import { SetupService } from '../setup/setup.service';
import { runCli } from './cli-context';

void runCli(async (app) => {
  const { created, skipped } = await app.get(SetupService).seedCategories();
  console.log(`Категорій створено: ${created}, пропущено (вже існують): ${skipped}`);
});
