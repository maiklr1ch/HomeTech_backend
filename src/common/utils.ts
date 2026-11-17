import { config } from '../config';

type DecimalLike = { toString(): string } | number | string;

export function toCents(value: DecimalLike): number {
  return Math.round(Number(value.toString()) * 100);
}

export function centsToString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function money(value: DecimalLike | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return centsToString(toCents(value));
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function pageWindow(requested: number, total: number, pageSize = config.pageSize) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requested), pages);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function imageUrl(p: { ownImagePath: string | null; supplierImageUrl: string | null }): string | null {
  if (p.ownImagePath) return `${config.uploadsUrlPrefix}/${p.ownImagePath}`;
  return p.supplierImageUrl ?? null;
}

const translitMap: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i',
  й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh',
  ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ъ: '', ё: 'io',
};

export function slugify(value: string, maxLength = 80): string {
  const latin = Array.from(value.toLowerCase())
    .map((ch) => (ch in translitMap ? translitMap[ch] : ch))
    .join('')
    .replace(/['’ʼ`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return latin.slice(0, maxLength).replace(/-+$/g, '') || 'item';
}

export function nameKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function kyivToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function kyivOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', timeZoneName: 'shortOffset' }).formatToParts(at);
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+2';
  const m = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 120;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

export function kyivDayStart(isoDate: string): Date {
  const utcMidnight = new Date(`${isoDate}T00:00:00Z`);
  return new Date(utcMidnight.getTime() - kyivOffsetMinutes(utcMidnight) * 60_000);
}

export function dateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function splitIds(value: unknown): number[] {
  if (typeof value !== 'string' && !Array.isArray(value)) return [];
  const raw = Array.isArray(value) ? value.join(',') : value;
  return raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}
