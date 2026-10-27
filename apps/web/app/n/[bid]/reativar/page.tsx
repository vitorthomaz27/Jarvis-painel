'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { firstName, formatPhone, relative, waLink } from '@/lib/format';
import type { LeadListItem } from '@/lib/types';
import { useBusiness, useMe } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { IconWa } from '@/components/icons';

export default function ReativarPage() {
  const { bid } = useParams<{ bid: string }>();
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const me = useMe().data;
  const business = useBusiness(bid).data;
  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', bid, 'reativar'],
    queryFn: () => api<LeadListItem[]>(`/businesses/${bid}/leads?view=reativar`),
  });
  const contact = useMutation({
    mutationFn: (id: string) => api(`/businesses/${bid}/leads/${id}/contact`, { method: 'POST', body: { channel: 'WhatsApp' } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leads', bid] });
      void qc.invalidateQueries({ queryKey: ['overview', bid] });
      toast('Contato registrado. O cliente saiu da lista.');
    },
  });

  const msg = (l: LeadListItem) =>
    `Oi, ${firstName(l.name)}! Aqui é ${me ? firstName(me.name) : ''}, da ${business?.name ?? ''}. Tudo bem? Sentimos sua falta por aqui. Quer que eu veja um horário para você esta semana?`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Reativar clientes</h1>
          <p className="muted">Clientes sem contato há mais de 60 dias, do mais antigo para o mais recente. A mensagem já vai pronta no WhatsApp.</p>
        </div>
      </div>
      {error ? <p className="error">{error.message}</p> : isLoading ? <div className="skeleton" style={{ height: 160 }} /> : !data?.length ? (
        <div className="card empty">
          <p className="h2">Ninguém para reativar agora</p>
          <p>Quando um cliente passar 60 dias sem contato, ele aparece aqui. Para isso, marque os contatos que fecham como <strong>Cliente</strong>.</p>
        </div>
      ) : (
        <section className="card">
          <div className="list">
            {data.map((l) => (
              <div key={l.id} className="list-item" style={{ flexWrap: 'wrap' }}>
                <span className="avatar">{firstName(l.name).charAt(0).toUpperCase()}</span>
                <span className="grow">
                  <Link href={`/n/${bid}/contatos/${l.id}`} className="name" style={{ display: 'block', textDecoration: 'none' }}>{l.name}</Link>
                  <span className="small muted">{[formatPhone(l.phone), `último contato ${relative(l.lastContactAt)}`].filter(Boolean).join(' · ')}</span>
                </span>
                {l.phone ? (
                  <a className="btn btn-wa btn-sm" href={waLink(l.phone, msg(l))} target="_blank" rel="noopener noreferrer" onClick={() => contact.mutate(l.id)}>
                    <IconWa />Chamar
                  </a>
                ) : <span className="small muted">sem WhatsApp</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
