import { Injectable } from '@nestjs/common';
import { Errors } from '../common/errors';
import { PasswordHasher } from '../users/password-hasher';
import type { UserEntity } from '../users/user.entity';
import { UsersRepository } from '../users/users.repository';
import type { PasswordChangeDto, ProfileDto } from './auth.schemas';

@Injectable()
export class ProfileService {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  update(user: UserEntity, dto: ProfileDto): Promise<UserEntity> {
    return this.users.update(user.id, {
      fullName: dto.fullName,
      phone: dto.phone,
      defaultAddress: dto.defaultAddress,
    });
  }

  async changePassword(user: UserEntity, dto: PasswordChangeDto): Promise<UserEntity> {
    if (!(await this.hasher.verify(dto.currentPassword, user.passwordHash))) {
      throw Errors.field('currentPassword', 'Поточний пароль неправильний');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw Errors.field('newPassword', 'Новий пароль має відрізнятися від поточного');
    }
    return this.users.update(user.id, {
      passwordHash: await this.hasher.hash(dto.newPassword),
      passwordChangedAt: new Date(),
    });
  }
}
