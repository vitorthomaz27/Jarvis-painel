import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthRequest } from '../common/auth.types';
import { OWNER_ONLY } from '../common/decorators';

/**
 * Isola cada negócio: só membros (ou a equipe Jarvis) acessam rotas com :businessId.
 * Com @OwnerOnly(), exige papel OWNER.
 */
@Injectable()
export class BusinessAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const raw = req.params.businessId;
    const businessId = Array.isArray(raw) ? raw[0] : raw;
    const user = req.user;
    if (!user || !businessId) throw new ForbiddenException();

    const ownerOnly = this.reflector.getAllAndOverride<boolean>(OWNER_ONLY, [ctx.getHandler(), ctx.getClass()]);

    if (user.isSuperAdmin) {
      const exists = await this.prisma.business.count({ where: { id: businessId } });
      if (!exists) throw new NotFoundException('Negócio não encontrado');
      req.businessRole = 'SUPERADMIN';
      return true;
    }
    const m = await this.prisma.membership.findUnique({ where: { userId_businessId: { userId: user.id, businessId } } });
    if (!m) throw new ForbiddenException('Você não tem acesso a este negócio');
    if (ownerOnly && m.role !== 'OWNER') throw new ForbiddenException('Apenas o responsável pelo negócio pode fazer isso');
    req.businessRole = m.role;
    return true;
  }
}
