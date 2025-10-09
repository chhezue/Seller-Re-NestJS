import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { User } from '../users/decorator/user.decorator';
import { UsersModel } from '../users/entity/users.entity';
import { CreateBuyDto } from './dto/create-buy.dto';
import { TradesService } from './trades.service';
import { CreateOfferDto } from './dto/create-offer.dto';

@Controller('trades')
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

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
