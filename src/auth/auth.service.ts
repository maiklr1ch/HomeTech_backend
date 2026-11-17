import { Injectable } from '@nestjs/common';
import { Errors } from '../common/errors';
import { PasswordHasher } from '../users/password-hasher';
import type { UserEntity } from '../users/user.entity';
import { UsersRepository } from '../users/users.repository';
import type { LoginDto, RegisterDto } from './auth.schemas';
import { LoginLimiter } from './login-limiter';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly limiter: LoginLimiter,
  ) {}

  async register(dto: RegisterDto): Promise<UserEntity> {
    if (await this.users.emailOwnerId(dto.email)) throw Errors.emailTaken();
    return this.users.create({
      email: dto.email,
      passwordHash: await this.hasher.hash(dto.password),
      role: 'client',
      fullName: dto.fullName,
      phone: dto.phone,
    });
  }

  async login(dto: LoginDto, ip: string): Promise<UserEntity> {
    const key = `${ip}|${dto.email}`;
    if (this.limiter.isBlocked(key)) throw Errors.tooManyAttempts();

    const found = await this.users.findByEmail(dto.email);
    const user = found && !found.isDeleted ? found : null;
    const passwordOk = await this.hasher.verify(dto.password, user?.passwordHash);
    if (!user || !passwordOk) {
      this.limiter.registerFailure(key);
      throw Errors.invalidCredentials();
    }
    if (user.isBlocked) throw Errors.accountBlocked();
    this.limiter.reset(key);
    return user;
  }
}
