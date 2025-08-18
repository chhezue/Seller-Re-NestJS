import {
  Controller,
  Post,
  UseGuards,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsPublic } from '../common/decorator/is-public.decorator';
import { RefreshTokenGuard } from './guard/bearer-token.guard';
import { User } from '../users/decorator/user.decorator';
import { UsersModel } from '../users/entity/users.entity';
import { BasicTokenGuard } from './guard/basic-token.guard';
import { Token } from './decorator/token.decorator';
import { RequestUnlockDto } from './dto/request-unlock.dto';
import { VerifyUnlockDto } from './dto/verify-unlock.dto';

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
  async postTokenRefresh(@Token() token: string, @Ip() ip: string) {
    return await this.authService.rotateRefreshToken(token, ip);
  }

  @Post('unlock/request')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async postRequestUnlock(@Body() body: RequestUnlockDto) {
    return this.authService.requestAccountUnlock(body);
  }

  @Post('unlock/verify')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async postVerifyUnlock(@Body() body: VerifyUnlockDto, @Ip() ip: string) {
    return this.authService.verifyAndUnlockAccount(body, ip);
  }

  @Post('logout')
  @IsPublic()
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  async postLogout(@Token() token: string) {
    return this.authService.logout(token);
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
