import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { BaseRepository } from '../prisma/prisma.service';
import { ProductVisibility } from './visibility';

export const productListSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  stockStatus: true,
  ownImagePath: true,
  supplierImageUrl: true,
} satisfies Prisma.ProductSelect;

export type ProductListRow = Prisma.ProductGetPayload<{ select: typeof productListSelect }>;

const cartSelect = {
  ...ProductVisibility.select,
  id: true,
  name: true,
  slug: true,
  stockStatus: true,
  ownImagePath: true,
  supplierImageUrl: true,
} satisfies Prisma.ProductSelect;

export type CartProductRow = Prisma.ProductGetPayload<{ select: typeof cartSelect }>;

@Injectable()
export class CatalogRepository extends BaseRepository {
  findVisibleCategories() {
    return this.prisma.category.findMany({
      where: ProductVisibility.categoryWhere,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, parentId: true },
    });
  }

  findVisibleCategoryBySlug(slug: string) {
    return this.prisma.category.findFirst({
      where: { slug, ...ProductVisibility.categoryWhere },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isVisible: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: { id: true, name: true, slug: true },
        },
        attributes: { where: { isFilterable: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      },
    });
  }

  countProducts(where: Prisma.ProductWhereInput) {
    return this.prisma.product.count({ where });
  }

  findProducts(
    where: Prisma.ProductWhereInput,
    orderBy: Prisma.ProductOrderByWithRelationInput[],
    skip: number,
    take: number,
  ): Promise<ProductListRow[]> {
    return this.prisma.product.findMany({ where, orderBy, skip, take, select: productListSelect });
  }

  async priceRange(where: Prisma.ProductWhereInput) {
    const agg = await this.prisma.product.aggregate({ where, _min: { price: true }, _max: { price: true } });
    return { min: agg._min.price, max: agg._max.price };
  }

  async manufacturersWithCounts(where: Prisma.ProductWhereInput) {
    const groups = await this.prisma.product.groupBy({
      by: ['manufacturerId'],
      where: { ...where, manufacturerId: { not: null } },
      _count: { _all: true },
    });
    const counts = new Map(groups.map((g) => [g.manufacturerId, g._count._all]));
    const manufacturers = await this.prisma.manufacturer.findMany({
      where: { id: { in: [...counts.keys()].filter((id): id is number => id !== null) } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    return manufacturers.map((m) => ({ ...m, productCount: counts.get(m.id) ?? 0 }));
  }

  async numberAttributeRange(attributeId: number, where: Prisma.ProductWhereInput) {
    const agg = await this.prisma.productAttributeValue.aggregate({
      where: { attributeId, product: { is: where } },
      _min: { valueNumber: true },
      _max: { valueNumber: true },
    });
    return { min: agg._min.valueNumber, max: agg._max.valueNumber };
  }

  findVisibleProductBySlug(slug: string) {
    return this.prisma.product.findFirst({
      where: { slug, ...ProductVisibility.productWhere },
      include: {
        category: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } },
        manufacturer: { select: { id: true, name: true, country: true } },
        attributeValues: { include: { attribute: true } },
      },
    });
  }

  findProductsForCart(ids: number[]): Promise<CartProductRow[]> {
    return this.prisma.product.findMany({ where: { id: { in: ids } }, select: cartSelect });
  }
}
