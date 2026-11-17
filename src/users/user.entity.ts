import type { Role, User } from '../generated/prisma/client';

export type UserStatus = 'active' | 'blocked' | 'deleted';

export class UserEntity implements User {
  id: number;
  email: string;
  passwordHash: string;
  role: Role;
  fullName: string;
  phone: string | null;
  defaultAddress: string | null;
  isBlocked: boolean;
  isDeleted: boolean;
  passwordChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  static from(row: User): UserEntity {
    return Object.assign(new UserEntity(), row);
  }

  static deletedEmail(id: number): string {
    return `deleted-${id}@domtech.invalid`;
  }

  get status(): UserStatus {
    if (this.isDeleted) return 'deleted';
    return this.isBlocked ? 'blocked' : 'active';
  }

  isClient(): boolean {
    return this.role === 'client';
  }

  acceptsSessionIssuedAt(issuedAtSeconds: number): boolean {
    return issuedAtSeconds >= Math.floor(this.passwordChangedAt.getTime() / 1000);
  }

  toProfile() {
    return {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      phone: this.phone,
      defaultAddress: this.defaultAddress,
      role: this.role,
    };
  }

  toClientSummary(ordersCount?: number) {
    return {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      phone: this.phone,
      defaultAddress: this.defaultAddress,
      status: this.status,
      isBlocked: this.isBlocked,
      createdAt: this.createdAt,
      ordersCount,
    };
  }
}
