import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { RegisterUserDto } from '../src/auth/dto/register-user.dto';

/**
 * 50명의 더미 유저를 생성하는 스크립트
 * - 이메일: user1@dummyUser.com ~ user50@dummyUser.com
 * - 닉네임: user1 ~ user50
 * - 비밀번호: 'user{i}'
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const authService = app.get(AuthService);

  try {
    console.log('start. create dummy user...');

    const numberOfUsers = 50;

    for (let i = 1; i <= numberOfUsers; i++) {
      const user: RegisterUserDto = {
        username: `user${i}`,
        email: `user${i}@dummyUser.com`,
        password: `user${i}`,
        profileImage:
          'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fCVFQSVCMyVBMCVFQyU5NiU5MSVFQyU5RCVCNHxlbnwwfHwwfHx8MA%3D%3D',
        phoneNumber: '010-0000-1111',
        region_id: null,
      };

      await authService.registerWithEmail(user);
      console.log(`CREATE USER: ${user.username} (${user.email})`);
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
