import { InjectRepository } from '@nestjs/typeorm';
import { ProductModel } from './entity/product.entity';
import { Repository } from 'typeorm';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductDto } from './dto/get-product.dto';
import { UsersModel } from '../users/entity/users.entity';
import { RegionModel } from '../common/entity/region.entity';
import { UploadsService } from '../uploads/uploads.service';
import { ProductImageModel } from '../uploads/entity/product-image.entity';
import { PageDto } from '../common/dto/page.dto';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

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
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // 상품 목록에 캐시의 실시간 조회수를 더해주는 헬퍼 메소드
  private async getProductsWithCacheViews(products: ProductModel[]) {
    // 처리할 상품이 없으면 바로 반환
    if (products.length === 0) return products;

    // 처리할 상품에 대한 캐시 키 목록 설정
    const cacheKeys = products.map((p) => `product:views:${p.id}`);

    const cachedViewsPromises = cacheKeys.map((key) =>
      this.cacheManager.get<number>(key),
    );
    const cachedViews = await Promise.all(cachedViewsPromises);

    const productsWithViews = products.map((product, index) => {
      const recentViews = cachedViews[index] || 0;
      return {
        ...product,
        views: product.views + recentViews,
      };
    });

    return productsWithViews;
  }

  async getAllProducts(
    getProductDto: GetProductDto,
  ): Promise<{ products: any[]; nextCursor: string | null }> {
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
      .leftJoinAndSelect('product.region', 'region')
      .where('product.isDeleted = :isDeleted', { isDeleted: false });

    // 대표 이미지 URL을 위한 서브쿼리 추가
    queryBuilder.addSelect((subQuery) => {
      return subQuery
        .select('file.url')
        .from(ProductImageModel, 'image')
        .leftJoin('image.file', 'file')
        .where('image.product = product.id')
        .andWhere('image.isRepresentative = :isRepresentative', {
          isRepresentative: true,
        })
        .limit(1);
    }, 'imageUrl');

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

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    // entities와 raw 결과를 조합하여 최종 products 배열을 만듦.
    const products = entities.map((product) => {
      // raw 결과에서 현재 product와 ID가 일치하는 데이터를 찾습니다.
      const rawData = raw.find((r) => r.product_id === product.id);
      return {
        ...product,
        imageUrl: rawData?.imageUrl || null, // 찾은 raw 데이터에서 imageUrl을 추가합니다.
      };
    });

    // 캐시된 조회수를 포함한 상품 목록 반환
    const productsWithViews = await this.getProductsWithCacheViews(products);

    const lastItem =
      productsWithViews.length > 0
        ? productsWithViews[productsWithViews.length - 1]
        : null;
    const nextCursor = lastItem ? lastItem.createdAt.toISOString() : null;

    return {
      products: productsWithViews, // 조회된 상품 목록
      nextCursor, // 다음 페이지를 위한 커서
    };
  }

  async getProduct(productId: string, userId?: string): Promise<any> {
    const product = await this.productRepository.findOne({
      where: { id: productId, isDeleted: false },
      relations: ['author', 'category', 'region', 'images', 'images.file'],
    });

    if (!product) {
      throw new NotFoundException('해당 상품을 찾을 수 없습니다.');
    }

    // 캐시된 조회수를 포함한 상품 정보 반환
    const productsWithViews = await this.getProductsWithCacheViews([product]);
    const productWithViews = productsWithViews[0];

    if (product.author.id === userId) {
      return {
        ...productWithViews,
        isOwner: true,
      };
    }

    return {
      ...productWithViews,
      isOwner: false,
    };
  }

  async getProductsByUserId(
    userId: string,
    pageDto: PageDto,
  ): Promise<{ products: ProductModel[]; nextCursor: string | null }> {
    const { cursor, limit } = pageDto;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.author', 'author')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.region', 'region');

    // 특정 유저의 상품만 조회 (삭제되지 않은 상품만)
    queryBuilder.where(
      'product.author.id = :userId AND product.isDeleted = :isDeleted',
      {
        userId,
        isDeleted: false,
      },
    );

    // 대표 이미지 URL을 위한 서브쿼리 추가
    queryBuilder.addSelect((subQuery) => {
      return subQuery
        .select('file.url')
        .from(ProductImageModel, 'image')
        .leftJoin('image.file', 'file')
        .where('image.product = product.id')
        .andWhere('image.isRepresentative = :isRepresentative', {
          isRepresentative: true,
        })
        .limit(1);
    }, 'imageUrl');

    if (cursor) {
      // cursor는 Date 객체여야 할 수 있으므로 타입 변환이 필요할 수 있습니다.
      queryBuilder.andWhere('product.createdAt < :cursor', {
        cursor: new Date(cursor),
      });
    }

    // 정렬 및 개수 제한
    queryBuilder.orderBy('product.createdAt', 'DESC');
    queryBuilder.take(limit);

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    // entities와 raw 결과를 조합하여 최종 products 배열을 만듦.
    const products = entities.map((product) => {
      // raw 결과에서 현재 product와 ID가 일치하는 데이터를 찾습니다.
      const rawData = raw.find((r) => r.product_id === product.id);
      return {
        ...product,
        imageUrl: rawData?.imageUrl || null, // 찾은 raw 데이터에서 imageUrl을 추가합니다.
      };
    });

    // 캐시된 조회수를 포함한 상품 목록 반환
    const productsWithViews = await this.getProductsWithCacheViews(products);

    // 다음 페이지를 위한 nextCursor 계산
    const lastItem =
      productsWithViews.length > 0
        ? productsWithViews[productsWithViews.length - 1]
        : null;
    // 가져온 아이템의 수가 limit과 같을 때만 다음 페이지가 있을 가능성이 있음
    const nextCursor =
      lastItem && productsWithViews.length === limit
        ? lastItem.createdAt.toISOString()
        : null;

    return {
      products: productsWithViews,
      nextCursor,
    };
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
      isDeleted: false,
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
          product: newProduct, // 해당하는 상품 (id로 저장)
          file: file, // 해당하는 File Entity (id로 저장)
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
    // 1. 상품 정보 확인 (삭제되지 않은 상품만, 없으면 에러 발생)
    await this.productRepository.findOneOrFail({
      where: { id: productId, isDeleted: false },
    });

    // categoryId가 있으면 category 객체로 변환
    const { categoryId, images, ...rest } = updateProductDto;
    const updateData = categoryId
      ? {
          ...rest,
          category: { id: categoryId },
        }
      : rest;

    // 상품 텍스트 정보 먼저 업데이트
    await this.productRepository.update(productId, updateData);

    // 이미지 업데이트가 있는 경우
    if (images) {
      const newTempImages = images.filter((img) => img.isNew === true);

      if (newTempImages.length > 0) {
        await this.uploadsService.commitFiles(newTempImages);
      }

      // 해당 상품에 연결된 기존 이미지 관계 모두 삭제
      await this.productImageRepository.delete({
        product: { id: productId },
      });

      // 최종 이미지 목록으로 새 이미지 관계 생성
      const newImages = images.map((imageInfo) =>
        this.productImageRepository.create({
          product: { id: productId }, // 해당하는 상품 (id로 저장)
          file: { id: imageInfo.fileId }, // 해당하는 File Entity (id로 저장)
          order: imageInfo.order,
          isRepresentative: imageInfo.isRepresentative,
        }),
      );
      await this.productImageRepository.save(newImages);
    }

    return this.getProduct(productId); // 변경된 최신 상태를 다시 가져와서 반환
  }

  async deleteProduct(productId: string): Promise<string> {
    // 삭제되지 않은 상품인지 확인
    const product = await this.productRepository.findOne({
      where: { id: productId, isDeleted: false },
    });

    if (!product) {
      throw new NotFoundException('삭제할 상품을 찾을 수 없습니다.');
    }

    // Soft Delete: isDeleted를 true로 변경
    await this.productRepository.update(productId, { isDeleted: true });
    return productId;
  }

  async isProductOwner(userId: string, productId: string): Promise<boolean> {
    const product = await this.productRepository.findOne({
      where: { id: productId, isDeleted: false },
      relations: ['author'],
    });

    return product && product.author.id === userId;
  }

  async incrementViewCount(productId: string, userId: string): Promise<string> {
    try {
      const viewHistoryKey = `product:viewed:${userId}:${productId}`;
      const viewCountKey = `product:views:${productId}`;
      const dirtyListKey = 'dirty:product:views';

      const viewed = await this.cacheManager.get(viewHistoryKey);

      if (viewed) {
        // 이미 본 기록이 있을 경우, 별도 처리 없이 성공 메시지 반환
        return '최근에 이미 조회한 상품입니다.';
      }

      // 본 기록이 없을 경우, 캐시 조회수 1 증가
      const currentViewsInCache =
        (await this.cacheManager.get<number>(viewCountKey)) || 0;
      await this.cacheManager.set(viewCountKey, currentViewsInCache + 1);

      // 24시간 동안 "봤음" 기록 남기기
      await this.cacheManager.set(viewHistoryKey, 1, 86400);

      // Dirty List에 상품 ID 추가
      const dirtyList =
        (await this.cacheManager.get<Set<string>>(dirtyListKey)) ||
        new Set<string>();
      dirtyList.add(productId);
      await this.cacheManager.set(dirtyListKey, dirtyList);

      return `${productId} 상품의 캐시 조회수 1 증가 성공`;
    } catch (error) {
      console.error(`조회수 증가 처리 중 에러 발생: ${error.message}`);

      // 2. 클라이언트에게는 내부 서버 오류가 발생했음을 알립니다.
      throw new InternalServerErrorException('조회수 처리 중 오류 발생');
    }
  }
}
