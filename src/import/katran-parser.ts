import { Injectable } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { Errors } from '../common/errors';
import { config } from '../config';

export const KATRAN_COLUMNS = {
  code: 'код',
  sku: 'артикул',
  name: 'назва товару',
  rrcPrice: 'ціна ррц uah',
  retailPrice: 'ціна роздрібна uah',
  wholesalePrice: 'ціна опт uah',
  stock: 'наявність',
  warranty: 'гарантія',
  photo: 'фото',
  manufacturer: 'виробник',
} as const;

export type KatranColumn = keyof typeof KATRAN_COLUMNS;

export interface KatranRow {
  line: number;
  values: Partial<Record<KatranColumn, string>>;
}

const REQUIRED_COLUMNS: KatranColumn[] = ['code', 'name', 'rrcPrice', 'retailPrice', 'stock'];

@Injectable()
export class KatranParser {
  parse(buffer: Buffer): KatranRow[] {
    const text = this.decode(this.extractCsv(buffer));
    let records: { record: string[]; info: { lines: number } }[];
    try {
      records = parse(text, {
        delimiter: ';',
        relax_quotes: true,
        relax_column_count: true,
        skip_empty_lines: true,
        info: true,
      }) as { record: string[]; info: { lines: number } }[];
    } catch {
      throw Errors.invalidFile('Файл не є коректним CSV з роздільником «;»');
    }
    if (!records.length) throw Errors.invalidFile('Файл порожній');

    const header = records[0].record.map((h) => this.normalizeHeader(h));
    const index = {} as Record<KatranColumn, number>;
    for (const key of Object.keys(KATRAN_COLUMNS) as KatranColumn[]) index[key] = header.indexOf(KATRAN_COLUMNS[key]);
    const missing = REQUIRED_COLUMNS.filter((k) => index[k] < 0).map((k) => `«${KATRAN_COLUMNS[k]}»`);
    if (missing.length) throw Errors.invalidFile(`У файлі бракує колонок: ${missing.join(', ')}`);

    return records.slice(1).map(({ record, info }) => {
      const values: Partial<Record<KatranColumn, string>> = {};
      for (const key of Object.keys(index) as KatranColumn[]) {
        const i = index[key];
        if (i >= 0 && record[i] !== undefined) values[key] = record[i];
      }
      return { line: info.lines, values };
    });
  }

  parseNumber(value: string | undefined): number | null | 'invalid' {
    if (value === undefined) return null;
    const compact = value.replace(/[\s ]/g, '').replace(',', '.');
    if (compact === '') return null;
    const n = Number(compact);
    return Number.isFinite(n) ? n : 'invalid';
  }

  private extractCsv(buffer: Buffer): Buffer {
    const isZip = buffer.length > 4 && buffer.readUInt32LE(0) === 0x04034b50;
    if (!isZip) return buffer;
    let zip: AdmZip;
    try {
      zip = new AdmZip(buffer);
    } catch {
      throw Errors.invalidFile('Не вдалося розпакувати ZIP-архів');
    }
    const csvEntries = zip.getEntries().filter((e) => !e.isDirectory && e.entryName.toLowerCase().endsWith('.csv'));
    if (csvEntries.length !== 1) throw Errors.invalidFile('ZIP-архів має містити рівно один CSV-файл');
    if (csvEntries[0].header.size > config.importMaxBytes) throw Errors.fileTooLarge();
    const data = csvEntries[0].getData();
    if (data.length > config.importMaxBytes) throw Errors.fileTooLarge();
    return data;
  }

  private decode(buffer: Buffer): string {
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return buffer.subarray(3).toString('utf8');
    }
    const utf8 = buffer.toString('utf8');
    return utf8.includes('�') ? iconv.decode(buffer, 'win1251') : utf8;
  }

  private normalizeHeader(value: string): string {
    return value.replace(/^﻿/, '').trim().replace(/\s+/g, ' ').toLowerCase();
  }
}
