import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthErrorCode } from '../const/auth-error-code.const';

@Injectable()
export class BasicTokenGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const rawToken = req.headers.authorization;

    if (!rawToken) {
      throw new UnauthorizedException({
        message: 'No token provided.',
        errorCode: AuthErrorCode.INVALID_TOKEN,
      });
    }

    const token = this.authService.extractTokenFromHeader(rawToken, false);

    const { email, password } = this.authService.decodedBasicToken(token);

    req.user = await this.authService.authenticateWithEmailAndPassword(
      { email, password },
      req.ip,
    );

    return true;
  }
}
