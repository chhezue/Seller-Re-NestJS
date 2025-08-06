import { ProductService } from './product.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiOperation } from '@nestjs/swagger';
import { GetProductDto } from './dto/get-product.dto';
import {
  enumTransform,
  PRODUCT_CONDITION_LABELS,
  PRODUCT_STATUS_LABELS,
  TRADE_TYPE_LABELS,
} from './util/enum-transform.util';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from './const/product.const';
import { User } from '../users/decorator/user.decorator';
import { UsersModel } from '../users/entity/users.entity';
import { IsPublic } from '../common/decorator/is-public.decorator';
import { ProductOwnerGuard } from './guard/product-owner.guard';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ description: '상품 목록 조회' })
  @IsPublic()
  @Get()
  async getAllProducts(@Query() getProductDto: GetProductDto) {
    return await this.productService.getAllProducts(getProductDto);
  }

  @ApiOperation({ description: '상품 관련 옵션 반환' })
  @IsPublic()
  @Get('/enums')
  async getAllEnums() {
    return {
      status: enumTransform(PRODUCT_STATUS, PRODUCT_STATUS_LABELS),
      tradeType: enumTransform(TRADE_TYPE, TRADE_TYPE_LABELS),
      condition: enumTransform(PRODUCT_CONDITION, PRODUCT_CONDITION_LABELS),
    };
  }

  @ApiOperation({ description: '내 상품 목록 조회' })
  @Get('/my-sales')
  async getMySales(@User() user: UsersModel) {
    return await this.productService.getMySales(user);
  }

  @ApiOperation({ description: '상품 상세 조회' })
  @Get('/:productId')
  async getProduct(@Param('productId') productId: string) {
    return await this.productService.getProduct(productId);
  }

  @ApiOperation({ description: '상품 등록' })
  @Post()
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @User() user: UsersModel,
  ) {
    return await this.productService.createProduct(createProductDto, user);
  }

  @ApiOperation({ description: '상품 수정' })
  @UseGuards(ProductOwnerGuard)
  @Patch('/:productId')
  async updateProduct(
    @Param('productId') productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return await this.productService.updateProduct(productId, updateProductDto);
  }

  @ApiOperation({ description: '상품 삭제' })
  @UseGuards(ProductOwnerGuard)
  @Delete('/:productId')
  async deleteProduct(@Param('productId') productId: string) {
    return await this.productService.deleteProduct(productId);
  }
}
