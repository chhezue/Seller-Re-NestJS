import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { User } from '../users/decorator/user.decorator';
import { UsersModel } from '../users/entity/users.entity';
import { CreateBuyDto } from './dto/create-buy.dto';
import { TradesService } from './trades.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { ProductOwnerGuard } from '../product/guard/product-owner.guard';

@Controller('trades')
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @ApiOperation({ description: '내가 받은 상품의 거래 요청 목록 조회' })
  @UseGuards(ProductOwnerGuard)
  @Get('/:productId')
  async getReceivedTrades(
    @Param('productId') productId: string,
    @User() user: UsersModel,
  ) {
    return await this.tradesService.getReceivedTrades(productId, user);
  }

  @ApiOperation({ description: '특정 거래 요청 상세 조회' })
  @Get('/:tradeId')
  async getTradeById(
    @Param('tradeId') tradeId: string,
    @User() user: UsersModel,
  ) {
    return await this.tradesService.getTradeById(tradeId, user);
  }

  @ApiOperation({ description: '신규 거래 요청' })
  @Post()
  async createBuy(
    @Body() createBuyDto: CreateBuyDto,
    @User() user: UsersModel,
  ) {
    return await this.tradesService.createBuy(createBuyDto, user);
  }

  @ApiOperation({ description: '신규 가격 제안' })
  @Post()
  async createOffer(
    @Body() createOfferDto: CreateOfferDto,
    @User() user: UsersModel,
  ) {
    return await this.tradesService.createOffer(createOfferDto, user);
  }
}
