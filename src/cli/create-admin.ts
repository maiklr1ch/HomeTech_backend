import { SetupService } from '../setup/setup.service';
import { Prompt, runCli } from './cli-context';

const USAGE = 'Використання: npm run create-admin -- <email> "<ПІБ>"';

void runCli(async (app) => {
  const [email, ...nameParts] = process.argv.slice(2);
  const fullName = nameParts.join(' ').trim();
  if (!email || !fullName) throw new Error(USAGE);

  const prompt = new Prompt();
  let password: string;
  try {
    password = await prompt.ask('Пароль: ', true);
    const repeat = await prompt.ask('Повторіть пароль: ', true);
    if (password !== repeat) throw new Error('Паролі не збігаються');
  } finally {
    prompt.close();
  }

  const result = await app.get(SetupService).createAdmin({ email, fullName, password });
  if (!result.created) throw new Error(`Користувач ${result.email} уже існує`);
  console.log(`Адміністратора ${result.email} створено`);
});
