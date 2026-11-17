import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'node:fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/exception.filter';
import { originCheck, requestId } from './common/middleware';
import './common/zod';
import { config } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.setGlobalPrefix('api');
  app.use(requestId);
  app.use(cookieParser());
  if (config.corsOrigins.length) app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.use(originCheck);
  mkdirSync(config.uploadDir, { recursive: true });
  app.useStaticAssets(config.uploadDir, { prefix: `${config.uploadsUrlPrefix}/`, index: false, fallthrough: true });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
  await app.listen(config.port);
}

void bootstrap();
