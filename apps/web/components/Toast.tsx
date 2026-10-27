'use client';
import { useToast } from '@/lib/toast';

export function Toast() {
  const { message, tone } = useToast();
  if (!message) return null;
  return <div className={`toast${tone === 'erro' ? ' is-erro' : ''}`} role="status" aria-live="polite">{message}</div>;
}
