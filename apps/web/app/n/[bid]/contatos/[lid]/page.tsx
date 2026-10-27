'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { SOURCE_LABEL, STATUS, dateTime, firstName, formatPhone, fromDateInput, isOverdue, relative, toDateInput, waLink } from '@/lib/format';
import type { Lead, LeadStatus } from '@/lib/types';
import { useBusiness, useMe, useRole } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { StatusPill } from '@/components/StatusPill';
import { Modal } from '@/components/Modal';
import { IconBack, IconWa } from '@/components/icons';

export default function LeadPage() {
  const { bid, lid } = useParams<{ bid: string; lid: string }>();
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const me = useMe().data;
  const business = useBusiness(bid).data;
  const role = useRole(bid);
  const key = ['lead', bid, lid];
  const { data: lead, error, isLoading } = useQuery({ queryKey: key, queryFn: () => api<Lead>(`/businesses/${bid}/leads/${lid}`) });
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = (l: Lead) => {
    qc.setQueryData(key, l);
    void qc.invalidateQueries({ queryKey: ['leads', bid] });
    void qc.invalidateQueries({ queryKey: ['overview', bid] });
  };

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) => api<Lead>(`/businesses/${bid}/leads/${lid}`, { method: 'PATCH', body }),
    onSuccess: refresh,
    onError: (e) => toast(e.message, 'erro'),
  });
  const addNote = useMutation({
    mutationFn: () => api<Lead>(`/businesses/${bid}/leads/${lid}/notes`, { method: 'POST', body: { body: note } }),
    onSuccess: (l) => { refresh(l); setNote(''); },
    onError: (e) => toast(e.message, 'erro'),
  });
  const contact = useMutation({
    mutationFn: () => api<Lead>(`/businesses/${bid}/leads/${lid}/contact`, { method: 'POST', body: { channel: 'WhatsApp' } }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => api(`/businesses/${bid}/leads/${lid}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['leads', bid] });
      void qc.invalidateQueries({ queryKey: ['overview', bid] });
      toast('Contato apagado');
      router.replace(`/n/${bid}/contatos`);
    },
  });

  if (error) return <p className="error">{error.message}</p>;
  if (isLoading || !lead) return <div className="skeleton" style={{ height: 240 }} />;

  const quem = me ? firstName(me.name) : '';
  const waText = lead.status === 'CLIENTE'
    ? `Oi, ${firstName(lead.name)}! Aqui é ${quem}, da ${business?.name ?? ''}. Tudo bem? Faz um tempinho que a gente não se fala.`
    : `Oi, ${firstName(lead.name)}! Aqui é ${quem}, da ${business?.name ?? ''}. Vi seu contato${lead.interest ? ` sobre ${lead.interest.toLowerCase()}` : ''} e queria te ajudar.`;

  const submitNote = (e: FormEvent) => { e.preventDefault(); if (note.trim()) addNote.mutate(); };

  return (
    <>
      <Link href={`/n/${bid}/contatos`} className="link small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
        <IconBack width={16} height={16} />Contatos
      </Link>
      <div className="page-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="h1">{lead.name}</h1><StatusPill status={lead.status} />
          </div>
          <div className="contact-line small">
            {lead.phone && <span>{formatPhone(lead.phone)}</span>}
            {lead.email && <span>{lead.email}</span>}
            <span>Chegou {relative(lead.createdAt)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {lead.phone && (
            <a className="btn btn-wa" href={waLink(lead.phone, waText)} target="_blank" rel="noopener noreferrer" onClick={() => contact.mutate()}>
              <IconWa />Chamar no WhatsApp
            </a>
          )}
          <button className="btn btn-ghost" onClick={() => setEditing(true)}>Editar</button>
        </div>
      </div>

      <div className="detail">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="card">
            <div className="card-head"><h2 className="h2">Etapa</h2></div>
            <div className="status-switch" role="group" aria-label="Mudar etapa">
              {STATUS.map((s) => (
                <button key={s.key} aria-pressed={lead.status === s.key} disabled={patch.isPending}
                  onClick={() => lead.status !== s.key && patch.mutate({ status: s.key as LeadStatus })}>{s.label}</button>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2 className="h2">Histórico</h2></div>
            <form className="form" onSubmit={submitNote} style={{ marginBottom: 12 }}>
              <textarea className="textarea" id="nova-nota" placeholder="Anote o que conversaram, o que a pessoa quer, objeções…" value={note} onChange={(e) => setNote(e.target.value)} />
              <div><button type="submit" className="btn btn-primary btn-sm" disabled={!note.trim() || addNote.isPending}>Salvar nota</button></div>
            </form>
            <div className="timeline">
              {lead.notes.map((n) => (
                <div key={n.id} className={`tl-item is-${n.kind}`}>
                  <span className="tl-dot" />
                  <div>
                    <div className="tl-body">{n.body}</div>
                    <div className="tl-meta">{dateTime(n.createdAt)}{n.author ? ` · ${n.author.name}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="card">
            <div className="card-head"><h2 className="h2">Lembrete de retorno</h2></div>
            <label className="field">
              <span>Retornar em</span>
              <input className="input" id="retorno" type="date" value={toDateInput(lead.followUpAt)}
                onChange={(e) => patch.mutate({ followUpAt: fromDateInput(e.target.value) })} />
            </label>
            {lead.followUpAt && (
              <p className={`small ${isOverdue(lead.followUpAt) ? 'tag is-late' : 'muted'}`} style={{ marginTop: 8 }}>
                {isOverdue(lead.followUpAt) ? 'Retorno para hoje ou atrasado.' : 'O contato aparece em "Retornar hoje" na data marcada.'}{' '}
                <button className="link" onClick={() => patch.mutate({ followUpAt: null })}>Tirar lembrete</button>
              </p>
            )}
          </section>

          <section className="card">
            <div className="card-head"><h2 className="h2">Detalhes</h2></div>
            <dl className="kv">
              <dt>Procura</dt><dd>{lead.interest ?? '—'}</dd>
              <dt>Origem</dt><dd>{SOURCE_LABEL[lead.source]}</dd>
              {lead.page && <><dt>Página</dt><dd>{lead.page}</dd></>}
              {lead.utmSource && <><dt>Campanha</dt><dd>{[lead.utmSource, lead.utmCampaign].filter(Boolean).join(' / ')}</dd></>}
              <dt>Último contato</dt><dd>{relative(lead.lastContactAt)}</dd>
            </dl>
            {lead.message && <><p className="small muted" style={{ margin: '14px 0 6px' }}>Mensagem enviada</p><div className="message-box">{lead.message}</div></>}
          </section>

          {role === 'OWNER' && (
            <button className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setConfirmDelete(true)}>Apagar contato</button>
          )}
        </div>
      </div>

      {editing && <EditModal lead={lead} onClose={() => setEditing(false)} onSave={(b) => patch.mutateAsync(b).then(() => setEditing(false))} />}
      {confirmDelete && (
        <Modal title="Apagar contato?" onClose={() => setConfirmDelete(false)}>
          <p className="muted" style={{ marginBottom: 18 }}>O contato {lead.name} e todo o histórico serão apagados. Isso não pode ser desfeito.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger" onClick={() => remove.mutate()} disabled={remove.isPending}>Apagar</button>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function EditModal({ lead, onClose, onSave }: { lead: Lead; onClose: () => void; onSave: (b: Record<string, unknown>) => Promise<unknown> }) {
  const [f, setF] = useState({ name: lead.name, phone: lead.phone ? formatPhone(lead.phone) : '', email: lead.email ?? '', interest: lead.interest ?? '' });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ name: f.name, phone: f.phone || null, email: f.email || null, interest: f.interest || null }).catch((x: Error) => setErr(x.message));
  };
  return (
    <Modal title="Editar contato" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Nome</span><input className="input" id="ed-name" required value={f.name} onChange={set('name')} /></label>
        <div className="row2">
          <label className="field"><span>WhatsApp</span><input className="input" id="ed-phone" inputMode="tel" value={f.phone} onChange={set('phone')} /></label>
          <label className="field"><span>E-mail</span><input className="input" id="ed-email" type="email" value={f.email} onChange={set('email')} /></label>
        </div>
        <label className="field"><span>O que procura</span><input className="input" id="ed-interest" value={f.interest} onChange={set('interest')} /></label>
        {err && <p className="error">{err}</p>}
        <button type="submit" className="btn btn-primary">Salvar</button>
      </form>
    </Modal>
  );
}
