import { Injectable } from '@nestjs/common';
import { Errors } from '../common/errors';
import { firstString, imageUrl, money, pageWindow, splitIds, type Page } from '../common/utils';
import { parseOrThrow } from '../common/zod';
import type { Prisma } from '../generated/prisma/client';
import { CatalogRepository, type ProductListRow } from './catalog.repository';
import { searchQuerySchema } from './catalog.schemas';
import { ProductVisibility } from './visibility';

export type ProductSort = 'default' | 'price_asc' | 'price_desc' | 'newest';

const SORTS: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  default: [{ stockStatus: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  price_asc: [{ price: 'asc' }, { id: 'asc' }],
  price_desc: [{ price: 'desc' }, { id: 'asc' }],
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
};

function toListItem(p: ProductListRow) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: money(p.price),
    stockStatus: p.stockStatus,
    imageUrl: imageUrl(p),
  };
}

function num(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async categoryTree() {
    const categories = await this.repository.findVisibleCategories();
    return {
      items: categories
        .filter((c) => c.parentId === null)
        .map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          children: categories.filter((c) => c.parentId === r.id).map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
        })),
    };
  }

  private async visibleCategory(slug: string) {
    const category = await this.repository.findVisibleCategoryBySlug(slug);
    if (!category) throw Errors.notFound('Категорію не знайдено');
    return category;
  }

  async filters(slug: string) {
    const category = await this.visibleCategory(slug);
    const where: Prisma.ProductWhereInput = {
      ...ProductVisibility.productWhere,
      categoryId: { in: [category.id, ...category.children.map((c) => c.id)] },
    };
    const [price, manufacturers] = await Promise.all([
      this.repository.priceRange(where),
      this.repository.manufacturersWithCounts(where),
    ]);
    const attributes = await Promise.all(
      category.attributes.map(async (a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        unit: a.unit,
        options: a.type === 'enum' ? a.options : undefined,
        ...(a.type === 'number' ? await this.repository.numberAttributeRange(a.id, where) : {}),
      })),
    );
    return {
      category: { id: category.id, name: category.name, slug: category.slug, parent: category.parent },
      subcategories: category.children,
      manufacturers,
      price: price.min === null ? null : { min: money(price.min), max: money(price.max) },
      attributes,
    };
  }

  async list(query: Record<string, unknown>): Promise<Page<ReturnType<typeof toListItem>>> {
    const and: Prisma.ProductWhereInput[] = [ProductVisibility.productWhere];

    const categorySlug = firstString(query.category)?.trim();
    let filterable: { id: number; type: string; options: string[] }[] = [];
    if (categorySlug) {
      const category = await this.visibleCategory(categorySlug);
      and.push({ categoryId: { in: [category.id, ...category.children.map((c) => c.id)] } });
      filterable = category.attributes;
    }

    const rawQuery = firstString(query.q);
    if (rawQuery !== undefined && rawQuery.trim() !== '') {
      const q = parseOrThrow(searchQuerySchema, rawQuery, 'q');
      for (const word of q.split(/\s+/).filter(Boolean)) {
        and.push({ OR: [{ name: { contains: word, mode: 'insensitive' } }, { sku: { contains: word, mode: 'insensitive' } }] });
      }
    }

    const manufacturerIds = splitIds(query.manufacturer);
    if (manufacturerIds.length) and.push({ manufacturerId: { in: manufacturerIds } });

    const priceMin = num(firstString(query.priceMin));
    const priceMax = num(firstString(query.priceMax));
    const validRange = priceMin === undefined || priceMax === undefined || priceMin <= priceMax;
    if (validRange && priceMin !== undefined && priceMin >= 0) and.push({ price: { gte: priceMin } });
    if (validRange && priceMax !== undefined && priceMax >= 0) and.push({ price: { lte: priceMax } });

    if (firstString(query.inStock) === 'true') and.push({ stockStatus: 'in_stock' });

    for (const [attrId, raw] of this.attributeParams(query)) {
      const attr = filterable.find((a) => a.id === attrId);
      if (!attr) continue;
      if (attr.type === 'number') {
        const [fromRaw, toRaw] = raw.split('..');
        const from = num(fromRaw);
        const to = num(toRaw);
        if ((from === undefined && to === undefined) || (from !== undefined && to !== undefined && from > to)) continue;
        and.push({ attributeValues: { some: { attributeId: attr.id, valueNumber: { gte: from, lte: to } } } });
      } else if (attr.type === 'enum') {
        const values = raw.split(',').map((v) => v.trim()).filter((v) => attr.options.includes(v));
        if (values.length) and.push({ attributeValues: { some: { attributeId: attr.id, valueText: { in: values } } } });
      } else if (attr.type === 'bool' && raw === 'true') {
        and.push({ attributeValues: { some: { attributeId: attr.id, valueBool: true } } });
      }
    }

    const sort = firstString(query.sort) as ProductSort | undefined;
    const orderBy = SORTS[sort && sort in SORTS ? sort : 'default'];
    const where: Prisma.ProductWhereInput = { AND: and };

    const total = await this.repository.countProducts(where);
    const requested = Number(firstString(query.page) ?? 1);
    const win = pageWindow(Number.isInteger(requested) && requested > 0 ? requested : 1, total);
    const rows = await this.repository.findProducts(where, orderBy, win.skip, win.take);
    return { items: rows.map(toListItem), page: win.page, pageSize: win.pageSize, total };
  }

  private attributeParams(query: Record<string, unknown>): [number, string][] {
    const result: [number, string][] = [];
    for (const [key, value] of Object.entries(query)) {
      const m = key.match(/^attr\[(\d+)\]$/);
      const str = firstString(value);
      if (m && str !== undefined) result.push([Number(m[1]), str]);
    }
    if (query.attr && typeof query.attr === 'object' && !Array.isArray(query.attr)) {
      for (const [key, value] of Object.entries(query.attr as Record<string, unknown>)) {
        const str = firstString(value);
        if (/^\d+$/.test(key) && str !== undefined) result.push([Number(key), str]);
      }
    }
    return result;
  }

  async product(slug: string) {
    const p = await this.repository.findVisibleProductBySlug(slug);
    if (!p) throw Errors.notFound('Товар не знайдено');

    const attributes = p.attributeValues
      .sort((a, b) => a.attribute.sortOrder - b.attribute.sortOrder || a.attribute.id - b.attribute.id)
      .map((v) => ({
        id: v.attribute.id,
        name: v.attribute.name,
        type: v.attribute.type,
        unit: v.attribute.unit,
        value: v.attribute.type === 'number' ? v.valueNumber : v.attribute.type === 'bool' ? v.valueBool : v.valueText,
      }))
      .filter((a) => a.value !== null);

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      price: money(p.price),
      stockStatus: p.stockStatus,
      warrantyMonths: p.warrantyMonths,
      imageUrl: imageUrl(p),
      description: p.description,
      assemblyCountry: p.assemblyCountry,
      assemblyCity: p.assemblyCity,
      manufacturer: p.manufacturer,
      category: p.category,
      attributes,
    };
  }
}
