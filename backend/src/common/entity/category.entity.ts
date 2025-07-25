import { Column } from 'typeorm';
import { BaseModel } from './base.entity';

export class CategoryModel extends BaseModel {
  @Column()
  name: string;
}
