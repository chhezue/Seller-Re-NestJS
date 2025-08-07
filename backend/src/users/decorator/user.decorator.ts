import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersModel } from '../entity/users.entity';

export const User = createParamDecorator(
  (data: keyof UsersModel | undefined, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();

    const user = req.user as UsersModel;

    if (!user) {
      if (!req.isRouterPublic) {
        throw new InternalServerErrorException(
          'User decorator cannot be used on a protected route without an authentication guard.',
        );
      }
      return null;
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
