import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersModel } from '../users/entity/users.entity';
import { ProductService } from '../product/product.service';
import { TRADE_REQUEST_STATUS, TRADE_REQUEST_TYPE } from './const/trade.const';
import { CreateOfferDto } from './dto/create-offer.dto';
import { TradeModel } from './entity/trade.entity';
import { CreateBuyDto } from './dto/create-buy.dto';

@Injectable()
export class TradesService {
  constructor(
    @InjectRepository(TradeModel)
    private readonly tradeRepository: Repository<TradeModel>,
    private readonly productService: ProductService,
  ) {}

  async getTrade(id: string): Promise<TradeModel> {
    return await this.tradeRepository.findOne({
      where: { id },
      relations: ['product', 'owner', 'requester'],
    });
  }

  async createBuy(
    createBuyDto: CreateBuyDto,
    user: UsersModel,
  ): Promise<TradeModel> {
    const { productId, ...rest } = createBuyDto;
    const { id } = user;

    const product = await this.productService.getProduct(productId);
    const owner = product.author;

    const newTrade = await this.tradeRepository.save({
      ...rest,
      product: { id: productId },
      owner: owner,
      requester: { id },
      requestType: TRADE_REQUEST_TYPE.BUY,
      status: TRADE_REQUEST_STATUS.PENDING,
    });

    return await this.getTrade(newTrade.id);
  }

  async createOffer(
    createOfferDto: CreateOfferDto,
    user: UsersModel,
  ): Promise<TradeModel> {
    const { productId, ...rest } = createOfferDto;
    const { id } = user;

    const product = await this.productService.getProduct(productId);
    const owner = product.author;

    const newTrade = await this.tradeRepository.save({
      ...rest,
      product: { id: productId },
      owner: owner,
      requester: { id },
      requestType: TRADE_REQUEST_TYPE.OFFER,
      status: TRADE_REQUEST_STATUS.PENDING,
    });

    return await this.getTrade(newTrade.id);
  }
}
