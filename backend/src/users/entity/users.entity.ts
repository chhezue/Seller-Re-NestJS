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
import { ProductModel } from '../../product/entity/product.entity';
import { LoginAttemptLogAtFailedModel } from '../../logs/entity/login-attempt-log.entity';
import { EmailLogModel } from '../../logs/entity/email-log.entity';

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

  @OneToMany(() => EmailLogModel, (log) => log.user)
  emailLogs: EmailLogModel[];
}
