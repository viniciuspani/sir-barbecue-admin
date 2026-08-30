const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(value: number): string {
  return brl.format(value);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  // Uma string "YYYY-MM-DD" pura não tem fuso — o construtor Date a interpreta
  // como UTC, o que desloca o dia exibido em fusos negativos (ex: Brasil). Trata
  // como meia-noite local para exibir o mesmo dia que foi armazenado/escolhido.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = new Date(dateOnly ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

/** Data + hora — o log de erros precisa do minuto, não só do dia. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** 'YYYY-MM' → 'mês/ano' curto. */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const idx = Number(m) - 1;
  return `${meses[idx] ?? m}/${y?.slice(2) ?? ''}`;
}

/** Mês atual no formato 'YYYY-MM'. */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
