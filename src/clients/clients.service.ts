import { Injectable } from '@nestjs/common';
import { Errors } from '../common/errors';
import { pageWindow } from '../common/utils';
import { OrderPresenter } from '../orders/order.presenter';
import { OrdersRepository } from '../orders/orders.repository';
import { PasswordHasher } from '../users/password-hasher';
import { UserEntity } from '../users/user.entity';
import { UsersRepository, type ClientStatusFilter } from '../users/users.repository';
import { AccountMailer } from './account-mailer';
import type { CreateClientDto, UpdateClientDto } from './clients.schemas';

@Injectable()
export class ClientsService {
  constructor(
    private readonly users: UsersRepository,
    private readonly orders: OrdersRepository,
    private readonly hasher: PasswordHasher,
    private readonly mailer: AccountMailer,
  ) {}

  async list(q: string, status: ClientStatusFilter, page: number) {
    const total = await this.users.countClients(q, status);
    const win = pageWindow(page, total);
    const rows = await this.users.findClients(q, status, win.skip, win.take);
    return {
      items: rows.map(({ user, ordersCount }) => user.toClientSummary(ordersCount)),
      page: win.page,
      pageSize: win.pageSize,
      total,
    };
  }

  async get(id: number) {
    const { user, ordersCount } = await this.findClient(id);
    const orders = await this.orders.findAllForUser(id);
    return { ...user.toClientSummary(ordersCount), orders: orders.map(OrderPresenter.summary) };
  }

  async create(dto: CreateClientDto) {
    if (await this.users.emailOwnerId(dto.email)) throw Errors.emailTaken();
    const password = this.hasher.temporary();
    const client = await this.users.create({
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone,
      defaultAddress: dto.defaultAddress ?? null,
      role: 'client',
      passwordHash: await this.hasher.hash(password),
    });
    const emailSent = await this.mailer.sendAccountCreated(client, password);
    return { client: client.toClientSummary(0), temporaryPassword: password, emailSent };
  }

  async update(id: number, dto: UpdateClientDto) {
    await this.findClient(id);
    if (dto.email) {
      const ownerId = await this.users.emailOwnerId(dto.email);
      if (ownerId !== null && ownerId !== id) throw Errors.emailTaken();
    }
    await this.users.update(id, { email: dto.email, fullName: dto.fullName, phone: dto.phone, defaultAddress: dto.defaultAddress });
    return this.get(id);
  }

  async resetPassword(id: number) {
    await this.findClient(id);
    const password = this.hasher.temporary();
    const client = await this.users.update(id, { passwordHash: await this.hasher.hash(password), passwordChangedAt: new Date() });
    const emailSent = await this.mailer.sendPasswordReset(client, password);
    return { temporaryPassword: password, emailSent };
  }

  async block(id: number) {
    await this.findClient(id);
    await this.users.update(id, { isBlocked: true });
    return this.get(id);
  }

  async unblock(id: number) {
    await this.findClient(id);
    await this.users.update(id, { isBlocked: false });
    return this.get(id);
  }

  async remove(id: number) {
    await this.findClient(id);
    await this.users.update(id, {
      isDeleted: true,
      isBlocked: false,
      email: UserEntity.deletedEmail(id),
      passwordChangedAt: new Date(),
    });
    return { ok: true };
  }

  private async findClient(id: number) {
    const found = await this.users.findClient(id);
    if (!found) throw Errors.notFound('Клієнта не знайдено');
    return found;
  }
}
