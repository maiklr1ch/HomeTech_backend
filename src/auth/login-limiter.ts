import { Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

interface Entry {
  failures: number;
  firstAt: number;
  blockedUntil: number;
}

@Injectable()
export class LoginLimiter {
  private readonly entries = new Map<string, Entry>();

  isBlocked(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    const now = Date.now();
    if (entry.blockedUntil > now) return true;
    if (entry.blockedUntil && entry.blockedUntil <= now) this.entries.delete(key);
    return false;
  }

  registerFailure(key: string) {
    const now = Date.now();
    let entry = this.entries.get(key);
    if (!entry || now - entry.firstAt > WINDOW_MS) {
      entry = { failures: 0, firstAt: now, blockedUntil: 0 };
      this.entries.set(key, entry);
    }
    entry.failures += 1;
    if (entry.failures >= MAX_FAILURES) entry.blockedUntil = now + WINDOW_MS;
    if (this.entries.size > 10_000) this.prune(now);
  }

  reset(key: string) {
    this.entries.delete(key);
  }

  private prune(now: number) {
    for (const [key, entry] of this.entries) {
      if (entry.blockedUntil <= now && now - entry.firstAt > WINDOW_MS) this.entries.delete(key);
    }
  }
}
