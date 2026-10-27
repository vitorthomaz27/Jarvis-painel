'use client';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { useMe, useOverview } from '@/lib/queries';
import { IconCode, IconHome, IconOut, IconRefresh, IconShield, IconTeam, IconUser, IconUsers, Mark } from './icons';

function Nav({ bid }: { bid: string | null }) {
  const path = usePathname();
  const me = useMe().data;
  const overview = useOverview(bid ?? '');
  const ov = bid ? overview.data : undefined;
  const items = bid ? [
    { href: `/n/${bid}`, label: 'Visão geral', icon: IconHome, exact: true },
    { href: `/n/${bid}/contatos`, label: 'Contatos', icon: IconUsers, count: ov ? ov.semResposta + ov.retornos : 0 },
    { href: `/n/${bid}/reativar`, label: 'Reativar clientes', icon: IconRefresh, count: ov?.reativar ?? 0 },
    { href: `/n/${bid}/instalacao`, label: 'Instalação no site', icon: IconCode },
    { href: `/n/${bid}/equipe`, label: 'Equipe', icon: IconTeam },
  ] : [];
  const isActive = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + '/'));
  return (
    <nav className="nav" aria-label="Seções">
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={isActive(it.href, it.exact) ? 'page' : undefined}>
          <it.icon />{it.label}{it.count ? <span className="count">{it.count}</span> : null}
        </Link>
      ))}
      {me?.isSuperAdmin && (
        <Link href="/admin" aria-current={path.startsWith('/admin') ? 'page' : undefined}><IconShield />Clientes Jarvis</Link>
      )}
    </nav>
  );
}

function Switcher({ bid }: { bid: string | null }) {
  const me = useMe().data;
  const router = useRouter();
  if (!me || !bid || me.businesses.length < 2) return null;
  return (
    <select className="switcher" aria-label="Trocar de negócio" value={bid} onChange={(e) => router.push(`/n/${e.target.value}`)}>
      {me.businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
  );
}

export function Shell({ bid, title, children }: { bid: string | null; title?: string; children: ReactNode }) {
  const me = useMe().data;
  const qc = useQueryClient();
  const current = me?.businesses.find((b) => b.id === bid);
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    qc.clear();
    window.location.href = '/login';
  };
  const brand = (
    <Link href="/" className="brand"><span className="mark"><Mark /></span><span className="brand-name">Jarvis<span>Painel</span></span></Link>
  );
  return (
    <div className="shell">
      <aside className="side">
        {brand}
        <Switcher bid={bid} />
        {!(me && me.businesses.length > 1) && (current?.name || title) && <div className="small muted" style={{ padding: '0 12px' }}>{current?.name ?? title}</div>}
        <Nav bid={bid} />
        <div className="side-foot nav">
          {me && <div className="side-user"><strong>{me.name}</strong>{me.email}</div>}
          <Link href="/conta"><IconUser />Minha conta</Link>
          <a href="#sair" onClick={(e) => { e.preventDefault(); void logout(); }}><IconOut />Sair</a>
        </div>
      </aside>
      <div className="mobile-bar">
        <div className="top">{brand}<button className="btn btn-ghost btn-sm" onClick={() => void logout()}>Sair</button></div>
        <Switcher bid={bid} />
        <Nav bid={bid} />
      </div>
      <main className="main">{children}</main>
    </div>
  );
}
