import type { LeadStatus } from '@/lib/types';
import { statusLabel } from '@/lib/format';

export function StatusPill({ status }: { status: LeadStatus }) {
  return <span className={`pill pill-${status}`}>{statusLabel(status)}</span>;
}
