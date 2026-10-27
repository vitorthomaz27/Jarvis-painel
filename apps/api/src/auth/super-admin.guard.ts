import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthRequest } from '../common/auth.types';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    if (!req.user?.isSuperAdmin) throw new ForbiddenException('Apenas a equipe Jarvis pode fazer isso');
    return true;
  }
}
