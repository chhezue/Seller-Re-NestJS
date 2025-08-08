import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Validates the data received from the client for user registration.
 */
export class RegisterUserDto {
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
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;

  /**
   * The URL of the user's profile image (optional).
   * @example "/images/profile.jpg"
   */
  @IsString({ message: 'Profile image URL must be a string.' })
  @IsOptional()
  profileImage?: string;

  /**
   * The user's phone number (optional).
   * @example "010-1234-5678"
   */
  @IsString({ message: 'Phone number must be a string.' })
  @IsOptional()
  phoneNumber?: string;

  /**
   * The ID of the user's region (optional).
   * @example "-"
   */
  @IsString({ message: 'Region ID must be a string.' })
  @IsOptional()
  region_id?: string;
}
