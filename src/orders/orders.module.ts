import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [CatalogModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersRepository, OrdersService, AdminOrdersService],
  exports: [OrdersRepository],
})
export class OrdersModule {}
