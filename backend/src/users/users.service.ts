import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PasswordChangeMethod } from '../logs/const/password-change-method.const';
import { UsersErrorCode } from './const/users-error-code.const';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersModel)
    private readonly usersRepository: Repository<UsersModel>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getUserByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async createUser(userDto: CreateUserDto) {
    const { username, email, password, region_id, ...rest } = userDto;

    const existingUser = await this.usersRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new BadRequestException({
          field: 'username',
          message: UsersErrorCode.USERNAME_ALREADY_EXISTS,
        });
      }
      if (existingUser.email === email) {
        throw new BadRequestException({
          field: 'email',
          message: UsersErrorCode.EMAIL_ALREADY_EXISTS,
        });
      }
    }

    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(this.configService.get<string>('HASH_ROUNDS', '10')),
    );

    const newUserObject = this.usersRepository.create({
      username: username,
      email: email,
      password: hashedPassword,
      ...rest,
      region: region_id ? { id: region_id } : null,
    });

    return await this.usersRepository.save(newUserObject);
  }

  async updateUser(userId: string, dto: Partial<UsersModel>, ip?: string) {
    const { password, ...rest } = dto;
    if (password) {
      console.log('password : ', password);
      const isAlreadyHashed = password.startsWith('$2b$');
      if (isAlreadyHashed) {
        await this.usersRepository.update(userId, {
          ...rest,
          password,
        });
      } else {
        if (!ip) {
          throw new BadRequestException({
            message: 'IP address is required when changing a password.',
            errorCode: UsersErrorCode.IP_ADDRESS_REQUIRED_FOR_PASSWORD_CHANGE,
          });
        }
        console.log('ip: ', ip);
        const hashedPassword = await bcrypt.hash(
          password,
          parseInt(this.configService.get<string>('HASH_ROUNDS', '10')),
        );
        await this.usersRepository.update(userId, {
          ...rest,
          password: hashedPassword,
        });
        this.eventEmitter.emit('user.password.changed', {
          user: { id: userId },
          ip,
          method: PasswordChangeMethod.USER_INITIATED,
        });
      }
    } else {
      await this.usersRepository.update(userId, rest);
    }
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<UsersModel | null> {
    return this.usersRepository.findOne({
      where: { phoneNumber },
    });
  }
}
