'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useBusiness, useOverview } from '@/lib/queries';
import { STATUS, firstName, formatPhone, isOverdue, relative, shortDate } from '@/lib/format';
import { StatusPill } from '@/components/StatusPill';
import { NewLeadModal } from '@/components/NewLeadModal';
import { IconPlus } from '@/components/icons';

const LOCATION_LABEL: Record<string, string> = {
  floating: 'Botão flutuante', hero: 'Topo da página', header: 'Menu', footer: 'Rodapé', cta_final: 'Chamada final',
  contato_pagina: 'Página de contato', diagnostico: 'Diagnóstico', 'sem identificação': 'Outros links',
};

export default function OverviewPage() {
  const { bid } = useParams<{ bid: string }>();
  const business = useBusiness(bid).data;
  const { data: ov, isLoading, error } = useOverview(bid);
  const [adding, setAdding] = useState(false);

  if (error) return <p className="error">{error.message}</p>;

  const max = ov ? Math.max(1, ...ov.serie.map((d) => d.leads)) : 1;
  const totalFunil = ov ? Object.values(ov.porStatus).reduce((a, b) => a + b, 0) : 0;
  const maxFunil = ov ? Math.max(1, ...Object.values(ov.porStatus)) : 1;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">{business?.name ?? 'Visão geral'}</h1>
          <p className="muted">Últimos 30 dias</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}><IconPlus />Novo contato</button>
      </div>

      {isLoading || !ov ? (
        <div className="grid-kpi">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 104 }} />)}</div>
      ) : (
        <>
          <div className="grid-kpi">
            <Link href={`/n/${bid}/contatos?view=sem-resposta`} className={`kpi${ov.semResposta ? ' is-alert' : ''}`}>
              <span className="kpi-label">Sem resposta</span>
              <span className="kpi-value">{ov.semResposta}</span>
              <span className="kpi-hint">contatos novos esperando há mais de 2 h</span>
            </Link>
            <Link href={`/n/${bid}/contatos?view=retorno`} className={`kpi${ov.retornos ? ' is-alert' : ''}`}>
              <span className="kpi-label">Retornos para hoje</span>
              <span className="kpi-value">{ov.retornos}</span>
              <span className="kpi-hint">lembretes de hoje ou atrasados</span>
            </Link>
            <div className="kpi">
              <span className="kpi-label">Contatos novos</span>
              <span className="kpi-value">{ov.leadsNoPeriodo}</span>
              <span className="kpi-hint">{ov.clientesNoPeriodo} já viraram cliente</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">Cliques no WhatsApp</span>
              <span className="kpi-value">{ov.cliquesWhatsapp}</span>
              <span className="kpi-hint">vindos do site</span>
            </div>
          </div>

          <div className="grid-2">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section className="card">
                <div className="card-head">
                  <h2 className="h2">Precisa de atenção</h2>
                  <Link href={`/n/${bid}/contatos`} className="link small">Ver todos os contatos</Link>
                </div>
                {ov.atencao.length === 0 ? (
                  <div className="empty" style={{ padding: 20 }}>
                    <p className="h2">Tudo em dia</p>
                    <p>Nenhum contato esperando resposta e nenhum retorno para hoje.</p>
                  </div>
                ) : (
                  <div className="list">
                    {ov.atencao.map((l) => {
                      const retorno = l.followUpAt && isOverdue(l.followUpAt);
                      return (
                        <Link key={l.id} href={`/n/${bid}/contatos/${l.id}`} className="list-item">
                          <span className="avatar">{firstName(l.name).charAt(0).toUpperCase()}</span>
                          <span className="grow">
                            <span className="name" style={{ display: 'block' }}>{l.name}</span>
                            <span className="small muted">{l.interest ?? formatPhone(l.phone)}</span>
                          </span>
                          <span className="tag is-late">{retorno ? `Retornar ${shortDate(l.followUpAt!)}` : `Esperando ${relative(l.createdAt).replace('há ', '')}`}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="card">
                <div className="card-head">
                  <h2 className="h2">Contatos por dia</h2>
                  <span className="small muted num">{ov.serie.reduce((s, d) => s + d.leads, 0)} no período</span>
                </div>
                <div className="bars" role="img" aria-label="Contatos novos por dia nos últimos 30 dias">
                  {ov.serie.map((d, i) => (
                    <div key={d.date}
                      className={`bar${d.leads === 0 ? ' is-zero' : ''}${i === ov.serie.length - 1 ? ' is-today' : ''}`}
                      style={{ height: `${d.leads === 0 ? 2 : Math.max(6, (d.leads / max) * 100)}%` }}
                      title={`${d.date.split('-').reverse().join('/')}: ${d.leads} contato(s)`} />
                  ))}
                </div>
                <div className="bars-axis"><span>{ov.serie[0]?.date.split('-').reverse().slice(0, 2).join('/')}</span><span>hoje</span></div>
              </section>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section className="card">
                <div className="card-head"><h2 className="h2">Funil</h2><span className="small muted num">{totalFunil} contatos</span></div>
                <div className="funnel">
                  {STATUS.map((s) => (
                    <Link key={s.key} href={`/n/${bid}/contatos?status=${s.key}`} className="funnel-row" style={{ textDecoration: 'none' }}>
                      <StatusPill status={s.key} />
                      <span className="funnel-track"><span className="funnel-fill" style={{ display: 'block', width: `${(ov.porStatus[s.key] / maxFunil) * 100}%`, opacity: s.key === 'PERDIDO' ? 0.4 : 1 }} /></span>
                      <span className="num" style={{ textAlign: 'right', fontWeight: 650 }}>{ov.porStatus[s.key]}</span>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="card">
                <div className="card-head"><h2 className="h2">De onde vêm os cliques</h2></div>
                {ov.cliquesPorLocal.length === 0 ? (
                  <p className="muted small">Nenhum clique registrado ainda. Confira a <Link className="link" href={`/n/${bid}/instalacao`}>instalação no site</Link>.</p>
                ) : (
                  <table className="table"><tbody>
                    {ov.cliquesPorLocal.map((c) => (
                      <tr key={c.location}><td>{LOCATION_LABEL[c.location] ?? c.location}</td><td className="num" style={{ textAlign: 'right', fontWeight: 650 }}>{c.count}</td></tr>
                    ))}
                  </tbody></table>
                )}
              </section>

              {ov.reativar > 0 && (
                <Link href={`/n/${bid}/reativar`} className="kpi" style={{ textDecoration: 'none' }}>
                  <span className="kpi-label">Clientes para reativar</span>
                  <span className="kpi-value">{ov.reativar}</span>
                  <span className="kpi-hint">sem contato há mais de 60 dias</span>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
      {adding && <NewLeadModal bid={bid} onClose={() => setAdding(false)} />}
    </>
  );
}
