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

@Injectable()
export class BearerTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest();

    if (isPublic) {
      const rawToken = req.headers.authorization;

      if (rawToken) {
        try {
          const token = this.authService.extractTokenFromHeader(rawToken, true);
          const payload = await this.authService.verifyToken(token);
          const user = await this.userService.getUserByEmail(payload.email);

          req.user = user;
          req.token = token;
          req.tokenType = payload.type;
        } catch (e) {}
      }
      req.isRouterPublic = true;
      return true;
    }

    const rawToken = req.headers.authorization;

    if (!rawToken) {
      throw new UnauthorizedException('No Token Provided');
    }

    try {
      const token = this.authService.extractTokenFromHeader(rawToken, true);
      const result = await this.authService.verifyToken(token);
      const user = await this.userService.getUserByEmail(result.email);

      req.user = user;
      req.token = token;
      req.tokenType = result.type;
    } catch (e) {
      throw new UnauthorizedException('Invalid Token');
    }

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
      throw new UnauthorizedException('No Access Token Provided');
    }

    return true;
  }
}

@Injectable()
export class RefreshTokenGuard extends BearerTokenGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const req = context.switchToHttp().getRequest();

    if (req.isRouterPublic) {
      return true;
    }

    if (req.tokenType !== 'refresh') {
      throw new UnauthorizedException('No Refresh Token Provided');
    }

    return true;
  }
}
