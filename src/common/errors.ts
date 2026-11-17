export type FieldErrors = Record<string, string>;

export interface CartIssue {
  productId: number;
  issue: 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'PRICE_CHANGED';
  currentPrice: string | null;
}

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: FieldErrors,
    readonly details?: unknown[],
  ) {
    super(message);
  }
}

export const Errors = {
  validation: (fields: FieldErrors, message = 'Дані не пройшли перевірку') =>
    new AppError(400, 'VALIDATION_ERROR', message, fields),
  field: (field: string, message: string) => new AppError(400, 'VALIDATION_ERROR', message, { [field]: message }),
  cartEmpty: () => new AppError(400, 'CART_EMPTY', 'Кошик порожній'),
  categoryNotLeaf: () =>
    new AppError(400, 'CATEGORY_NOT_LEAF', 'Товар можна призначити лише категорії без підкатегорій', {
      categoryId: 'Оберіть категорію без підкатегорій',
    }),
  invalidFile: (message: string) => new AppError(400, 'INVALID_FILE', message),
  unauthorized: () => new AppError(401, 'UNAUTHORIZED', 'Потрібно увійти'),
  invalidCredentials: () => new AppError(401, 'INVALID_CREDENTIALS', 'Неправильний email або пароль'),
  forbidden: (message = 'Недостатньо прав') => new AppError(403, 'FORBIDDEN', message),
  accountBlocked: () =>
    new AppError(403, 'ACCOUNT_BLOCKED', 'Обліковий запис заблоковано. Зверніться до магазину'),
  notFound: (message = 'Не знайдено') => new AppError(404, 'NOT_FOUND', message),
  emailTaken: () =>
    new AppError(409, 'EMAIL_TAKEN', 'Користувач з таким email уже існує', {
      email: 'Користувач з таким email уже існує',
    }),
  cartChanged: (details: CartIssue[]) =>
    new AppError(409, 'CART_CHANGED', 'Товари в кошику змінилися', undefined, details),
  invalidTransition: (message = 'Такий перехід статусу не дозволений') =>
    new AppError(409, 'INVALID_STATUS_TRANSITION', message),
  statusConflict: () => new AppError(409, 'STATUS_CONFLICT', 'Статус замовлення змінився. Оновіть сторінку'),
  categoryNotEmpty: (message = 'Категорія містить товари або підкатегорії') =>
    new AppError(409, 'CATEGORY_NOT_EMPTY', message),
  manufacturerInUse: () =>
    new AppError(409, 'MANUFACTURER_IN_USE', 'Виробника призначено товарам. Спершу змініть виробника в цих товарах'),
  attributeInUse: () =>
    new AppError(409, 'ATTRIBUTE_IN_USE', 'Тип характеристики, що має значення в товарах, змінити не можна'),
  importInProgress: () => new AppError(409, 'IMPORT_IN_PROGRESS', 'Інший імпорт ще виконується'),
  fileTooLarge: () => new AppError(413, 'FILE_TOO_LARGE', 'Файл перевищує допустимий розмір'),
  tooManyAttempts: () =>
    new AppError(429, 'TOO_MANY_ATTEMPTS', 'Забагато невдалих спроб входу. Спробуйте через 15 хвилин'),
};
