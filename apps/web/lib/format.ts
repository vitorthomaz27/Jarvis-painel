import type { LeadSource, LeadStatus } from './types';

export const STATUS: { key: LeadStatus; label: string }[] = [
  { key: 'NOVO', label: 'Novo' },
  { key: 'CONVERSANDO', label: 'Conversando' },
  { key: 'AGENDOU', label: 'Agendou' },
  { key: 'CLIENTE', label: 'Cliente' },
  { key: 'PERDIDO', label: 'Perdido' },
];
export const statusLabel = (s: LeadStatus) => STATUS.find((x) => x.key === s)?.label ?? s;

export const SOURCE_LABEL: Record<LeadSource, string> = {
  FORMULARIO: 'Formulário do site', DIAGNOSTICO: 'Diagnóstico', MANUAL: 'Cadastro manual', OUTRO: 'Outro',
};

/** 5531998060020 -> (31) 99806-0020 */
export function formatPhone(p: string | null | undefined): string {
  if (!p) return '';
  const d = p.startsWith('55') && (p.length === 12 || p.length === 13) ? p.slice(2) : p;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `+${p}`;
}

export function waLink(phone: string, text?: string): string {
  return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export const firstName = (n: string) => n.replace(/\s*\(.*?\)\s*/g, ' ').trim().split(/\s+/)[0] ?? n;

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
export function relative(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const m = 60_000, h = 60 * m, d = 24 * h;
  if (abs < m) return 'agora';
  if (abs < h) return rtf.format(Math.round(diff / m), 'minute');
  if (abs < d) return rtf.format(Math.round(diff / h), 'hour');
  if (abs < 30 * d) return rtf.format(Math.round(diff / d), 'day');
  return rtf.format(Math.round(diff / (30 * d)), 'month');
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Valor para <input type="date"> no fuso do navegador. */
export function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "2026-10-27" -> ISO às 9h do horário local. */
export function fromDateInput(v: string): string | null {
  if (!v) return null;
  const [y, mo, d] = v.split('-').map(Number);
  return new Date(y, mo - 1, d, 9, 0, 0).toISOString();
}

export function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return new Date(iso).getTime() <= end.getTime();
}
