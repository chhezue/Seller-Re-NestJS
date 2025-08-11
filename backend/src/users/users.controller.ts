import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { User } from './decorator/user.decorator';
import { UsersModel } from './entity/users.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMyProfile(@User() user: UsersModel) {
    return user;
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async patchMyProfile(
    @User('id') userId: string,
    @Body() body: UpdateUserDto,
  ): Promise<{ message: string }> {
    await this.usersService.updateUser(userId, body);
    return { message: 'userProfile updated successfully.' };
  }
}
