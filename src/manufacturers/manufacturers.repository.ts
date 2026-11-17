import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { BaseRepository, type Tx } from '../prisma/prisma.service';

const activeProducts = { where: { isDeleted: false } } as const;

@Injectable()
export class ManufacturersRepository extends BaseRepository {
  private searchWhere(q: string): Prisma.ManufacturerWhereInput {
    return q ? { name: { contains: q, mode: 'insensitive' } } : {};
  }

  count(q: string): Promise<number> {
    return this.prisma.manufacturer.count({ where: this.searchWhere(q) });
  }

  async findPage(q: string, skip: number, take: number) {
    const rows = await this.prisma.manufacturer.findMany({
      where: this.searchWhere(q),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip,
      take,
      include: { _count: { select: { products: activeProducts } } },
    });
    return rows.map(({ _count, ...m }) => ({ id: m.id, name: m.name, country: m.country, productCount: _count.products }));
  }

  findById(id: number, tx?: Tx) {
    return this.db(tx).manufacturer.findUnique({ where: { id } });
  }

  findByNameKey(key: string, tx?: Tx) {
    return this.db(tx).manufacturer.findUnique({ where: { nameKey: key } });
  }

  create(data: { name: string; nameKey: string; country?: string | null }, tx?: Tx) {
    return this.db(tx).manufacturer.create({ data });
  }

  update(id: number, data: Prisma.ManufacturerUpdateInput) {
    return this.prisma.manufacturer.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.manufacturer.delete({ where: { id } });
  }

  countActiveProducts(id: number): Promise<number> {
    return this.prisma.product.count({ where: { manufacturerId: id, isDeleted: false } });
  }

  async idsByNameKey(tx?: Tx): Promise<Map<string, number>> {
    const rows = await this.db(tx).manufacturer.findMany({ select: { id: true, nameKey: true } });
    return new Map(rows.map((m) => [m.nameKey, m.id]));
  }

  createMany(items: { name: string; nameKey: string }[], tx?: Tx) {
    return this.db(tx).manufacturer.createManyAndReturn({ data: items, select: { id: true, nameKey: true } });
  }
}
