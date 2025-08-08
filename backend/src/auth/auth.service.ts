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

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly maxLoginAttempts: number;

  constructor(
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

  loginUser(user: Pick<UsersModel, 'email' | 'id' | 'username'>) {
    return {
      accessToken: this.signToken(user, false),
      refreshToken: this.signToken(user, true),
    };
  }

  signToken(
    
    user: Pick<UsersModel, 'email' | 'id' | 'username'>,
   
    isRefreshToken: boolean,
  ) {
    const payload = {
      username: user.username,
      email: user.email,
      sub: user.id,
      type: isRefreshToken ? 'refresh' : 'access',
    };

    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      // refresh: 7d, access: 1h
      expiresIn: isRefreshToken ? '7d' : '1h',
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

  async reissueToken(token: string, isRefresh: boolean) {
    const newToken = await this.rotateToken(token, isRefresh);
    const tokenType = isRefresh ? 'refreshToken' : 'accessToken';

    return { [tokenType]: newToken };
  }

  async rotateToken(token: string, isRefreshToken: boolean) {
    const decoded = this.jwtService.verify(token, {
      secret: this.jwtSecret,
    });

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('only refresh token can be rotated');
    }

    const user = await this.userService.getUserByEmail(decoded.email);

    if (!user) {
      throw new UnauthorizedException('not exists user, please login again');
    }

    return this.signToken(user, isRefreshToken);
  }
}