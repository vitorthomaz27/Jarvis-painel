'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { STATUS, fromDateInput } from '@/lib/format';
import type { LeadListItem, LeadStatus } from '@/lib/types';
import { useToast } from '@/lib/toast';
import { Modal } from './Modal';

/** Cadastro rápido: para quem chamou direto no WhatsApp, ligou ou apareceu no balcão. */
export function NewLeadModal({ bid, onClose }: { bid: string; onClose: () => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const [form, setForm] = useState({ name: '', phone: '', email: '', interest: '', message: '', status: 'CONVERSANDO' as LeadStatus, followUp: '' });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = useMutation({
    mutationFn: () => api<LeadListItem>(`/businesses/${bid}/leads`, {
      method: 'POST',
      body: {
        name: form.name, phone: form.phone || null, email: form.email || null, interest: form.interest || null,
        message: form.message || null, status: form.status, followUpAt: fromDateInput(form.followUp),
      },
    }),
    onSuccess: (lead) => {
      void qc.invalidateQueries({ queryKey: ['leads', bid] });
      void qc.invalidateQueries({ queryKey: ['overview', bid] });
      toast('Contato cadastrado');
      onClose();
      router.push(`/n/${bid}/contatos/${lead.id}`);
    },
  });

  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };

  return (
    <Modal title="Novo contato" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Nome</span><input className="input" id="nl-name" required autoFocus value={form.name} onChange={set('name')} /></label>
        <div className="row2">
          <label className="field"><span>WhatsApp</span><input className="input" id="nl-phone" inputMode="tel" placeholder="(31) 99999-9999" value={form.phone} onChange={set('phone')} /></label>
          <label className="field"><span>E-mail</span><input className="input" id="nl-email" type="email" value={form.email} onChange={set('email')} /></label>
        </div>
        <label className="field"><span>O que procura</span><input className="input" id="nl-interest" placeholder="Ex.: aula experimental" value={form.interest} onChange={set('interest')} /></label>
        <div className="row2">
          <label className="field"><span>Etapa</span>
            <select className="select" id="nl-status" value={form.status} onChange={set('status')}>
              {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          <label className="field"><span>Lembrar de retornar em</span><input className="input" id="nl-follow" type="date" value={form.followUp} onChange={set('followUp')} /></label>
        </div>
        <label className="field"><span>Observação</span><textarea className="textarea" id="nl-msg" value={form.message} onChange={set('message')} /></label>
        {create.error && <p className="error">{create.error.message}</p>}
        <button type="submit" className="btn btn-primary" disabled={create.isPending}>{create.isPending ? 'Salvando…' : 'Cadastrar contato'}</button>
      </form>
    </Modal>
  );
}
