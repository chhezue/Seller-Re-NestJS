import { Controller, Post, Headers, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from 'express';

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
}
