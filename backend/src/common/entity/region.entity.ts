import { BaseModel } from './base.entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class RegionModel extends BaseModel {
  @Column()
  name: string;

  @Column()
  parentId: string;
}
