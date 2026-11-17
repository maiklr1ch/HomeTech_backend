import { Injectable } from '@nestjs/common';
import { Errors } from '../common/errors';
import { addDays, kyivDayStart, money, pageWindow, type Page } from '../common/utils';
import type { OrderStatus, Prisma } from '../generated/prisma/client';
import { TransactionManager } from '../prisma/prisma.service';
import type { UserEntity } from '../users/user.entity';
import { OrderEntity } from './order.entity';
import { OrderPresenter } from './order.presenter';
import { OrdersRepository } from './orders.repository';
import type { AdminOrderPatchDto, StatusChangeDto } from './orders.schemas';

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly transactions: TransactionManager,
  ) {}

  async list(query: Record<string, unknown>) {
    const and: Prisma.OrderWhereInput[] = [];
    const str = (k: string) => (typeof query[k] === 'string' ? (query[k] as string).trim() : '');

    const statuses = str('status')
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is OrderStatus => (OrderEntity.STATUSES as readonly string[]).includes(s));
    if (statuses.length) and.push({ status: { in: statuses } });

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRe.test(str('dateFrom'))) and.push({ createdAt: { gte: kyivDayStart(str('dateFrom')) } });
    if (dateRe.test(str('dateTo'))) and.push({ createdAt: { lt: kyivDayStart(addDays(str('dateTo'), 1)) } });

    const client = str('client');
    if (client) {
      and.push({
        user: {
          is: {
            OR: [
              { fullName: { contains: client, mode: 'insensitive' } },
              { email: { contains: client, mode: 'insensitive' } },
              { phone: { contains: client.replace(/[\s()-]/g, '') } },
            ],
          },
        },
      });
    }
    if (str('number')) and.push({ id: OrderEntity.parseNumber(str('number')) ?? -1 });

    const where: Prisma.OrderWhereInput = { AND: and };
    const total = await this.orders.count(where);
    const page = Number(str('page') || 1);
    const win = pageWindow(Number.isInteger(page) && page > 0 ? page : 1, total);
    const rows = await this.orders.findPage(where, [{ createdAt: 'desc' }, { id: 'desc' }], win.skip, win.take);
    return {
      items: rows.map(({ order, client }) => ({
        id: order.id,
        number: order.number,
        createdAt: order.createdAt,
        client,
        total: money(order.total),
        deliveryMethod: order.deliveryMethod,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
      })),
      page: win.page,
      pageSize: win.pageSize,
      total,
    } satisfies Page<unknown>;
  }

  async stale(page: number) {
    const now = new Date();
    const where = this.orders.staleWhere(now);
    const total = await this.orders.count(where);
    const win = pageWindow(page, total);
    const rows = await this.orders.findPage(where, [{ statusChangedAt: 'asc' }, { id: 'asc' }], win.skip, win.take);
    return {
      items: rows.map(({ order, client }) => ({
        id: order.id,
        number: order.number,
        createdAt: order.createdAt,
        status: order.status,
        statusChangedAt: order.statusChangedAt,
        hoursInStatus: order.hoursInStatus(now),
        allowedHours: OrderEntity.STALE_AFTER_HOURS[order.status] ?? null,
        deliveryMethod: order.deliveryMethod,
        contact: { name: order.contactName, phone: order.contactPhone },
        client,
      })),
      page: win.page,
      pageSize: win.pageSize,
      total,
    };
  }

  async get(id: number) {
    const detail = await this.orders.findDetail(id);
    if (!detail) throw Errors.notFound('Замовлення не знайдено');
    return OrderPresenter.adminDetail(detail);
  }

  async changeStatus(admin: UserEntity, id: number, dto: StatusChangeDto) {
    const order = await this.orders.findEntity(id);
    if (!order) throw Errors.notFound('Замовлення не знайдено');
    if (order.status !== dto.fromStatus) throw Errors.statusConflict();
    if (!order.canTransitionTo(dto.toStatus)) throw Errors.invalidTransition();
    if (dto.toStatus === 'cancelled' && (!dto.note || dto.note.length < 3)) {
      throw Errors.field('note', 'Вкажіть причину скасування (від 3 символів)');
    }
    const changed = await this.transactions.run((tx) => this.orders.changeStatus(id, dto.fromStatus, dto.toStatus, admin.id, dto.note, tx));
    if (!changed) throw Errors.statusConflict();
    return this.get(id);
  }

  async patch(id: number, dto: AdminOrderPatchDto) {
    if (!(await this.orders.findEntity(id))) throw Errors.notFound('Замовлення не знайдено');
    await this.orders.update(id, { paymentStatus: dto.paymentStatus, adminNote: dto.adminNote });
    return this.get(id);
  }
}
