import {
  Controller,
  Post,
  Headers,
  Req,
  Body,
  UseGuards,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { RegisterUserDto } from './dto/register-user.dto';
import { IsPublic } from '../common/decorator/is-public.decorator';
import { RefreshTokenGuard } from './guard/bearer-token.guard';
import { User } from '../users/decorator/user.decorator';
import { UsersModel } from '../users/entity/users.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @IsPublic()
  async postLoginEmail(
    @Headers('authorization') rawToken: string,
    @Req() req: Request,
  ) {
    const token = this.authService.extractTokenFromHeader(rawToken, false);

    const credentials = this.authService.decodedBasicToken(token);

    return await this.authService.loginWithEmail(credentials, req.ip);
  }

  @Post('users')
  @IsPublic()
  async postRegister(@Body() registerUserDto: RegisterUserDto) {
    return await this.authService.registerWithEmail(registerUserDto);
  }

  @Post('token/access')
  @IsPublic()
  @UseGuards(RefreshTokenGuard)
  async postTokenAccess(@Headers('authorization') rawToken: string) {
    return await this.reissueToken(rawToken, false);
  }

  @Post('token/refresh')
  @IsPublic()
  @UseGuards(RefreshTokenGuard)
  async postTokenRefresh(@Headers('authorization') rawToken: string) {
    return await this.reissueToken(rawToken, true);
  }

  private async reissueToken(rawToken: string, isRefresh: boolean) {
    const token = this.authService.extractTokenFromHeader(rawToken, true);
    const newToken = await this.authService.rotateToken(token, isRefresh);

    const tokenType = isRefresh ? 'refreshToken' : 'accessToken';

    return { [tokenType]: newToken };
  }

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
