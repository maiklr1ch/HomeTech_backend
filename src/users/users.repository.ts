import { Injectable } from '@nestjs/common';
import type { Prisma, Role } from '../generated/prisma/client';
import { BaseRepository, type Tx } from '../prisma/prisma.service';
import { UserEntity } from './user.entity';

export type ClientStatusFilter = 'active' | 'blocked' | 'all';

export interface NewUser {
  email: string;
  passwordHash: string;
  role: Role;
  fullName: string;
  phone?: string | null;
  defaultAddress?: string | null;
}

@Injectable()
export class UsersRepository extends BaseRepository {
  async findById(id: number, tx?: Tx): Promise<UserEntity | null> {
    const row = await this.db(tx).user.findUnique({ where: { id } });
    return row ? UserEntity.from(row) : null;
  }

  async findByEmail(email: string, tx?: Tx): Promise<UserEntity | null> {
    const row = await this.db(tx).user.findUnique({ where: { email } });
    return row ? UserEntity.from(row) : null;
  }

  async emailOwnerId(email: string): Promise<number | null> {
    const row = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    return row?.id ?? null;
  }

  async create(data: NewUser, tx?: Tx): Promise<UserEntity> {
    return UserEntity.from(await this.db(tx).user.create({ data }));
  }

  async update(id: number, data: Prisma.UserUpdateInput, tx?: Tx): Promise<UserEntity> {
    return UserEntity.from(await this.db(tx).user.update({ where: { id }, data }));
  }

  async findClient(id: number): Promise<{ user: UserEntity; ordersCount: number } | null> {
    const row = await this.prisma.user.findFirst({
      where: { id, role: 'client', isDeleted: false },
      include: { _count: { select: { orders: true } } },
    });
    if (!row) return null;
    const { _count, ...user } = row;
    return { user: UserEntity.from(user), ordersCount: _count.orders };
  }

  private clientWhere(q: string, status: ClientStatusFilter): Prisma.UserWhereInput {
    return {
      role: 'client',
      isDeleted: false,
      ...(status === 'active' ? { isBlocked: false } : status === 'blocked' ? { isBlocked: true } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q.replace(/[\s()-]/g, '') } },
            ],
          }
        : {}),
    };
  }

  countClients(q: string, status: ClientStatusFilter): Promise<number> {
    return this.prisma.user.count({ where: this.clientWhere(q, status) });
  }

  async findClients(q: string, status: ClientStatusFilter, skip: number, take: number) {
    const rows = await this.prisma.user.findMany({
      where: this.clientWhere(q, status),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      include: { _count: { select: { orders: true } } },
    });
    return rows.map(({ _count, ...user }) => ({ user: UserEntity.from(user), ordersCount: _count.orders }));
  }
}

