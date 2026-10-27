/**
 * Normaliza telefone brasileiro para só dígitos com DDI 55.
 * "(31) 99806-0020" -> "5531998060020". Devolve null se não houver dígitos suficientes.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = String(input).replace(/\D/g, '');
  if (!d) return null;
  d = d.replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  if (d.length < 10 || d.length > 15) return null;
  return d;
}

export function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
