import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a new user.
 * This is the base DTO for user-related data.
 */
export class CreateUserDto {
  /**
   * The user's name.
   * @example "user1"
   */
  @IsString({ message: 'Username must be a string.' })
  @IsNotEmpty({ message: 'Username is required.' })
  username: string;

  /**
   * The user's email, used for login.
   * @example "user1@dummyUser.com"
   */
  @IsEmail({}, { message: 'Must be a valid email format.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;

  /**
   * The user's password.
   * @example "user1"
   */
  @IsString({ message: 'Password must be a string.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;

  @IsString({ message: 'Profile image URL must be a string.' })
  @IsOptional()
  profileImage?: string;

  @IsString({ message: 'Phone number must be a string.' })
  @IsOptional()
  phoneNumber?: string;

  @IsString({ message: 'Region ID must be a string.' })
  @IsOptional()
  region_id?: string;
}