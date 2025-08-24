import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../const/product.const';
import { Type } from 'class-transformer';
import { ImageCommitDto } from '../../uploads/dto/image-commit.dto';

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

  @ApiProperty({ description: "가격 (거래 형식이 '판매(SELL)'일 때만 필요)" })
  @ValidateIf((o) => o.tradeType === TRADE_TYPE.SELL) // tradeType이 SELL일 때만 아래 유효성 검사를 실행
  @IsNumber()
  @IsNotEmpty()
  @IsOptional() // tradeType이 SHARE일 경우
  price?: number;

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

  @ApiProperty({
    description: "가격 제안 가능 여부 (거래 형식이 '판매(SELL)'일 때만 필요)",
  })
  @ValidateIf((o) => o.tradeType === TRADE_TYPE.SELL) // tradeType이 SELL일 때만 아래 유효성 검사를 실행
  @IsBoolean()
  @IsNotEmpty()
  @IsOptional() // tradeType이 SHARE일 경우
  isNegotiable?: boolean;

  @ApiProperty({ description: '최종 저장될 이미지 파일들' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageCommitDto)
  images: ImageCommitDto[];
}
