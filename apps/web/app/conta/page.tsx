'use client';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useMe } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { Shell } from '@/components/Shell';

export default function ContaPage() {
  const me = useMe().data;
  const toast = useToast((s) => s.show);
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [err, setErr] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: () => api('/auth/password', { method: 'POST', body: { current: f.current, next: f.next } }),
    onSuccess: () => { setF({ current: '', next: '', confirm: '' }); toast('Senha alterada'); },
    onError: (e) => setErr(e.message),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault(); setErr(null);
    if (f.next !== f.confirm) return setErr('A confirmação não é igual à nova senha');
    change.mutate();
  };
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Shell bid={me?.businesses[0]?.id ?? null}>
      <div className="page-head"><div><h1 className="h1">Minha conta</h1><p className="muted">{me?.name} · {me?.email}</p></div></div>
      <section className="card" style={{ maxWidth: 480 }}>
        <div className="card-head"><h2 className="h2">Trocar senha</h2></div>
        <form className="form" onSubmit={submit}>
          <label className="field"><span>Senha atual</span><input className="input" id="pw-cur" type="password" autoComplete="current-password" required value={f.current} onChange={set('current')} /></label>
          <label className="field"><span>Nova senha</span><input className="input" id="pw-new" type="password" autoComplete="new-password" minLength={8} required value={f.next} onChange={set('next')} /></label>
          <label className="field"><span>Repita a nova senha</span><input className="input" id="pw-conf" type="password" autoComplete="new-password" minLength={8} required value={f.confirm} onChange={set('confirm')} /></label>
          {err && <p className="error">{err}</p>}
          <div><button type="submit" className="btn btn-primary" disabled={change.isPending}>Trocar senha</button></div>
        </form>
      </section>
    </Shell>
  );
}
