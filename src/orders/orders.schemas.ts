import { z } from 'zod';
import { cartItemSchema } from '../catalog/catalog.schemas';
import { fullNameSchema, moneySchema, optionalText, phoneSchema } from '../common/schemas';
import { addDays, kyivToday } from '../common/utils';
import { OrderEntity } from './order.entity';

export const createOrderSchema = z
  .object({
    clientOrderId: z.string().uuid(),
    items: z
      .array(cartItemSchema.extend({ price: moneySchema }))
      .max(50)
      .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, 'Товари в кошику повторюються'),
    deliveryMethod: z.enum(['pickup', 'courier', 'nova_poshta']),
    deliveryAddress: optionalText(200),
    deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата у форматі РРРР-ММ-ДД').nullish(),
    deliverySlot: z.string().nullish(),
    paymentMethod: z.enum(['cash', 'card', 'cod', 'invoice']),
    contactName: fullNameSchema,
    contactPhone: phoneSchema,
    comment: optionalText(1000),
  })
  .superRefine((o, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (o.deliveryMethod === 'courier') {
      if (!o.deliveryAddress || o.deliveryAddress.length < 5) issue('deliveryAddress', 'Вкажіть адресу доставки (від 5 символів)');
      const today = kyivToday();
      if (!o.deliveryDate) issue('deliveryDate', 'Вкажіть бажану дату доставки');
      else if (o.deliveryDate < addDays(today, 1) || o.deliveryDate > addDays(today, 14))
        issue('deliveryDate', 'Дата доставки — від завтра до 14 днів');
      if (!o.deliverySlot || !(OrderEntity.DELIVERY_SLOTS as readonly string[]).includes(o.deliverySlot))
        issue('deliverySlot', `Інтервал: ${OrderEntity.DELIVERY_SLOTS.join(', ')}`);
    }
    if (o.deliveryMethod === 'nova_poshta' && (!o.deliveryAddress || o.deliveryAddress.length < 3))
      issue('deliveryAddress', 'Вкажіть місто й номер відділення або поштомата Нової пошти');
    if (!OrderEntity.isPaymentAllowed(o.deliveryMethod, o.paymentMethod))
      issue('paymentMethod', 'Цей спосіб оплати недоступний для обраної доставки');
  });

export const cancelSchema = z.object({ reason: optionalText(500) });

export const statusChangeSchema = z.object({
  fromStatus: z.enum(OrderEntity.STATUSES),
  toStatus: z.enum(OrderEntity.STATUSES),
  note: optionalText(500),
});

export const adminOrderPatchSchema = z
  .object({
    paymentStatus: z.enum(['unpaid', 'paid']).optional(),
    adminNote: optionalText(1000).optional(),
  })
  .strict();

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type CancelOrderDto = z.infer<typeof cancelSchema>;
export type StatusChangeDto = z.infer<typeof statusChangeSchema>;
export type AdminOrderPatchDto = z.infer<typeof adminOrderPatchSchema>;
