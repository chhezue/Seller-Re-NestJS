import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ProductService } from '../product.service';
import { UsersModel } from '../../users/entity/users.entity';

@Injectable()
export class ProductOwnerGuard implements CanActivate {
  constructor(private readonly productService: ProductService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user: UsersModel = req.user;
    const productId = req.params.productId;

    if (!user || !productId) {
      throw new ForbiddenException('사용자 정보 또는 상품 ID가 없습니다.');
    }

    const isOwner = await this.productService.isProductOwner(
      user.id,
      productId,
    );

    if (!isOwner) {
      throw new ForbiddenException(
        '해당 상품에 대한 수정/삭제 권한이 없습니다.',
      );
    }

    return true; // 권한이 있으면 요청 통과
  }
}
