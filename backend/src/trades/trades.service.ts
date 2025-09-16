import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeModel } from './entity/trade.entity';

@Injectable()
export class TradesService {
  constructor(
    @InjectRepository(TradeModel)
    private readonly tradeRepository: Repository<TradeModel>,
  ) {}
}
