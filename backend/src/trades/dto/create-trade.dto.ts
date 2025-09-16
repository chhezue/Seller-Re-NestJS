import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  Min,
  IsBoolean,
} from 'class-validator';
import { TRADE_REQUEST_TYPE, TRADE_METHOD } from '../const/trade.const';

export class CreateTradeDto {
  @ApiProperty({ description: '상품 ID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: '거래 요청 타입', enum: TRADE_REQUEST_TYPE })
  @IsEnum(TRADE_REQUEST_TYPE)
  @IsNotEmpty()
  requestType: TRADE_REQUEST_TYPE;

  @ApiProperty({ description: '제안 가격 (OFFER 타입일 때만 필요)' })
  @ValidateIf((o) => o.requestType === TRADE_REQUEST_TYPE.OFFER)
  @IsNumber()
  @Min(0)
  @IsOptional()
  offerPrice?: number;

  @ApiProperty({ description: '거래 방식', enum: TRADE_METHOD })
  @IsEnum(TRADE_METHOD)
  @IsNotEmpty()
  tradeMethod: TRADE_METHOD;

  @ApiProperty({ description: '거래 요청 메시지' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ description: '희망 거래 일시' })
  @IsString()
  @IsOptional()
  preferredDateTime?: string;

  @ApiProperty({ description: '거래 장소 (직거래일 때만 필요)' })
  @ValidateIf((o) => o.tradeMethod === TRADE_METHOD.DIRECT)
  @IsString()
  @IsOptional()
  meetingLocation?: string;

  @ApiProperty({ description: '오늘 입금 가능 여부' })
  @IsBoolean()
  @IsNotEmpty()
  isTodayDepositAvailable?: boolean;
}
