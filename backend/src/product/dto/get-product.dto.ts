import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PageDto } from '../../common/dto/page.dto';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../const/product.const';
import { Type } from 'class-transformer';

// TODO 지역 검색 추가
export class GetProductDto extends PageDto {
  @IsOptional()
  @IsUUID()
  readonly categoryId?: string;

  @IsOptional()
  @IsEnum(PRODUCT_STATUS)
  readonly status?: PRODUCT_STATUS;

  @IsOptional()
  @IsEnum(TRADE_TYPE)
  readonly tradeType?: TRADE_TYPE;

  @IsOptional()
  @IsEnum(PRODUCT_CONDITION)
  readonly condition?: PRODUCT_CONDITION;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  readonly isNegotiable: boolean;

  @IsOptional()
  @Type(() => Number) // 쿼리 파라미터(string)를 숫자로 변환
  @IsNumber()
  @Min(0)
  readonly minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  readonly maxPrice?: number;

  @IsOptional()
  @IsString()
  readonly keyword?: string;
}
