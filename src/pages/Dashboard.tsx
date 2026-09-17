import { AlertTriangle, CheckCircle2, Clock, FileDown, TrendingUp, UserMinus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Layout, PageHeader } from '@/components/Layout';
import { SystemHealthCard } from '@/components/SystemHealthCard';
import { Card } from '@/components/ui/Card';
import { CenteredSpinner } from '@/components/ui/Spinner';
import {
  useDataExportPendingCount,
  useDeletionRequests,
  useFinanceSummary,
} from '@/hooks/useAdmin';
import { formatBRL, formatDate } from '@/lib/format';

function Kpi({
  label,
  value,
  icon,
  accent,
  hint,
  to,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent: string;
  /** Linha extra abaixo do número — usada para a data do vencimento mais próximo. */
  hint?: string;
  /** Quando informado, o card inteiro vira link para a fila correspondente. */
  to?: string;
}) {
  const card = (
    <Card className={`flex items-center gap-4 ${to ? 'transition-colors hover:bg-surface-hover' : ''}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="text-xl font-bold text-text-primary">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-text-secondary">{hint}</p>}
      </div>
    </Card>
  );
  return to ? (
    <Link to={to} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

export function Dashboard() {
  const { data, isLoading } = useFinanceSummary();
  const { data: deletions } = useDeletionRequests({ status: 'pending' });
  const { data: pendingExports = 0 } = useDataExportPendingCount();

  // As exclusões são as únicas com PRAZO CORRENDO, então é o vencimento mais
  // próximo que define a cor: vermelho quando falta um dia ou já venceu.
  const pendentes = deletions ?? [];
  const proxima = pendentes[0]?.scheduledFor ?? null;
  const diasAteProxima = proxima
    ? Math.ceil((new Date(proxima).getTime() - Date.now()) / 86_400_000)
    : null;
  const urgente = diasAteProxima !== null && diasAteProxima <= 1;

  return (
    <Layout>
      <PageHeader title="Dashboard" subtitle="Visão geral do negócio" />

      {/* As duas filas ficam no TOPO e fora do `isLoading` do resumo financeiro:
          são a única coisa da página com prazo, têm query própria, e não devem
          esperar o financeiro carregar. O card leva para a fila, onde estão os
          detalhes (qual empresa, contato, ações) que não cabem num KPI. */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Kpi
          label="Exclusões de conta pendentes"
          value={String(pendentes.length)}
          hint={
            proxima
              ? `mais próxima: ${formatDate(proxima)}${urgente ? ' — vence já' : ''}`
              : 'nenhuma solicitação em aberto'
          }
          icon={
            <UserMinus className={`h-5 w-5 ${urgente ? 'text-danger' : 'text-yellow'}`} />
          }
          accent={urgente ? 'bg-danger/15' : 'bg-yellow/15'}
          to="/solicitacoes"
        />
        <Kpi
          label="Exportações de dados na fila"
          value={String(pendingExports)}
          hint={
            pendingExports > 0
              ? 'o worker processa de hora em hora'
              : 'nenhuma solicitação em aberto'
          }
          icon={
            <FileDown
              className={`h-5 w-5 ${pendingExports > 0 ? 'text-yellow' : 'text-text-secondary'}`}
            />
          }
          accent={pendingExports > 0 ? 'bg-yellow/15' : 'bg-text-secondary/15'}
          to="/exportacoes"
        />
      </div>

      {isLoading || !data ? (
        <CenteredSpinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Receita mensal (MRR)"
              value={formatBRL(data.monthlyRevenue)}
              icon={<TrendingUp className="h-5 w-5 text-green" />}
              accent="bg-green/15"
            />
            <Kpi
              label="Lucro do mês"
              value={formatBRL(data.monthlyProfit)}
              icon={<TrendingUp className="h-5 w-5 text-gold" />}
              accent="bg-gold/15"
            />
            <Kpi
              label="Clientes ativos"
              value={String(data.activeCount)}
              icon={<CheckCircle2 className="h-5 w-5 text-green" />}
              accent="bg-green/15"
            />
            <Kpi
              label="Em atraso"
              value={String(data.pastDueCount)}
              icon={<AlertTriangle className="h-5 w-5 text-danger" />}
              accent="bg-danger/15"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SystemHealthCard compact />
            <Kpi
              label="Em trial"
              value={String(data.trialCount)}
              icon={<Clock className="h-5 w-5 text-yellow" />}
              accent="bg-yellow/15"
            />
            <Kpi
              label="Despesas do mês"
              value={formatBRL(data.monthlyExpense)}
              icon={<AlertTriangle className="h-5 w-5 text-text-secondary" />}
              accent="bg-text-secondary/15"
            />
          </div>
        </>
      )}
    </Layout>
  );
}
