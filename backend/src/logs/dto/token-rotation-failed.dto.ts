import { IsEmail, IsIP, IsUUID } from 'class-validator';

export class TokenRotationFailedDto {
  @IsUUID()
  userId: string;

  @IsEmail()
  email: string;

  @IsIP()
  ip: string;
}
