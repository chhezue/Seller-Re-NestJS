import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../const/product.const';

export class CreateProductDto {
  @ApiProperty({ description: '제품명' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: '제품 상세 설명' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: '카테고리 ID' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: '가격' })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  // @ApiProperty({ description: '판매자 ID' })
  // @IsUUID()
  // sellerId: string;
  //
  // @ApiProperty({ description: '거래 지역 ID' })
  // @IsUUID()
  // regionId: string;

  @ApiProperty({ description: '판매 상태', enum: PRODUCT_STATUS })
  @IsEnum(PRODUCT_STATUS)
  @IsNotEmpty()
  status: PRODUCT_STATUS;

  @ApiProperty({ description: '거래 형식', enum: TRADE_TYPE })
  @IsEnum(TRADE_TYPE)
  @IsNotEmpty()
  tradeType: TRADE_TYPE;

  @ApiProperty({ description: '제품 상태', enum: PRODUCT_CONDITION })
  @IsEnum(PRODUCT_CONDITION)
  @IsNotEmpty()
  condition: PRODUCT_CONDITION;

  @ApiProperty({ description: '가격 제안 가능 여부' })
  @IsBoolean()
  @IsNotEmpty()
  isNegotiable: boolean;
}
