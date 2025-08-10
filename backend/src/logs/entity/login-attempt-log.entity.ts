import { Column, CreateDateColumn, Entity, ManyToOne } from 'typeorm';
import { UsersModel } from '../../users/entity/users.entity';
import { BaseModel } from '../../common/entity/base.entity';

@Entity()
export class LoginAttemptLogAtFailedModel extends BaseModel {
  @ManyToOne(() => UsersModel, (user) => user.loginAttempts)
  user: UsersModel;

  @Column({ type: 'varchar', length: 50 })
  ip: string;

  // override BaseModel.createdAt
  @CreateDateColumn({
    name: 'attempted_at',
  })
  createdAt: Date;
}
