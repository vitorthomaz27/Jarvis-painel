import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    // compara mesmo sem usuário para não revelar quais e-mails existem pelo tempo de resposta
    const ok = await bcrypt.compare(password, user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    if (!user || !ok) throw new UnauthorizedException('E-mail ou senha incorretos');
    const token = await this.jwt.signAsync({ sub: user.id, sa: user.isSuperAdmin });
    return { token, me: await this.me(user.id) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, isSuperAdmin: true,
        memberships: { select: { role: true, business: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return {
      id: user.id, email: user.email, name: user.name, isSuperAdmin: user.isSuperAdmin,
      businesses: user.memberships.map((m) => ({ id: m.business.id, name: m.business.name, role: m.role })),
    };
  }

  async changePassword(userId: string, current: string, next: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(current, user.passwordHash))) throw new UnauthorizedException('Senha atual incorreta');
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(next, 10) } });
    return { ok: true };
  }
}
