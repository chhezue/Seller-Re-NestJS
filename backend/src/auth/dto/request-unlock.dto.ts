import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestUnlockDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
