import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateLikeDto {
  @ApiProperty({ description: '찜을 누른 user ID' })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({ description: '찜을 누른 product ID' })
  @IsNotEmpty()
  @IsUUID()
  productId: string;
}
