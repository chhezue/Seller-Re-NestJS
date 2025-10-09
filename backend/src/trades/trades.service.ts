import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersModel } from '../users/entity/users.entity';
import { ProductService } from '../product/product.service';
import { TRADE_REQUEST_STATUS, TRADE_REQUEST_TYPE } from './const/trade.const';
import { CreateOfferDto } from './dto/create-offer.dto';
import { TradeModel } from './entity/trade.entity';
import { CreateBuyDto } from './dto/create-buy.dto';
import { UpdateTradeStatusDto } from './dto/update-trade-status.dto';

@Injectable()
export class TradesService {
  constructor(
    @InjectRepository(TradeModel)
    private readonly tradeRepository: Repository<TradeModel>,
    private readonly productService: ProductService,
  ) {}

  async getReceivedTrades(
    productId: string,
    user: UsersModel,
  ): Promise<TradeModel[]> {
    return await this.tradeRepository.find({
      where: {
        owner: { id: user.id },
        product: { id: productId },
      },
      relations: ['product', 'owner', 'requester'],
    });
  }

  async getTradeById(id: string, user: UsersModel): Promise<TradeModel> {
    const userId = user.id;
    const trade = await this.tradeRepository.findOne({
      where: { id },
      relations: {
        product: true,
        owner: true,
        requester: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('해당 거래를 찾을 수 없습니다.');
    }

    const isOwner = trade.owner.id === userId;
    const isRequester = trade.requester.id === userId;

    if (!isOwner && !isRequester) {
      throw new ForbiddenException('이 거래를 조회할 권한이 없습니다.');
    }

    return trade;
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

    return await this.getTradeById(newTrade.id, user);
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

    return await this.getTradeById(newTrade.id, user);
  }

  async updateTradeStatus(tradeId: string, updateDto: UpdateTradeStatusDto) {
    const trade = await this.tradeRepository.findOne({
      where: { id: tradeId },
    });

    if (!trade) {
      throw new NotFoundException('해당 거래를 찾을 수 없습니다.');
    }

    // PENDING 상태일 때만 변경 가능하도록 제한
    if (trade.status !== TRADE_REQUEST_STATUS.PENDING) {
      throw new BadRequestException(
        '대기 상태의 거래만 수락 또는 거절할 수 있습니다.',
      );
    }

    // 4. 상태 업데이트 및 저장
    trade.status = updateDto.status;
    return await this.tradeRepository.save(trade);
  }
}
