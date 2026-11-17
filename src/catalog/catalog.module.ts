import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CatalogController } from './catalog.controller';
import { CatalogRepository } from './catalog.repository';
import { CatalogService } from './catalog.service';

@Module({
  controllers: [CatalogController, CartController],
  providers: [CatalogRepository, CatalogService, CartService],
  exports: [CartService],
})
export class CatalogModule {}
