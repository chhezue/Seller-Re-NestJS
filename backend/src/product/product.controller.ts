import { ProductService } from './product.service';

export class ProductController {
  constructor(private readonly productService: ProductService) {}
}
