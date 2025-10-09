import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TRADE_METHOD } from '../const/trade.const';

export class BaseTradeDto {
  @ApiProperty({ description: '상품 ID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: '거래 방식', enum: TRADE_METHOD })
  @IsEnum(TRADE_METHOD)
  @IsNotEmpty()
  tradeMethod: TRADE_METHOD;

  @ApiProperty({ description: '거래 요청 메시지' })
  @IsString()
  @IsOptional()
  message?: string;
}
