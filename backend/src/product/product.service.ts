import { InjectRepository } from '@nestjs/typeorm';
import { ProductModel } from './entity/product.entity';
import { Repository } from 'typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductModel)
    private readonly productRepository: Repository<ProductModel>,
  ) {}

  async getAllProducts(): Promise<ProductModel[]> {
    return await this.productRepository.find();
  }

  async getProduct(productId: string): Promise<ProductModel> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('해당 상품을 찾을 수 없습니다.');
    }

    return product;
  }

  async createProduct(
    createProductDto: CreateProductDto,
  ): Promise<ProductModel> {
    const { categoryId, ...rest } = createProductDto;
    const newProduct = this.productRepository.create({
      ...rest,
      category: {
        id: categoryId,
      },
    });
    return await this.productRepository.save(newProduct);
  }

  async updateProduct(
    productId: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductModel> {
    await this.getProduct(productId); // 상품 존재 여부 확인
    await this.productRepository.update(productId, updateProductDto); // update()는 업데이트만 하고 엔티티를 반환하지는 않음.
    return this.getProduct(productId); // 변경된 최신 상태를 다시 가져와서 반환
  }

  async deleteProduct(productId: string): Promise<string> {
    await this.getProduct(productId); // 상품 존재 여부 확인

    const result = await this.productRepository.delete(productId);
    if (result.affected === 0) {
      throw new NotFoundException('삭제할 상품을 찾을 수 없습니다.');
    }

    return productId;
  }
}
