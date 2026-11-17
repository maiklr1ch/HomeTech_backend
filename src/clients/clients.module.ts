import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { AccountMailer } from './account-mailer';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [OrdersModule],
  controllers: [ClientsController],
  providers: [ClientsService, AccountMailer],
})
export class ClientsModule {}
