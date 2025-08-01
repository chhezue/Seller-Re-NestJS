import { UsersModel } from '../../users/entity/users.entity';

export class LoginFailedDto {
  user: UsersModel;
  ip: string;
}
