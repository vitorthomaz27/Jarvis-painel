import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'Painel Jarvis', template: '%s · Painel Jarvis' },
  description: 'Contatos, funil e retornos do seu negócio, num lugar só.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = { themeColor: '#0B0C10', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
