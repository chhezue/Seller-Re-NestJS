import { Column, Entity, OneToOne } from 'typeorm';
import { BaseModel } from '../../common/entity/base.entity';
import { IsString } from 'class-validator';
import { Exclude } from 'class-transformer';
import { RegionModel } from '../../common/entity/region.entity';
import { UserRolesEnum } from '../const/roles.const';
import { UserStatusEnum } from '../const/status.const';

@Entity()
export class UsersModel extends BaseModel {
  @Column({ type: 'varchar', length: 50, nullable: false })
  username: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @Exclude({ toPlainOnly: true })
  passwordHash: string;

  @Column({ name: 'profile_image', type: 'text', nullable: true })
  profileImage: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @OneToOne(() => RegionModel, (region) => region.id)
  region_id: RegionModel;

  @Column({
    type: 'enum',
    enum: Object.values(UserRolesEnum),
    default: UserRolesEnum.USER,
  })
  role: UserRolesEnum;

  @Column({
    type: 'enum',
    enum: Object.values(UserStatusEnum),
    default: UserStatusEnum.ACTIVE,
  })
  status: UserStatusEnum;
}
