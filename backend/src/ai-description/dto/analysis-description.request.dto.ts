import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PRODUCT_CONDITION } from '../../product/const/product.const';

export class AnalysisDescriptionRequestDto {
  @ApiProperty({ description: '제품명' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '제품 상태', enum: PRODUCT_CONDITION })
  @IsEnum(PRODUCT_CONDITION)
  @IsNotEmpty()
  condition: PRODUCT_CONDITION;

  @ApiProperty({ description: '분석할 상품 설명' })
  @IsString()
  @IsNotEmpty()
  description: string;

  // @ApiProperty({ description: '카테고리 ID' })
  // @IsUUID()
  // @IsNotEmpty()
  // categoryId: string;
  //
  // @ApiProperty({ description: '업로드된 이미지의 임시 URL 배열' })
  // @IsArray()
  // @ArrayMinSize(1)
  // @IsNotEmpty()
  // imageUrls: string[];
}
