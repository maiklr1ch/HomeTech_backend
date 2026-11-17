import { PipeTransform } from '@nestjs/common';
import { z, ZodIssueCode, ZodTypeAny } from 'zod';
import { Errors, FieldErrors } from './errors';

z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') return { message: 'Обов’язкове поле' };
      if (issue.expected === 'integer') return { message: 'Потрібне ціле число' };
      return { message: 'Некоректний тип значення' };
    case ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: `Мінімум ${issue.minimum} символів` };
      if (issue.type === 'array') return { message: `Мінімум ${issue.minimum} елементів` };
      return { message: `Значення не менше ${issue.minimum}` };
    case ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `Максимум ${issue.maximum} символів` };
      if (issue.type === 'array') return { message: `Максимум ${issue.maximum} елементів` };
      return { message: `Значення не більше ${issue.maximum}` };
    case ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'Некоректний email' };
      if (issue.validation === 'uuid') return { message: 'Некоректний ідентифікатор' };
      return { message: 'Некоректний формат' };
    case ZodIssueCode.invalid_enum_value:
      return { message: 'Недопустиме значення' };
    case ZodIssueCode.unrecognized_keys:
      return { message: 'Зайві поля' };
    default:
      return { message: ctx.defaultError };
  }
});

export function zodFields(error: z.ZodError, root?: string): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const path = root ? [root, ...issue.path] : issue.path;
    const key = path.length ? path.join('.') : '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export function parseOrThrow<T extends ZodTypeAny>(schema: T, value: unknown, root?: string): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields = zodFields(result.error, root);
    throw Errors.validation(fields, root ? Object.values(fields)[0] : undefined);
  }
  return result.data;
}

export class ZodPipe<T extends ZodTypeAny> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    return parseOrThrow(this.schema, value ?? {});
  }
}
