import { BaseModel } from './base.entity';
import { Column } from 'typeorm';

export class RegionModel extends BaseModel {
  @Column()
  name: string;

  @Column()
  parentId: string;
}
