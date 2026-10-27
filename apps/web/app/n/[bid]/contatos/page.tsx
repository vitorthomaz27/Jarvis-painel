'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { STATUS, formatPhone, isOverdue, relative, shortDate } from '@/lib/format';
import type { LeadListItem, LeadStatus } from '@/lib/types';
import { useOverview } from '@/lib/queries';
import { StatusPill } from '@/components/StatusPill';
import { NewLeadModal } from '@/components/NewLeadModal';
import { IconPlus } from '@/components/icons';

type View = 'todos' | 'sem-resposta' | 'retorno';

function LeadCard({ bid, l }: { bid: string; l: LeadListItem }) {
  const late = isOverdue(l.followUpAt);
  return (
    <Link href={`/n/${bid}/contatos/${l.id}`} className="lead-card">
      <span className="name">{l.name}</span>
      {l.interest && <span className="small muted">{l.interest}</span>}
      <span className="meta">
        {l.phone && <span className="tag">{formatPhone(l.phone)}</span>}
        {l.followUpAt ? <span className={`tag${late ? ' is-late' : ''}`}>Retornar {shortDate(l.followUpAt)}</span>
          : <span className="tag">{relative(l.createdAt)}</span>}
      </span>
    </Link>
  );
}

function Contatos() {
  const { bid } = useParams<{ bid: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const view = (params.get('view') as View | null) ?? 'todos';
  const status = params.get('status') as LeadStatus | null;
  const [q, setQ] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(q);
  const [adding, setAdding] = useState(false);
  const ov = useOverview(bid).data;

  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v); else next.delete(k);
    router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`);
  };

  const qs = new URLSearchParams({ view });
  if (debounced.trim()) qs.set('q', debounced.trim());
  const { data: leads, isLoading, error } = useQuery({
    queryKey: ['leads', bid, view, debounced],
    queryFn: () => api<LeadListItem[]>(`/businesses/${bid}/leads?${qs}`),
  });

  const columns = status ? STATUS.filter((s) => s.key === status) : STATUS;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Contatos</h1>
          <p className="muted">Clique num contato para conversar, anotar e mudar de etapa.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><IconPlus />Novo contato</button>
      </div>

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filtrar contatos">
          <button className="chip" aria-pressed={view === 'todos'} onClick={() => setParam('view', null)}>Todos</button>
          <button className="chip" aria-pressed={view === 'sem-resposta'} onClick={() => setParam('view', 'sem-resposta')}>
            Sem resposta{ov?.semResposta ? <span className="n">{ov.semResposta}</span> : null}
          </button>
          <button className="chip" aria-pressed={view === 'retorno'} onClick={() => setParam('view', 'retorno')}>
            Retornar hoje{ov?.retornos ? <span className="n">{ov.retornos}</span> : null}
          </button>
          {status && <button className="chip" aria-pressed onClick={() => setParam('status', null)}>Etapa: {STATUS.find((s) => s.key === status)?.label} ✕</button>}
        </div>
        <input className="input search" id="busca" type="search" placeholder="Buscar por nome, telefone ou interesse" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar contatos" />
      </div>

      {error ? <p className="error">{error.message}</p> : (
        <div className="board">
          {columns.map((col) => {
            const items = (leads ?? []).filter((l) => l.status === col.key);
            return (
              <section key={col.key} className="col" aria-label={col.label}>
                <div className="col-head"><StatusPill status={col.key} /><span className="count">{isLoading ? '…' : items.length}</span></div>
                {isLoading ? <div className="skeleton" style={{ height: 70 }} /> :
                  items.length === 0 ? <p className="col-empty">{view === 'todos' && !debounced ? 'Nenhum contato nesta etapa.' : 'Nada por aqui com esse filtro.'}</p> :
                  items.map((l) => <LeadCard key={l.id} bid={bid} l={l} />)}
              </section>
            );
          })}
        </div>
      )}
      {adding && <NewLeadModal bid={bid} onClose={() => setAdding(false)} />}
    </>
  );
}

export default function Page() {
  return <Suspense><Contatos /></Suspense>;
}
