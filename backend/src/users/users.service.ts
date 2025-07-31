import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersModel } from './entity/users.entity';
import { Repository } from 'typeorm';

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
    user: Pick<
      UsersModel,
      | 'username'
      | 'email'
      | 'password'
      | 'profileImage'
      | 'phoneNumber'
      | 'region_id'
    >,
  ) {
    const existingUser = await this.usersRepository.findOne({
      where: [{ username: user.username }, { email: user.email }],
    });

    if (existingUser) {
      if (existingUser.username === user.username) {
        throw new BadRequestException({
          message: 'username is already exists.',
          field: 'exists username',
        });
      }
      if (existingUser.email === user.email) {
        throw new BadRequestException({
          message: 'email is already exists.',
          field: 'exists email',
        });
      }
    }

    const newUserObject = this.usersRepository.create({
      username: user.username,
      email: user.email,
      password: user.password,
      profileImage: user.profileImage,
      phoneNumber: user.phoneNumber,
      region_id: user.region_id,
    });

    return await this.usersRepository.save(newUserObject);
  }

  async updateUser(userId: string, dto: Partial<UsersModel>) {
    await this.usersRepository.update(userId, dto);
  }
}
