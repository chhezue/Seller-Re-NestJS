import { InjectRepository } from '@nestjs/typeorm';
import { ProductModel } from './entity/product.entity';
import { Repository } from 'typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductDto } from './dto/get-product.dto';
import { UsersModel } from '../users/entity/users.entity';
import { RegionModel } from '../common/entity/region.entity';
import { UploadsService } from '../uploads/uploads.service';
import { ProductImageModel } from '../uploads/entity/product-image.entity';

@Injectable()
export class ProductService {
  constructor(
    private readonly uploadsService: UploadsService,
    @InjectRepository(ProductModel)
    private readonly productRepository: Repository<ProductModel>,
    @InjectRepository(RegionModel)
    private readonly regionRepository: Repository<RegionModel>,
    @InjectRepository(ProductImageModel)
    private readonly productImageRepository: Repository<ProductImageModel>,
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
    const { categoryId, images, ...rest } = createProductDto;
    const { id, region } = user;

    // 상품 정보 먼저 생성
    const newProduct = await this.productRepository.save({
      ...rest,
      category: { id: categoryId },
      author: { id },
      region: region ?? null, // region이 존재할 때만 포함
    });

    // 최종 이미지 저장 로직 처리
    if (images && images.length > 0) {
      // S3에 영구 저장
      const committedFiles = await this.uploadsService.commitFiles(images);

      // S3 저장 후 반환된 파일들을 바탕으로 ProductImage 생성
      // commitFiles에는 order & isRepresentative 정보가 없으므로, 원래 DTO와 매칭시켜야 함
      const productImages = committedFiles.map((file) => {
        const originalImageInfo = images.find((img) => img.fileId === file.id);

        // productImage Entity 생성: 상품과의 관계 설정
        return this.productImageRepository.create({
          product: newProduct, // 해당하는 상품(id로 저장)
          file: file, // 해당하는 File Entity(id로 저장)
          order: originalImageInfo.order,
          isRepresentative: originalImageInfo.isRepresentative,
        });
      });

      // 한번에 모든 ProductImage를 저장 (더 효율적)
      await this.productImageRepository.save(productImages);
    }

    // 최종 생성된 상품 반환(author, region, category, images 포함)
    return await this.getProduct(newProduct.id);
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
