import { Controller, Post, Headers, Req, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async postLoginEmail(
    @Headers('authorization') rawToken: string,
    @Req() req: Request,
  ) {
    const token = this.authService.extractTokenFromHeader(rawToken, false);

    const credentials = this.authService.decodedBasicToken(token);

    return await this.authService.loginWithEmail(credentials, req.ip);
  }

  @Post('users')
  async postRegister(@Body() registerUserDto: RegisterUserDto) {
    return await this.authService.registerWithEmail(registerUserDto);
  }
}
