import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyUnlockDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Length(6, 6)
  verificationCode: string;
}
