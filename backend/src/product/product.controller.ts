import { ProductService } from './product.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ description: '상품 목록 조회' })
  @Get()
  async getAllProducts() {
    return await this.productService.getAllProducts();
  }

  @ApiOperation({ description: '상품 상세 조회' })
  @Get('/:productId')
  async getProduct(@Param('productId') productId: string) {
    return await this.productService.getProduct(productId);
  }

  @ApiOperation({ description: '상품 등록' })
  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return await this.productService.createProduct(createProductDto);
  }

  @ApiOperation({ description: '상품 수정' })
  @Patch('/:productId')
  async updateProduct(
    @Param('productId') productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return await this.productService.updateProduct(productId, updateProductDto);
  }

  @ApiOperation({ description: '상품 삭제' })
  @Delete('/:productId')
  async deleteProduct(@Param('productId') productId: string) {
    return await this.productService.deleteProduct(productId);
  }
}
