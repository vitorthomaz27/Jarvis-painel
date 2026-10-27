import { Injectable } from '@nestjs/common';
import type { LeadStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LeadsService } from '../leads/leads.service';
import { daysAgo, localDateKey, startOfLocalDay } from '../common/dates';
import { config } from '../config';

const STATUSES: LeadStatus[] = ['NOVO', 'CONVERSANDO', 'AGENDOU', 'CLIENTE', 'PERDIDO'];

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(businessId: string, days: number) {
    const now = new Date();
    const since = startOfLocalDay(daysAgo(days - 1, now));
    const chartDays = Math.min(days, 30);
    const chartSince = startOfLocalDay(daysAgo(chartDays - 1, now));

    const [leadsNoPeriodo, porStatusRaw, clientesNoPeriodo, semResposta, retornos, reativar, cliques, cliquesPorLocal, porDia, atencao] = await Promise.all([
      this.prisma.lead.count({ where: { businessId, createdAt: { gte: since } } }),
      this.prisma.lead.groupBy({ by: ['status'], where: { businessId }, _count: true }),
      this.prisma.lead.count({ where: { businessId, createdAt: { gte: since }, status: 'CLIENTE' } }),
      this.prisma.lead.count({ where: LeadsService.viewWhere(businessId, 'sem-resposta', now) }),
      this.prisma.lead.count({ where: LeadsService.viewWhere(businessId, 'retorno', now) }),
      this.prisma.lead.count({ where: LeadsService.viewWhere(businessId, 'reativar', now) }),
      this.prisma.event.count({ where: { businessId, type: 'WHATSAPP_CLICK', createdAt: { gte: since } } }),
      this.prisma.event.groupBy({ by: ['location'], where: { businessId, type: 'WHATSAPP_CLICK', createdAt: { gte: since } }, _count: true, orderBy: { _count: { location: 'desc' } }, take: 6 }),
      this.prisma.$queryRaw<{ d: string; c: number }[]>`
        SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${config.timeZone}, 'YYYY-MM-DD') AS d, count(*)::int AS c
        FROM "Lead" WHERE "businessId" = ${businessId} AND "createdAt" >= ${chartSince}
        GROUP BY 1 ORDER BY 1`,
      this.prisma.lead.findMany({
        where: { OR: [LeadsService.viewWhere(businessId, 'sem-resposta', now), LeadsService.viewWhere(businessId, 'retorno', now)] },
        orderBy: { createdAt: 'asc' },
        take: 6,
        select: { id: true, name: true, phone: true, status: true, createdAt: true, followUpAt: true, firstResponseAt: true, interest: true },
      }),
    ]);

    const porStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
    porStatusRaw.forEach((r) => { porStatus[r.status] = r._count; });

    const map = new Map(porDia.map((r) => [r.d, Number(r.c)]));
    const serie = Array.from({ length: chartDays }, (_, i) => {
      const key = localDateKey(daysAgo(chartDays - 1 - i, now));
      return { date: key, leads: map.get(key) ?? 0 };
    });

    return {
      periodoDias: days,
      leadsNoPeriodo,
      clientesNoPeriodo,
      cliquesWhatsapp: cliques,
      cliquesPorLocal: cliquesPorLocal.map((c) => ({ location: c.location || 'sem identificação', count: c._count })),
      porStatus,
      semResposta,
      retornos,
      reativar,
      serie,
      atencao,
    };
  }
}
