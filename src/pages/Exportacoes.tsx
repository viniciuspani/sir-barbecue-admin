import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Layout, PageHeader } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { DataCard, DataRow, EmptyState } from '@/components/ui/DataCard';
import { Input, Select } from '@/components/ui/Input';
import { CenteredSpinner } from '@/components/ui/Spinner';
import {
  useDataExportRequests,
  useMarkDataExportDelivered,
  type DataExportFilters,
} from '@/hooks/useAdmin';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import type { DataExportRequest, DataExportStatus } from '@/types';

/**
 * Fila de solicitações de EXPORTAÇÃO de dados (MIGRATION_25).
 *
 * Tela separada das exclusões de propósito: são assuntos diferentes. Aqui o
 * cliente continua com a conta ativa e só pediu uma cópia — não há prazo
 * correndo nem empresa para apagar. Juntar as duas filas enterraria as
 * exclusões, que são as que têm data marcada.
 *
 * O dono não precisa fazer nada no caminho feliz: o worker horário processa
 * sozinho. Esta tela é monitoramento, com uma única ação de socorro para quando
 * a entrega não se confirma.
 */

const STATUS: Record<DataExportStatus, { label: string; className: string }> = {
  pending: { label: 'Na fila', className: 'bg-yellow/15 text-yellow' },
  ready: { label: 'Arquivo pronto', className: 'bg-yellow/15 text-yellow' },
  sent: { label: 'Enviado', className: 'bg-yellow/15 text-yellow' },
  delivered: { label: 'Entregue', className: 'bg-green/15 text-green' },
  failed: { label: 'Falhou', className: 'bg-danger/15 text-danger' },
};

function StatusBadge({ status }: { status: DataExportStatus }) {
  const s = STATUS[status];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', s.className)}>
      {s.label}
    </span>
  );
}

/** Precisa de socorro manual: falhou, ou foi enviada e não confirmou em 24h. */
function needsAttention(r: DataExportRequest): boolean {
  if (r.status === 'failed') return true;
  if (r.status !== 'sent' || !r.sentAt) return false;
  return Date.now() - new Date(r.sentAt).getTime() > 86_400_000;
}

export function Exportacoes() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<DataExportFilters['status']>('pending');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useDataExportRequests({
    status,
    search: search.trim() || undefined,
  });
  const markDelivered = useMarkDataExportDelivered();
  const rows = data ?? [];

  const onMarkDelivered = (r: DataExportRequest) => {
    if (
      !window.confirm(
        `Confirmar que o arquivo de ${r.tenantName} foi entregue a ${r.contactEmail ?? 'o cliente'}?`,
      )
    )
      return;
    markDelivered.mutate({ id: r.id });
  };

  return (
    <Layout>
      <PageHeader
        title="Exportações"
        subtitle="Pedidos de cópia dos dados — o cliente continua com a conta ativa"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Input
          placeholder="Buscar por empresa ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as DataExportFilters['status'])}
          className="sm:max-w-[180px]"
        >
          <option value="pending">Na fila</option>
          <option value="all">Todas</option>
          <option value="sent">Enviadas</option>
          <option value="delivered">Entregues</option>
          <option value="failed">Com falha</option>
        </Select>
      </div>

      {isLoading ? (
        <CenteredSpinner />
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {rows.length === 0 ? (
              <EmptyState>Nenhuma solicitação de exportação com estes filtros.</EmptyState>
            ) : (
              rows.map((r) => (
                <DataCard key={r.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate font-semibold text-text-primary">
                      {r.tenantName}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <DataRow label="Solicitado em" value={formatDateTime(r.createdAt)} />
                  <DataRow label="E-mail" value={r.contactEmail ?? '—'} />
                  <DataRow label="Enviado em" value={formatDateTime(r.sentAt)} />
                  <DataRow label="Entregue em" value={formatDateTime(r.deliveredAt)} />
                  {r.errorMessage && <p className="mt-2 text-xs text-danger">{r.errorMessage}</p>}
                  <div className="mt-3 flex flex-col gap-2">
                    {needsAttention(r) && (
                      <Button
                        variant="outline"
                        onClick={() => onMarkDelivered(r)}
                        disabled={markDelivered.isPending}
                      >
                        {markDelivered.isPending ? 'Marcando…' : 'Marcar entrega manualmente'}
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => navigate(`/clientes/${r.tenantId}`)}>
                      Abrir cliente
                    </Button>
                  </div>
                </DataCard>
              ))
            )}
          </div>

          <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-divider lg:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Solicitado em</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Enviado</th>
                  <th className="px-4 py-3 font-medium">Entregue</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr className="border-t border-divider bg-bg">
                    <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                      Nenhuma solicitação de exportação com estes filtros.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-t border-divider bg-bg align-top">
                      <td className="px-4 py-3 font-medium text-text-primary">{r.tenantName}</td>
                      <td className="px-4 py-3 text-text-secondary">{formatDateTime(r.createdAt)}</td>
                      <td className="px-4 py-3 text-text-secondary">{r.contactEmail ?? '—'}</td>
                      <td className="px-4 py-3 text-text-secondary">{formatDateTime(r.sentAt)}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatDateTime(r.deliveredAt)}
                        {r.deliveryManual && <span className="block text-xs">(manual)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                        {r.errorMessage && (
                          <span className="mt-1 block text-xs text-danger">{r.errorMessage}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {needsAttention(r) && (
                            <Button
                              variant="outline"
                              onClick={() => onMarkDelivered(r)}
                              disabled={markDelivered.isPending}
                              className="min-h-8 px-3 text-xs"
                            >
                              {markDelivered.isPending ? 'Marcando…' : 'Marcar entrega'}
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate(`/clientes/${r.tenantId}`)}
                            className="text-xs text-text-secondary hover:text-gold hover:underline"
                          >
                            Abrir cliente →
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
