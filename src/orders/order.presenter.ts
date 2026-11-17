import { centsToString, dateOnly, money, toCents } from '../common/utils';
import type { OrderEntity } from './order.entity';
import type { OrderDetail } from './orders.repository';

export class OrderPresenter {
  static summary(order: OrderEntity) {
    return {
      id: order.id,
      number: order.number,
      createdAt: order.createdAt,
      total: money(order.total),
      status: order.status,
      paymentStatus: order.paymentStatus,
    };
  }

  static clientDetail({ order, items, history }: OrderDetail) {
    return {
      id: order.id,
      number: order.number,
      createdAt: order.createdAt,
      status: order.status,
      statusChangedAt: order.statusChangedAt,
      total: money(order.total),
      delivery: {
        method: order.deliveryMethod,
        address: order.deliveryAddress,
        date: dateOnly(order.deliveryDate),
        slot: order.deliverySlot,
      },
      payment: { method: order.paymentMethod, status: order.paymentStatus },
      contact: { name: order.contactName, phone: order.contactPhone },
      comment: order.comment,
      items: items.map((i) => ({
        productId: i.productId,
        name: i.productName,
        slug: i.product.isVisible && !i.product.isDeleted ? i.product.slug : null,
        unitPrice: money(i.unitPrice),
        quantity: i.quantity,
        lineTotal: centsToString(toCents(i.unitPrice) * i.quantity),
      })),
      history: history.map((h) => ({ fromStatus: h.fromStatus, toStatus: h.toStatus, note: h.note, changedAt: h.changedAt })),
      canCancel: order.canBeCancelledByClient,
    };
  }

  static adminDetail(detail: OrderDetail) {
    return {
      ...OrderPresenter.clientDetail(detail),
      client: detail.user,
      adminNote: detail.order.adminNote,
      allowedTransitions: detail.order.allowedTransitions(),
      history: detail.history.map((h) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        note: h.note,
        changedAt: h.changedAt,
        changedBy: h.changedBy,
      })),
    };
  }
}
