import { InjectRepository } from '@nestjs/typeorm';
import { ProductModel } from './entity/product.entity';
import { Repository } from 'typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductDto } from './dto/get-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductModel)
    private readonly productRepository: Repository<ProductModel>,
  ) {}

  async getAllProducts(
    getProductDto: GetProductDto,
  ): Promise<{ products: ProductModel[]; nextCursor: string | null }> {
    const {
      categoryId,
      status,
      tradeType,
      condition,
      isNegotiable,
      minPrice,
      maxPrice,
      keyword,
      cursor,
      limit,
    } = getProductDto;
    const queryBuilder = this.productRepository.createQueryBuilder('product');

    if (categoryId) {
      queryBuilder.andWhere('product.category = :categoryId', { categoryId });
    }
    if (status) {
      queryBuilder.andWhere('product.status = :status', { status });
    }
    if (tradeType) {
      queryBuilder.andWhere('product.tradeType = :tradeType', { tradeType });
    }
    if (condition) {
      queryBuilder.andWhere('product.condition = :condition', { condition });
    }
    if (isNegotiable) {
      queryBuilder.andWhere('product.isNegotiable = :isNegotiable', {
        isNegotiable,
      });
    }
    if (keyword) {
      queryBuilder.andWhere(
        '(product.name LIKE :keyword OR product.description LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }
    if (minPrice) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }
    if (cursor) {
      // cursor는 Date 객체여야 할 수 있으므로 타입 변환이 필요할 수 있습니다.
      queryBuilder.andWhere('product.createdAt < :cursor', {
        cursor: new Date(cursor),
      });
    }

    queryBuilder.orderBy('product.createdAt', 'DESC');
    queryBuilder.take(limit);

    const products = await queryBuilder.getMany();

    const lastItem = products.length > 0 ? products[products.length - 1] : null;
    const nextCursor = lastItem ? lastItem.createdAt.toISOString() : null;

    return {
      products, // 조회된 상품 목록
      nextCursor, // 다음 페이지를 위한 커서
    };
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
