import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseModel } from '../../common/entity/base.entity';
import { UsersModel } from '../../users/entity/users.entity';

@Entity()
export class RefreshTokenModel extends BaseModel {
  @ManyToOne(() => UsersModel, (user) => user.id, {
    onDelete: 'CASCADE',
  })
  user: UsersModel;

  @Column()
  jti: string;

  @Column({ default: false })
  isRevoked: boolean;

  @Column()
  expiresAt: Date;
}
