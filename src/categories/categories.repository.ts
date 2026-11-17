import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { BaseRepository, type Tx } from '../prisma/prisma.service';
import { CategoryAttributeEntity } from './category-attribute.entity';

const activeProducts = { where: { isDeleted: false } } as const;

@Injectable()
export class CategoriesRepository extends BaseRepository {
  findAllWithCounts() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: activeProducts, children: true, attributes: true } } },
    });
  }

  findDetail(id: number) {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, slug: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        _count: { select: { products: activeProducts } },
        attributes: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          include: { _count: { select: { values: { where: { product: { is: { isDeleted: false } } } } } } },
        },
      },
    });
  }

  findWithCounts(id: number) {
    return this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: activeProducts, children: true } } },
    });
  }

  async idByNameKey(key: string): Promise<number | null> {
    return (await this.prisma.category.findUnique({ where: { nameKey: key }, select: { id: true } }))?.id ?? null;
  }

  async idBySlug(slug: string): Promise<number | null> {
    return (await this.prisma.category.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null;
  }

  async exists(id: number): Promise<boolean> {
    return (await this.prisma.category.count({ where: { id } })) > 0;
  }

  create(data: Prisma.CategoryUncheckedCreateInput, tx?: Tx) {
    return this.db(tx).category.create({ data });
  }

  update(id: number, data: Prisma.CategoryUncheckedUpdateInput) {
    return this.prisma.category.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.category.delete({ where: { id } });
  }

  async findLeafAttributes(categoryId: number, tx?: Tx): Promise<{ childrenCount: number; attributes: CategoryAttributeEntity[] } | null> {
    const category = await this.db(tx).category.findUnique({
      where: { id: categoryId },
      include: { attributes: true, _count: { select: { children: true } } },
    });
    if (!category) return null;
    return { childrenCount: category._count.children, attributes: category.attributes.map(CategoryAttributeEntity.from) };
  }

  async findImportable(tx?: Tx) {
    const categories = await this.db(tx).category.findMany({
      where: { importPattern: { not: null } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { children: true } } },
    });
    return categories.filter((c) => c._count.children === 0).map((c) => ({ id: c.id, importPattern: c.importPattern as string }));
  }

  findBySlugOrNameKey(slug: string, key: string, tx?: Tx) {
    return this.db(tx).category.findFirst({ where: { OR: [{ slug }, { nameKey: key }] }, select: { id: true } });
  }

  async findAttribute(categoryId: number, attributeId: number) {
    const row = await this.prisma.categoryAttribute.findFirst({
      where: { id: attributeId, categoryId },
      include: { _count: { select: { values: true } } },
    });
    if (!row) return null;
    const { _count, ...attribute } = row;
    return { attribute: CategoryAttributeEntity.from(attribute), valuesCount: _count.values };
  }

  async attributeIdByName(categoryId: number, name: string): Promise<number | null> {
    const row = await this.prisma.categoryAttribute.findUnique({
      where: { categoryId_name: { categoryId, name } },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async maxAttributeSortOrder(categoryId: number): Promise<number> {
    const agg = await this.prisma.categoryAttribute.aggregate({ where: { categoryId }, _max: { sortOrder: true } });
    return agg._max.sortOrder ?? 0;
  }

  createAttribute(data: Prisma.CategoryAttributeUncheckedCreateInput) {
    return this.prisma.categoryAttribute.create({ data });
  }

  updateAttribute(id: number, data: Prisma.CategoryAttributeUncheckedUpdateInput, tx?: Tx) {
    return this.db(tx).categoryAttribute.update({ where: { id }, data });
  }

  deleteAttribute(id: number) {
    return this.prisma.categoryAttribute.delete({ where: { id } });
  }

  async deleteValuesWithText(attributeId: number, values: string[], tx?: Tx): Promise<number> {
    const result = await this.db(tx).productAttributeValue.deleteMany({ where: { attributeId, valueText: { in: values } } });
    return result.count;
  }
}
