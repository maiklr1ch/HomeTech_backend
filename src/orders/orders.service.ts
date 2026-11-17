import { Injectable } from '@nestjs/common';
import { CartService } from '../catalog/cart.service';
import { Errors } from '../common/errors';
import { centsToString, money, pageWindow } from '../common/utils';
import { TransactionManager } from '../prisma/prisma.service';
import type { UserEntity } from '../users/user.entity';
import { OrderEntity } from './order.entity';
import { OrderPresenter } from './order.presenter';
import { OrdersRepository } from './orders.repository';
import type { CreateOrderDto } from './orders.schemas';

@Injectable()
export class OrdersService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly cart: CartService,
    private readonly transactions: TransactionManager,
  ) {}

  async create(user: UserEntity, dto: CreateOrderDto): Promise<{ created: boolean; order: { id: number; number: string } }> {
    if (!user.isClient()) throw Errors.forbidden('Замовлення оформлює клієнт');

    const existingId = await this.orders.idByClientOrderId(user.id, dto.clientOrderId);
    if (existingId) return { created: false, order: { id: existingId, number: OrderEntity.numberOf(existingId) } };
    if (!dto.items.length) throw Errors.cartEmpty();

    const { lines, totalCents, issues } = await this.cart.check(dto.items);
    if (issues.length) throw Errors.cartChanged(issues);

    try {
      const id = await this.transactions.run((tx) =>
        this.orders.create(
          {
            userId: user.id,
            clientOrderId: dto.clientOrderId,
            deliveryMethod: dto.deliveryMethod,
            deliveryAddress: dto.deliveryMethod === 'pickup' ? null : dto.deliveryAddress,
            deliveryDate: dto.deliveryMethod === 'courier' && dto.deliveryDate ? new Date(`${dto.deliveryDate}T00:00:00Z`) : null,
            deliverySlot: dto.deliveryMethod === 'courier' ? (dto.deliverySlot ?? null) : null,
            paymentMethod: dto.paymentMethod,
            contactName: dto.contactName,
            contactPhone: dto.contactPhone,
            comment: dto.comment,
            total: centsToString(totalCents),
            items: lines.map((l) => ({
              productId: l.productId,
              productName: l.name ?? '',
              unitPrice: centsToString(l.priceCents ?? 0),
              quantity: l.quantity,
            })),
          },
          tx,
        ),
      );
      return { created: true, order: { id, number: OrderEntity.numberOf(id) } };
    } catch (e) {
      const againId = await this.orders.idByClientOrderId(user.id, dto.clientOrderId);
      if (againId) return { created: false, order: { id: againId, number: OrderEntity.numberOf(againId) } };
      throw e;
    }
  }

  async list(user: UserEntity, page: number) {
    const total = await this.orders.countForUser(user.id);
    const win = pageWindow(page, total);
    const rows = await this.orders.findPageForUser(user.id, win.skip, win.take);
    return {
      items: rows.map(({ order, itemsCount }) => ({
        id: order.id,
        number: order.number,
        createdAt: order.createdAt,
        itemsCount,
        total: money(order.total),
        status: order.status,
        paymentStatus: order.paymentStatus,
      })),
      page: win.page,
      pageSize: win.pageSize,
      total,
    };
  }

  async get(user: UserEntity, id: number) {
    const detail = await this.orders.findDetail(id, user.id);
    if (!detail) throw Errors.notFound('Замовлення не знайдено');
    return OrderPresenter.clientDetail(detail);
  }

  async cancel(user: UserEntity, id: number, reason: string | null) {
    const order = await this.orders.findEntity(id, user.id);
    if (!order) throw Errors.notFound('Замовлення не знайдено');
    if (!order.canBeCancelledByClient) {
      throw Errors.invalidTransition('Замовлення вже зібране, скасування неможливе. Зверніться до магазину');
    }
    const changed = await this.transactions.run((tx) => this.orders.changeStatus(id, order.status, 'cancelled', user.id, reason, tx));
    if (!changed) throw Errors.invalidTransition('Статус замовлення змінився. Оновіть сторінку');
    return this.get(user, id);
  }
}
