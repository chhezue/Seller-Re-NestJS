import { BaseModel } from '../../common/entity/base.entity';
import { Column, Entity } from 'typeorm';
import { IsBoolean, IsEnum, IsNumber, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../const/products.const';

@Entity()
export class ProductsModel extends BaseModel {
  @ApiProperty({ description: '제품명' })
  @Column()
  @IsString()
  name: string;

  @ApiProperty({ description: '제품 상세 설명' })
  @Column()
  @IsString()
  description: string;

  @ApiProperty({ description: '카테고리 ID' })
  @Column()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: '가격' })
  @Column()
  @IsNumber()
  price: number;

  @ApiProperty({ description: '판매자 ID' })
  @Column()
  @IsUUID()
  sellerId: string;

  @ApiProperty({ description: '거래 지역 ID' })
  @Column()
  @IsUUID()
  regionId: string;

  @ApiProperty({ description: '판매 상태', enum: PRODUCT_STATUS })
  @Column({ default: PRODUCT_STATUS.ON_SALE })
  @IsEnum(PRODUCT_STATUS)
  status: ProductStatus;

  @ApiProperty({ description: '거래 형식', enum: TRADE_TYPE })
  @Column({ default: TRADE_TYPE.SELL })
  @IsEnum(TRADE_TYPE)
  tradeType: TradeType;

  @ApiProperty({ description: '제품 상태', enum: PRODUCT_CONDITION })
  @Column({ default: PRODUCT_CONDITION.USED })
  @IsEnum(PRODUCT_CONDITION)
  condition: ProductCondition;

  @ApiProperty({ description: '가격 제안 가능 여부' })
  @Column()
  @IsBoolean()
  isNegotiable: boolean;

  @ApiProperty({ description: '조회수' })
  @Column({ default: 0 })
  @IsNumber()
  viewCount: number;

  @ApiProperty({ description: '즐겨찾기 수' })
  @Column({ default: 0 })
  @IsNumber()
  favoriteCount: number;
}
