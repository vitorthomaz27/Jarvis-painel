import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../common/phone';
import type { AuthUser } from '../common/auth.types';

export function newCaptureKey(): string {
  return 'pj_' + randomBytes(12).toString('base64url');
}

export function normalizeOrigin(o: string): string | null {
  try {
    const u = new URL(o.trim().startsWith('http') ? o.trim() : `https://${o.trim()}`);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

const businessSelect = {
  id: true, name: true, segment: true, city: true, whatsapp: true, captureKey: true, allowedOrigins: true, createdAt: true,
} as const;

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async listFor(user: AuthUser) {
    const where = user.isSuperAdmin ? {} : { members: { some: { userId: user.id } } };
    const rows = await this.prisma.business.findMany({
      where,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, segment: true, city: true, createdAt: true, _count: { select: { leads: true, members: true } } },
    });
    const novos = await this.prisma.lead.groupBy({ by: ['businessId'], where: { businessId: { in: rows.map((r) => r.id) }, status: 'NOVO' }, _count: true });
    const novosMap = new Map(novos.map((n) => [n.businessId, n._count]));
    return rows.map((r) => ({
      id: r.id, name: r.name, segment: r.segment, city: r.city, createdAt: r.createdAt,
      leads: r._count.leads, members: r._count.members, novos: novosMap.get(r.id) ?? 0,
    }));
  }

  async get(id: string) {
    const b = await this.prisma.business.findUnique({ where: { id }, select: businessSelect });
    if (!b) throw new NotFoundException('Negócio não encontrado');
    return b;
  }

  async update(id: string, data: { name?: string; segment?: string | null; city?: string | null; whatsapp?: string | null; allowedOrigins?: string[] }) {
    const allowedOrigins = data.allowedOrigins?.map(normalizeOrigin).filter((o): o is string => !!o);
    return this.prisma.business.update({
      where: { id },
      data: {
        name: data.name,
        segment: data.segment,
        city: data.city,
        whatsapp: data.whatsapp === undefined ? undefined : normalizePhone(data.whatsapp),
        allowedOrigins: allowedOrigins ? Array.from(new Set(allowedOrigins)) : undefined,
      },
      select: businessSelect,
    });
  }

  rotateKey(id: string) {
    return this.prisma.business.update({ where: { id }, data: { captureKey: newCaptureKey() }, select: businessSelect });
  }

  async members(businessId: string) {
    const rows = await this.prisma.membership.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, createdAt: true, user: { select: { id: true, name: true, email: true } } },
    });
    return rows.map((r) => ({ ...r.user, role: r.role, since: r.createdAt }));
  }

  /** Adiciona membro. Se o e-mail já existe, só vincula (a senha informada é ignorada). */
  async addMember(businessId: string, input: { name: string; email: string; password: string; role: Role }) {
    const email = input.email.trim().toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({ data: { email, name: input.name.trim(), passwordHash: await bcrypt.hash(input.password, 10) } });
    }
    const exists = await this.prisma.membership.findUnique({ where: { userId_businessId: { userId: user.id, businessId } } });
    if (exists) throw new ConflictException('Essa pessoa já faz parte da equipe');
    await this.prisma.membership.create({ data: { userId: user.id, businessId, role: input.role } });
    return { id: user.id, name: user.name, email: user.email, role: input.role };
  }

  async removeMember(businessId: string, userId: string, actor: AuthUser) {
    if (userId === actor.id) throw new ForbiddenException('Você não pode remover a si mesmo');
    const m = await this.prisma.membership.findUnique({ where: { userId_businessId: { userId, businessId } } });
    if (!m) throw new NotFoundException('Membro não encontrado');
    if (m.role === 'OWNER') {
      const owners = await this.prisma.membership.count({ where: { businessId, role: 'OWNER' } });
      if (owners <= 1) throw new ForbiddenException('O negócio precisa de pelo menos um responsável');
    }
    await this.prisma.membership.delete({ where: { userId_businessId: { userId, businessId } } });
    return { ok: true };
  }

  /** Cadastro de um novo cliente pela equipe Jarvis, já com o responsável. */
  async createWithOwner(input: {
    name: string; segment?: string; city?: string; whatsapp?: string; allowedOrigins?: string[];
    owner: { name: string; email: string; password: string };
  }) {
    const business = await this.prisma.business.create({
      data: {
        name: input.name.trim(),
        segment: input.segment?.trim() || null,
        city: input.city?.trim() || null,
        whatsapp: normalizePhone(input.whatsapp),
        captureKey: newCaptureKey(),
        allowedOrigins: (input.allowedOrigins ?? []).map(normalizeOrigin).filter((o): o is string => !!o),
      },
      select: businessSelect,
    });
    const owner = await this.addMember(business.id, { ...input.owner, role: 'OWNER' });
    return { business, owner };
  }
}
