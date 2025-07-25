import { BaseModel } from '../../common/entity/base.entity';
import { Column, Entity } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../const/product.const';

@Entity()
export class ProductModel extends BaseModel {
  @ApiProperty({ description: '제품명' })
  @Column()
  name: string;

  @ApiProperty({ description: '제품 상세 설명' })
  @Column()
  description: string;

  @ApiProperty({ description: '카테고리 ID' })
  @Column()
  categoryId: string;

  @ApiProperty({ description: '가격' })
  @Column()
  price: number;

  @ApiProperty({ description: '판매자 ID' })
  @Column()
  sellerId: string;

  @ApiProperty({ description: '거래 지역 ID' })
  @Column()
  regionId: string;

  @ApiProperty({ description: '판매 상태', enum: PRODUCT_STATUS })
  @Column({ default: PRODUCT_STATUS.ON_SALE })
  status: PRODUCT_STATUS;

  @ApiProperty({ description: '거래 형식', enum: TRADE_TYPE })
  @Column({ default: TRADE_TYPE.SELL })
  tradeType: TRADE_TYPE;

  @ApiProperty({ description: '제품 상태', enum: PRODUCT_CONDITION })
  @Column({ default: PRODUCT_CONDITION.USED })
  condition: PRODUCT_CONDITION;

  @ApiProperty({ description: '가격 제안 가능 여부' })
  @Column()
  isNegotiable: boolean;

  @ApiProperty({ description: '조회수' })
  @Column({ default: 0 })
  viewCount: number;

  @ApiProperty({ description: '즐겨찾기 수' })
  @Column({ default: 0 })
  favoriteCount: number;
}
