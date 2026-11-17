import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ManufacturersModule } from '../manufacturers/manufacturers.module';
import { ProductsModule } from '../products/products.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { KatranParser } from './katran-parser';

@Module({
  imports: [ProductsModule, CategoriesModule, ManufacturersModule],
  controllers: [ImportController],
  providers: [ImportService, KatranParser],
  exports: [ImportService],
})
export class ImportModule {}
