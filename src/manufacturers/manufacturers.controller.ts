import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Auth } from '../auth/auth.guard';
import { idSchema, pageSchema } from '../common/schemas';
import { firstString } from '../common/utils';
import { ZodPipe } from '../common/zod';
import {
  createManufacturerSchema,
  updateManufacturerSchema,
  type CreateManufacturerDto,
  type UpdateManufacturerDto,
} from './manufacturers.schemas';
import { ManufacturersService } from './manufacturers.service';

@Controller('admin/manufacturers')
@Auth('admin')
export class ManufacturersController {
  constructor(private readonly manufacturers: ManufacturersService) {}

  @Get()
  list(@Query('q') q: unknown, @Query('page', new ZodPipe(pageSchema)) page: number) {
    return this.manufacturers.list(firstString(q)?.trim() ?? '', page);
  }

  @Post()
  create(@Body(new ZodPipe(createManufacturerSchema)) dto: CreateManufacturerDto) {
    return this.manufacturers.create(dto);
  }

  @Patch(':id')
  update(@Param('id', new ZodPipe(idSchema)) id: number, @Body(new ZodPipe(updateManufacturerSchema)) dto: UpdateManufacturerDto) {
    return this.manufacturers.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.manufacturers.remove(id);
  }
}
