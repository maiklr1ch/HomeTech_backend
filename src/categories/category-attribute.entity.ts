import { Errors } from '../common/errors';
import type { AttributeType, CategoryAttribute } from '../generated/prisma/client';

export interface StoredAttributeValue {
  attributeId: number;
  valueNumber: number | null;
  valueText: string | null;
  valueBool: boolean | null;
}

export type AttributeValue = number | string | boolean | null;

export class CategoryAttributeEntity implements CategoryAttribute {
  id: number;
  categoryId: number;
  name: string;
  type: AttributeType;
  unit: string | null;
  options: string[];
  isFilterable: boolean;
  sortOrder: number;

  static readonly TEXT_MAX_LENGTH = 200;

  static from(row: CategoryAttribute): CategoryAttributeEntity {
    return Object.assign(new CategoryAttributeEntity(), row);
  }

  static normalize(
    type: AttributeType,
    input: { unit?: string | null; options?: string[]; isFilterable?: boolean },
  ): { unit: string | null; options: string[]; isFilterable: boolean } {
    if (type === 'enum' && (!input.options || input.options.length < 2)) {
      throw Errors.field('options', 'Для переліку потрібно від 2 до 30 варіантів');
    }
    if (type === 'text' && input.isFilterable) {
      throw Errors.field('isFilterable', 'Текстова характеристика не використовується у фільтрах');
    }
    return {
      unit: type === 'number' ? (input.unit ?? null) : null,
      options: type === 'enum' ? (input.options ?? []) : [],
      isFilterable: type === 'text' ? false : (input.isFilterable ?? false),
    };
  }

  toStored(value: Exclude<AttributeValue, null>): StoredAttributeValue | string {
    const row: StoredAttributeValue = { attributeId: this.id, valueNumber: null, valueText: null, valueBool: null };
    switch (this.type) {
      case 'number': {
        const n = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
        if (typeof n !== 'number' || !Number.isFinite(n)) return 'Потрібне число';
        row.valueNumber = n;
        return row;
      }
      case 'bool':
        if (typeof value !== 'boolean') return 'Потрібне значення так/ні';
        row.valueBool = value;
        return row;
      case 'enum':
        if (typeof value !== 'string' || !this.options.includes(value)) return 'Значення не входить до переліку';
        row.valueText = value;
        return row;
      default: {
        const text = String(value).trim();
        if (text.length > CategoryAttributeEntity.TEXT_MAX_LENGTH) return `Максимум ${CategoryAttributeEntity.TEXT_MAX_LENGTH} символів`;
        row.valueText = text;
        return row;
      }
    }
  }

  read(stored: Omit<StoredAttributeValue, 'attributeId'> | undefined): AttributeValue {
    if (!stored) return null;
    if (this.type === 'number') return stored.valueNumber;
    if (this.type === 'bool') return stored.valueBool;
    return stored.valueText;
  }
}
