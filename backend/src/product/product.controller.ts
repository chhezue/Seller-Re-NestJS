import { ProductService } from './product.service';
import { Controller } from '@nestjs/common';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
}
