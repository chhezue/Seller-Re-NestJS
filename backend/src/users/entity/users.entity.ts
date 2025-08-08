import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseModel } from '../../common/entity/base.entity';
import { Exclude } from 'class-transformer';
import { RegionModel } from '../../common/entity/region.entity';
import { UserRolesEnum } from '../const/roles.const';
import { UserStatusEnum } from '../const/status.const';
import { LoginAttemptLogAtFailedModel } from '../../common/entity/login-attempt-log.entity';
import { ProductModel } from '../../product/entity/product.entity';
import { FileModel } from '../../uploads/entity/file.entity';

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
  password: string;

  // @OneToOne(() => FileModel, {
  //   nullable: true,
  //   eager: true, // 사용자 조회 시 이미지 파일 정보도 항상 함께 가져옴.
  //   onDelete: 'SET NULL', // 연결된 파일이 삭제될 경우 이 필드를 null로 설정
  // })
  // @JoinColumn({ name: 'profile_image_id' })
  // profileImage: FileModel;
  @Column({ name: 'profile_image', type: 'text', nullable: true })
  profileImage: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @ManyToOne(() => RegionModel, {
    eager: true, // user 조회시 region도 같이 조회.
    nullable: true,
  })
  @JoinColumn({ name: 'region_id' })
  region: RegionModel;

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

  @Column({
    type: 'int',
    name: 'password_failed_count',
    default: 0,
  })
  passwordFailedCount: number;

  @OneToMany(() => LoginAttemptLogAtFailedModel, (log) => log.user)
  loginAttempts: LoginAttemptLogAtFailedModel[];

  @OneToMany(() => ProductModel, (product) => product.author)
  products: ProductModel[];
}
