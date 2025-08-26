import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CreateUserDto } from '../src/users/dto/create-user.dto';
import { UsersService } from '../src/users/users.service';
import { CommonService } from '../src/common/common.service';

/**
 * 50명의 더미 유저를 생성하는 스크립트
 * - 이메일: user1@dummyUser.com ~ user50@dummyUser.com
 * - 닉네임: user1 ~ user50
 * - 비밀번호: 'user{i}'
 * - 지역: 랜덤으로 할당(하위 지역만)
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const commonService = app.get(CommonService);

  try {
    console.log('start. create dummy user...');

    // 지역 데이터 조회 (하위 지역만)
    const regions = await commonService.getTreeRegions();
    const subRegions = regions.flatMap((region) => region.children);

    if (subRegions.length === 0) {
      console.warn('Region data is empty. region_id is set null.');
    }

    const numberOfUsers = 50;

    for (let i = 1; i <= numberOfUsers; i++) {
      // 랜덤 지역 할당 (하위 지역만)
      const randomRegion =
        subRegions.length > 0
          ? subRegions[Math.floor(Math.random() * subRegions.length)]
          : null;

      const user: CreateUserDto = {
        username: `user${i}`,
        email: `user${i}@dummyUser.com`,
        password: `user${i}`,
        profileImageId: null,
        phoneNumber: '010-0000-1111',
        region_id: randomRegion?.id || null,
      };

      await usersService.createUser(user);
      console.log(
        `CREATE USER: ${user.username} (${user.email}) ${randomRegion?.name}`,
      );
    }

    console.log(
      `dummy user created. created dummy user count : ${numberOfUsers}`,
    );
  } catch (error) {
    if (
      error.message.includes('duplicate key value violates unique constraint')
    ) {
      console.warn('user is already exists.');
    } else {
      console.error('An error occurred while creating dummy users:', error);
    }
  } finally {
    await app.close();
  }
}

bootstrap();
