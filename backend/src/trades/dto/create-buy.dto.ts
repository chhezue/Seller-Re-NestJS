import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';
import { BaseTradeDto } from './base-trade-dto';

export class CreateBuyDto extends BaseTradeDto {
  @ApiProperty({ description: '오늘 입금 가능 여부' })
  @IsBoolean()
  @IsNotEmpty()
  isTodayDepositAvailable: boolean;
}
