'use client';
import type { ReactNode } from 'react';
import { Shell } from '@/components/Shell';

export function BusinessShell({ bid, children }: { bid: string; children: ReactNode }) {
  return <Shell bid={bid}>{children}</Shell>;
}
