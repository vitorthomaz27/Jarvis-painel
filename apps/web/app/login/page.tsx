'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { Me } from '@/lib/types';
import { Mark } from '@/components/icons';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () => api<Me>('/auth/login', { method: 'POST', body: { email, password } }),
    onSuccess: (me) => {
      qc.setQueryData(['me'], me);
      const next = params.get('next');
      if (next && next.startsWith('/') && !next.startsWith('//')) return router.replace(next);
      if (me.businesses[0]) return router.replace(`/n/${me.businesses[0].id}`);
      router.replace(me.isSuperAdmin ? '/admin' : '/');
    },
  });

  const submit = (e: FormEvent) => { e.preventDefault(); login.mutate(); };

  return (
    <form className="form" onSubmit={submit}>
      <label className="field"><span>E-mail</span><input className="input" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="field"><span>Senha</span><input className="input" id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {login.error && <p className="error" role="alert">{login.error.message}</p>}
      <button type="submit" className="btn btn-primary" disabled={login.isPending}>{login.isPending ? 'Entrando…' : 'Entrar'}</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand" style={{ padding: 0, marginBottom: 26 }}>
          <span className="mark"><Mark /></span>
          <span className="brand-name">Jarvis<span>Painel</span></span>
        </div>
        <h1 className="h1" style={{ fontSize: 24, marginBottom: 6 }}>Entrar no painel</h1>
        <p className="muted" style={{ marginBottom: 22 }}>Seus contatos, o funil e os retornos do dia.</p>
        <Suspense><LoginForm /></Suspense>
      </div>
    </main>
  );
}
