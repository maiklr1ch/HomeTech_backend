import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '../auth/auth.guard';
import { idSchema } from '../common/schemas';
import { ZodPipe } from '../common/zod';
import { config } from '../config';
import { createProductSchema, updateProductSchema, type CreateProductDto, type UpdateProductDto } from './products.schemas';
import { ProductsService } from './products.service';

@Controller('admin/products')
@Auth('admin')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.products.list(query);
  }

  @Get(':id')
  get(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.products.get(id);
  }

  @Post()
  create(@Body(new ZodPipe(createProductSchema)) dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch(':id')
  update(@Param('id', new ZodPipe(idSchema)) id: number, @Body(new ZodPipe(updateProductSchema)) dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.products.remove(id);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: config.imageMaxBytes } }))
  setImage(@Param('id', new ZodPipe(idSchema)) id: number, @UploadedFile() file: Express.Multer.File | undefined) {
    return this.products.setImage(id, file);
  }

  @Delete(':id/image')
  removeImage(@Param('id', new ZodPipe(idSchema)) id: number) {
    return this.products.removeImage(id);
  }
}
