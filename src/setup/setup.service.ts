import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CategoriesRepository } from '../categories/categories.repository';
import { emailSchema, fullNameSchema, passwordSchema } from '../common/schemas';
import { nameKey } from '../common/utils';
import { parseOrThrow } from '../common/zod';
import { TransactionManager } from '../prisma/prisma.service';
import { PasswordHasher } from '../users/password-hasher';
import { UsersRepository } from '../users/users.repository';
import { SEED_CATEGORIES } from './seed-data';

export const adminAccountSchema = z.object({ email: emailSchema, fullName: fullNameSchema, password: passwordSchema });
export type AdminAccountDto = z.infer<typeof adminAccountSchema>;

@Injectable()
export class SetupService {
  constructor(
    private readonly categories: CategoriesRepository,
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly transactions: TransactionManager,
  ) {}

  seedCategories(): Promise<{ created: number; skipped: number }> {
    return this.transactions.run(async (tx) => {
      let created = 0;
      let skipped = 0;
      for (const [index, c] of SEED_CATEGORIES.entries()) {
        if (await this.categories.findBySlugOrNameKey(c.slug, nameKey(c.name), tx)) {
          skipped++;
          continue;
        }
        await this.categories.create(
          {
            name: c.name,
            nameKey: nameKey(c.name),
            slug: c.slug,
            sortOrder: (index + 1) * 10,
            importPattern: c.importPattern,
            attributes: {
              create: c.attributes.map((a, i) => ({
                name: a.name,
                type: a.type,
                unit: a.unit ?? null,
                options: a.options ?? [],
                isFilterable: a.isFilterable,
                sortOrder: (i + 1) * 10,
              })),
            },
          },
          tx,
        );
        created++;
      }
      return { created, skipped };
    });
  }

  async createAdmin(input: unknown): Promise<{ created: boolean; email: string }> {
    const dto = parseOrThrow(adminAccountSchema, input);
    if (await this.users.emailOwnerId(dto.email)) return { created: false, email: dto.email };
    await this.users.create({
      email: dto.email,
      passwordHash: await this.hasher.hash(dto.password),
      fullName: dto.fullName,
      role: 'admin',
    });
    return { created: true, email: dto.email };
  }
}
