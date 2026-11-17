import { Injectable } from '@nestjs/common';
import type { CartIssue } from '../common/errors';
import { centsToString, imageUrl, money, toCents } from '../common/utils';
import { ProductEntity } from '../products/product.entity';
import { CatalogRepository } from './catalog.repository';
import type { CartItemInput } from './catalog.schemas';
import { ProductVisibility } from './visibility';

export interface CartLine {
  productId: number;
  name: string | null;
  slug: string | null;
  imageUrl: string | null;
  price: string | null;
  priceCents: number | null;
  stockStatus: string | null;
  quantity: number;
  lineTotal: string;
  issue: CartIssue['issue'] | null;
}

export interface CartCheck {
  lines: CartLine[];
  totalCents: number;
  issues: CartIssue[];
}

@Injectable()
export class CartService {
  constructor(private readonly repository: CatalogRepository) {}

  async check(items: CartItemInput[]): Promise<CartCheck> {
    const products = await this.repository.findProductsForCart(items.map((i) => i.productId));
    const byId = new Map(products.map((p) => [p.id, p]));

    let totalCents = 0;
    const issues: CartIssue[] = [];
    const lines = items.map((item): CartLine => {
      const p = byId.get(item.productId);
      const visible = !!p && ProductVisibility.isVisible(p);
      const priceCents = visible && p.price !== null ? toCents(p.price) : null;
      let issue: CartLine['issue'] = null;
      if (!visible) issue = 'UNAVAILABLE';
      else if (!ProductEntity.isOrderableStock(p.stockStatus)) issue = 'OUT_OF_STOCK';
      else if (item.price !== undefined && Math.round(item.price * 100) !== priceCents) issue = 'PRICE_CHANGED';

      const counted = issue !== 'UNAVAILABLE' && issue !== 'OUT_OF_STOCK';
      const lineCents = priceCents === null ? 0 : priceCents * item.quantity;
      if (counted) totalCents += lineCents;
      if (issue) issues.push({ productId: item.productId, issue, currentPrice: priceCents === null ? null : centsToString(priceCents) });

      return {
        productId: item.productId,
        name: p?.name ?? null,
        slug: visible ? p.slug : null,
        imageUrl: p ? imageUrl(p) : null,
        price: money(priceCents === null ? null : priceCents / 100),
        priceCents,
        stockStatus: p?.stockStatus ?? null,
        quantity: item.quantity,
        lineTotal: centsToString(counted ? lineCents : 0),
        issue,
      };
    });

    return { lines, totalCents, issues };
  }

  async validate(items: CartItemInput[]) {
    const { lines, totalCents, issues } = await this.check(items);
    return {
      items: lines.map(({ priceCents, ...line }) => line),
      total: centsToString(totalCents),
      canCheckout: lines.length > 0 && !issues.some((i) => i.issue !== 'PRICE_CHANGED'),
    };
  }
}
