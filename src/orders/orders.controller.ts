import { Body, Controller, Get, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Auth, CurrentUser } from '../auth/auth.guard';
import { idSchema, pageSchema } from '../common/schemas';
import { ZodPipe } from '../common/zod';
import type { UserEntity } from '../users/user.entity';
import { cancelSchema, createOrderSchema, type CancelOrderDto, type CreateOrderDto } from './orders.schemas';
import { OrdersService } from './orders.service';

@Controller('orders')
@Auth('client')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  async create(
    @CurrentUser() user: UserEntity,
    @Body(new ZodPipe(createOrderSchema)) dto: CreateOrderDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.orders.create(user, dto);
    res.status(result.created ? 201 : 200);
    return result.order;
  }

  @Get()
  list(@CurrentUser() user: UserEntity, @Query('page', new ZodPipe(pageSchema)) page: number) {
    return this.orders.list(user, page);
  }

  @Get(':id')
  get(@CurrentUser() user: UserEntity, @Param('id', new ZodPipe(idSchema)) id: number) {
    return this.orders.get(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentUser() user: UserEntity,
    @Param('id', new ZodPipe(idSchema)) id: number,
    @Body(new ZodPipe(cancelSchema)) dto: CancelOrderDto,
  ) {
    return this.orders.cancel(user, id, dto.reason);
  }
}
