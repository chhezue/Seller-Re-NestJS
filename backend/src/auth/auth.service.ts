import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersModel } from '../users/entity/users.entity';
import { UsersService } from '../users/users.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

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

    //TODO. refactor to generate jwt-token
    return true;
  }

  async authenticateWithEmailAndPassword(
    user: Pick<UsersModel, 'email' | 'password'>,
    ip: string,
  ) {
    const existingUser = await this.userService.getUserByEmail(user.email);

    if (!existingUser) {
      throw new UnauthorizedException('');
    }

    const isPasswordMatch = await bcrypt.compare(
      user.password,
      existingUser.password,
    );

    if (!isPasswordMatch) {
      this.eventEmitter.emit('login.failed', {
        email: user.email,
        ip: ip,
        timestamp: new Date(),
      });

      throw new UnauthorizedException('email or password is not matched.');
    }

    return existingUser;
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
  }
}
