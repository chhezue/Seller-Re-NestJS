import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { Repository } from 'typeorm';
import { RegisterUserDto } from '../auth/dto/register-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsersModel)
    private readonly usersRepository: Repository<UsersModel>,
  ) {}

  async getUserByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async createUser(
    user: Omit<RegisterUserDto, 'password'> & { password: string },
  ) {
    const { username, email, region_id, ...rest } = user;

    const existingUser = await this.usersRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new BadRequestException({
          message: 'username is already exists.',
          field: 'exists username',
        });
      }
      if (existingUser.email === email) {
        throw new BadRequestException({
          message: 'email is already exists.',
          field: 'exists email',
        });
      }
    }

    const newUserObject = this.usersRepository.create({
      username: username,
      email: email,
      ...rest,
      region: region_id ? { id: region_id } : null,
    });

    return await this.usersRepository.save(newUserObject);
  }

  async updateUser(userId: string, dto: Partial<UsersModel>) {
    await this.usersRepository.update(userId, dto);
  }
}
