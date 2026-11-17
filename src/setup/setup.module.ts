import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { SetupService } from './setup.service';

@Module({
  imports: [CategoriesModule],
  providers: [SetupService],
  exports: [SetupService],
})
export class SetupModule {}
