import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

export const Token = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();

    const token = req.token;

    if (!token) {
      throw new InternalServerErrorException(
        'Token decorator must be used with a guard that populates req.token.',
      );
    }

    return token;
  },
);
