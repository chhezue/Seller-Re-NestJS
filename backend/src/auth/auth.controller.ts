import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { IsPublic } from '../common/decorator/is-public.decorator';
import { RefreshTokenGuard } from './guard/bearer-token.guard';
import { User } from '../users/decorator/user.decorator';
import { UsersModel } from '../users/entity/users.entity';
import { BasicTokenGuard } from './guard/basic-token.guard';
import { Token } from './decorator/token.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @IsPublic()
  @UseGuards(BasicTokenGuard)
  async postLoginEmail(@User() user: UsersModel) {
    return this.authService.loginUser(user);
  }

  @Post('users')
  @IsPublic()
  async postRegister(@Body() registerUserDto: RegisterUserDto) {
    return await this.authService.registerWithEmail(registerUserDto);
  }

  @Post('token/access')
  @IsPublic()
  @UseGuards(RefreshTokenGuard)
  async postTokenAccess(@Token() token: string) {
    return await this.authService.reissueToken(token, false);
  }

  @Post('token/refresh')
  @IsPublic()
  @UseGuards(RefreshTokenGuard)
  async postTokenRefresh(@Token() token: string) {
    return await this.authService.reissueToken(token, true);
  }

  //TEST API

  @Get('test/here')
  // @UseGuards(AccessTokenGuard)  // app.module 에서 전역으로 사용중임
  async testHere(@User() user: UsersModel) {
    console.log('testHere.user : ', user);
    return user;
  }

  @Get('test/here2')
  @IsPublic()
  async testHere2(@User() user: UsersModel) {
    console.log('its public. but... user : ', user);
    return user;
  }
}
