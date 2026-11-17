import type {
  DeliveryMethod,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '../generated/prisma/client';

const HOUR_MS = 60 * 60 * 1000;

export class OrderEntity implements Order {
  id: number;
  userId: number;
  clientOrderId: string;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string | null;
  deliveryDate: Date | null;
  deliverySlot: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  contactName: string;
  contactPhone: string;
  comment: string | null;
  adminNote: string | null;
  total: Prisma.Decimal;
  statusChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  static readonly STATUSES = ['new', 'processing', 'assembled', 'shipped', 'delivered', 'cancelled'] as const;
  static readonly DELIVERY_SLOTS = ['09:00–12:00', '12:00–15:00', '15:00–18:00', '18:00–21:00'] as const;
  static readonly PAYMENT_BY_DELIVERY: Record<DeliveryMethod, PaymentMethod[]> = {
    pickup: ['cash', 'card', 'invoice'],
    courier: ['cash', 'card', 'invoice'],
    nova_poshta: ['cod', 'invoice'],
  };
  static readonly CLIENT_CANCELLABLE: OrderStatus[] = ['new', 'processing'];
  static readonly STALE_AFTER_HOURS: Partial<Record<OrderStatus, number>> = {
    new: 24,
    processing: 48,
    assembled: 72,
    shipped: 14 * 24,
  };

  static from(row: Order): OrderEntity {
    return Object.assign(new OrderEntity(), row);
  }

  static numberOf(id: number): string {
    return `DT-${String(id).padStart(6, '0')}`;
  }

  static parseNumber(value: string): number | null {
    const m = value.trim().toUpperCase().match(/^(?:DT-?)?(\d{1,9})$/);
    return m ? Number(m[1]) : null;
  }

  static transitionsFrom(status: OrderStatus, delivery: DeliveryMethod): OrderStatus[] {
    switch (status) {
      case 'new':
        return ['processing', 'cancelled'];
      case 'processing':
        return ['assembled', 'cancelled'];
      case 'assembled':
        return delivery === 'pickup' ? ['delivered'] : ['shipped'];
      case 'shipped':
        return ['delivered'];
      default:
        return [];
    }
  }

  static isPaymentAllowed(delivery: DeliveryMethod, payment: PaymentMethod): boolean {
    return OrderEntity.PAYMENT_BY_DELIVERY[delivery].includes(payment);
  }

  static staleBefore(now: Date): { status: OrderStatus; changedBefore: Date }[] {
    return Object.entries(OrderEntity.STALE_AFTER_HOURS).map(([status, hours]) => ({
      status: status as OrderStatus,
      changedBefore: new Date(now.getTime() - (hours as number) * HOUR_MS),
    }));
  }

  get number(): string {
    return OrderEntity.numberOf(this.id);
  }

  get canBeCancelledByClient(): boolean {
    return OrderEntity.CLIENT_CANCELLABLE.includes(this.status);
  }

  allowedTransitions(): OrderStatus[] {
    return OrderEntity.transitionsFrom(this.status, this.deliveryMethod);
  }

  canTransitionTo(status: OrderStatus): boolean {
    return this.allowedTransitions().includes(status);
  }

  hoursInStatus(now = new Date()): number {
    return Math.floor((now.getTime() - this.statusChangedAt.getTime()) / HOUR_MS);
  }
}
