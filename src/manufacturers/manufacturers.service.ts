import { Injectable } from '@nestjs/common';
import { Errors } from '../common/errors';
import { nameKey, pageWindow } from '../common/utils';
import { type Tx } from '../prisma/prisma.service';
import { ManufacturersRepository } from './manufacturers.repository';
import type { CreateManufacturerDto, UpdateManufacturerDto } from './manufacturers.schemas';

@Injectable()
export class ManufacturersService {
  constructor(private readonly manufacturers: ManufacturersRepository) {}

  async list(q: string, page: number) {
    const total = await this.manufacturers.count(q);
    const win = pageWindow(page, total);
    return { items: await this.manufacturers.findPage(q, win.skip, win.take), page: win.page, pageSize: win.pageSize, total };
  }

  async create(dto: CreateManufacturerDto) {
    await this.assertNameFree(dto.name);
    const m = await this.manufacturers.create({ name: dto.name, nameKey: nameKey(dto.name), country: dto.country ?? null });
    return { id: m.id, name: m.name, country: m.country, productCount: 0 };
  }

  async update(id: number, dto: UpdateManufacturerDto) {
    if (!(await this.manufacturers.findById(id))) throw Errors.notFound('Виробника не знайдено');
    if (dto.name) await this.assertNameFree(dto.name, id);
    const m = await this.manufacturers.update(id, {
      name: dto.name,
      nameKey: dto.name ? nameKey(dto.name) : undefined,
      country: dto.country,
    });
    return { id: m.id, name: m.name, country: m.country, productCount: await this.manufacturers.countActiveProducts(id) };
  }

  async remove(id: number) {
    if (!(await this.manufacturers.findById(id))) throw Errors.notFound('Виробника не знайдено');
    if ((await this.manufacturers.countActiveProducts(id)) > 0) throw Errors.manufacturerInUse();
    await this.manufacturers.delete(id);
    return { ok: true };
  }

  async resolve(tx: Tx, manufacturerId: number | null | undefined, manufacturerName: string | undefined) {
    if (manufacturerName) {
      const key = nameKey(manufacturerName);
      const found = await this.manufacturers.findByNameKey(key, tx);
      if (found) return found.id;
      return (await this.manufacturers.create({ name: manufacturerName.trim(), nameKey: key }, tx)).id;
    }
    if (manufacturerId === undefined || manufacturerId === null) return manufacturerId;
    if (!(await this.manufacturers.findById(manufacturerId, tx))) throw Errors.field('manufacturerId', 'Виробника не знайдено');
    return manufacturerId;
  }

  private async assertNameFree(name: string, exceptId?: number) {
    const other = await this.manufacturers.findByNameKey(nameKey(name));
    if (other && other.id !== exceptId) throw Errors.field('name', 'Виробник з такою назвою вже існує');
  }
}
