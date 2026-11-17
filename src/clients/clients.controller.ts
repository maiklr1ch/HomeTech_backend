import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { Auth } from '../auth/auth.guard';
import { idSchema, pageSchema } from '../common/schemas';
import { firstString } from '../common/utils';
import { ZodPipe } from '../common/zod';
import type { ClientStatusFilter } from '../users/users.repository';
import {
  clientStatusSchema,
  createClientSchema,
  updateClientSchema,
  type CreateClientDto,
  type UpdateClientDto,
} from './clients.schemas';
import { ClientsService } from './clients.service';

@Controller('admin/clients')
@Auth('admin')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  list(
    @Query('q') q: unknown,
    @Query('status', new ZodPipe(clientStatusSchema)) status: ClientStatusFilter,
    @Query('page', new ZodPipe(pageSchema)) page: number,
  ) {
    return this.clients.list(firstString(q)?.trim() ?? '', status, page);
  }

  @Get(':id')
  get(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.clients.get(id);
  }

  @Post()
  create(@Body(new ZodPipe(createClientSchema)) dto: CreateClientDto) {
    return this.clients.create(dto);
  }

  @Patch(':id')
  update(@Param('id', new ZodPipe(idSchema)) id: number, @Body(new ZodPipe(updateClientSchema)) dto: UpdateClientDto) {
    return this.clients.update(id, dto);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  resetPassword(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.clients.resetPassword(id);
  }

  @Post(':id/block')
  @HttpCode(200)
  block(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.clients.block(id);
  }

  @Post(':id/unblock')
  @HttpCode(200)
  unblock(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.clients.unblock(id);
  }

  @Delete(':id')
  remove(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.clients.remove(id);
  }
}
