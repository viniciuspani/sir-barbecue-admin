import { Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { useDataExportPendingCount, useDeletionRequests } from '@/hooks/useAdmin';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';

const MAX_LINHAS = 3;

/**
 * Faixa de solicitações de exclusão pendentes, no topo do Dashboard.
 *
 * Por que NÃO é um 5º KPI: o grid é de 4 colunas, um quinto cartão cria órfão na
 * segunda linha — e colocaria um evento raro no mesmo peso visual do MRR.
 *
 * Por que o slot existe SEMPRE (inclusive no zero): um layout que salta 120px
 * quando aparece a primeira solicitação treina o dono a não confiar na página. E
 * "nenhuma pendência" é informação que ele quer ver afirmada, não inferida da
 * ausência.
 *
 * Borda amarela e não `danger`: ainda é reversível — e é exatamente isso que ele
 * precisa saber para ligar a tempo.
 */
export function DeletionRequestsStrip() {
  const { data, isLoading } = useDeletionRequests({ status: 'pending' });
  const { data: pendingExports = 0 } = useDataExportPendingCount();
  const rows = data ?? [];

  // A linha de exportações é sempre secundária: elas não têm prazo correndo e o
  // worker resolve sozinho. Só precisam de olho quando travam.
  const linhaExportacoes =
    pendingExports > 0 ? (
      <Link to="/exportacoes" className="text-xs text-text-secondary hover:text-gold hover:underline">
        {pendingExports === 1
          ? '1 exportação de dados na fila'
          : `${pendingExports} exportações de dados na fila`}{' '}
        →
      </Link>
    ) : null;

  // Carregando: não pisca nada, só reserva a linha discreta.
  if (isLoading || rows.length === 0) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
        <span>{isLoading ? ' ' : 'Nenhuma solicitação de exclusão pendente.'}</span>
        {!isLoading && (
          <span className="flex flex-wrap items-center gap-4">
            {linhaExportacoes}
            <Link to="/solicitacoes" className="text-xs hover:text-gold hover:underline">
              Ver exclusões →
            </Link>
          </span>
        )}
      </div>
    );
  }

  const visiveis = rows.slice(0, MAX_LINHAS);
  const restantes = rows.length - visiveis.length;

  return (
    <Card className="mb-4 border-yellow">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow/15">
          <Timer className="h-5 w-5 text-yellow" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text-primary">
            {rows.length === 1
              ? '1 solicitação de exclusão de conta'
              : `${rows.length} solicitações de exclusão de conta`}
          </p>
          <ul className="mt-2 space-y-1 border-t border-divider pt-2">
            {visiveis.map((r) => {
              const dias = Math.ceil((new Date(r.scheduledFor).getTime() - Date.now()) / 86_400_000);
              const urgente = dias <= 1;
              return (
                <li
                  key={r.id}
                  className={cn('text-sm', urgente ? 'font-semibold text-danger' : 'text-text-secondary')}
                >
                  {r.tenantName} · excluir em {formatDate(r.scheduledFor)}
                  {urgente && (dias <= 0 ? ' (hoje)' : ' (amanhã)')} ·{' '}
                  {r.exportRequested ? 'com exportação' : 'sem exportação'}
                </li>
              );
            })}
            {restantes > 0 && (
              <li className="text-sm text-text-secondary">e mais {restantes} solicitações</li>
            )}
          </ul>
          <div className="mt-2 flex flex-wrap items-center justify-end gap-4">
            {linhaExportacoes}
            <Link
              to="/solicitacoes"
              className="text-xs text-text-secondary hover:text-gold hover:underline"
            >
              Ver exclusões →
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
