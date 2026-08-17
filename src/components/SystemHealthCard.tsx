import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { HEALTH_URL_MISSING, useHealthNow } from '@/hooks/useAdmin';
import { cn } from '@/lib/cn';
import type { HealthNow } from '@/types';

type Tone = 'green' | 'danger' | 'muted';

const toneClass: Record<Tone, { dot: string; text: string; accent: string }> = {
  green: { dot: 'bg-green', text: 'text-green', accent: 'bg-green/15' },
  danger: { dot: 'bg-danger', text: 'text-danger', accent: 'bg-danger/15' },
  muted: { dot: 'bg-text-secondary', text: 'text-text-secondary', accent: 'bg-text-secondary/15' },
};

/** Motivos técnicos do /health traduzidos para o que o dono precisa saber. */
const motivos: Record<string, string> = {
  db_unreachable: 'o banco de dados não respondeu',
  db_error: 'o banco recusou a consulta',
  db_unexpected: 'o banco respondeu de forma inesperada',
  config_missing: 'a função está sem as credenciais do projeto',
};

function resolve(
  isLoading: boolean,
  isError: boolean,
  error: Error | null,
  data: HealthNow | undefined,
): { label: string; detail: string; tone: Tone } {
  if (isLoading) return { label: 'Verificando…', detail: 'Consultando o endpoint /health', tone: 'muted' };

  // Falta de configuração NÃO pode se disfarçar de "tudo bem" nem de "caiu".
  if (error?.message === HEALTH_URL_MISSING) {
    return {
      label: 'Não configurado',
      detail: 'Defina VITE_HEALTH_URL no .env / Netlify e refaça o build do painel',
      tone: 'muted',
    };
  }

  // Sem resposta nenhuma: ou o Supabase inteiro está fora, ou o CORS bloqueou o
  // navegador (ALLOWED_ORIGIN). Vale distinguir os dois no texto para não caçar
  // fantasma quando na verdade é configuração.
  if (isError || !data) {
    return {
      label: 'Sem resposta',
      detail: 'O endpoint não respondeu — backend fora do ar ou origem não liberada (ALLOWED_ORIGIN)',
      tone: 'danger',
    };
  }

  if (data.status === 'ok') {
    return {
      label: 'No ar',
      detail: `Banco de dados respondendo em ${data.checks.database.latency_ms} ms`,
      tone: 'green',
    };
  }

  const causa = motivos[data.checks.database.error ?? ''] ?? 'falha no banco de dados';
  return { label: 'Fora do ar', detail: `Servidor respondeu, mas ${causa}`, tone: 'danger' };
}

/**
 * Estado do backend AGORA (ping ao vivo no /health, revalidado a cada 30s).
 * Não substitui o monitor externo: se o Supabase cair por completo, este painel
 * também não abre. Serve para conferir na hora e para ver a latência do banco.
 */
export function SystemHealthCard({ compact = false }: { compact?: boolean }) {
  const { data, isLoading, isError, error, dataUpdatedAt } = useHealthNow();
  const { label, detail, tone } = resolve(isLoading, isError, error, data);
  const t = toneClass[tone];

  const verificadoAs = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  if (compact) {
    return (
      <Card className="flex items-center gap-4">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-full', t.accent)}>
          <Activity className={cn('h-5 w-5', t.text)} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-text-secondary">Sistema</p>
          <p className={cn('text-xl font-bold', t.text)}>{label}</p>
        </div>
        <Link
          to="/saude"
          className="ml-auto shrink-0 text-xs text-text-secondary underline-offset-2 hover:text-gold hover:underline"
        >
          detalhes
        </Link>
      </Card>
    );
  }

  return (
    <Card className="flex items-start gap-4">
      <span className={cn('mt-1.5 h-3 w-3 shrink-0 rounded-full', t.dot)} />
      <div className="min-w-0 flex-1">
        <p className={cn('text-lg font-bold', t.text)}>{label}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{detail}</p>
        <p className="mt-3 text-xs text-text-secondary">
          Verificado às {verificadoAs} · atualiza sozinho a cada 30s
          {data?.version ? ` · versão ${data.version}` : ''}
        </p>
      </div>
    </Card>
  );
}
