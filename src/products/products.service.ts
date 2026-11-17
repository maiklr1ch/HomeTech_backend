import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from '../categories/categories.repository';
import { CategoryAttributeEntity, type StoredAttributeValue } from '../categories/category-attribute.entity';
import { Errors, type FieldErrors } from '../common/errors';
import { money, pageWindow } from '../common/utils';
import type { Prisma } from '../generated/prisma/client';
import { ManufacturersService } from '../manufacturers/manufacturers.service';
import { TransactionManager, type Tx } from '../prisma/prisma.service';
import { ImageStorage } from './image-storage';
import { ProductEntity } from './product.entity';
import { ProductsRepository } from './products.repository';
import type { AttributeValueInput, CreateProductDto, UpdateProductDto } from './products.schemas';

const STOCK_STATUSES = ['in_stock', 'expected', 'out_of_stock'] as const;

@Injectable()
export class ProductsService {
  constructor(
    private readonly products: ProductsRepository,
    private readonly categories: CategoriesRepository,
    private readonly manufacturers: ManufacturersService,
    private readonly images: ImageStorage,
    private readonly transactions: TransactionManager,
  ) {}

  async list(query: Record<string, unknown>) {
    const str = (k: string) => (typeof query[k] === 'string' ? (query[k] as string).trim() : '');
    const and: Prisma.ProductWhereInput[] = [{ isDeleted: false }];

    const q = str('q');
    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { supplierCode: { contains: q } },
        ],
      });
    }
    const category = str('category');
    if (category === 'none') and.push({ categoryId: null });
    else if (/^\d+$/.test(category)) and.push({ categoryId: Number(category) });
    if (/^\d+$/.test(str('manufacturer'))) and.push({ manufacturerId: Number(str('manufacturer')) });
    if (str('visibility') === 'visible') and.push({ isVisible: true });
    if (str('visibility') === 'hidden') and.push({ isVisible: false });
    const stock = STOCK_STATUSES.find((s) => s === str('stock'));
    if (stock) and.push({ stockStatus: stock });
    if (str('source') === 'katran') and.push({ supplierCode: { not: null } });
    if (str('source') === 'manual') and.push({ supplierCode: null });

    const where: Prisma.ProductWhereInput = { AND: and };
    const total = await this.products.count(where);
    const page = Number(str('page') || 1);
    const win = pageWindow(Number.isInteger(page) && page > 0 ? page : 1, total);
    const rows = await this.products.findPage(where, win.skip, win.take);
    return {
      items: rows.map(({ product: p, category: c, manufacturer: m }) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        supplierCode: p.supplierCode,
        source: p.source,
        imageUrl: p.imageUrl,
        category: c,
        manufacturer: m,
        price: money(p.price),
        supplierPrice: money(p.supplierPrice),
        stockStatus: p.stockStatus,
        isVisible: p.isVisible,
        updatedAt: p.updatedAt,
      })),
      page: win.page,
      pageSize: win.pageSize,
      total,
    };
  }

  async get(id: number) {
    const found = await this.products.findDetail(id);
    if (!found) throw Errors.notFound('Товар не знайдено');
    const { product: p, category, manufacturer, attributeValues } = found;
    const values = new Map(attributeValues.map((v) => [v.attributeId, v]));
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      supplierCode: p.supplierCode,
      source: p.source,
      category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
      manufacturer,
      price: money(p.price),
      supplierPrice: money(p.supplierPrice),
      stockStatus: p.stockStatus,
      warrantyMonths: p.warrantyMonths,
      description: p.description,
      assemblyCountry: p.assemblyCountry,
      assemblyCity: p.assemblyCity,
      isVisible: p.isVisible,
      imageUrl: p.imageUrl,
      ownImageUrl: p.ownImageUrl,
      supplierImageUrl: p.supplierImageUrl,
      updatedFromSupplierAt: p.updatedFromSupplierAt,
      importUpdatesFields: p.importUpdatesFields,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      attributes: (category?.attributes ?? []).map((row) => {
        const a = CategoryAttributeEntity.from(row);
        return {
          id: a.id,
          name: a.name,
          type: a.type,
          unit: a.unit,
          options: a.type === 'enum' ? a.options : undefined,
          value: a.read(values.get(a.id)),
        };
      }),
    };
  }

  async create(dto: CreateProductDto) {
    const id = await this.transactions.run(async (tx) => {
      const categoryId = dto.categoryId ?? null;
      const attributes = await this.categoryAttributes(tx, categoryId);
      const manufacturerId = await this.manufacturers.resolve(tx, dto.manufacturerId, dto.manufacturerName);
      const price = dto.price ?? null;
      const isVisible = dto.isVisible ?? false;
      ProductEntity.assertPublishable(isVisible, categoryId, price);

      const product = await this.products.create(
        {
          name: dto.name,
          stockStatus: dto.stockStatus,
          categoryId,
          manufacturerId: manufacturerId ?? null,
          sku: dto.sku ?? null,
          price,
          warrantyMonths: dto.warrantyMonths ?? null,
          description: dto.description ?? null,
          assemblyCountry: dto.assemblyCountry ?? null,
          assemblyCity: dto.assemblyCity ?? null,
          isVisible,
        },
        tx,
      );
      await this.writeAttributes(tx, product.id, attributes, dto.attributes ?? []);
      return product.id;
    });
    return this.get(id);
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.transactions.run(async (tx) => {
      const current = await this.products.findActive(id, tx);
      if (!current) throw Errors.notFound('Товар не знайдено');

      const categoryChanged = dto.categoryId !== undefined && dto.categoryId !== current.categoryId;
      const categoryId = dto.categoryId !== undefined ? dto.categoryId : current.categoryId;
      const attributes = await this.categoryAttributes(tx, categoryId, !categoryChanged);
      const manufacturerId = await this.manufacturers.resolve(tx, dto.manufacturerId, dto.manufacturerName);
      const price = dto.price !== undefined ? dto.price : current.priceValue;
      const isVisible = dto.isVisible ?? current.isVisible;
      ProductEntity.assertPublishable(isVisible, categoryId, price);

      if (categoryChanged) await this.products.deleteAttributeValues(id, 'all', tx);
      await this.products.update(
        id,
        {
          name: dto.name,
          stockStatus: dto.stockStatus,
          categoryId: dto.categoryId,
          manufacturerId,
          sku: dto.sku,
          price: dto.price,
          warrantyMonths: dto.warrantyMonths,
          description: dto.description,
          assemblyCountry: dto.assemblyCountry,
          assemblyCity: dto.assemblyCity,
          isVisible,
        },
        tx,
      );
      if (dto.attributes) await this.writeAttributes(tx, id, attributes, dto.attributes);
    });
    return this.get(id);
  }

  async remove(id: number) {
    if (!(await this.products.softDelete(id))) throw Errors.notFound('Товар не знайдено');
    return { ok: true };
  }

  async setImage(id: number, file: Express.Multer.File | undefined) {
    if (!file) throw Errors.field('file', 'Оберіть файл фото');
    const extension = ProductEntity.IMAGE_TYPES[file.mimetype];
    if (!extension) throw Errors.field('file', 'Фото має бути у форматі JPEG, PNG або WebP');
    const product = await this.products.findActive(id);
    if (!product) throw Errors.notFound('Товар не знайдено');

    const path = await this.images.saveProductImage(id, extension, file.buffer);
    await this.products.update(id, { ownImagePath: path });
    await this.images.remove(product.ownImagePath);
    return this.get(id);
  }

  async removeImage(id: number) {
    const product = await this.products.findActive(id);
    if (!product) throw Errors.notFound('Товар не знайдено');
    if (product.ownImagePath) {
      await this.products.update(id, { ownImagePath: null });
      await this.images.remove(product.ownImagePath);
    }
    return this.get(id);
  }

  private async categoryAttributes(tx: Tx, categoryId: number | null, skipLeafCheck = false): Promise<CategoryAttributeEntity[]> {
    if (!categoryId) return [];
    const category = await this.categories.findLeafAttributes(categoryId, tx);
    if (!category) throw Errors.field('categoryId', 'Категорію не знайдено');
    if (!skipLeafCheck && category.childrenCount > 0) throw Errors.categoryNotLeaf();
    return category.attributes;
  }

  private async writeAttributes(tx: Tx, productId: number, attributes: CategoryAttributeEntity[], values: AttributeValueInput[]) {
    if (!values.length) return;
    const byId = new Map(attributes.map((a) => [a.id, a]));
    const fields: FieldErrors = {};
    const toSave: StoredAttributeValue[] = [];
    const toDelete: number[] = [];

    for (const { attributeId, value } of values) {
      const key = `attributes.${attributeId}`;
      const attribute = byId.get(attributeId);
      if (!attribute) {
        fields[key] = 'Характеристика не належить категорії товару';
        continue;
      }
      if (value === null || (typeof value === 'string' && value.trim() === '')) {
        toDelete.push(attributeId);
        continue;
      }
      const stored = attribute.toStored(value);
      if (typeof stored === 'string') fields[key] = stored;
      else toSave.push(stored);
    }
    if (Object.keys(fields).length) throw Errors.validation(fields);

    if (toDelete.length) await this.products.deleteAttributeValues(productId, toDelete, tx);
    await this.products.saveAttributeValues(productId, toSave, tx);
  }
}
