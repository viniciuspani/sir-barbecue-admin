import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Layout, PageHeader } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { DataCard, DataRow, EmptyState } from '@/components/ui/DataCard';
import { Input, Select } from '@/components/ui/Input';
import { CenteredSpinner } from '@/components/ui/Spinner';
import {
  useCancelDeletionRequest,
  useDeletionRequests,
  useMarkExportSent,
  type DeletionRequestFilters,
} from '@/hooks/useAdmin';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/format';
import type { DeletionRequest, DeletionRequestStatus, ExportStatus } from '@/types';

/**
 * Fila de solicitações de exclusão de conta (MIGRATION_24).
 *
 * UMA tela só, cobrindo com e sem exportação: separar em duas quebraria a fila em
 * duas e esconderia justamente os casos SEM exportação, que vencem em 48h e são
 * os mais urgentes para ligar.
 *
 * "Excluir agora" NÃO aparece aqui — botão irreversível em tabela densa é clique
 * na linha errada. Ele vive só no detalhe do cliente, com contexto e duas travas.
 */

const STATUS_BADGE: Record<DeletionRequestStatus, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow/15 text-yellow' },
  completed: { label: 'Excluída', className: 'bg-danger/15 text-danger' },
  canceled: { label: 'Cancelada', className: 'bg-text-secondary/15 text-text-secondary' },
  failed: { label: 'Falhou', className: 'bg-danger/15 text-danger' },
};

function SolicitacaoBadge({ status }: { status: DeletionRequestStatus }) {
  const s = STATUS_BADGE[status];
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', s.className)}
    >
      {s.label}
    </span>
  );
}

/** Estágio da entrega — é por aqui que o dono descobre exclusão travada esperando o webhook. */
function exportLabel(r: DeletionRequest): { text: string; className: string } {
  if (!r.exportRequested) return { text: 'Não', className: 'text-text-secondary' };
  const map: Record<ExportStatus, { text: string; className: string }> = {
    not_requested: { text: 'Não', className: 'text-text-secondary' },
    pending: { text: 'Pendente', className: 'text-yellow' },
    sent: { text: 'Enviado — aguardando confirmação', className: 'text-yellow' },
    delivered: {
      text: `Entregue em ${formatDate(r.exportDeliveredAt)}${r.exportDeliveryManual ? ' (manual)' : ''}`,
      className: 'text-green',
    },
    failed: { text: 'Falha na entrega', className: 'text-danger' },
  };
  return map[r.exportStatus];
}

/** Dias até a data, em linguagem de gente. Vencendo hoje/amanhã vira alerta. */
function countdown(iso: string): { text: string; urgent: boolean } {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return { text: '', urgent: false };
  const days = Math.ceil((target - Date.now()) / 86_400_000);
  if (days < 0) return { text: 'vencida', urgent: true };
  if (days === 0) return { text: 'HOJE', urgent: true };
  if (days === 1) return { text: 'amanhã', urgent: true };
  return { text: `em ${days} dias`, urgent: false };
}

function whatsappHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}

/** A entrega precisa de socorro manual: falhou, ou está sem confirmação há mais de 5 dias. */
function needsManualDelivery(r: DeletionRequest): boolean {
  if (!r.exportRequested || r.exportStatus === 'delivered') return false;
  if (r.exportStatus === 'failed') return true;
  if (r.exportStatus !== 'sent' || !r.exportSentAt) return false;
  return Date.now() - new Date(r.exportSentAt).getTime() > 5 * 86_400_000;
}

export function Solicitacoes() {
  const navigate = useNavigate();
  // Default 'pending': isto é uma lista de tarefas, não um arquivo.
  const [status, setStatus] = useState<DeletionRequestFilters['status']>('pending');
  const [exportFilter, setExportFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [search, setSearch] = useState('');

  const filters: DeletionRequestFilters = {
    status,
    exportRequested: exportFilter === 'all' ? null : exportFilter === 'yes',
    search: search.trim() || undefined,
  };
  const { data, isLoading } = useDeletionRequests(filters);
  const cancel = useCancelDeletionRequest();
  const markSent = useMarkExportSent();

  const onCancel = (r: DeletionRequest) => {
    if (!window.confirm(`Cancelar a solicitação de exclusão de ${r.tenantName}?\n\nA conta volta a funcionar normalmente e nada será excluído.`)) return;
    cancel.mutate({ id: r.id, tenantId: r.tenantId });
  };

  const onMarkSent = (r: DeletionRequest) => {
    if (!window.confirm(`Confirmar que o arquivo com os dados de ${r.tenantName} foi entregue?\n\nIsto libera a exclusão para acontecer na data — não a antecipa.`)) return;
    markSent.mutate({ id: r.id, tenantId: r.tenantId });
  };

  const rows = data ?? [];

  return (
    <Layout>
      <PageHeader
        title="Solicitações"
        subtitle="Pedidos de exclusão de conta e de exportação de dados"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Input
          placeholder="Buscar por empresa, e-mail ou responsável…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as DeletionRequestFilters['status'])}
          className="sm:max-w-[180px]"
        >
          <option value="pending">Pendentes</option>
          <option value="all">Todas</option>
          <option value="completed">Excluídas</option>
          <option value="canceled">Canceladas</option>
          <option value="failed">Com falha</option>
        </Select>
        <Select
          value={exportFilter}
          onChange={(e) => setExportFilter(e.target.value as 'all' | 'yes' | 'no')}
          className="sm:max-w-[220px]"
        >
          <option value="all">Com e sem exportação</option>
          <option value="yes">Só com exportação</option>
          <option value="no">Só sem exportação</option>
        </Select>
      </div>

      {isLoading ? (
        <CenteredSpinner />
      ) : (
        <>
          {/* Mobile: cartões empilhados. */}
          <div className="space-y-3 lg:hidden">
            {rows.length === 0 ? (
              <EmptyState>Nenhuma solicitação de exclusão com estes filtros. 🎉</EmptyState>
            ) : (
              rows.map((r) => {
                const c = countdown(r.scheduledFor);
                const exp = exportLabel(r);
                const wa = whatsappHref(r.contactPhone);
                return (
                  <DataCard key={r.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate font-semibold text-text-primary">
                        {r.tenantName}
                      </span>
                      <SolicitacaoBadge status={r.status} />
                    </div>
                    <DataRow label="Solicitado em" value={formatDateTime(r.requestedAt)} />
                    <DataRow
                      label="Excluir em"
                      value={
                        <span className={cn(c.urgent && 'font-semibold text-danger')}>
                          {formatDate(r.scheduledFor)}
                          {c.text && ` · ${c.text}`}
                        </span>
                      }
                    />
                    <DataRow
                      label="Exportação"
                      value={<span className={exp.className}>{exp.text}</span>}
                    />
                    <DataRow label="Responsável" value={r.contactName ?? '—'} />
                    <DataRow
                      label="Telefone"
                      value={
                        wa ? (
                          <a href={wa} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                            {r.contactPhone}
                          </a>
                        ) : (
                          (r.contactPhone ?? '—')
                        )
                      }
                    />
                    <DataRow label="E-mail" value={r.contactEmail ?? '—'} />

                    {r.lastError && <p className="mt-2 text-xs text-danger">{r.lastError}</p>}

                    <div className="mt-3 flex flex-col gap-2">
                      {r.status === 'pending' || r.status === 'failed' ? (
                        <Button variant="outline" onClick={() => onCancel(r)} disabled={cancel.isPending}>
                          {cancel.isPending ? 'Cancelando…' : 'Cancelar solicitação'}
                        </Button>
                      ) : null}
                      {needsManualDelivery(r) && (
                        <Button variant="ghost" onClick={() => onMarkSent(r)} disabled={markSent.isPending}>
                          {markSent.isPending ? 'Marcando…' : 'Marcar entrega manualmente'}
                        </Button>
                      )}
                      {r.tenantId && (
                        <Button variant="ghost" onClick={() => navigate(`/clientes/${r.tenantId}`)}>
                          Abrir cliente
                        </Button>
                      )}
                    </div>
                  </DataCard>
                );
              })
            )}
          </div>

          {/* Desktop: tabela. */}
          <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-divider lg:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="px-4 py-3 font-medium">Solicitado em</th>
                  <th className="px-4 py-3 font-medium">Excluir em</th>
                  <th className="px-4 py-3 font-medium">Exportação</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr className="border-t border-divider bg-bg">
                    <td colSpan={7} className="px-4 py-8 text-center text-text-secondary">
                      Nenhuma solicitação de exclusão com estes filtros. 🎉
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const c = countdown(r.scheduledFor);
                    const exp = exportLabel(r);
                    const wa = whatsappHref(r.contactPhone);
                    return (
                      <tr key={r.id} className="border-t border-divider bg-bg align-top">
                        <td className="px-4 py-3 font-medium text-text-primary">{r.tenantName}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {formatDateTime(r.requestedAt)}
                        </td>
                        <td className={cn('px-4 py-3', c.urgent ? 'font-semibold text-danger' : 'text-text-primary')}>
                          {formatDate(r.scheduledFor)}
                          {c.text && <span className="block text-xs">{c.text}</span>}
                        </td>
                        <td className={cn('px-4 py-3 text-xs', exp.className)}>{exp.text}</td>
                        <td className="px-4 py-3">
                          <span className="block text-text-primary">{r.contactName ?? '—'}</span>
                          {wa ? (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-gold hover:underline"
                            >
                              {r.contactPhone} ↗
                            </a>
                          ) : (
                            <span className="block text-xs text-text-secondary">
                              {r.contactPhone ?? '—'}
                            </span>
                          )}
                          <span className="block text-xs text-text-secondary">
                            {r.contactEmail ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <SolicitacaoBadge status={r.status} />
                          {r.lastError && (
                            <span className="mt-1 block text-xs text-danger">{r.lastError}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {r.status === 'pending' || r.status === 'failed' ? (
                              <Button
                                variant="outline"
                                onClick={() => onCancel(r)}
                                disabled={cancel.isPending}
                                className="min-h-8 px-3 text-xs"
                              >
                                {cancel.isPending ? 'Cancelando…' : 'Cancelar'}
                              </Button>
                            ) : null}
                            {needsManualDelivery(r) && (
                              <Button
                                variant="ghost"
                                onClick={() => onMarkSent(r)}
                                disabled={markSent.isPending}
                                className="min-h-8 px-3 text-xs"
                              >
                                {markSent.isPending ? 'Marcando…' : 'Marcar entrega'}
                              </Button>
                            )}
                            {r.tenantId && (
                              <button
                                type="button"
                                onClick={() => navigate(`/clientes/${r.tenantId}`)}
                                className="text-xs text-text-secondary hover:text-gold hover:underline"
                              >
                                Abrir cliente →
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
