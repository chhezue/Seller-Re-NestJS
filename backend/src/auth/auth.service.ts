import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersModel } from '../users/entity/users.entity';
import { UsersService } from '../users/users.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatusEnum } from '../users/const/status.const';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshTokenModel } from './entity/refresh-token.entity';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { TokenRotationFailedDto } from '../logs/dto/token-rotation-failed.dto';
import { AuthErrorCode } from './const/auth-error-code.const';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MailService } from '../mail/mail.service';
import { RequestUnlockDto } from './dto/request-unlock.dto';
import { VerifyUnlockDto } from './dto/verify-unlock.dto';
import { PasswordChangeMethod } from '../logs/const/password-change-method.const';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly maxLoginAttempts: number;
  private readonly unlockCodeTtl: number;

  constructor(
    @InjectRepository(RefreshTokenModel)
    private readonly refreshTokenRepository: Repository<RefreshTokenModel>,
    private readonly userService: UsersService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {
    this.jwtSecret =
      this.configService.get<string>('JWT_SECRET') +
      this.configService.get<string>('CAT');

    this.maxLoginAttempts = parseInt(
      this.configService.get<string>('AUTH_MAX_LOGIN_ATTEMPTS', '5'),
      10,
    );

    this.unlockCodeTtl =
      parseInt(
        this.configService.get<string>('AUTH_UNLOCK_CODE_TTL_SECONDS', '300'),
      ) * 1000;
  }

  extractTokenFromHeader(headerRawToken: string, isBearer: boolean) {
    const splitToken = headerRawToken.split(' ');
    const prefix = isBearer ? 'Bearer' : 'Basic';
    if (splitToken.length !== 2 || splitToken[0] !== prefix) {
      // throw new UnauthorizedException('Invalid token format');
      throw new UnauthorizedException({
        message: 'Invalid token format.',
        errorCode: AuthErrorCode.INVALID_TOKEN,
      });
    }

    return splitToken[1];
  }

  decodedBasicToken(base64String: string) {
    const decoded = Buffer.from(base64String, 'base64').toString('utf8');
    const [email, password] = decoded.split(':');

    if (!email || !password) {
      throw new UnauthorizedException({
        message: 'Invalid authorization credentials.',
        errorCode: AuthErrorCode.INVALID_TOKEN,
      });
    }

    return { email, password };
  }

  async authenticateWithEmailAndPassword(
    user: Pick<UsersModel, 'email' | 'password'>,
    ip: string,
  ) {
    const existingUser = await this.userService.getUserByEmail(user.email);

    if (!existingUser) {
      throw new UnauthorizedException({
        message: 'Email or password does not match.',
        errorCode: AuthErrorCode.AUTHENTICATION_FAILED,
      });
    }

    if (existingUser.status === UserStatusEnum.LOCKED) {
      throw new ForbiddenException({
        message:
          'This account is locked due to multiple failed login attempts. Please try again later or reset your password.',
        errorCode: AuthErrorCode.ACCOUNT_LOCKED,
      });
    }

    if (existingUser.status === UserStatusEnum.SUSPENDED) {
      throw new ForbiddenException({
        message:
          'This account has been suspended. Please contact customer support.',
        errorCode: AuthErrorCode.ACCOUNT_SUSPENDED,
      });
    }

    if (existingUser.status === UserStatusEnum.DELETED) {
      // To prevent user enumeration, treat deleted users the same as non-existent ones.
      throw new UnauthorizedException({
        message: 'Email or password does not match.',
        errorCode: AuthErrorCode.AUTHENTICATION_FAILED,
      });
    }

    const isPasswordMatch = await bcrypt.compare(
      user.password,
      existingUser.password,
    );

    if (isPasswordMatch) {
      if (existingUser.passwordFailedCount > 0) {
        await this.userService.updateUserInternal(existingUser.id, {
          passwordFailedCount: 0,
        });
      }
      return existingUser;
    }

    const newFailedCount = existingUser.passwordFailedCount + 1;
    const shouldLock = newFailedCount >= this.maxLoginAttempts;

    await this.userService.updateUserInternal(existingUser.id, {
      passwordFailedCount: newFailedCount,
      status: shouldLock ? UserStatusEnum.LOCKED : existingUser.status,
    });

    this.eventEmitter.emit('login.failed', {
      user: existingUser,
      ip: ip,
    });

    if (shouldLock) {
      throw new ForbiddenException({
        message:
          'Account has been locked due to too many failed login attempts.',
        errorCode: AuthErrorCode.ACCOUNT_LOCKED,
      });
    }

    // Generic failure for wrong password
    throw new UnauthorizedException({
      message: 'Email or password does not match.',
      errorCode: AuthErrorCode.AUTHENTICATION_FAILED,
    });
  }

  async loginUser(user: Pick<UsersModel, 'email' | 'id' | 'username'>) {
    const jti = uuid();
    const accessToken = this.signToken(user, false);
    const refreshToken = this.signToken(user, true, jti);

    await this.saveRefreshToken(user.id, jti);
    return {
      accessToken,
      refreshToken,
    };
  }

  signToken(
    user: Pick<UsersModel, 'email' | 'id' | 'username'>,

    isRefreshToken: boolean,
    jti?: string,
  ) {
    const payload = {
      username: user.username,
      email: user.email,
      sub: user.id,
      type: isRefreshToken ? 'refresh' : 'access',
      ...(jti && { jti }), // if jti exists, add it to the payload
    };

    // refresh: 7d, access: 1h
    const expiresIn = isRefreshToken
      ? this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')
      : this.configService.get<string>('JWT_ACCESS_EXPIRES_IN');

    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn,
    });
  }

  verifyToken(token: string) {
    try {
      return this.jwtService.verify(token, {
        secret: this.jwtSecret,
      });
    } catch (error) {
      throw new UnauthorizedException({
        message: 'Invalid or expired token.',
        errorCode: AuthErrorCode.INVALID_TOKEN,
      });
    }
  }

  async rotateRefreshToken(token: string, reqIP: string) {
    const decoded = this.verifyToken(token);

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException({
        message: 'A refresh token must be provided for rotation.',
        errorCode: AuthErrorCode.INVALID_TOKEN_TYPE,
      });
    }

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { jti: decoded.jti },
      relations: { user: true },
    });

    if (!refreshToken) {
      /**
       * DB에 JTI가 없다는 것은 정상조 발급된 토큰이 아니거나,
       * 이미 rotate되어 이전 jti가 폐기된 후 함참 뒤에 사용된 경우.
       * 누군가 탈취한 토큰을 사용하려 했을 가능성이 있으므로,
       * decoded.sub (userId)를 이용해 해당 유저의 모든 토큰을 무효화 하고
       * 강제 로그아웃 기능을 추가하기를 권장함.
       *
       * await this.revokeAllTokensForUser(decoded.sub);
       */
      const payload: TokenRotationFailedDto = {
        userId: decoded.sub,
        email: decoded.email,
        ip: reqIP,
      };
      this.eventEmitter.emit('token.rotation.failed.NoRefreshToken', payload);
      throw new UnauthorizedException({
        message: 'Invalid Refresh Token.',
        errorCode: AuthErrorCode.INVALID_TOKEN,
      });
    }

    if (refreshToken.isRevoked) {
      /**
       * 이미 폐기된 토큰으로 재발급을 시도하는 경우는 정상적이지 않은 시도일 확률이 높음.
       * 정상 사용자가 실수로 이전 토큰을 사용했을수도 있지만,
       * 공격자가 탈취한 토큰을 사용하는 것일 확률이 더 높으므로
       * 사용자에게 강제 로그아웃 기능을 적용함.
       */
      await this.revokeAllTokensForUser(refreshToken.user.id);

      const payload: TokenRotationFailedDto = {
        userId: refreshToken.user.id,
        email: refreshToken.user.email,
        ip: reqIP,
      };
      this.eventEmitter.emit(
        'token.rotation.failed.RevokedRefreshToken',
        payload,
      );
      throw new UnauthorizedException({
        message: 'Abnormal access detected. All sessions have been terminated.',
        errorCode: AuthErrorCode.INVALID_TOKEN,
      });
    }

    refreshToken.isRevoked = true;
    await this.refreshTokenRepository.save(refreshToken);
    return this.loginUser(refreshToken.user);
  }

  private async saveRefreshToken(userId: string, jti: string) {
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    await this.refreshTokenRepository.save({
      user: { id: userId },
      jti,
      expiresAt: expires,
    });
  }

  private async revokeAllTokensForUser(userId: string) {
    await this.refreshTokenRepository.update(
      {
        user: { id: userId },
        isRevoked: false,
      },
      { isRevoked: true },
    );
  }

  async requestAccountUnlock(dto: RequestUnlockDto) {
    const { email } = dto;
    const user = await this.userService.getUserByEmail(email);

    if (!user || user.status !== UserStatusEnum.LOCKED) {
      throw new BadRequestException({
        message: 'No locked account found with the provided email.',
        errorCode: AuthErrorCode.ACCOUNT_STATE_INVALID,
      });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const cacheKey = `unlock-code:${email}`;

    await this.cacheManager.set(cacheKey, verificationCode, this.unlockCodeTtl);

    this.eventEmitter.emit('user.unlock.request', {
      user,
      verificationCode,
    });

    return {
      message: 'A verification code has been sent to your email.',
    };
  }

  async verifyAndUnlockAccount(dto: VerifyUnlockDto, ip: string) {
    const { email, verificationCode } = dto;
    const cacheKey = `unlock-code:${email}`;

    const cachedCode = await this.cacheManager.get<string>(cacheKey);

    if (!cachedCode) {
      throw new BadRequestException({
        message: 'Verification code has expired or invalid.',
        errorCode: AuthErrorCode.VALIDATION_FAILED,
      });
    }

    if (cachedCode !== verificationCode) {
      throw new BadRequestException({
        message: 'The provided verification code is incorrect.',
        errorCode: AuthErrorCode.VALIDATION_FAILED,
      });
    }

    const user = await this.userService.getUserByEmail(email);
    if (!user || user.status !== UserStatusEnum.LOCKED) {
      throw new BadRequestException({
        message: 'Account is not in a locked state.',
        errorCode: AuthErrorCode.ACCOUNT_STATE_INVALID,
      });
    }

    const temporaryPassword = Math.random().toString(36).slice(-8);

    const hashedPassword = await bcrypt.hash(
      temporaryPassword,
      parseInt(this.configService.get<string>('HASH_ROUNDS', '10')),
    );

    await this.userService.updateUserInternal(user.id, {
      status: UserStatusEnum.ACTIVE,
      passwordFailedCount: 0,
      password: hashedPassword,
    });

    this.eventEmitter.emit('user.password.changed', {
      user,
      ip,
      method: PasswordChangeMethod.UNLOCK_RESET,
    });

    this.eventEmitter.emit('user.password.reset', {
      user,
      temporaryPassword,
    });

    await this.cacheManager.del(cacheKey);

    return {
      message:
        'Your account has been successfully unlocked. You can now log in with new password.',
    };
  }

  async logout(token: string) {
    const decoded = this.verifyToken(token);

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException({
        message: 'Invalid token type for logout.',
        errorCode: AuthErrorCode.INVALID_TOKEN_TYPE,
      });
    }
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { jti: decoded.jti },
    });

    if (!refreshToken || refreshToken.isRevoked) {
      // already logged out or invalid token,
      return { message: 'You have been successfully logged out.' };
    }

    refreshToken.isRevoked = true;
    await this.refreshTokenRepository.save(refreshToken);

    return { message: 'You have been successfully logged out.' };
  }
}
