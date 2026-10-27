import type { Request } from 'express';
import type { Role } from '../prisma/client';

export interface AuthUser {
  id: string;
  isSuperAdmin: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  /** Papel do usuário no negócio da rota (preenchido pelo BusinessAccessGuard). */
  businessRole?: Role | 'SUPERADMIN';
}
