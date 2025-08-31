import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from '../../common/entity/base.entity';
import { ProductModel } from '../../product/entity/product.entity';
import { UsersModel } from '../../users/entity/users.entity';

@Entity()
export class LikeModel extends BaseModel {
  @ManyToOne(() => ProductModel, (product) => product.likes)
  @JoinColumn({ name: 'product_id' })
  product: ProductModel;

  @ManyToOne(() => UsersModel, (user) => user.likes)
  @JoinColumn({ name: 'user_id' })
  user: UsersModel;
}
