import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { createInterface } from 'node:readline';
import { AppModule } from '../app.module';
import { AppError } from '../common/errors';

export async function runCli(task: (app: INestApplicationContext) => Promise<void>) {
  let app: INestApplicationContext | undefined;
  try {
    app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
    await task(app);
  } catch (e) {
    if (e instanceof AppError) {
      console.error(e.message);
      for (const [field, message] of Object.entries(e.fields ?? {})) console.error(`  ${field}: ${message}`);
    } else {
      console.error(e instanceof Error ? e.message : e);
    }
    process.exitCode = 1;
  } finally {
    await app?.close();
  }
}

export class Prompt {
  private readonly lines: string[] = [];
  private readonly waiting: ((line: string | null) => void)[] = [];
  private closed = false;
  private muted = false;
  private readonly rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });

  constructor() {
    const rl = this.rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    const write = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (s: string) => {
      if (!this.muted || s.includes('\n') || s.includes('\r')) write(this.muted ? '\n' : s);
    };
    this.rl.on('line', (line) => {
      const next = this.waiting.shift();
      if (next) next(line);
      else this.lines.push(line);
    });
    this.rl.on('close', () => {
      this.closed = true;
      for (const resolve of this.waiting.splice(0)) resolve(null);
    });
  }

  async ask(question: string, hidden = false): Promise<string> {
    process.stdout.write(question);
    this.muted = hidden && Boolean(process.stdin.isTTY);
    const answer = await new Promise<string | null>((resolve) => {
      const buffered = this.lines.shift();
      if (buffered !== undefined) resolve(buffered);
      else if (this.closed) resolve(null);
      else this.waiting.push(resolve);
    });
    this.muted = false;
    if (!process.stdin.isTTY) process.stdout.write('\n');
    if (answer === null) throw new Error('Введення перервано');
    return answer;
  }

  close() {
    this.rl.close();
  }
}
