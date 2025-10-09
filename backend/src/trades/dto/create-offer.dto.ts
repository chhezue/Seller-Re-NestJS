import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { BaseTradeDto } from './base-trade-dto';

export class CreateOfferDto extends BaseTradeDto {
  @ApiProperty({ description: '제안 가격' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  offerPrice: number; // 이제 이 필드는 항상 필수입니다.
}
