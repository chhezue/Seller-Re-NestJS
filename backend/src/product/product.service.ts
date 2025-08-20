import { InjectRepository } from '@nestjs/typeorm';
import { ProductModel } from './entity/product.entity';
import { Repository } from 'typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductDto } from './dto/get-product.dto';
import { UsersModel } from '../users/entity/users.entity';
import { RegionModel } from '../common/entity/region.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductModel)
    private readonly productRepository: Repository<ProductModel>,
    @InjectRepository(RegionModel)
    private readonly regionRepository: Repository<RegionModel>,
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
      regionId,
    } = getProductDto;

    // queryBuilder 방식은 relation: [...] 옵션 사용 불가: 명시적으로 관계 조인
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.author', 'author')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.region', 'region');

    if (regionId) {
      const selectedRegion = await this.regionRepository.findOne({
        where: { id: regionId },
      });

      if (selectedRegion) {
        const regionFilter = [selectedRegion.id];

        // 검색할 지역이 상위 지역이라면 하위 지역 id도 모두 포함하여 필터링
        if (selectedRegion.parentId === null) {
          const childRegions = await this.regionRepository.find({
            where: { parentId: selectedRegion.id },
          });
          const childRegionIds = childRegions.map((child) => child.id);
          regionFilter.push(...childRegionIds);
        }

        queryBuilder.andWhere('product.region IN (:...regionFilter)', {
          regionFilter,
        });
      }
    }
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

  async getProduct(productId: string, userId?: string): Promise<any> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['author', 'category', 'region'],
    });

    if (!product) {
      throw new NotFoundException('해당 상품을 찾을 수 없습니다.');
    }

    if (product.author.id === userId) {
      return {
        ...product,
        isOwner: true,
      };
    }

    return {
      ...product,
      isOwner: false,
    };
  }

  async getMySales(user: UsersModel): Promise<ProductModel[]> {
    return await this.productRepository.find({
      where: {
        author: {
          id: user.id,
        },
      },
      relations: ['author', 'category', 'region'],
    });
  }

  async createProduct(
    createProductDto: CreateProductDto,
    user: UsersModel,
  ): Promise<ProductModel> {
    const { categoryId, ...rest } = createProductDto;
    const { id, region } = user;

    const newProduct = this.productRepository.create({
      ...rest,
      category: { id: categoryId },
      author: { id },
      region: region ?? null, // region이 존재할 때만 포함
    });

    const savedProduct = await this.productRepository.save(newProduct);
    return await this.getProduct(savedProduct.id); // author 정보 포함 반환
  }

  async updateProduct(
    productId: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductModel> {
    await this.getProduct(productId); // 상품 존재 여부 확인

    // categoryId가 있으면 category 객체로 변환
    const { categoryId, ...rest } = updateProductDto;
    const updateData = categoryId
      ? {
          ...rest,
          category: {
            id: categoryId,
          },
        }
      : rest;

    await this.productRepository.update(productId, updateData); // update()는 업데이트만 하고 엔티티를 반환하지는 않음.
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

  async isProductOwner(userId: string, productId: string): Promise<boolean> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['author'],
    });

    return product && product.author.id === userId;
  }
}
