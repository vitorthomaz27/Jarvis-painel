import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthRequest, AuthUser } from './auth.types';

export const IS_PUBLIC = 'isPublic';
/** Rota sem login (captura pública, login). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const OWNER_ONLY = 'ownerOnly';
/** Exige papel OWNER no negócio (ou superadmin). */
export const OwnerOnly = () => SetMetadata(OWNER_ONLY, true);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<AuthRequest>();
  if (!req.user) throw new Error('CurrentUser usado em rota pública');
  return req.user;
});
