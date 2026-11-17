import { Injectable } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config';

@Injectable()
export class ImageStorage {
  async saveProductImage(productId: number, extension: string, content: Buffer): Promise<string> {
    const relative = `products/${productId}-${Date.now()}.${extension}`;
    await mkdir(join(config.uploadDir, 'products'), { recursive: true });
    await writeFile(join(config.uploadDir, relative), content);
    return relative;
  }

  async remove(relative: string | null) {
    if (relative) await unlink(join(config.uploadDir, relative)).catch(() => undefined);
  }
}
