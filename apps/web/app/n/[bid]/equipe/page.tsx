'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { Business, Member } from '@/lib/types';
import { useBusiness, useMe, useRole } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { formatPhone } from '@/lib/format';

export default function EquipePage() {
  const { bid } = useParams<{ bid: string }>();
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const me = useMe().data;
  const role = useRole(bid);
  const isOwner = role === 'OWNER';
  const { data: b } = useBusiness(bid);
  const { data: members } = useQuery({ queryKey: ['members', bid], queryFn: () => api<Member[]>(`/businesses/${bid}/members`) });

  const [info, setInfo] = useState({ name: '', segment: '', city: '', whatsapp: '' });
  useEffect(() => { if (b) setInfo({ name: b.name, segment: b.segment ?? '', city: b.city ?? '', whatsapp: b.whatsapp ? formatPhone(b.whatsapp) : '' }); }, [b]);
  const saveInfo = useMutation({
    mutationFn: () => api<Business>(`/businesses/${bid}`, { method: 'PATCH', body: { name: info.name, segment: info.segment || null, city: info.city || null, whatsapp: info.whatsapp || null } }),
    onSuccess: (nb) => { qc.setQueryData(['business', bid], nb); void qc.invalidateQueries({ queryKey: ['me'] }); toast('Dados salvos'); },
    onError: (e) => toast(e.message, 'erro'),
  });

  const [nm, setNm] = useState({ name: '', email: '', password: '', role: 'MEMBER' as 'MEMBER' | 'OWNER' });
  const add = useMutation({
    mutationFn: () => api<Member>(`/businesses/${bid}/members`, { method: 'POST', body: nm }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['members', bid] }); setNm({ name: '', email: '', password: '', role: 'MEMBER' }); toast('Pessoa adicionada. Passe o e-mail e a senha para ela.'); },
  });
  const removeM = useMutation({
    mutationFn: (uid: string) => api(`/businesses/${bid}/members/${uid}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['members', bid] }); toast('Acesso removido'); },
    onError: (e) => toast(e.message, 'erro'),
  });

  const setI = (k: keyof typeof info) => (e: { target: { value: string } }) => setInfo((x) => ({ ...x, [k]: e.target.value }));
  const setN = (k: keyof typeof nm) => (e: { target: { value: string } }) => setNm((x) => ({ ...x, [k]: e.target.value }));

  return (
    <>
      <div className="page-head"><div><h1 className="h1">Equipe e dados do negócio</h1><p className="muted">Quem acessa o painel e os dados usados nas mensagens.</p></div></div>
      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2 className="h2">Quem tem acesso</h2></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Nome</th><th>Papel</th><th /></tr></thead>
              <tbody>
                {members?.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.name}</strong><div className="small muted">{m.email}</div></td>
                    <td>{m.role === 'OWNER' ? 'Responsável' : 'Equipe'}</td>
                    <td style={{ textAlign: 'right' }}>{isOwner && m.id !== me?.id && <button className="btn btn-danger btn-sm" onClick={() => removeM.mutate(m.id)}>Remover</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isOwner && (
            <form className="form" style={{ marginTop: 18 }} onSubmit={(e: FormEvent) => { e.preventDefault(); add.mutate(); }}>
              <h3 className="h2" style={{ fontSize: 16 }}>Adicionar pessoa</h3>
              <div className="row2">
                <label className="field"><span>Nome</span><input className="input" id="m-name" required value={nm.name} onChange={setN('name')} /></label>
                <label className="field"><span>E-mail</span><input className="input" id="m-email" type="email" required value={nm.email} onChange={setN('email')} /></label>
              </div>
              <div className="row2">
                <label className="field"><span>Senha inicial</span><input className="input" id="m-pass" type="text" minLength={8} required value={nm.password} onChange={setN('password')} /></label>
                <label className="field"><span>Papel</span>
                  <select className="select" id="m-role" value={nm.role} onChange={setN('role')}>
                    <option value="MEMBER">Equipe (vê e atende contatos)</option>
                    <option value="OWNER">Responsável (também configura)</option>
                  </select>
                </label>
              </div>
              {add.error && <p className="error">{add.error.message}</p>}
              <div><button type="submit" className="btn btn-primary btn-sm" disabled={add.isPending}>Adicionar</button></div>
            </form>
          )}
        </section>
        <section className="card">
          <div className="card-head"><h2 className="h2">Dados do negócio</h2></div>
          <form className="form" onSubmit={(e: FormEvent) => { e.preventDefault(); saveInfo.mutate(); }}>
            <label className="field"><span>Nome</span><input className="input" id="b-name" required value={info.name} onChange={setI('name')} disabled={!isOwner} /></label>
            <div className="row2">
              <label className="field"><span>Segmento</span><input className="input" id="b-seg" value={info.segment} onChange={setI('segment')} disabled={!isOwner} /></label>
              <label className="field"><span>Cidade</span><input className="input" id="b-city" value={info.city} onChange={setI('city')} disabled={!isOwner} /></label>
            </div>
            <label className="field"><span>WhatsApp do negócio</span><input className="input" id="b-wa" inputMode="tel" value={info.whatsapp} onChange={setI('whatsapp')} disabled={!isOwner} /></label>
            {isOwner && <div><button type="submit" className="btn btn-primary btn-sm" disabled={saveInfo.isPending}>Salvar</button></div>}
          </form>
        </section>
      </div>
    </>
  );
}
