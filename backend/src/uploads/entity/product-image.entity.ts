import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseModel } from '../../common/entity/base.entity';
import { ProductModel } from '../../product/entity/product.entity';
import { FileModel } from './file.entity';

// 이미지 순서, 대표 이미지 여부 등을 알기 위해서는 중간 테이블이 필요함.
@Entity()
export class ProductImageModel extends BaseModel {
  @ManyToOne(() => ProductModel, (product) => product.images)
  @JoinColumn({ name: 'product_id' })
  product: ProductModel; // 속한 상품

  @OneToOne(() => FileModel, { eager: true })
  @JoinColumn({ name: 'file_id' })
  file: FileModel;

  @Column({ default: false })
  isRepresentative: boolean; // 대표 이미지(썸네일) 여부

  @Column({ default: 0 })
  order: number; // 이미지의 노출 순서
}
