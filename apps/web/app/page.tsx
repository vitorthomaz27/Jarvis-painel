'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMe } from '@/lib/queries';

/** Decide para onde ir: primeiro negócio do usuário, ou a área da Jarvis. */
export default function Home() {
  const router = useRouter();
  const { data: me, error } = useMe();
  useEffect(() => {
    if (!me) return;
    if (me.businesses[0]) router.replace(`/n/${me.businesses[0].id}`);
    else if (me.isSuperAdmin) router.replace('/admin');
  }, [me, router]);

  if (error) return <main className="auth"><p className="error">{error.message}</p></main>;
  if (me && !me.businesses.length && !me.isSuperAdmin) {
    return (
      <main className="auth">
        <div className="auth-card empty">
          <h1 className="h2">Nenhum negócio vinculado</h1>
          <p>Peça para a Jarvis Tecnologia ou para o responsável do seu negócio te adicionar à equipe.</p>
        </div>
      </main>
    );
  }
  return <main className="auth"><div className="skeleton" style={{ width: 200, height: 20 }} /></main>;
}
