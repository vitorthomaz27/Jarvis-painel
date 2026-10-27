import type { ReactNode } from 'react';
import { BusinessShell } from './shell';

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ bid: string }> }) {
  const { bid } = await params;
  return <BusinessShell bid={bid}>{children}</BusinessShell>;
}
