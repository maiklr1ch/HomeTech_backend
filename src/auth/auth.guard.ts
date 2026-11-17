import {
  applyDecorators,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Errors } from '../common/errors';
import type { Role } from '../generated/prisma/client';
import type { UserEntity } from '../users/user.entity';
import { UsersRepository } from '../users/users.repository';
import { SessionService, TOKEN_COOKIE } from './session.service';

const ROLES_KEY = 'roles';

export type AuthRequest = Request & { user?: UserEntity };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const claims = this.sessions.verify(req.cookies?.[TOKEN_COOKIE]);
    if (!claims) throw Errors.unauthorized();

    const user = await this.users.findById(claims.userId);
    if (!user || user.isDeleted || !user.acceptsSessionIssuedAt(claims.issuedAt)) throw Errors.unauthorized();
    if (user.isBlocked) throw Errors.accountBlocked();

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (roles?.length && !roles.includes(user.role)) throw Errors.forbidden();

    req.user = user;
    return true;
  }
}

export function Auth(...roles: Role[]) {
  return applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(AuthGuard));
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): UserEntity => {
  const req = ctx.switchToHttp().getRequest<AuthRequest>();
  if (!req.user) throw Errors.unauthorized();
  return req.user;
});
