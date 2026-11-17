import { Injectable } from '@nestjs/common';
import type { DeliveryMethod, OrderStatus, PaymentMethod, Prisma } from '../generated/prisma/client';
import { BaseRepository, type Tx } from '../prisma/prisma.service';
import { OrderEntity } from './order.entity';

const detailInclude = {
  user: { select: { id: true, fullName: true, email: true, phone: true } },
  items: {
    orderBy: { id: 'asc' },
    include: { product: { select: { slug: true, isVisible: true, isDeleted: true } } },
  },
  history: {
    orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
    include: { changedBy: { select: { id: true, fullName: true, role: true } } },
  },
} satisfies Prisma.OrderInclude;

type DetailRow = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;

export interface OrderDetail {
  order: OrderEntity;
  user: DetailRow['user'];
  items: DetailRow['items'];
  history: DetailRow['history'];
}

export interface NewOrder {
  userId: number;
  clientOrderId: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string | null;
  deliveryDate: Date | null;
  deliverySlot: string | null;
  paymentMethod: PaymentMethod;
  contactName: string;
  contactPhone: string;
  comment: string | null;
  total: string;
  items: { productId: number; productName: string; unitPrice: string; quantity: number }[];
}

const clientSelect = { id: true, fullName: true, email: true } satisfies Prisma.UserSelect;

@Injectable()
export class OrdersRepository extends BaseRepository {
  async idByClientOrderId(userId: number, clientOrderId: string): Promise<number | null> {
    const row = await this.prisma.order.findUnique({
      where: { userId_clientOrderId: { userId, clientOrderId } },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async create(data: NewOrder, tx: Tx): Promise<number> {
    const { items, ...order } = data;
    const created = await tx.order.create({
      data: { ...order, status: 'new', items: { create: items } },
      select: { id: true },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: created.id, fromStatus: null, toStatus: 'new', changedById: data.userId },
    });
    return created.id;
  }

  async findEntity(id: number, userId?: number): Promise<OrderEntity | null> {
    const row = await this.prisma.order.findFirst({ where: { id, ...(userId !== undefined ? { userId } : {}) } });
    return row ? OrderEntity.from(row) : null;
  }

  async findDetail(id: number, userId?: number): Promise<OrderDetail | null> {
    const row = await this.prisma.order.findFirst({
      where: { id, ...(userId !== undefined ? { userId } : {}) },
      include: detailInclude,
    });
    if (!row) return null;
    const { user, items, history, ...order } = row;
    return { order: OrderEntity.from(order), user, items, history };
  }

  countForUser(userId: number): Promise<number> {
    return this.prisma.order.count({ where: { userId } });
  }

  async findPageForUser(userId: number, skip: number, take: number) {
    const rows = await this.prisma.order.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      include: { items: { select: { quantity: true } } },
    });
    return rows.map(({ items, ...order }) => ({
      order: OrderEntity.from(order),
      itemsCount: items.reduce((sum, i) => sum + i.quantity, 0),
    }));
  }

  async findAllForUser(userId: number): Promise<OrderEntity[]> {
    const rows = await this.prisma.order.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    return rows.map(OrderEntity.from);
  }

  count(where: Prisma.OrderWhereInput): Promise<number> {
    return this.prisma.order.count({ where });
  }

  async findPage(where: Prisma.OrderWhereInput, orderBy: Prisma.OrderOrderByWithRelationInput[], skip: number, take: number) {
    const rows = await this.prisma.order.findMany({ where, orderBy, skip, take, include: { user: { select: clientSelect } } });
    return rows.map(({ user, ...order }) => ({ order: OrderEntity.from(order), client: user }));
  }

  staleWhere(now: Date): Prisma.OrderWhereInput {
    return {
      OR: OrderEntity.staleBefore(now).map(({ status, changedBefore }) => ({ status, statusChangedAt: { lt: changedBefore } })),
    };
  }

  async changeStatus(id: number, from: OrderStatus, to: OrderStatus, actorId: number, note: string | null, tx: Tx): Promise<boolean> {
    const changedAt = new Date();
    const updated = await tx.order.updateMany({ where: { id, status: from }, data: { status: to, statusChangedAt: changedAt } });
    if (updated.count === 0) return false;
    await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: from, toStatus: to, changedById: actorId, note, changedAt } });
    return true;
  }

  update(id: number, data: Prisma.OrderUpdateInput) {
    return this.prisma.order.update({ where: { id }, data });
  }
}
