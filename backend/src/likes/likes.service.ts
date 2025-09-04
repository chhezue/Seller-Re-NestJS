import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LikeModel } from './entity/like.entity';
import { PageDto } from '../common/dto/page.dto';
import { ProductModel } from '../product/entity/product.entity';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(LikeModel)
    private readonly likeRepository: Repository<LikeModel>,
    @InjectRepository(ProductModel)
    private readonly productRepository: Repository<ProductModel>,
  ) {}

  async getMyLikes(
    userId: string,
    pageDto: PageDto,
  ): Promise<{ products: ProductModel[]; nextCursor: string | null }> {
    const { cursor, limit } = pageDto;

    // 1단계: 사용자가 찜한 상품 ID 목록 조회
    const likedProductIds = await this.likeRepository
      .createQueryBuilder('like')
      .select('like.product.id', 'productId')
      .where('like.user.id = :userId', { userId })
      .getRawMany();

    if (likedProductIds.length === 0) {
      return { products: [], nextCursor: null };
    }

    const productIds = likedProductIds.map((item) => item.productId);

    // 2단계: 찜한 상품들의 상세 정보 조회
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.author', 'author')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.region', 'region')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('images.file', 'imageFile')
      .where('product.id IN (:...productIds)', { productIds })
      .andWhere('product.isDeleted = :isDeleted', { isDeleted: false });

    if (cursor) {
      // cursor는 Date 객체여야 할 수 있으므로 타입 변환이 필요할 수 있습니다.
      queryBuilder.andWhere('product.createdAt < :cursor', {
        cursor: new Date(cursor),
      });
    }

    // 정렬 및 개수 제한
    queryBuilder.orderBy('product.createdAt', 'DESC');
    queryBuilder.take(limit);

    const products = await queryBuilder.getMany();

    // 다음 페이지를 위한 nextCursor 계산
    const lastItem = products.length > 0 ? products[products.length - 1] : null;
    // 가져온 아이템의 수가 limit과 같을 때만 다음 페이지가 있을 가능성이 있음
    const nextCursor =
      lastItem && products.length === limit
        ? lastItem.createdAt.toISOString()
        : null;

    return {
      products,
      nextCursor,
    };
  }

  @Transactional()
  async createLike(productId: string, userId: string): Promise<string> {
    // 특정 사용자가 특정 상품을 찜했는지 확인
    const like = await this.likeRepository.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });
    if (like) {
      throw new ConflictException('이미 찜한 상품입니다.');
    }

    await this.likeRepository.save({
      user: { id: userId },
      product: { id: productId },
    });

    // 상품의 likesCount 1 증가
    await this.productRepository.increment({ id: productId }, 'likeCount', 1);

    return `${productId} 찜 성공`;
  }

  @Transactional()
  async deleteLike(productId: string, userId: string): Promise<string> {
    const like = await this.likeRepository.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });
    if (!like) {
      throw new ConflictException('찜하지 않은 상품입니다.');
    }

    await this.likeRepository.delete({
      user: { id: userId },
      product: { id: productId },
    });

    // 상품의 likesCount 1 감소
    await this.productRepository.decrement({ id: productId }, 'likeCount', 1);

    return `${productId} 찜 삭제 성공`;
  }
}
