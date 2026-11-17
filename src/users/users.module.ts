import { Global, Module } from '@nestjs/common';
import { PasswordHasher } from './password-hasher';
import { UsersRepository } from './users.repository';

@Global()
@Module({
  providers: [UsersRepository, PasswordHasher],
  exports: [UsersRepository, PasswordHasher],
})
export class UsersModule {}
