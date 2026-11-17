import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';

const ROUNDS = 10;
const TEMPORARY_LETTERS = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const TEMPORARY_DIGITS = '23456789';

@Injectable()
export class PasswordHasher {
  private readonly dummyHash = bcrypt.hashSync('dummy-password-1', ROUNDS);

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, ROUNDS);
  }

  verify(password: string, hash: string | null | undefined): Promise<boolean> {
    return bcrypt.compare(password, hash ?? this.dummyHash);
  }

  temporary(length = 12): string {
    const all = TEMPORARY_LETTERS + TEMPORARY_DIGITS;
    const chars = [TEMPORARY_LETTERS[randomInt(TEMPORARY_LETTERS.length)], TEMPORARY_DIGITS[randomInt(TEMPORARY_DIGITS.length)]];
    while (chars.length < length) chars.push(all[randomInt(all.length)]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }
}
