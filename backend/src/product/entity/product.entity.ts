import { BaseModel } from '../../common/entity/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../const/product.const';
import { CategoryModel } from '../../common/entity/category.entity';
import { UsersModel } from '../../users/entity/users.entity';
import { RegionModel } from '../../common/entity/region.entity';
import { ProductImageModel } from '../../uploads/entity/product-image.entity';

@Entity()
export class ProductModel extends BaseModel {
  @Column()
  name: string; // 제품명

  @Column()
  description: string; // 제품 상세 설명

  @ManyToOne(() => CategoryModel, (category) => category.products, {
    eager: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: CategoryModel; // 타입은 string이 아닌 Category 엔티티 자체여야 합니다.

  @Column({ default: 0 })
  price: number; // 가격

  @ManyToOne(() => UsersModel, (user) => user.products, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: UsersModel; // 작성자

  @ManyToOne(() => RegionModel, { nullable: true, eager: true })
  @JoinColumn({ name: 'region_id' })
  region: RegionModel; // 작성자의 지역 정보 자동 할당

  @Column({ default: PRODUCT_STATUS.ON_SALE })
  status: PRODUCT_STATUS; // 판매 상태

  @Column({ default: TRADE_TYPE.SELL })
  tradeType: TRADE_TYPE; // 거래 형식

  @Column({ default: PRODUCT_CONDITION.USED })
  condition: PRODUCT_CONDITION; // 제품 상태

  @Column({ default: false })
  isNegotiable: boolean; // 가격 제안 가능 여부

  @Column({ default: 0 })
  viewCount: number; // 조회수

  @Column({ default: 0 })
  favoriteCount: number; // 즐겨찾기 수

  @OneToMany(() => ProductImageModel, (image) => image.product, {
    nullable: false,
    eager: true,
  })
  images: ProductImageModel[];
}
