import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../src/product/const/product.const';
import { CreateProductDto } from '../src/product/dto/create-product.dto';
import { ProductService } from '../src/product/product.service';
import { CommonService } from '../src/common/common.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const productService = app.get(ProductService);
  const commonService = app.get(CommonService);

  try {
    console.log('Dummy product data creation started...');

    const categories = await commonService.getCategories();
    const categoryIds = categories.map((category) => category.id);

    console.log(categories);
    console.log(categoryIds);

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
      const dummyProduct: CreateProductDto = {
        name: `dummy product ${i}`,
        description: `이 제품은 테스트를 위해 생성된 ${i}번째 더미 제품입니다.`,
        categoryId: categoryIds[Math.floor(Math.random() * categoryIds.length)],
        price: Math.floor(Math.random() * 100000) + 10000, // 10,000 ~ 109,999 사이 랜덤 가격
        status: statuses[Math.floor(Math.random() * statuses.length)],
        tradeType: Math.random() > 0.5 ? TRADE_TYPE.SELL : TRADE_TYPE.SHARE,
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        isNegotiable: Math.random() > 0.5,
        // 판매자와 거래 지역은 user 완성된 후 추가
      };
      await productService.createProduct(dummyProduct);
      console.log(`Created: ${dummyProduct.name}`);
    }
    console.log(`Successfully created ${numberOfProducts} dummy products!`);
  } catch (error) {
    console.error('Failed to create dummy product data:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
