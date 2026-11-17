import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from '../categories/categories.repository';
import { Errors } from '../common/errors';
import { nameKey } from '../common/utils';
import type { StockStatus } from '../generated/prisma/client';
import { ManufacturersRepository } from '../manufacturers/manufacturers.repository';
import { TransactionManager, type Tx } from '../prisma/prisma.service';
import { ProductsRepository, type SupplierProductData } from '../products/products.repository';
import { KatranParser } from './katran-parser';

const IMPORT_LOCK_KEY = 7938016;
const EXCLUDED_FRAGMENTS = ['уцін', 'вживан', 'б/в'];
const PRICE_PLACEHOLDER = 7;
const MAX_ERRORS_IN_REPORT = 100;

export interface ImportReport {
  totalRows: number;
  added: number;
  updated: number;
  skipped: number;
  errorRows: number;
  markedOutOfStock: number;
  errors: { line: number; reason: string }[];
}

type PendingProduct = Omit<SupplierProductData, 'manufacturerId'> & { manufacturerName: string | null };

@Injectable()
export class ImportService {
  constructor(
    private readonly parser: KatranParser,
    private readonly products: ProductsRepository,
    private readonly categories: CategoriesRepository,
    private readonly manufacturers: ManufacturersRepository,
    private readonly transactions: TransactionManager,
  ) {}

  async run(buffer: Buffer): Promise<ImportReport> {
    const rows = this.parser.parse(buffer);
    const report: ImportReport = { totalRows: rows.length, added: 0, updated: 0, skipped: 0, errorRows: 0, markedOutOfStock: 0, errors: [] };
    const fail = (line: number, reason: string) => {
      report.errorRows++;
      if (report.errors.length < MAX_ERRORS_IN_REPORT) report.errors.push({ line, reason });
    };

    await this.transactions.run(
      async (tx) => {
        if (!(await this.transactions.tryAdvisoryLock(tx, IMPORT_LOCK_KEY))) throw Errors.importInProgress();

        const categories = (await this.categories.findImportable(tx)).flatMap((c) => {
          try {
            return [{ id: c.id, regex: new RegExp(c.importPattern, 'i') }];
          } catch {
            return [];
          }
        });
        const existing = await this.products.supplierIndex(tx);
        const seen = new Set<string>();
        const creates: PendingProduct[] = [];
        const now = new Date();

        for (const { line, values } of rows) {
          const code = (values.code ?? '').trim();
          const sku = (values.sku ?? '').trim() || null;
          const name = (values.name ?? '').trim();
          if (!code || !name) {
            fail(line, 'Порожній код або назва товару');
            continue;
          }
          if (seen.has(code)) {
            fail(line, `Код ${code} повторюється у файлі`);
            continue;
          }
          seen.add(code);

          const rrc = this.parser.parseNumber(values.rrcPrice);
          const retail = this.parser.parseNumber(values.retailPrice);
          const wholesale = this.parser.parseNumber(values.wholesalePrice);
          if (rrc === 'invalid' || retail === 'invalid' || wholesale === 'invalid') {
            fail(line, 'Нечислове значення ціни');
            continue;
          }

          const price = this.pickPrice(rrc, retail);
          const supplierPrice = wholesale !== null && wholesale > 0 ? Math.round(wholesale * 100) / 100 : null;
          const stockStatus = price === null ? 'out_of_stock' : this.mapStock(values.stock);
          const warrantyRaw = this.parser.parseNumber(values.warranty);
          const warrantyMonths =
            typeof warrantyRaw === 'number' && Number.isInteger(warrantyRaw) && warrantyRaw >= 0 && warrantyRaw <= 120 ? warrantyRaw : null;
          const photo = (values.photo ?? '').trim();
          const supplierImageUrl = /^https?:\/\//i.test(photo) ? photo : null;

          const current = existing.get(code);
          if (current) {
            if (current.isDeleted) {
              report.skipped++;
              continue;
            }
            await this.products.update(
              current.id,
              {
                ...(price !== null ? { price } : {}),
                stockStatus,
                supplierPrice,
                warrantyMonths,
                supplierImageUrl,
                updatedFromSupplierAt: now,
              },
              tx,
            );
            report.updated++;
            continue;
          }

          const lower = name.toLowerCase();
          const category = categories.find((c) => c.regex.test(name));
          if (EXCLUDED_FRAGMENTS.some((f) => lower.includes(f)) || !category) {
            report.skipped++;
            continue;
          }
          creates.push({
            supplierCode: code,
            sku,
            name,
            categoryId: category.id,
            manufacturerName: (values.manufacturer ?? '').trim() || null,
            price,
            supplierPrice,
            stockStatus,
            warrantyMonths,
            supplierImageUrl,
            updatedFromSupplierAt: now,
          });
        }

        const manufacturerIds = await this.ensureManufacturers(creates, tx);
        report.added = await this.products.createFromSupplier(
          creates.map(({ manufacturerName, ...p }) => ({
            ...p,
            manufacturerId: manufacturerName ? (manufacturerIds.get(nameKey(manufacturerName)) ?? null) : null,
          })),
          tx,
        );
        report.markedOutOfStock = await this.products.markMissingOutOfStock([...seen], tx);
      },
      { timeout: 180_000, maxWait: 10_000 },
    );

    return report;
  }

  private async ensureManufacturers(creates: PendingProduct[], tx: Tx): Promise<Map<string, number>> {
    const ids = await this.manufacturers.idsByNameKey(tx);
    const missing = new Map<string, string>();
    for (const c of creates) {
      if (!c.manufacturerName) continue;
      const key = nameKey(c.manufacturerName);
      if (!ids.has(key) && !missing.has(key)) missing.set(key, c.manufacturerName);
    }
    if (missing.size) {
      const created = await this.manufacturers.createMany([...missing].map(([key, name]) => ({ name, nameKey: key })), tx);
      for (const m of created) ids.set(m.nameKey, m.id);
    }
    return ids;
  }

  private pickPrice(...candidates: (number | null)[]): number | null {
    for (const c of candidates) {
      if (c !== null && c > 0 && Math.abs(c - PRICE_PLACEHOLDER) > 1e-9) return Math.round(c * 100) / 100;
    }
    return null;
  }

  private mapStock(value: string | undefined): StockStatus {
    const v = (value ?? '').trim().toLowerCase();
    if (v === 'в наявності') return 'in_stock';
    if (v === 'очікується') return 'expected';
    return 'out_of_stock';
  }
}
