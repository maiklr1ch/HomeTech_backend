import type { Prisma } from '../generated/prisma/client';

export interface VisibilityProjection {
  isVisible: boolean;
  isDeleted: boolean;
  price: unknown;
  category: { isVisible: boolean; parent: { isVisible: boolean } | null } | null;
}

export class ProductVisibility {
  static readonly categoryWhere: Prisma.CategoryWhereInput = {
    isVisible: true,
    OR: [{ parentId: null }, { parent: { is: { isVisible: true } } }],
  };

  static readonly productWhere: Prisma.ProductWhereInput = {
    isVisible: true,
    isDeleted: false,
    price: { not: null },
    category: { is: ProductVisibility.categoryWhere },
  };

  static readonly select = {
    isVisible: true,
    isDeleted: true,
    price: true,
    category: { select: { isVisible: true, parent: { select: { isVisible: true } } } },
  } satisfies Prisma.ProductSelect;

  static isVisible(p: VisibilityProjection): boolean {
    return (
      p.isVisible &&
      !p.isDeleted &&
      p.price !== null &&
      !!p.category &&
      p.category.isVisible &&
      (!p.category.parent || p.category.parent.isVisible)
    );
  }
}
