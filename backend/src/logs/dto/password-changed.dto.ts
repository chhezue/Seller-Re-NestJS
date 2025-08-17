import { UsersModel } from '../../users/entity/users.entity';
import { PasswordChangeMethod } from '../const/password-change-method.const';
import { IsIP } from 'class-validator';

export class PasswordChangedDto {
  user: Pick<UsersModel, 'id'>;
  @IsIP()
  ip: string;
  method: PasswordChangeMethod;
}
