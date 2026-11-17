import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CategoriesModule } from './categories/categories.module';
import { ClientsModule } from './clients/clients.module';
import { DocsModule } from './docs/docs.module';
import { ImportModule } from './import/import.module';
import { MailModule } from './mail/mail.service';
import { ManufacturersModule } from './manufacturers/manufacturers.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.service';
import { ProductsModule } from './products/products.module';
import { SetupModule } from './setup/setup.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    UsersModule,
    AuthModule,
    CatalogModule,
    OrdersModule,
    ProductsModule,
    CategoriesModule,
    ManufacturersModule,
    ClientsModule,
    ImportModule,
    SetupModule,
    DocsModule,
  ],
})
export class AppModule {}
