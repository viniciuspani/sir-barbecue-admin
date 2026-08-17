import { ArrowUpCircle, Clock, ShieldAlert, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { Layout, PageHeader } from '@/components/Layout';
import { SystemHealthCard } from '@/components/SystemHealthCard';
import { Card } from '@/components/ui/Card';
import { CenteredSpinner } from '@/components/ui/Spinner';
import { useHealthEvents, useHealthSummary } from '@/hooks/useAdmin';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import type { HealthEvent } from '@/types';

function Kpi({ label, value, hint, icon, accent }: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="text-xl font-bold text-text-primary">{value}</p>
        {hint ? <p className="text-xs text-text-secondary">{hint}</p> : null}
      </div>
    </Card>
  );
}

function EventBadge({ status }: { status: HealthEvent['status'] }) {
  const caiu = status === 'offline';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        caiu ? 'bg-danger/15 text-danger' : 'bg-green/15 text-green',
      )}
    >
      {caiu ? 'Caiu' : 'Voltou'}
    </span>
  );
}

/** Duração de uma queda = tempo até o próximo evento da lista (que é o retorno). */
function duracao(events: HealthEvent[], index: number): string {
  const atual = events[index];
  if (!atual || atual.status !== 'offline') return '—';
  // A lista vem do mais recente para o mais antigo: o retorno está ACIMA (índice menor).
  const retorno = events[index - 1];
  const fim = retorno && retorno.status === 'online' ? new Date(retorno.occurredAt) : new Date();
  const minutos = Math.max(0, Math.round((fim.getTime() - new Date(atual.occurredAt).getTime()) / 60_000));
  if (!retorno || retorno.status !== 'online') return `${minutos} min (em aberto)`;
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)}h ${minutos % 60}min`;
}

export function Saude() {
  const { data: resumo, isLoading: carregandoResumo } = useHealthSummary(30);
  const { data: eventos, isLoading: carregandoEventos } = useHealthEvents(100);

  const rows = eventos ?? [];

  return (
    <Layout>
      <PageHeader
        title="Saúde do sistema"
        subtitle="Estado do backend agora e histórico de quedas registrado pelo monitor externo"
      />

      <SystemHealthCard />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {carregandoResumo || !resumo ? (
          <Card className="sm:col-span-3">
            <CenteredSpinner />
          </Card>
        ) : (
          <>
            <Kpi
              label="Disponibilidade (30 dias)"
              value={`${resumo.uptimePercent.toFixed(2)}%`}
              icon={<TrendingUp className="h-5 w-5 text-green" />}
              accent="bg-green/15"
            />
            <Kpi
              label="Quedas (30 dias)"
              value={String(resumo.incidents)}
              hint={resumo.incidents === 0 ? 'Nenhuma queda registrada' : undefined}
              icon={<ShieldAlert className="h-5 w-5 text-danger" />}
              accent="bg-danger/15"
            />
            <Kpi
              label="Tempo fora do ar"
              value={`${resumo.downtimeMinutes} min`}
              hint={resumo.since ? `Estado atual desde ${formatDateTime(resumo.since)}` : undefined}
              icon={<Clock className="h-5 w-5 text-yellow" />}
              accent="bg-yellow/15"
            />
          </>
        )}
      </div>

      <h2 className="mb-3 mt-8 text-base font-semibold text-text-primary">Histórico de quedas</h2>

      {carregandoEventos ? (
        <CenteredSpinner />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-divider">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Ficou fora</th>
                <th className="px-4 py-3 font-medium">Motivo detectado</th>
                <th className="px-4 py-3 font-medium">Monitor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={e.id} className="border-t border-divider bg-bg">
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {formatDateTime(e.occurredAt)}
                  </td>
                  <td className="px-4 py-3">
                    <EventBadge status={e.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-primary">{duracao(rows, i)}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {e.errors.length > 0 ? e.errors.join(' · ') : '—'}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{e.monitorName}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr className="border-t border-divider bg-bg">
                  <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                    Nenhuma queda registrada. 🎉
                    <span className="mt-1 block text-xs">
                      Se o monitor externo ainda não foi ligado ao webhook, esta lista fica vazia
                      mesmo depois de uma queda.
                    </span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-md)] border border-divider bg-surface px-4 py-3">
        <ArrowUpCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
        <p className="text-xs leading-relaxed text-text-secondary">
          Este painel <strong>não é o alarme</strong> — quem vigia 24h é o monitor externo
          (HetrixTools, de 1 em 1 minuto), que avisa por e-mail e Telegram e alimenta este
          histórico pelo webhook. Se o Supabase cair por inteiro, este painel também não abre:
          por isso o alerta tem que continuar vindo de fora.
        </p>
      </div>
    </Layout>
  );
}
