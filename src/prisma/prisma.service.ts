import { Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { config } from '../config';

export type Tx = Prisma.TransactionClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Injectable()
export class TransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(work: (tx: Tx) => Promise<T>, options?: { timeout?: number; maxWait?: number }): Promise<T> {
    return this.prisma.$transaction(work, options);
  }

  async tryAdvisoryLock(tx: Tx, key: number): Promise<boolean> {
    const rows = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${key}) AS locked`;
    return rows[0]?.locked === true;
  }
}

@Injectable()
export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}

  protected db(tx?: Tx): PrismaService | Tx {
    return tx ?? this.prisma;
  }
}

@Global()
@Module({
  providers: [PrismaService, TransactionManager],
  exports: [PrismaService, TransactionManager],
})
export class PrismaModule {}
