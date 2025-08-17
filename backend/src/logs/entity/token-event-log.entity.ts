import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseModel } from '../../common/entity/base.entity';
import { UsersModel } from '../../users/entity/users.entity';

export enum TokenEventType {
  ROTATION_FAILED_NO_TOKEN = 'rotation_failed_no_token',
  ROTATION_FAILED_REVOKED_TOKEN = 'rotation_failed_revoked_token',
}

@Entity()
export class TokenEventLogModel extends BaseModel {
  @ManyToOne(() => UsersModel, (user) => user.id, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  user: UsersModel;

  @Column()
  ip: string;

  @Column({
    type: 'enum',
    enum: TokenEventType,
  })
  eventType: TokenEventType;

  @Column()
  description: string;
}
