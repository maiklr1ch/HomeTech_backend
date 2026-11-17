import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Auth, CurrentUser } from '../auth/auth.guard';
import { idSchema, pageSchema } from '../common/schemas';
import { ZodPipe } from '../common/zod';
import type { UserEntity } from '../users/user.entity';
import { AdminOrdersService } from './admin-orders.service';
import { adminOrderPatchSchema, statusChangeSchema, type AdminOrderPatchDto, type StatusChangeDto } from './orders.schemas';

@Controller('admin/orders')
@Auth('admin')
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.orders.list(query);
  }

  @Get('stale')
  stale(@Query('page', new ZodPipe(pageSchema)) page: number) {
    return this.orders.stale(page);
  }

  @Get(':id')
  get(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.orders.get(id);
  }

  @Patch(':id/status')
  changeStatus(
    @CurrentUser() admin: UserEntity,
    @Param('id', new ZodPipe(idSchema)) id: number,
    @Body(new ZodPipe(statusChangeSchema)) dto: StatusChangeDto,
  ) {
    return this.orders.changeStatus(admin, id, dto);
  }

  @Patch(':id')
  patch(@Param('id', new ZodPipe(idSchema)) id: number, @Body(new ZodPipe(adminOrderPatchSchema)) dto: AdminOrderPatchDto) {
    return this.orders.patch(id, dto);
  }
}
