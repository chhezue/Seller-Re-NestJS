import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersModel)
    private readonly usersRepository: Repository<UsersModel>,
    private readonly configService: ConfigService,
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
          message: 'This username is already taken.',
        });
      }
      if (existingUser.email === email) {
        throw new BadRequestException({
          field: 'email',
          message: 'This email is already registered.',
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

  async updateUser(userId: string, dto: Partial<UsersModel>) {
    await this.usersRepository.update(userId, dto);
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<UsersModel | null> {
    return this.usersRepository.findOne({
      where: { phoneNumber },
    });
  }
}
