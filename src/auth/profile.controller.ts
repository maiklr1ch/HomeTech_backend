import { Body, Controller, Get, HttpCode, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ZodPipe } from '../common/zod';
import type { UserEntity } from '../users/user.entity';
import { Auth, CurrentUser } from './auth.guard';
import { passwordChangeSchema, profileSchema, type PasswordChangeDto, type ProfileDto } from './auth.schemas';
import { ProfileService } from './profile.service';
import { SessionService } from './session.service';

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profile: ProfileService,
    private readonly sessions: SessionService,
  ) {}

  @Get()
  @Auth()
  get(@CurrentUser() user: UserEntity) {
    return { user: user.toProfile() };
  }

  @Patch()
  @Auth('client')
  async update(@CurrentUser() user: UserEntity, @Body(new ZodPipe(profileSchema)) dto: ProfileDto) {
    return { user: (await this.profile.update(user, dto)).toProfile() };
  }

  @Post('password')
  @Auth()
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: UserEntity,
    @Body(new ZodPipe(passwordChangeSchema)) dto: PasswordChangeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const updated = await this.profile.changePassword(user, dto);
    this.sessions.issue(res, updated);
    return { ok: true };
  }
}
