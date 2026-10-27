import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { config } from '../config';
import type { AuthRequest } from '../common/auth.types';
import { IS_PUBLIC } from '../common/decorators';

interface TokenPayload { sub: string; sa?: boolean }

/** Guard global: toda rota exige login, exceto as marcadas com @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const header = req.headers.authorization;
    const token = (req.cookies?.[config.cookieName] as string | undefined) ?? (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    if (!token) throw new UnauthorizedException('Faça login para continuar');
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token);
      req.user = { id: payload.sub, isSuperAdmin: !!payload.sa };
      return true;
    } catch {
      throw new UnauthorizedException('Sessão expirada. Faça login de novo');
    }
  }
}
