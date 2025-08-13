import {
  Controller,
  Post,
  UseGuards,
  Get,
  Req,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsPublic } from '../common/decorator/is-public.decorator';
import { RefreshTokenGuard } from './guard/bearer-token.guard';
import { User } from '../users/decorator/user.decorator';
import { UsersModel } from '../users/entity/users.entity';
import { BasicTokenGuard } from './guard/basic-token.guard';
import { Token } from './decorator/token.decorator';
import { Request } from 'express';
import { UnlockAccountDto } from './dto/unlock-account.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @IsPublic()
  @UseGuards(BasicTokenGuard)
  async postLoginEmail(@User() user: UsersModel) {
    return await this.authService.loginUser(user);
  }

  @Post('token/refresh')
  @IsPublic()
  @UseGuards(RefreshTokenGuard)
  async postTokenRefresh(@Token() token: string, @Req() req: Request) {
    return await this.authService.rotateRefreshToken(token, req.ip);
  }

  @Post('unlock')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async postUnlockAccount(@Body() body: UnlockAccountDto) {
    return this.authService.unlockAccount(body);
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
