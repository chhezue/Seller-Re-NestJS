import { BaseModel } from '../../common/entity/base.entity';
import { Column, Entity } from 'typeorm';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../const/product.const';

@Entity()
export class ProductModel extends BaseModel {
  @Column()
  name: string; // 제품명

  @Column()
  description: string; // 제품 상세 설명

  @Column()
  categoryId: string; // 카테고리 ID

  @Column()
  price: number; // 가격

  @Column()
  sellerId: string; // 판매자 ID

  @Column()
  regionId: string; // 거래 지역 ID

  @Column({ default: PRODUCT_STATUS.ON_SALE })
  status: PRODUCT_STATUS; // 판매 상태

  @Column({ default: TRADE_TYPE.SELL })
  tradeType: TRADE_TYPE; // 거래 형식

  @Column({ default: PRODUCT_CONDITION.USED })
  condition: PRODUCT_CONDITION; // 제품 상태

  @Column()
  isNegotiable: boolean; // 가격 제안 가능 여부

  @Column({ default: 0 })
  viewCount: number; // 조회수

  @Column({ default: 0 })
  favoriteCount: number; // 즐겨찾기 수
}
