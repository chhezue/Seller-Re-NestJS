import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../src/product/const/product.const';
import { CreateProductDto } from '../src/product/dto/create-product.dto';
import { UsersModel } from '../src/users/entity/users.entity';
import { CommonService } from '../src/common/common.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileModel, FileStatus } from '../src/uploads/entity/file.entity';
import { ImageCommitDto } from '../src/uploads/dto/image-commit.dto';
import { ProductImageModel } from '../src/uploads/entity/product-image.entity';
import { ProductModel } from '../src/product/entity/product.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { initializeTransactionalContext } from 'typeorm-transactional';

interface AiGeneratedData {
  name: string;
  description: string;
  imageUrls: string[];
}

async function bootstrap() {
  initializeTransactionalContext();

  const app = await NestFactory.createApplicationContext(AppModule);

  // HttpService 인스턴스 가져오기
  const httpService = app.get(HttpService);

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

    // 더미 사용자들 조회 (모든 사용자 사용)
    const users = await usersRepository.find({
      relations: ['region'],
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

    const numberOfProducts = 10; // 생성할 더미 데이터 개수

    for (let i = 1; i <= numberOfProducts; i++) {
      // 순차적으로 사용자 선택 (모든 사용자가 골고루 상품을 가지도록)
      const userIndex = (i - 1) % users.length;
      const selectedUser = users[userIndex];

      // 1. 랜덤 카테고리 선택
      const randomCategory =
        categories[Math.floor(Math.random() * categories.length)];

      // 2. Python AI 서비스에 데이터 생성 요청
      let aiData: AiGeneratedData;
      try {
        console.log(
          `[${i}] AI 서비스에 '${randomCategory.name}' 데이터 생성 요청...`,
        );
        const response = await firstValueFrom(
          httpService.post<AiGeneratedData>(
            'http://localhost:5001/generate-product-data',
            { category: randomCategory.name },
          ),
        );
        aiData = response.data;

        if (aiData.name.includes('실패') || aiData.name.includes('오류')) {
          console.error(
            `[${i}] AI 데이터 생성 실패: ${aiData.name} - ${aiData.description}. 이 상품은 건너뜁니다.`,
          );
          continue; // 루프의 나머지 부분을 건너뛰고 다음 상품으로 넘어갑니다.
        }
      } catch (e) {
        // 2. HTTP 요청 자체가 실패한 경우에도 건너뜁니다.
        console.error(
          `[${i}] AI 서비스 호출에 실패했습니다 (${e.message}). 이 상품은 건너뜁니다.`,
        );
        continue;
      }

      // 3. AI가 생성한 이미지 URL로 FileModel 생성
      const productImages = [];
      // AI가 생성한 이미지 URL이 1~3개가 아닐 수 있으므로, 랜덤 개수만큼만 사용
      const numberOfImages =
        Math.floor(Math.random() * Math.min(aiData.imageUrls.length, 3)) + 1;

      for (let imgIndex = 0; imgIndex < numberOfImages; imgIndex++) {
        const imageUrl = aiData.imageUrls[imgIndex];
        const uniqueKey = `product-${i}-img-${imgIndex}-${Date.now()}`;

        const dummyFile = fileRepository.create({
          originalName: `product-${i}-image-${imgIndex + 1}.jpg`,
          mimeType: 'image/jpeg',
          size: 150000 + Math.floor(Math.random() * 50000),
          key: uniqueKey,
          url: imageUrl, // AI가 제공한 URL 사용
          status: FileStatus.PERMANENT,
        });
        const savedFile = await fileRepository.save(dummyFile);
        productImages.push(savedFile);
      }

      const images: ImageCommitDto[] = productImages.map((image, index) => ({
        fileId: image.id,
        isRepresentative: index === 0,
        order: index,
        isNew: false,
      }));

      // 4. AI가 생성한 제목과 설명으로 제품 정보 구성
      const baseProductData = {
        name: aiData.name, // AI가 생성한 이름 사용
        description: aiData.description, // AI가 생성한 설명 사용
        categoryId: randomCategory.id, // 랜덤 선택된 카테고리 ID 사용
        status: statuses[Math.floor(Math.random() * statuses.length)],
        tradeType: Math.random() > 0.5 ? TRADE_TYPE.SELL : TRADE_TYPE.SHARE,
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        images: images,
        isDeleted: false,
      };

      // 거래 타입에 따른 조건부 필드 설정
      const dummyProduct: CreateProductDto =
        baseProductData.tradeType === TRADE_TYPE.SELL
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
          author: { id: selectedUser.id },
          region: selectedUser.region ?? null,
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
          `생성 완료: ${dummyProduct.name} (${dummyProduct.tradeType}) - 작성자: ${selectedUser.username}`,
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
