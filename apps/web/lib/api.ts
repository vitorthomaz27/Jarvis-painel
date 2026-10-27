export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** Chama a API pelo próprio domínio (/api → rewrite do Next). Sessão vai no cookie. */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: 'same-origin',
  });
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/login')) {
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?next=${next}`;
    throw new ApiError('Sessão expirada', 401);
  }
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string')
      ? (data as { message: string }).message
      : 'Não foi possível concluir. Tente de novo.';
    throw new ApiError(msg, res.status);
  }
  return data as T;
}
