import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProductModel } from '../../product/entity/product.entity';

@Entity()
export class CategoryModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // 카테고리명

  @OneToMany(() => ProductModel, (product) => product.category)
  products: ProductModel[]; // 해당 카테고리에 속한 제품들
}
