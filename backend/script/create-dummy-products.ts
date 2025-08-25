import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../src/product/const/product.const';
import { CreateProductDto } from '../src/product/dto/create-product.dto';
import { ProductService } from '../src/product/product.service';
import { UsersModel } from '../src/users/entity/users.entity';
import { CommonService } from '../src/common/common.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileModel, FileStatus } from '../src/uploads/entity/file.entity';
import { ImageCommitDto } from '../src/uploads/dto/image-commit.dto';
import { ProductImageModel } from '../src/uploads/entity/product-image.entity';
import { ProductModel } from '../src/product/entity/product.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const productService = app.get(ProductService);
  const commonService = app.get(CommonService);
  const usersRepository = app.get<Repository<UsersModel>>(
    getRepositoryToken(UsersModel),
  );
  const fileRepository = app.get<Repository<FileModel>>(
    getRepositoryToken(FileModel),
  );
  const productImageRepository = app.get<Repository<ProductImageModel>>(
    getRepositoryToken(ProductImageModel),
  );
  const productRepository = app.get<Repository<ProductModel>>(
    getRepositoryToken(ProductModel),
  );

  try {
    console.log('더미 제품 데이터 생성을 시작합니다...');

    // 카테고리 조회
    const categories = await commonService.getCategories();
    const categoryIds = categories.map((category) => category.id);

    if (categoryIds.length === 0) {
      console.error(
        '카테고리가 존재하지 않습니다. 먼저 카테고리를 생성해주세요.',
      );
      return;
    }

    // 더미 사용자들 조회
    const users = await usersRepository.find({
      relations: ['region'],
      take: 10, // 처음 10명의 사용자만 사용
    });

    if (users.length === 0) {
      console.error(
        '사용자가 존재하지 않습니다. 먼저 create-dummy-user.ts를 실행해주세요.',
      );
      return;
    }

    console.log(
      `카테고리 ${categoryIds.length}개, 사용자 ${users.length}명을 찾았습니다.`,
    );

    // 기본 이미지 URL 템플릿
    const imageUrls = [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500',
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500',
    ];

    const statuses = [
      PRODUCT_STATUS.ON_SALE,
      PRODUCT_STATUS.RESERVED,
      PRODUCT_STATUS.SOLD,
    ];
    const conditions = [
      PRODUCT_CONDITION.NEW,
      PRODUCT_CONDITION.LIKE_NEW,
      PRODUCT_CONDITION.USED,
      PRODUCT_CONDITION.FOR_PARTS,
    ];

    const numberOfProducts = 50; // 생성할 더미 데이터 개수

    for (let i = 1; i <= numberOfProducts; i++) {
      // 랜덤 사용자 선택
      const randomUser = users[Math.floor(Math.random() * users.length)];

      // 랜덤 거래 타입 선택
      const tradeType =
        Math.random() > 0.5 ? TRADE_TYPE.SELL : TRADE_TYPE.SHARE;

      // 각 상품마다 고유한 이미지 파일 생성 (OneToOne 제약 해결)
      const numberOfImages = Math.floor(Math.random() * 3) + 1; // 1~3개
      const productImages = [];

      for (let imgIndex = 0; imgIndex < numberOfImages; imgIndex++) {
        const selectedImageUrl =
          imageUrls[Math.floor(Math.random() * imageUrls.length)];

        // 각 이미지마다 고유한 키와 타임스탬프로 구분
        const uniqueKey = `product-${i}-img-${imgIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const dummyFile = fileRepository.create({
          originalName: `product-${i}-image-${imgIndex + 1}.jpg`,
          mimeType: 'image/jpeg',
          size: 150000 + Math.floor(Math.random() * 50000), // 150KB ~ 200KB 랜덤 크기
          key: uniqueKey,
          url: selectedImageUrl,
          status: FileStatus.PERMANENT,
        });
        const savedFile = await fileRepository.save(dummyFile);
        productImages.push(savedFile);
      }

      // 이미지 DTO 생성
      const images: ImageCommitDto[] = productImages.map((image, index) => ({
        fileId: image.id,
        isRepresentative: index === 0, // 첫 번째 이미지를 대표 이미지로 설정
        order: index,
        isNew: false, // 이미 PERMANENT 상태인 파일이므로 false
      }));

      // 기본 제품 정보
      const baseProductData = {
        name: `더미 제품 ${i}`,
        description: `이 제품은 테스트를 위해 생성된 ${i}번째 더미 제품입니다. 품질이 좋고 상태가 양호합니다.`,
        categoryId: categoryIds[Math.floor(Math.random() * categoryIds.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        tradeType: tradeType,
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        images: images,
      };

      // 거래 타입에 따른 조건부 필드 설정
      const dummyProduct: CreateProductDto =
        tradeType === TRADE_TYPE.SELL
          ? {
              ...baseProductData,
              price: Math.floor(Math.random() * 100000) + 10000, // 10,000 ~ 109,999 사이 랜덤 가격
              isNegotiable: Math.random() > 0.5,
            }
          : baseProductData; // SHARE의 경우 price, isNegotiable 없음

      try {
        // ProductService를 사용하지 않고 직접 상품 생성 (이미지는 이미 PERMANENT 상태)
        const { categoryId, images, ...productData } = dummyProduct;

        // 1. 상품 정보 먼저 생성
        const newProduct = await productRepository.save({
          ...productData,
          category: { id: categoryId },
          author: { id: randomUser.id },
          region: randomUser.region ?? null,
        });

        // 2. 이미지가 있는 경우 ProductImage 관계 직접 생성
        if (images && images.length > 0) {
          const productImages = images.map((imageInfo) =>
            productImageRepository.create({
              product: { id: newProduct.id },
              file: { id: imageInfo.fileId },
              order: imageInfo.order,
              isRepresentative: imageInfo.isRepresentative,
            }),
          );
          await productImageRepository.save(productImages);
        }

        console.log(
          `생성 완료: ${dummyProduct.name} (${dummyProduct.tradeType}) - 작성자: ${randomUser.username}`,
        );
      } catch (error) {
        console.error(`제품 생성 실패 (${i}번째):`, error.message);
      }
    }
    console.log(`${numberOfProducts}개의 더미 제품 생성이 완료되었습니다!`);
  } catch (error) {
    console.error('더미 제품 데이터 생성 중 오류 발생:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
