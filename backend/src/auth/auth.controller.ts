import { Controller, Post, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async postLoginEmail(@Headers('authorization') rawToken: string) {
    const token = this.authService.extractTokenFromHeader(rawToken, false);

    const credentials = this.authService.decodedBasicToken(token);

    return await this.authService.loginWithEmail();
  }
}
