import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProductModel } from '../../product/entity/product.entity';

@Entity()
export class RegionModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // 지역명

  @Column({ nullable: true })
  parentId: string | null; // 상위 지역 ID

  @OneToMany(() => ProductModel, (product) => product.region)
  products: ProductModel[];
}
