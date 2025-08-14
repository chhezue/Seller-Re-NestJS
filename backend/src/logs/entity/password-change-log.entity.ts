import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseModel } from '../../common/entity/base.entity';
import { UsersModel } from '../../users/entity/users.entity';
import { PasswordChangeMethod } from '../const/password-change-method.const';

@Entity()
export class PasswordChangeLogModel extends BaseModel {
  @ManyToOne(() => UsersModel, (user) => user.passwordChangeLogs, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  user: UsersModel;

  @Column({
    type: 'enum',
    enum: PasswordChangeMethod,
  })
  changeMethod: PasswordChangeMethod;

  @Column()
  ip: string;
}
