import { BaseModel } from '../../common/entity/base.entity';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import {
  TRADE_REQUEST_STATUS,
  TRADE_REQUEST_TYPE,
  TRADE_METHOD,
} from '../const/trade.const';
import { ProductModel } from '../../product/entity/product.entity';
import { UsersModel } from '../../users/entity/users.entity';

@Entity('trade')
export class TradeModel extends BaseModel {
  // Relations
  @ManyToOne(() => ProductModel)
  @JoinColumn({ name: 'product_id' })
  product: ProductModel;

  @ManyToOne(() => UsersModel)
  @JoinColumn({ name: 'requester_id' })
  requester: UsersModel;

  @ManyToOne(() => UsersModel)
  @JoinColumn({ name: 'owner_id' })
  owner: UsersModel;

  @Column({ type: 'enum', enum: TRADE_REQUEST_TYPE })
  requestType: TRADE_REQUEST_TYPE; // 거래 요청 타입 (구매/가격제안)

  @Column({
    type: 'enum',
    enum: TRADE_REQUEST_STATUS,
    default: TRADE_REQUEST_STATUS.PENDING,
  })
  status: TRADE_REQUEST_STATUS; // 거래 상태 (대기/수락/거절/취소/완료)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  offerPrice?: number; // 제안 가격 (OFFER 타입일 때만 사용)

  @Column({ type: 'enum', enum: TRADE_METHOD })
  tradeMethod: TRADE_METHOD; // 거래 방법 (직거래/택배)

  @Column({ type: 'text', nullable: true })
  message?: string; // 거래 요청 메시지

  @Column({ type: 'boolean', nullable: true })
  isTodayDepositAvailable?: boolean; // 오늘 입금 가능 여부 (BUY 타입일 때만 사용)
}
