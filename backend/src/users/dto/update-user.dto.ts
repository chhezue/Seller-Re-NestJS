import { PartialType } from '@nestjs/swagger';
import { RegisterUserDto } from '../../auth/dto/register-user.dto';

export class UpdateUserDto extends PartialType(RegisterUserDto) {}
