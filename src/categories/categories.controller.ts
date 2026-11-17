import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Auth } from '../auth/auth.guard';
import { idSchema } from '../common/schemas';
import { ZodPipe } from '../common/zod';
import {
  createAttributeSchema,
  createCategorySchema,
  updateAttributeSchema,
  updateCategorySchema,
  type CreateAttributeDto,
  type CreateCategoryDto,
  type UpdateAttributeDto,
  type UpdateCategoryDto,
} from './categories.schemas';
import { CategoriesService } from './categories.service';

@Controller('admin/categories')
@Auth('admin')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  tree() {
    return this.categories.tree();
  }

  @Get(':id')
  get(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.categories.get(id);
  }

  @Post()
  create(@Body(new ZodPipe(createCategorySchema)) dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  update(@Param('id', new ZodPipe(idSchema)) id: number, @Body(new ZodPipe(updateCategorySchema)) dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.categories.remove(id);
  }

  @Post(':id/attributes')
  createAttribute(@Param('id', new ZodPipe(idSchema)) id: number, @Body(new ZodPipe(createAttributeSchema)) dto: CreateAttributeDto) {
    return this.categories.createAttribute(id, dto);
  }

  @Patch(':id/attributes/:attrId')
  updateAttribute(
    @Param('id', new ZodPipe(idSchema)) id: number,
    @Param('attrId', new ZodPipe(idSchema)) attrId: number,
    @Body(new ZodPipe(updateAttributeSchema)) dto: UpdateAttributeDto,
  ) {
    return this.categories.updateAttribute(id, attrId, dto);
  }

  @Delete(':id/attributes/:attrId')
  removeAttribute(@Param('id', new ZodPipe(idSchema)) id: number, @Param('attrId', new ZodPipe(idSchema)) attrId: number) {
    return this.categories.removeAttribute(id, attrId);
  }
}
