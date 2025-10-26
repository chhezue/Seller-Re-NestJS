import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUrl,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { PRODUCT_CONDITION } from '../../product/const/product.const';

// 사용자가 설명 생성을 위해 전달하는 DTO
export class CreateDescriptionDto {
  @ApiProperty({ description: '제품명' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '카테고리 ID' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: '제품 상태', enum: PRODUCT_CONDITION })
  @IsEnum(PRODUCT_CONDITION)
  @IsNotEmpty()
  condition: PRODUCT_CONDITION;

  @ApiProperty({ description: '업로드된 이미지의 임시 URL 배열' })
  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  imageUrls: string[];
}
