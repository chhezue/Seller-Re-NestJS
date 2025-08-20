import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageDto } from '../../common/dto/page.dto';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../const/product.const';
import { Type } from 'class-transformer';

export class GetProductDto extends PageDto {
  @ApiProperty({ description: '카테고리 ID' })
  @IsOptional()
  @IsUUID()
  readonly categoryId?: string;

  @ApiProperty({ description: '지역 ID' })
  @IsOptional()
  @IsUUID()
  readonly regionId?: string;

  @ApiProperty({ description: '제품 상태' })
  @IsOptional()
  @IsEnum(PRODUCT_STATUS)
  readonly status?: PRODUCT_STATUS;

  @ApiProperty({ description: '거래 형식' })
  @IsOptional()
  @IsEnum(TRADE_TYPE)
  readonly tradeType?: TRADE_TYPE;

  @ApiProperty({ description: '제품 상태' })
  @IsOptional()
  @IsEnum(PRODUCT_CONDITION)
  readonly condition?: PRODUCT_CONDITION;

  @ApiProperty({ description: '가격 협상 가능 여부' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly isNegotiable?: boolean;

  @ApiProperty({ description: '최소 가격' })
  @IsOptional()
  @Type(() => Number) // 쿼리 파라미터(string)를 숫자로 변환
  @IsNumber()
  @Min(0)
  readonly minPrice?: number;

  @ApiProperty({ description: '최대 가격' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  readonly maxPrice?: number;

  @ApiProperty({ description: '검색 키워드' })
  @IsOptional()
  @IsString()
  readonly keyword?: string;
}
