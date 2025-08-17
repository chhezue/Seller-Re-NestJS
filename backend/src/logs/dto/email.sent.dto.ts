import { UsersModel } from '../../users/entity/users.entity';
import { EmailSendStatus } from '../const/email-send-status.const';

export class EmailSentDto {
  user?: Pick<UsersModel, 'id'>;
  recipient: string;
  subject: string;
  status: EmailSendStatus;
  errorMessage?: string;
}
