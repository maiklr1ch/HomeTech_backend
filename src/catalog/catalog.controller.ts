import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories() {
    return this.catalog.categoryTree();
  }

  @Get('categories/:slug/filters')
  filters(@Param('slug') slug: string) {
    return this.catalog.filters(slug);
  }

  @Get('products')
  products(@Query() query: Record<string, unknown>) {
    return this.catalog.list(query);
  }

  @Get('products/:slug')
  product(@Param('slug') slug: string) {
    return this.catalog.product(slug);
  }
}
