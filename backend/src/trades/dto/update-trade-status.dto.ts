import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TRADE_REQUEST_STATUS } from '../const/trade.const';

export class UpdateTradeStatusDto {
  @ApiProperty({ description: '변경할 거래 상태', enum: TRADE_REQUEST_STATUS })
  @IsEnum(TRADE_REQUEST_STATUS)
  @IsNotEmpty()
  status: TRADE_REQUEST_STATUS;
}
