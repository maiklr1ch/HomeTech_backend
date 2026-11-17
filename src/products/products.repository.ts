import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { StoredAttributeValue } from '../categories/category-attribute.entity';
import type { Prisma, StockStatus } from '../generated/prisma/client';
import { BaseRepository, type Tx } from '../prisma/prisma.service';
import { ProductEntity } from './product.entity';

const detailInclude = {
  category: { select: { id: true, name: true, slug: true, attributes: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } } },
  manufacturer: { select: { id: true, name: true, country: true } },
  attributeValues: true,
} satisfies Prisma.ProductInclude;

const listInclude = {
  category: { select: { id: true, name: true } },
  manufacturer: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

export interface SupplierProductData {
  supplierCode: string;
  sku: string | null;
  name: string;
  categoryId: number;
  manufacturerId: number | null;
  price: number | null;
  supplierPrice: number | null;
  stockStatus: StockStatus;
  warrantyMonths: number | null;
  supplierImageUrl: string | null;
  updatedFromSupplierAt: Date;
}

@Injectable()
export class ProductsRepository extends BaseRepository {
  static temporarySlug(): string {
    return `tmp-${randomUUID()}`;
  }

  count(where: Prisma.ProductWhereInput): Promise<number> {
    return this.prisma.product.count({ where });
  }

  async findPage(where: Prisma.ProductWhereInput, skip: number, take: number) {
    const rows = await this.prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      include: listInclude,
    });
    return rows.map(({ category, manufacturer, ...p }) => ({ product: ProductEntity.from(p), category, manufacturer }));
  }

  async findDetail(id: number) {
    const row = await this.prisma.product.findFirst({ where: { id, isDeleted: false }, include: detailInclude });
    if (!row) return null;
    const { category, manufacturer, attributeValues, ...p } = row;
    return { product: ProductEntity.from(p), category, manufacturer, attributeValues };
  }

  async findActive(id: number, tx?: Tx): Promise<ProductEntity | null> {
    const row = await this.db(tx).product.findFirst({ where: { id, isDeleted: false } });
    return row ? ProductEntity.from(row) : null;
  }

  async create(data: Omit<Prisma.ProductUncheckedCreateInput, 'slug'>, tx: Tx): Promise<ProductEntity> {
    const created = await tx.product.create({ data: { ...data, slug: ProductsRepository.temporarySlug() } });
    return ProductEntity.from(
      await tx.product.update({ where: { id: created.id }, data: { slug: ProductEntity.slugFor(created.name, created.id) } }),
    );
  }

  update(id: number, data: Prisma.ProductUncheckedUpdateInput, tx?: Tx) {
    return this.db(tx).product.update({ where: { id }, data });
  }

  async softDelete(id: number): Promise<boolean> {
    const result = await this.prisma.product.updateMany({ where: { id, isDeleted: false }, data: { isDeleted: true, isVisible: false } });
    return result.count > 0;
  }

  deleteAttributeValues(productId: number, attributeIds: number[] | 'all', tx: Tx) {
    return tx.productAttributeValue.deleteMany({
      where: attributeIds === 'all' ? { productId } : { productId, attributeId: { in: attributeIds } },
    });
  }

  async saveAttributeValues(productId: number, values: StoredAttributeValue[], tx: Tx) {
    for (const { attributeId, valueNumber, valueText, valueBool } of values) {
      await tx.productAttributeValue.upsert({
        where: { productId_attributeId: { productId, attributeId } },
        create: { productId, attributeId, valueNumber, valueText, valueBool },
        update: { valueNumber, valueText, valueBool },
      });
    }
  }

  async supplierIndex(tx: Tx): Promise<Map<string, { id: number; isDeleted: boolean }>> {
    const rows = await tx.product.findMany({
      where: { supplierCode: { not: null } },
      select: { id: true, supplierCode: true, isDeleted: true },
    });
    return new Map(rows.map((p) => [p.supplierCode as string, { id: p.id, isDeleted: p.isDeleted }]));
  }

  async createFromSupplier(items: SupplierProductData[], tx: Tx): Promise<number> {
    let count = 0;
    for (let i = 0; i < items.length; i += 1000) {
      const inserted = await tx.product.createManyAndReturn({
        data: items.slice(i, i + 1000).map((item) => ({ ...item, slug: ProductsRepository.temporarySlug(), isVisible: false })),
        select: { id: true, name: true },
      });
      for (const p of inserted) {
        await tx.product.update({ where: { id: p.id }, data: { slug: ProductEntity.slugFor(p.name, p.id) } });
      }
      count += inserted.length;
    }
    return count;
  }

  async markMissingOutOfStock(presentCodes: string[], tx: Tx): Promise<number> {
    const result = await tx.product.updateMany({
      where: { supplierCode: { not: null, notIn: presentCodes }, isDeleted: false, stockStatus: { not: 'out_of_stock' } },
      data: { stockStatus: 'out_of_stock' },
    });
    return result.count;
  }
}
