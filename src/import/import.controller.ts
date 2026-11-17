import { Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '../auth/auth.guard';
import { Errors } from '../common/errors';
import { config } from '../config';
import { ImportService } from './import.service';

@Controller('admin/import')
@Auth('admin')
export class ImportController {
  constructor(private readonly importer: ImportService) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: config.importMaxBytes } }))
  run(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw Errors.invalidFile('Оберіть файл прайсу (ZIP або CSV)');
    return this.importer.run(file.buffer);
  }
}
