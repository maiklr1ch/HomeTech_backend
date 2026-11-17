import 'dotenv/config';
import { resolve } from 'node:path';
import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGINS: z.string().default(''),
  COOKIE_SECURE: bool.optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  TRUST_PROXY: bool.default('false'),
  UPLOAD_DIR: z.string().default('./uploads'),
  PUBLIC_URL: z.string().url().optional().or(z.literal('')),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: bool.default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}
const env = parsed.data;

export const config = {
  isProduction: env.NODE_ENV === 'production',
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean),
  cookieSecure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
  cookieSameSite: env.COOKIE_SAMESITE,
  trustProxy: env.TRUST_PROXY,
  uploadDir: resolve(env.UPLOAD_DIR),
  uploadsUrlPrefix: '/api/uploads',
  publicUrl: (env.PUBLIC_URL ?? '').replace(/\/$/, ''),
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM || env.SMTP_USER,
  },
  sessionDays: 7,
  pageSize: 20,
  importMaxBytes: 20 * 1024 * 1024,
  imageMaxBytes: 5 * 1024 * 1024,
};
