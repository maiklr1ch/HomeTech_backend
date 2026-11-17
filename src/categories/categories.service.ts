import { Injectable } from '@nestjs/common';
import { Errors } from '../common/errors';
import { nameKey, slugify } from '../common/utils';
import { TransactionManager } from '../prisma/prisma.service';
import { CategoriesRepository } from './categories.repository';
import type { CreateAttributeDto, CreateCategoryDto, UpdateAttributeDto, UpdateCategoryDto } from './categories.schemas';
import { CategoryAttributeEntity } from './category-attribute.entity';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categories: CategoriesRepository,
    private readonly transactions: TransactionManager,
  ) {}

  async tree() {
    const all = await this.categories.findAllWithCounts();
    const map = (c: (typeof all)[number]) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
      isVisible: c.isVisible,
      importPattern: c.importPattern,
      productCount: c._count.products,
      attributeCount: c._count.attributes,
    });
    return {
      items: all.filter((c) => c.parentId === null).map((r) => ({ ...map(r), children: all.filter((c) => c.parentId === r.id).map(map) })),
    };
  }

  async get(id: number) {
    const c = await this.categories.findDetail(id);
    if (!c) throw Errors.notFound('Категорію не знайдено');
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      parent: c.parent,
      children: c.children,
      sortOrder: c.sortOrder,
      isVisible: c.isVisible,
      importPattern: c.importPattern,
      productCount: c._count.products,
      attributes: c.attributes.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        unit: a.unit,
        options: a.options,
        isFilterable: a.isFilterable,
        sortOrder: a.sortOrder,
        valuesCount: a._count.values,
      })),
    };
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ?? slugify(dto.name, 60);
    await this.assertUnique(dto.name, slug);
    if (dto.parentId) await this.assertParent(dto.parentId, null);
    const created = await this.categories.create({
      name: dto.name,
      nameKey: nameKey(dto.name),
      slug,
      parentId: dto.parentId ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isVisible: dto.isVisible ?? true,
      importPattern: dto.importPattern ?? null,
    });
    return this.get(created.id);
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const current = await this.categories.findWithCounts(id);
    if (!current) throw Errors.notFound('Категорію не знайдено');
    await this.assertUnique(dto.name, dto.slug, id);
    if (dto.parentId !== undefined && dto.parentId !== null && dto.parentId !== current.parentId) {
      if (dto.parentId === id) throw Errors.field('parentId', 'Категорія не може бути батьківською для себе');
      if (current._count.children > 0) throw Errors.field('parentId', 'Категорія з підкатегоріями не може стати підкатегорією');
      await this.assertParent(dto.parentId, id);
    }
    await this.categories.update(id, {
      name: dto.name,
      nameKey: dto.name ? nameKey(dto.name) : undefined,
      slug: dto.slug,
      parentId: dto.parentId,
      sortOrder: dto.sortOrder,
      isVisible: dto.isVisible,
      importPattern: dto.importPattern,
    });
    return this.get(id);
  }

  async remove(id: number) {
    const c = await this.categories.findWithCounts(id);
    if (!c) throw Errors.notFound('Категорію не знайдено');
    if (c._count.products > 0 || c._count.children > 0) {
      throw Errors.categoryNotEmpty('Спершу перенесіть товари й підкатегорії в іншу категорію');
    }
    await this.categories.delete(id);
    return { ok: true };
  }

  async createAttribute(categoryId: number, dto: CreateAttributeDto) {
    if (!(await this.categories.exists(categoryId))) throw Errors.notFound('Категорію не знайдено');
    const normalized = CategoryAttributeEntity.normalize(dto.type, dto);
    await this.assertAttributeName(categoryId, dto.name);
    await this.categories.createAttribute({
      categoryId,
      name: dto.name,
      type: dto.type,
      ...normalized,
      sortOrder: dto.sortOrder ?? (await this.categories.maxAttributeSortOrder(categoryId)) + 10,
    });
    return this.get(categoryId);
  }

  async updateAttribute(categoryId: number, attributeId: number, dto: UpdateAttributeDto) {
    const found = await this.categories.findAttribute(categoryId, attributeId);
    if (!found) throw Errors.notFound('Характеристику не знайдено');
    const { attribute, valuesCount } = found;
    if (dto.type && dto.type !== attribute.type && valuesCount > 0) throw Errors.attributeInUse();
    if (dto.name && dto.name !== attribute.name) await this.assertAttributeName(categoryId, dto.name, attributeId);

    const type = dto.type ?? attribute.type;
    const normalized = CategoryAttributeEntity.normalize(type, {
      unit: dto.unit !== undefined ? dto.unit : attribute.unit,
      options: dto.options ?? attribute.options,
      isFilterable: dto.isFilterable ?? attribute.isFilterable,
    });

    const removedValues = await this.transactions.run(async (tx) => {
      let removed = 0;
      if (type === 'enum' && attribute.type === 'enum' && dto.options) {
        const dropped = attribute.options.filter((o) => !dto.options!.includes(o));
        if (dropped.length) removed = await this.categories.deleteValuesWithText(attributeId, dropped, tx);
      }
      await this.categories.updateAttribute(attributeId, { name: dto.name, type, sortOrder: dto.sortOrder, ...normalized }, tx);
      return removed;
    });
    return { ...(await this.get(categoryId)), removedValues };
  }

  async removeAttribute(categoryId: number, attributeId: number) {
    const found = await this.categories.findAttribute(categoryId, attributeId);
    if (!found) throw Errors.notFound('Характеристику не знайдено');
    await this.categories.deleteAttribute(attributeId);
    return { ...(await this.get(categoryId)), removedValues: found.valuesCount };
  }

  private async assertUnique(name: string | undefined, slug: string | undefined, exceptId?: number) {
    if (name) {
      const id = await this.categories.idByNameKey(nameKey(name));
      if (id !== null && id !== exceptId) throw Errors.field('name', 'Категорія з такою назвою вже існує');
    }
    if (slug) {
      const id = await this.categories.idBySlug(slug);
      if (id !== null && id !== exceptId) throw Errors.field('slug', 'Такий slug уже використовується');
    }
  }

  private async assertParent(parentId: number, selfId: number | null) {
    const parent = await this.categories.findWithCounts(parentId);
    if (!parent || parent.id === selfId) throw Errors.field('parentId', 'Батьківську категорію не знайдено');
    if (parent.parentId !== null) throw Errors.field('parentId', 'Допускаються лише два рівні категорій');
    if (parent._count.products > 0) throw Errors.categoryNotEmpty('Батьківська категорія містить товари');
  }

  private async assertAttributeName(categoryId: number, name: string, exceptId?: number) {
    const id = await this.categories.attributeIdByName(categoryId, name);
    if (id !== null && id !== exceptId) throw Errors.field('name', 'Характеристика з такою назвою вже є в категорії');
  }
}
