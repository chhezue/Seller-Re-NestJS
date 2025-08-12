import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UnlockAccountDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
