import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class RegionModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // 지역명

  @Column({ nullable: true })
  parentId: string | null; // 상위 지역 ID
}
