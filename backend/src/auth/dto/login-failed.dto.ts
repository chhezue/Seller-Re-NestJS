import { UsersModel } from '../../users/entity/users.entity';
import { IsIP, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LoginFailedDto {
  @IsObject()
  @ValidateNested()
  @Type(() => UsersModel)
  user: UsersModel;

  @IsIP()
  ip: string;
}
