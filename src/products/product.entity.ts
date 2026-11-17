import { Errors, type FieldErrors } from '../common/errors';
import { imageUrl, slugify } from '../common/utils';
import { config } from '../config';
import type { Prisma, Product, StockStatus } from '../generated/prisma/client';

export type ProductSource = 'katran' | 'manual';

export class ProductEntity implements Product {
  id: number;
  supplierCode: string | null;
  sku: string | null;
  name: string;
  slug: string;
  categoryId: number | null;
  manufacturerId: number | null;
  price: Prisma.Decimal | null;
  supplierPrice: Prisma.Decimal | null;
  stockStatus: StockStatus;
  warrantyMonths: number | null;
  supplierImageUrl: string | null;
  ownImagePath: string | null;
  description: string | null;
  assemblyCountry: string | null;
  assemblyCity: string | null;
  isVisible: boolean;
  isDeleted: boolean;
  updatedFromSupplierAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  static readonly IMPORT_UPDATED_FIELDS = ['price', 'supplierPrice', 'stockStatus', 'warrantyMonths', 'supplierImageUrl'];
  static readonly IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

  static from(row: Product): ProductEntity {
    return Object.assign(new ProductEntity(), row);
  }

  static slugFor(name: string, id: number): string {
    return `${slugify(name)}-${id}`;
  }

  static isOrderableStock(stockStatus: StockStatus | string): boolean {
    return stockStatus === 'in_stock' || stockStatus === 'expected';
  }

  static assertPublishable(isVisible: boolean, categoryId: number | null, price: number | null) {
    if (!isVisible) return;
    const fields: FieldErrors = {};
    if (!categoryId) fields.categoryId = 'Для публікації потрібна категорія';
    if (price === null) fields.price = 'Для публікації потрібна ціна';
    if (Object.keys(fields).length) throw Errors.validation(fields, 'Товар без категорії або ціни не можна опублікувати');
  }

  get source(): ProductSource {
    return this.supplierCode ? 'katran' : 'manual';
  }

  get imageUrl(): string | null {
    return imageUrl(this);
  }

  get ownImageUrl(): string | null {
    return this.ownImagePath ? `${config.uploadsUrlPrefix}/${this.ownImagePath}` : null;
  }

  get priceValue(): number | null {
    return this.price === null ? null : Number(this.price);
  }

  get importUpdatesFields(): string[] {
    return this.supplierCode ? ProductEntity.IMPORT_UPDATED_FIELDS : [];
  }
}
