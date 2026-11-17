import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ManufacturersModule } from '../manufacturers/manufacturers.module';
import { ImageStorage } from './image-storage';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

@Module({
  imports: [CategoriesModule, ManufacturersModule],
  controllers: [ProductsController],
  providers: [ProductsRepository, ProductsService, ImageStorage],
  exports: [ProductsRepository],
})
export class ProductsModule {}
