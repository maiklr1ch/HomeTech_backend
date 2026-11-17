import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodPipe } from '../common/zod';
import type { UserEntity } from '../users/user.entity';
import { Auth, CurrentUser } from './auth.guard';
import { loginSchema, registerSchema, type LoginDto, type RegisterDto } from './auth.schemas';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('register')
  async register(@Body(new ZodPipe(registerSchema)) dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.register(dto);
    this.sessions.issue(res, user);
    return { user: user.toProfile() };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodPipe(loginSchema)) dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.login(dto, req.ip ?? 'unknown');
    this.sessions.issue(res, user);
    return { user: user.toProfile() };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    this.sessions.clear(res);
    return { ok: true };
  }

  @Get('me')
  @Auth()
  me(@CurrentUser() user: UserEntity) {
    return { user: user.toProfile() };
  }
}
