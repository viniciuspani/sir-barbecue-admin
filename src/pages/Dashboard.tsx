import { AlertTriangle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { Layout, PageHeader } from '@/components/Layout';
import { SystemHealthCard } from '@/components/SystemHealthCard';
import { Card } from '@/components/ui/Card';
import { CenteredSpinner } from '@/components/ui/Spinner';
import { useFinanceSummary } from '@/hooks/useAdmin';
import { formatBRL } from '@/lib/format';

function Kpi({ label, value, icon, accent }: { label: string; value: string; icon: ReactNode; accent: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${accent}`}>{icon}</div>
      <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="text-xl font-bold text-text-primary">{value}</p>
      </div>
    </Card>
  );
}

export function Dashboard() {
  const { data, isLoading } = useFinanceSummary();

  return (
    <Layout>
      <PageHeader title="Dashboard" subtitle="Visão geral do negócio" />
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
