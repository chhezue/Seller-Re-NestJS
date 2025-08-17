import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Patch,
  Post,
} from '@nestjs/common';
import { User } from './decorator/user.decorator';
import { UsersModel } from './entity/users.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { IsPublic } from '../common/decorator/is-public.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get('me')
  async getMyProfile(@User() user: UsersModel) {
    return user;
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async patchMyProfile(
    @User('id') userId: string,
    @Body() body: UpdateUserDto,
    @Ip() ip: string,
  ) {
    console.log('patch.');
    console.log('userId : ', userId);
    console.log('body : ', body);
    console.log('ip : ', ip);
    await this.usersService.updateUser(userId, body, ip);
    return { message: 'Your profile has been updated successfully.' };
  }

  @Post()
  @IsPublic()
  async postUser(@Body() body: CreateUserDto) {
    const newUser = await this.usersService.createUser(body);

    // After successful registration, log the new user in immediately
    return this.authService.loginUser(newUser);
  }
}
