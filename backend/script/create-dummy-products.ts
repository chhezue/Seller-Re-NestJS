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

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const productService = app.get(ProductService);
  const commonService = app.get(CommonService);
  const usersRepository = app.get<Repository<UsersModel>>(
    getRepositoryToken(UsersModel),
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

      // 기본 제품 정보
      const baseProductData = {
        name: `더미 제품 ${i}`,
        description: `이 제품은 테스트를 위해 생성된 ${i}번째 더미 제품입니다. 품질이 좋고 상태가 양호합니다.`,
        categoryId: categoryIds[Math.floor(Math.random() * categoryIds.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        tradeType: tradeType,
        condition: conditions[Math.floor(Math.random() * conditions.length)],
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
        await productService.createProduct(dummyProduct, randomUser);
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
