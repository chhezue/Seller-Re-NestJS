import { BaseModel } from './base.entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class RegionModel extends BaseModel {
  @Column()
  name: string; // 지역명

  @Column()
  parentId: string; // 상위 지역 ID
}
