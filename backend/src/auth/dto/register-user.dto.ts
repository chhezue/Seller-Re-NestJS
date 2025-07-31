import { PickType } from '@nestjs/swagger';
import { UsersModel } from '../../users/entity/users.entity';

export class RegisterUserDto extends PickType(UsersModel, [
  'username',
  'email',
  'password',
  'profileImage',
  'phoneNumber',
  'region_id',
]) {}
