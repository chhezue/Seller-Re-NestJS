import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { BaseModel } from '../../common/entity/base.entity';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Exclude } from 'class-transformer';
import { RegionModel } from '../../common/entity/region.entity';
import { UserRolesEnum } from '../const/roles.const';
import { UserStatusEnum } from '../const/status.const';
import { LoginAttemptLogAtFailedModel } from '../../common/entity/login-attempt-log.entity';
import { ProductModel } from '../../product/entity/product.entity';

@Entity()
export class UsersModel extends BaseModel {
  @IsString()
  @IsNotEmpty()
  @Column({ type: 'varchar', length: 50, nullable: false })
  username: string;

  @IsEmail()
  @IsNotEmpty()
  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @IsString()
  @IsNotEmpty()
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @Exclude({ toPlainOnly: true })
  password: string;

  @IsString()
  @IsOptional()
  @Column({ name: 'profile_image', type: 'text', nullable: true })
  profileImage: string;

  @IsString()
  @IsOptional()
  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @IsString()
  @IsOptional()
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
