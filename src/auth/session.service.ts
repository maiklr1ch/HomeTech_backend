import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { UserEntity } from '../users/user.entity';

export const TOKEN_COOKIE = 'token';

export interface SessionClaims {
  userId: number;
  issuedAt: number;
}

@Injectable()
export class SessionService {
  issue(res: Response, user: Pick<UserEntity, 'id' | 'role'>) {
    const token = jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, {
      expiresIn: `${config.sessionDays}d`,
    });
    res.cookie(TOKEN_COOKIE, token, { ...this.cookieOptions(), maxAge: config.sessionDays * 24 * 60 * 60 * 1000 });
  }

  clear(res: Response) {
    res.clearCookie(TOKEN_COOKIE, this.cookieOptions());
  }

  verify(token: unknown): SessionClaims | null {
    if (typeof token !== 'string' || !token) return null;
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      if (typeof decoded === 'string') return null;
      const userId = Number(decoded.sub);
      if (!Number.isInteger(userId)) return null;
      return { userId, issuedAt: decoded.iat ?? 0 };
    } catch {
      return null;
    }
  }

  private cookieOptions() {
    return { httpOnly: true, secure: config.cookieSecure, sameSite: config.cookieSameSite, path: '/' } as const;
  }
}
