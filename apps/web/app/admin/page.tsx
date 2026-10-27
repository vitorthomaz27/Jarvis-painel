'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { Business, BusinessSummary } from '@/lib/types';
import { useMe } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { Shell } from '@/components/Shell';
import { Modal } from '@/components/Modal';
import { IconPlus } from '@/components/icons';
import { shortDate } from '@/lib/format';

const empty = { name: '', segment: '', city: '', whatsapp: '', site: '', ownerName: '', ownerEmail: '', ownerPassword: '' };

export default function AdminPage() {
  const me = useMe().data;
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const { data, isLoading } = useQuery({ queryKey: ['businesses'], queryFn: () => api<BusinessSummary[]>('/businesses'), enabled: !!me?.isSuperAdmin });

  const create = useMutation({
    mutationFn: () => api<{ business: Business }>('/admin/businesses', {
      method: 'POST',
      body: {
        name: f.name, segment: f.segment || undefined, city: f.city || undefined, whatsapp: f.whatsapp || undefined,
        allowedOrigins: f.site ? [f.site] : [],
        owner: { name: f.ownerName, email: f.ownerEmail, password: f.ownerPassword },
      },
    }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['businesses'] });
      void qc.invalidateQueries({ queryKey: ['me'] });
      setOpen(false); setF(empty);
      toast('Cliente cadastrado');
      router.push(`/n/${r.business.id}/instalacao`);
    },
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  if (me && !me.isSuperAdmin) {
    return <Shell bid={me.businesses[0]?.id ?? null}><p className="muted">Esta área é só da equipe Jarvis.</p></Shell>;
  }

  return (
    <Shell bid={null} title="Clientes Jarvis">
      <div className="page-head">
        <div><h1 className="h1">Clientes Jarvis</h1><p className="muted">Todos os negócios que usam o painel.</p></div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><IconPlus />Novo cliente</button>
      </div>
      <section className="card">
        {isLoading ? <div className="skeleton" style={{ height: 120 }} /> : !data?.length ? (
          <div className="empty"><p className="h2">Nenhum cliente ainda</p><p>Cadastre o primeiro negócio para gerar o código de instalação do site.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Negócio</th><th>Contatos</th><th>Novos</th><th>Equipe</th><th>Desde</th></tr></thead>
              <tbody>
                {data.map((b) => (
                  <tr key={b.id}>
                    <td><Link href={`/n/${b.id}`} style={{ fontWeight: 650, textDecoration: 'none' }}>{b.name}</Link><div className="small muted">{[b.segment, b.city].filter(Boolean).join(', ')}</div></td>
                    <td className="num">{b.leads}</td>
                    <td className="num">{b.novos ? <span className="pill pill-NOVO">{b.novos}</span> : 0}</td>
                    <td className="num">{b.members}</td>
                    <td>{shortDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <Modal title="Novo cliente" onClose={() => setOpen(false)}>
          <form className="form" onSubmit={(e: FormEvent) => { e.preventDefault(); create.mutate(); }}>
            <label className="field"><span>Nome do negócio</span><input className="input" id="a-name" required value={f.name} onChange={set('name')} /></label>
            <div className="row2">
              <label className="field"><span>Segmento</span><input className="input" id="a-seg" placeholder="pilates, dentista…" value={f.segment} onChange={set('segment')} /></label>
              <label className="field"><span>Cidade</span><input className="input" id="a-city" value={f.city} onChange={set('city')} /></label>
            </div>
            <div className="row2">
              <label className="field"><span>WhatsApp do negócio</span><input className="input" id="a-wa" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} /></label>
              <label className="field"><span>Site</span><input className="input" id="a-site" placeholder="https://…" value={f.site} onChange={set('site')} /></label>
            </div>
            <h3 className="h2" style={{ fontSize: 16, marginTop: 4 }}>Responsável</h3>
            <div className="row2">
              <label className="field"><span>Nome</span><input className="input" id="a-oname" required value={f.ownerName} onChange={set('ownerName')} /></label>
              <label className="field"><span>E-mail</span><input className="input" id="a-oemail" type="email" required value={f.ownerEmail} onChange={set('ownerEmail')} /></label>
            </div>
            <label className="field"><span>Senha inicial (mínimo 8 caracteres)</span><input className="input" id="a-opass" type="text" minLength={8} required value={f.ownerPassword} onChange={set('ownerPassword')} /></label>
            {create.error && <p className="error">{create.error.message}</p>}
            <button type="submit" className="btn btn-primary" disabled={create.isPending}>Cadastrar cliente</button>
          </form>
        </Modal>
      )}
    </Shell>
  );
}
