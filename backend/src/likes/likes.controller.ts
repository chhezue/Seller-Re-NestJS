import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { LikesService } from './likes.service';
import { ApiOperation } from '@nestjs/swagger';
import { User } from '../users/decorator/user.decorator';
import { PageDto } from '../common/dto/page.dto';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @ApiOperation({ description: '나의 찜 목록 조회' })
  @Get('/my')
  getMyLikes(@User('id') userId: string, @Body() pageDto: PageDto) {
    return this.likesService.getMyLikes(userId, pageDto);
  }

  @ApiOperation({ description: '상품 찜하기' })
  @Post('/:productId')
  createLike(
    @Param('productId') productId: string,
    @User('id') userId: string,
  ) {
    return this.likesService.createLike(productId, userId);
  }

  @ApiOperation({ description: '상품 찜 취소' })
  @Delete('/:productId')
  deleteLike(
    @Param('productId') productId: string,
    @User('id') userId: string,
  ) {
    return this.likesService.deleteLike(productId, userId);
  }
}
