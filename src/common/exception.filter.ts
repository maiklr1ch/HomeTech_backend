import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from './errors';

const httpCodes: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'FILE_TOO_LARGE',
  429: 'TOO_MANY_ATTEMPTS',
};

const httpMessages: Record<number, string> = {
  400: 'Некоректний запит',
  401: 'Потрібно увійти',
  403: 'Недостатньо прав',
  404: 'Не знайдено',
  413: 'Файл перевищує допустимий розмір',
  429: 'Забагато запитів',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    let status = 500;
    let body: Record<string, unknown> = { code: 'INTERNAL_ERROR', message: 'Внутрішня помилка сервера' };

    if (exception instanceof AppError) {
      status = exception.status;
      body = { code: exception.code, message: exception.message };
      if (exception.fields) body.fields = exception.fields;
      if (exception.details) body.details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      body = {
        code: httpCodes[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'ERROR'),
        message: httpMessages[status] ?? exception.message,
      };
    } else if (isPrismaKnownError(exception) && exception.code === 'P2025') {
      status = 404;
      body = { code: 'NOT_FOUND', message: 'Не знайдено' };
    }

    const where = `${req.id ?? '-'} ${req.method} ${req.originalUrl} ${status} ${String(body.code)}`;
    if (status >= 500) {
      this.logger.error(`${where} ${exception instanceof Error ? (exception.stack ?? exception.message) : String(exception)}`);
    } else {
      this.logger.warn(`${where} ${String(body.message)}`);
    }

    res.status(status).json({ error: body });
  }
}

function isPrismaKnownError(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { name?: string }).name === 'PrismaClientKnownRequestError';
}
