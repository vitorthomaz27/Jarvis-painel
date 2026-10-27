'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Business } from '@/lib/types';
import { useBusiness, useRole } from '@/lib/queries';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/Modal';

const API_PUBLIC = (process.env.NEXT_PUBLIC_API_PUBLIC_URL ?? 'http://localhost:3333').replace(/\/$/, '');

function Copy({ text }: { text: string }) {
  const toast = useToast((s) => s.show);
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(text).then(() => toast('Copiado'), () => toast('Não deu para copiar. Selecione o texto e copie.', 'erro'))}>
      Copiar
    </button>
  );
}

export default function InstalacaoPage() {
  const { bid } = useParams<{ bid: string }>();
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const role = useRole(bid);
  const { data: b } = useBusiness(bid);
  const [origins, setOrigins] = useState('');
  const [confirmRotate, setConfirmRotate] = useState(false);
  useEffect(() => { if (b) setOrigins(b.allowedOrigins.join('\n')); }, [b]);

  const save = useMutation({
    mutationFn: () => api<Business>(`/businesses/${bid}`, { method: 'PATCH', body: { allowedOrigins: origins.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) } }),
    onSuccess: (nb) => { qc.setQueryData(['business', bid], nb); toast('Sites autorizados salvos'); },
    onError: (e) => toast(e.message, 'erro'),
  });
  const rotate = useMutation({
    mutationFn: () => api<Business>(`/businesses/${bid}/rotate-key`, { method: 'POST' }),
    onSuccess: (nb) => { qc.setQueryData(['business', bid], nb); setConfirmRotate(false); toast('Chave trocada. Atualize o código no site.'); },
  });

  if (!b) return <div className="skeleton" style={{ height: 240 }} />;
  const isOwner = role === 'OWNER';

  const script = `<script src="${API_PUBLIC}/public/embed.js" data-key="${b.captureKey}" defer></script>`;
  const form = `<form data-jarvis-form>
  <input name="nome" placeholder="Seu nome" required>
  <input name="telefone" placeholder="WhatsApp" required>
  <input name="tipo" placeholder="O que você procura">
  <textarea name="mensagem" placeholder="Mensagem"></textarea>
  <input name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">
  <button type="submit">Enviar</button>
  <p data-jarvis-ok hidden>Recebemos! Já já falamos com você.</p>
  <p data-jarvis-error hidden>Não foi possível enviar. Chame no WhatsApp.</p>
</form>`;
  const js = `// Para formulários que já têm código próprio:
window.JarvisPainel.lead({ nome: 'Ana', telefone: '31999999999', tipo: 'Site', mensagem: '...' });`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Instalação no site</h1>
          <p className="muted">Com o código no site, os formulários viram contatos aqui e os cliques no WhatsApp são contados.</p>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="steps">
          <div className="step">
            <span className="step-n">1</span>
            <div style={{ minWidth: 0 }}>
              <div className="card-head" style={{ marginBottom: 8 }}><h2 className="h2">Cole antes de &lt;/body&gt; em todas as páginas</h2><Copy text={script} /></div>
              <pre className="code">{script}</pre>
              <p className="small muted" style={{ marginTop: 8 }}>Só isso já conta os cliques em qualquer link de WhatsApp (wa.me). Para saber de qual botão veio o clique, adicione <code>data-jarvis-location=&quot;topo&quot;</code> no link.</p>
            </div>
          </div>
          <div className="step">
            <span className="step-n">2</span>
            <div style={{ minWidth: 0 }}>
              <div className="card-head" style={{ marginBottom: 8 }}><h2 className="h2">Marque o formulário com data-jarvis-form</h2><Copy text={form} /></div>
              <pre className="code">{form}</pre>
              <p className="small muted" style={{ marginTop: 8 }}>Campos aceitos: nome, telefone ou whatsapp, email, tipo, mensagem. O campo escondido <code>_gotcha</code> barra robôs.</p>
            </div>
          </div>
          <div className="step">
            <span className="step-n">3</span>
            <div style={{ minWidth: 0 }}>
              <div className="card-head" style={{ marginBottom: 8 }}><h2 className="h2">Ou envie pelo JavaScript do site</h2><Copy text={js} /></div>
              <pre className="code">{js}</pre>
            </div>
          </div>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2 className="h2">Sites autorizados</h2></div>
          <p className="small muted" style={{ marginBottom: 10 }}>Um por linha. Com a lista preenchida, só esses sites conseguem enviar contatos com esta chave. Vazio aceita qualquer site.</p>
          <textarea className="textarea" id="origens" placeholder="https://www.seusite.com.br" value={origins} onChange={(e) => setOrigins(e.target.value)} disabled={!isOwner} />
          {isOwner && <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => save.mutate()} disabled={save.isPending}>Salvar sites</button>}
        </section>
        <section className="card">
          <div className="card-head"><h2 className="h2">Chave de captura</h2></div>
          <pre className="code" style={{ marginBottom: 10 }}>{b.captureKey}</pre>
          <p className="small muted">Se a chave vazar e começarem a chegar contatos falsos, troque. O código antigo para de funcionar na hora.</p>
          {isOwner && <button className="btn btn-danger btn-sm" style={{ marginTop: 10 }} onClick={() => setConfirmRotate(true)}>Trocar chave</button>}
        </section>
      </div>

      {confirmRotate && (
        <Modal title="Trocar a chave?" onClose={() => setConfirmRotate(false)}>
          <p className="muted" style={{ marginBottom: 18 }}>O site para de enviar contatos até você colar o código novo.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger" onClick={() => rotate.mutate()} disabled={rotate.isPending}>Trocar chave</button>
            <button className="btn btn-ghost" onClick={() => setConfirmRotate(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
