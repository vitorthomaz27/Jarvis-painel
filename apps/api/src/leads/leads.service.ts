import { Injectable, NotFoundException } from '@nestjs/common';
import type { LeadSource, LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone } from '../common/phone';
import { daysAgo, endOfLocalDay, hoursAgo } from '../common/dates';
import { RULES } from '../common/rules';

export const STATUS_LABEL: Record<LeadStatus, string> = {
  NOVO: 'Novo', CONVERSANDO: 'Conversando', AGENDOU: 'Agendou', CLIENTE: 'Cliente', PERDIDO: 'Perdido',
};

export type LeadView = 'todos' | 'sem-resposta' | 'retorno' | 'reativar';

const listSelect = {
  id: true, name: true, phone: true, email: true, interest: true, status: true, source: true,
  followUpAt: true, lastContactAt: true, firstResponseAt: true, createdAt: true,
} as const;

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Filtros das listas do painel. As mesmas regras alimentam a visão geral. */
  static viewWhere(businessId: string, view: LeadView, now = new Date()): Prisma.LeadWhereInput {
    switch (view) {
      case 'sem-resposta':
        return { businessId, status: 'NOVO', firstResponseAt: null, createdAt: { lt: hoursAgo(RULES.semRespostaHoras, now) } };
      case 'retorno':
        return { businessId, followUpAt: { lte: endOfLocalDay(now) }, status: { notIn: ['PERDIDO'] } };
      case 'reativar':
        return { businessId, status: 'CLIENTE', lastContactAt: { lt: daysAgo(RULES.reativarDias, now) } };
      default:
        return { businessId };
    }
  }

  list(businessId: string, opts: { view: LeadView; status?: LeadStatus; q?: string }) {
    const where: Prisma.LeadWhereInput = { ...LeadsService.viewWhere(businessId, opts.view) };
    if (opts.status) where.status = opts.status;
    if (opts.q) {
      const q = opts.q.trim();
      const digits = q.replace(/\D/g, '');
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { interest: { contains: q, mode: 'insensitive' } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
      ];
    }
    const orderBy: Prisma.LeadOrderByWithRelationInput =
      opts.view === 'retorno' ? { followUpAt: 'asc' } : opts.view === 'reativar' ? { lastContactAt: 'asc' } : { createdAt: 'desc' };
    return this.prisma.lead.findMany({ where, orderBy, take: 500, select: listSelect });
  }

  async get(businessId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, businessId },
      include: { notes: { orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, name: true } } } } },
    });
    if (!lead) throw new NotFoundException('Contato não encontrado');
    return lead;
  }

  async create(businessId: string, authorId: string | null, data: {
    name: string; phone?: string | null; email?: string | null; interest?: string | null; message?: string | null;
    status?: LeadStatus; source?: LeadSource; followUpAt?: Date | null;
  }) {
    const now = new Date();
    const status = data.status ?? 'NOVO';
    return this.prisma.lead.create({
      data: {
        businessId,
        name: data.name.trim(),
        phone: normalizePhone(data.phone),
        email: data.email?.trim().toLowerCase() || null,
        interest: data.interest?.trim() || null,
        message: data.message?.trim() || null,
        status,
        source: data.source ?? 'MANUAL',
        followUpAt: data.followUpAt ?? null,
        firstResponseAt: status !== 'NOVO' ? now : null,
        notes: { create: { kind: 'SISTEMA', body: 'Contato cadastrado no painel', authorId } },
      },
      select: listSelect,
    });
  }

  async update(businessId: string, leadId: string, authorId: string, data: {
    name?: string; phone?: string | null; email?: string | null; interest?: string | null;
    status?: LeadStatus; followUpAt?: Date | null;
  }) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, businessId } });
    if (!lead) throw new NotFoundException('Contato não encontrado');
    const now = new Date();
    const statusChanged = data.status !== undefined && data.status !== lead.status;

    const update: Prisma.LeadUpdateInput = {
      name: data.name?.trim(),
      phone: data.phone === undefined ? undefined : normalizePhone(data.phone),
      email: data.email === undefined ? undefined : data.email?.trim().toLowerCase() || null,
      interest: data.interest === undefined ? undefined : data.interest?.trim() || null,
      followUpAt: data.followUpAt,
    };
    if (statusChanged) {
      update.status = data.status;
      update.lastContactAt = now;
      if (!lead.firstResponseAt) update.firstResponseAt = now;
      update.notes = { create: { kind: 'STATUS', authorId, body: `${STATUS_LABEL[lead.status]} → ${STATUS_LABEL[data.status!]}` } };
    }
    await this.prisma.lead.update({ where: { id: lead.id }, data: update });
    return this.get(businessId, leadId);
  }

  async addNote(businessId: string, leadId: string, authorId: string, body: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, businessId }, select: { id: true, firstResponseAt: true } });
    if (!lead) throw new NotFoundException('Contato não encontrado');
    const now = new Date();
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastContactAt: now,
        firstResponseAt: lead.firstResponseAt ?? now,
        notes: { create: { kind: 'NOTA', authorId, body: body.trim() } },
      },
    });
    return this.get(businessId, leadId);
  }

  /** "Falei com a pessoa": registra o contato e tira o lead de "sem resposta"/"reativar". */
  async registerContact(businessId: string, leadId: string, authorId: string, channel: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, businessId }, select: { id: true, status: true, firstResponseAt: true } });
    if (!lead) throw new NotFoundException('Contato não encontrado');
    const now = new Date();
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        lastContactAt: now,
        firstResponseAt: lead.firstResponseAt ?? now,
        status: lead.status === 'NOVO' ? 'CONVERSANDO' : undefined,
        notes: { create: { kind: 'SISTEMA', authorId, body: `Contato feito pelo ${channel}` } },
      },
    });
    return this.get(businessId, leadId);
  }

  async remove(businessId: string, leadId: string) {
    const res = await this.prisma.lead.deleteMany({ where: { id: leadId, businessId } });
    if (!res.count) throw new NotFoundException('Contato não encontrado');
    return { ok: true };
  }
}
