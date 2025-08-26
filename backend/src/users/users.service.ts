import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { RegionModel } from '../common/entity/region.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PasswordChangeMethod } from '../logs/const/password-change-method.const';
import { UsersErrorCode } from './const/users-error-code.const';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersModel)
    private readonly usersRepository: Repository<UsersModel>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly uploadService: UploadsService,
  ) {}

  async getUserByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async createUser(userDto: CreateUserDto) {
    const { username, email, password, region_id, profileImageId, ...rest } =
      userDto;

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

    const newUser = await this.usersRepository.save(newUserObject);

    if (profileImageId) {
      const [committedFile] = await this.uploadService.commitFiles([
        {
          fileId: profileImageId,
          isRepresentative: true,
          order: 1,
        },
      ]);
      newUser.profileImage = committedFile.url;
      return await this.usersRepository.save(newUser);
    }
    return newUser;
  }

  async updateUser(
    userId: string,
    dto: Partial<UsersModel> & {
      region_id?: string | null;
      profileImageId?: string | null;
    },
    ip?: string,
  ) {
    const { password, region_id, profileImageId, ...rest } = dto;

    const updatePayload: Partial<UsersModel> = {
      ...rest,
    };

    if (password) {
      const isAlreadyHashed = password.startsWith('$2b$');
      if (isAlreadyHashed) {
        updatePayload.password = password;
      } else {
        if (!ip) {
          throw new BadRequestException({
            message: 'IP address is required when changing a password.',
            errorCode: UsersErrorCode.IP_ADDRESS_REQUIRED_FOR_PASSWORD_CHANGE,
          });
        }
        const hashedPassword = await bcrypt.hash(
          password,
          parseInt(this.configService.get<string>('HASH_ROUNDS', '10')),
        );
        updatePayload.password = hashedPassword;

        this.eventEmitter.emit('user.password.changed', {
          user: { id: userId },
          ip,
          method: PasswordChangeMethod.USER_INITIATED,
        });
      }
    }

    if (region_id !== undefined) {
      updatePayload.region = region_id
        ? ({ id: region_id } as RegionModel)
        : null;
    }

    if (profileImageId !== undefined) {
      if (profileImageId === null) {
        updatePayload.profileImage = null;
      } else {
        const [committedFile] = await this.uploadService.commitFiles([
          {
            fileId: profileImageId,
            isRepresentative: true,
            order: 1,
          },
        ]);
        updatePayload.profileImage = committedFile.url;
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      await this.usersRepository.update(userId, updatePayload);
    }
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<UsersModel | null> {
    return this.usersRepository.findOne({
      where: { phoneNumber },
    });
  }
}
