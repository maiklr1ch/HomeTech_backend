import { readFileSync } from 'node:fs';
import { ImportService } from '../import/import.service';
import { runCli } from './cli-context';

void runCli(async (app) => {
  const file = process.argv[2];
  if (!file) throw new Error('Використання: npm run import -- <katran.zip | katran.csv>');
  const report = await app.get(ImportService).run(readFileSync(file));
  console.log(`Рядків у файлі:          ${report.totalRows}`);
  console.log(`Додано:                  ${report.added}`);
  console.log(`Оновлено:                ${report.updated}`);
  console.log(`Пропущено:               ${report.skipped}`);
  console.log(`Рядків з помилками:      ${report.errorRows}`);
  console.log(`Переведено в «Немає»:    ${report.markedOutOfStock}`);
  for (const e of report.errors) console.log(`  рядок ${e.line}: ${e.reason}`);
});
