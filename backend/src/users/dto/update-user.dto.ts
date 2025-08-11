import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// We use OmitType to exclude fields that should not be updated via this endpoint.
// - Email is a unique identifier and changing it requires a more secure process.
// - Password updates should have their own dedicated, secure endpoint.
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const),
) {}
