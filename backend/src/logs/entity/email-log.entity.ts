import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseModel } from '../../common/entity/base.entity';
import { UsersModel } from '../../users/entity/users.entity';
import { EmailSendStatus } from '../const/email-send-status.const';

@Entity()
export class EmailLogModel extends BaseModel {
  @ManyToOne(() => UsersModel, (user) => user.emailLogs, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  user?: UsersModel;

  @Column()
  recipient: string;

  @Column()
  subject: string;

  @Column({ type: 'enum', enum: EmailSendStatus })
  status: EmailSendStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;
}
