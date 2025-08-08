import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersModel } from '../users/entity/users.entity';
import { UsersService } from '../users/users.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatusEnum } from '../users/const/status.const';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshTokenModel } from './entity/refresh-token.entity';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly maxLoginAttempts: number;

  constructor(
    @InjectRepository(RefreshTokenModel)
    private readonly refreshTokenRepository: Repository<RefreshTokenModel>,
    private readonly userService: UsersService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.jwtSecret =
      this.configService.get<string>('JWT_SECRET') +
      this.configService.get<string>('CAT');

    this.maxLoginAttempts = parseInt(
      this.configService.get<string>('AUTH_MAX_LOGIN_ATTEMPTS', '5'),
      10,
    );
  }

  extractTokenFromHeader(headerRawToken: string, isBearer: boolean) {
    const splitToken = headerRawToken.split(' ');
    const prefix = isBearer ? 'Bearer' : 'Basic';
    if (splitToken.length !== 2 || splitToken[0] !== prefix) {
      throw new UnauthorizedException('Invalid token format');
    }

    return splitToken[1];
  }

  decodedBasicToken(base64String: string) {
    const decoded = Buffer.from(base64String, 'base64').toString('utf8');
    const [email, password] = decoded.split(':');

    if (!email || !password) {
      throw new UnauthorizedException('Invalid Base Token(email or password)');
    }

    return { email, password };
  }

  async loginWithEmail(
    user: Pick<UsersModel, 'email' | 'password'>,
    ip: string,
  ) {
    const existingUser = await this.authenticateWithEmailAndPassword(user, ip);

    return this.loginUser(existingUser);
  }

  async authenticateWithEmailAndPassword(
    user: Pick<UsersModel, 'email' | 'password'>,
    ip: string,
  ) {
    const existingUser = await this.userService.getUserByEmail(user.email);

    if (!existingUser) {
      throw new UnauthorizedException('email is not exists.');
    }

    if (existingUser.status === UserStatusEnum.LOCKED) {
      throw new ForbiddenException('User is locked.');
    }

    const isPasswordMatch = await bcrypt.compare(
      user.password,
      existingUser.password,
    );

    if (isPasswordMatch) {
      if (existingUser.passwordFailedCount > 0) {
        await this.userService.updateUser(existingUser.id, {
          passwordFailedCount: 0,
        });
      }
      return existingUser;
    }

    const newFailedCount = existingUser.passwordFailedCount + 1;
    const shouldLock = newFailedCount >= this.maxLoginAttempts;

    await this.userService.updateUser(existingUser.id, {
      passwordFailedCount: newFailedCount,
      status: shouldLock ? UserStatusEnum.LOCKED : existingUser.status,
    });

    this.eventEmitter.emit('login.failed', {
      user: existingUser,
      ip: ip,
    });

    if (shouldLock) {
      throw new ForbiddenException(
        'Account has been locked due to too many failed login attempts.',
      );
    }

    throw new UnauthorizedException('email or password is not matched.');
  }

  async registerWithEmail(user: RegisterUserDto) {
    const hash = await bcrypt.hash(
      user.password,
      parseInt(this.configService.get<string>('HASH_ROUNDS') ?? '10'),
    );

    const newUser = await this.userService.createUser({
      ...user,
      password: hash,
    });

    return this.loginUser(newUser);
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
    const expiresIn = isRefreshToken ? '7d' : '1h';

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
      throw new UnauthorizedException('Invalid token or expired token');
    }
  }

  async rotateRefreshToken(token: string) {
    const decoded = this.verifyToken(token);

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException(
        'a refreshToken must be provided for rotation.',
      );
    }

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { jti: decoded.jti },
      relations: { user: true },
    });

    if (!refreshToken || refreshToken.isRevoked) {
      throw new UnauthorizedException('This token has been revoked.');
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
}
