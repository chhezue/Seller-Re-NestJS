import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorator/is-public.decorator';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { AuthErrorCode } from '../const/auth-error-code.const';

@Injectable()
export class BearerTokenGuard implements CanActivate {
  constructor(
    protected readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest();
    const rawToken = req.headers.authorization;

    if (isPublic) {
      if (rawToken && rawToken.startsWith('Bearer ')) {
        try {
          const token = this.authService.extractTokenFromHeader(rawToken, true);
          const payload = await this.authService.verifyToken(token);
          const user = await this.userService.getUserByEmail(payload.email);

          req.user = user;
          req.token = token;
          req.tokenType = payload.type;
        } catch (e) {
          // For public routes, if token validation fails, we just don't populate the user.
          // The request is allowed to proceed without authentication.
        }
      }
      req.isRouterPublic = true;
      return true;
    }

    if (!rawToken) {
      throw new UnauthorizedException({
        message: 'No token provided.',
        errorCode: AuthErrorCode.INVALID_TOKEN,
      });
    }

    // For protected routes, token extraction and verification must succeed.
    // The services (authService, userService) will throw appropriate exceptions on failure.
    const token = this.authService.extractTokenFromHeader(rawToken, true);
    const payload = await this.authService.verifyToken(token);
    const user = await this.userService.getUserByEmail(payload.email);

    if (!user) {
      throw new UnauthorizedException({
        message: 'User associated with token not found.',
        errorCode: AuthErrorCode.INVALID_TOKEN,
      });
    }

    req.user = user;
    req.token = token;
    req.tokenType = payload.type;

    return true;
  }
}

@Injectable()
export class AccessTokenGuard extends BearerTokenGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const req = context.switchToHttp().getRequest();

    if (req.isRouterPublic) {
      return true;
    }

    if (req.tokenType !== 'access') {
      throw new UnauthorizedException({
        message: 'An access token must be provided.',
        errorCode: AuthErrorCode.INVALID_TOKEN_TYPE,
      });
    }

    return true;
  }
}

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const rawToken = req.headers.authorization;

    if (!rawToken) {
      throw new UnauthorizedException({
        message: 'A refresh token must be provided.',
        errorCode: AuthErrorCode.INVALID_TOKEN,
      });
    }
    const token = this.authService.extractTokenFromHeader(rawToken, true);

    req.token = token;

    return true;
  }
}
