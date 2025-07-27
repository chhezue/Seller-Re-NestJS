import { Column, Entity } from 'typeorm';
import { BaseModel } from './base.entity';

@Entity()
export class CategoryModel extends BaseModel {
  @Column()
  name: string;
}
