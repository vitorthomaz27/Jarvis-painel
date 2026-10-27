import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { LeadSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { looksLikeEmail, normalizePhone } from '../common/phone';
import { normalizeOrigin } from '../businesses/businesses.service';

type Raw = Record<string, unknown>;

/** Primeiro campo de texto preenchido entre os nomes aceitos (formulários usam nomes variados). */
function pick(body: Raw, keys: string[], max = 500): string | undefined {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, max);
  }
  return undefined;
}

export interface CaptureContext { origin?: string }

@Injectable()
export class CaptureService {
  constructor(private readonly prisma: PrismaService) {}

  private async businessFor(key: unknown, ctx: CaptureContext) {
    if (typeof key !== 'string' || !key) throw new BadRequestException('Chave de captura ausente');
    const b = await this.prisma.business.findUnique({ where: { captureKey: key }, select: { id: true, allowedOrigins: true } });
    if (!b) throw new NotFoundException('Chave de captura inválida');
    if (b.allowedOrigins.length && ctx.origin) {
      const o = normalizeOrigin(ctx.origin);
      if (!o || !b.allowedOrigins.includes(o)) throw new ForbiddenException('Site não autorizado para esta chave');
    }
    return b;
  }

  /** Recebe um contato de formulário. Contato repetido (mesmo telefone ou e-mail) vira nota no lead existente. */
  async lead(body: Raw, ctx: CaptureContext) {
    // armadilha para robôs: campo escondido preenchido = descarta em silêncio
    if (pick(body, ['_gotcha', 'botcheck', 'website'])) return { ok: true };

    const b = await this.businessFor(body.key, ctx);

    const name = pick(body, ['nome', 'name', 'f-nome', 'nome_completo'], 120);
    let phoneRaw = pick(body, ['telefone', 'whatsapp', 'phone', 'celular', 'tel', 'f-telefone'], 40);
    let email = pick(body, ['email', 'e-mail', 'f-email'], 160);
    const contato = pick(body, ['contato', 'f-contato', 'whatsapp_ou_email'], 160);
    if (contato) {
      if (looksLikeEmail(contato)) email ??= contato;
      else phoneRaw ??= contato;
    }
    const phone = normalizePhone(phoneRaw);
    if (email && !looksLikeEmail(email)) email = undefined;

    if (!name) throw new BadRequestException('Informe o nome');
    if (!phone && !email) throw new BadRequestException('Informe um WhatsApp ou e-mail');

    const interest = pick(body, ['tipo', 'interesse', 'interest', 'servico', 'f-negocio', 'tipo_de_negocio'], 120);
    const message = pick(body, ['mensagem', 'message', 'msg', 'f-msg', 'observacoes'], 2000);
    const page = pick(body, ['page', 'pagina'], 300);
    const utmSource = pick(body, ['utm_source'], 100);
    const utmCampaign = pick(body, ['utm_campaign'], 100);
    const sourceRaw = pick(body, ['source', 'origem'], 30)?.toLowerCase();
    const source: LeadSource = sourceRaw === 'diagnostico' ? 'DIAGNOSTICO' : 'FORMULARIO';

    const existing = await this.prisma.lead.findFirst({
      where: { businessId: b.id, OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email: email.toLowerCase() }] : [])] },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const parts = ['Entrou em contato de novo pelo site'];
      if (interest) parts.push(`Interesse: ${interest}`);
      if (message) parts.push(`Mensagem: ${message}`);
      await this.prisma.lead.update({
        where: { id: existing.id },
        data: {
          lastContactAt: new Date(),
          status: existing.status === 'PERDIDO' ? 'NOVO' : undefined,
          firstResponseAt: existing.status === 'PERDIDO' ? null : undefined,
          notes: { create: { kind: 'SISTEMA', body: parts.join('\n') } },
        },
      });
      return { ok: true };
    }

    await this.prisma.lead.create({
      data: {
        businessId: b.id, name, phone, email: email?.toLowerCase() ?? null, interest: interest ?? null, message: message ?? null,
        source, page: page ?? null, utmSource: utmSource ?? null, utmCampaign: utmCampaign ?? null,
        notes: { create: { kind: 'SISTEMA', body: source === 'DIAGNOSTICO' ? 'Chegou pelo diagnóstico' : 'Chegou pelo formulário do site' } },
      },
    });
    return { ok: true };
  }

  async event(body: Raw, ctx: CaptureContext) {
    const b = await this.businessFor(body.key, ctx);
    const type = pick(body, ['type'], 40);
    if (type !== 'whatsapp_click') throw new BadRequestException('Tipo de evento não suportado');
    await this.prisma.event.create({
      data: { businessId: b.id, type: 'WHATSAPP_CLICK', location: pick(body, ['location'], 60) ?? null, page: pick(body, ['page'], 300) ?? null },
    });
    return { ok: true };
  }
}
