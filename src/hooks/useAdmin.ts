import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  mockActivateTenantSubscription,
  mockCancelDeletionRequest,
  mockDataExportPendingCount,
  mockDataExportRequests,
  mockDeletionPendingCount,
  mockDeletionRequests,
  mockErrorLogDetail,
  mockErrorLogs,
  mockExecuteDeletionNow,
  mockExpenses,
  mockExtendTrial,
  mockFinance,
  mockMarkDataExportDelivered,
  mockMarkExportSent,
  mockHealthEvents,
  mockHealthNow,
  mockHealthSummary,
  mockPriceHistoryRetention,
  mockSetTrialEndsAt,
  mockTenantDetail,
  mockTenants,
} from '@/lib/mock';
import { supabase, USE_MOCK } from '@/lib/supabase';
import type {
  DataExportRequest,
  DeletionRequest,
  DeletionRequestStatus,
  ExportStatus,
  ErrorLog,
  ErrorLogDetail,
  ErrorLogFilters,
  Expense,
  FinanceSummary,
  HealthEvent,
  HealthNow,
  HealthSummary,
  PaymentMethod,
  PriceHistoryCleanupResult,
  PriceHistoryRetention,
  TenantDetail,
  TenantOverview,
} from '@/types';

// Chaves de cache
const keys = {
  tenants: ['tenants'] as const,
  tenant: (id: string) => ['tenant', id] as const,
  finance: ['finance'] as const,
  expenses: ['expenses'] as const,
  priceHistoryRetention: ['priceHistoryRetention'] as const,
  errorLogs: (f: ErrorLogFilters) => ['errorLogs', f] as const,
  errorLog: (id: string) => ['errorLog', id] as const,
  healthNow: ['healthNow'] as const,
  healthSummary: (days: number) => ['healthSummary', days] as const,
  healthEvents: (limit: number) => ['healthEvents', limit] as const,
  deletionRequests: (f: DeletionRequestFilters) => ['deletionRequests', f] as const,
  deletionPendingCount: ['deletionPendingCount'] as const,
  dataExports: (f: DataExportFilters) => ['dataExports', f] as const,
  dataExportPendingCount: ['dataExportPendingCount'] as const,
};

// ── Solicitações de exclusão de conta (MIGRATION_24) ─────────────────────────

export type DeletionRequestFilters = {
  /** 'all' traz todas; o default da tela é 'pending' — é uma fila de trabalho. */
  status?: DeletionRequestStatus | 'all';
  /** null = com e sem exportação. */
  exportRequested?: boolean | null;
  search?: string;
};

/** Fila de solicitações (RPC admin_list_deletion_requests). */
export function useDeletionRequests(filters: DeletionRequestFilters) {
  return useQuery({
    queryKey: keys.deletionRequests(filters),
    queryFn: async (): Promise<DeletionRequest[]> => {
      if (USE_MOCK) return mockDeletionRequests(filters);
      const { data, error } = await supabase.rpc('admin_list_deletion_requests', {
        p_status: filters.status ?? 'pending',
        p_export: filters.exportRequested ?? null,
        p_search: filters.search ?? null,
        p_limit: 200,
        p_offset: 0,
      });
      if (error) throw error;
      return (data ?? []) as DeletionRequest[];
    },
  });
}

/** Contagem de pendentes — badge do menu e faixa do dashboard. */
export function useDeletionPendingCount() {
  return useQuery({
    queryKey: keys.deletionPendingCount,
    queryFn: async (): Promise<number> => {
      if (USE_MOCK) return mockDeletionPendingCount();
      const { data, error } = await supabase.rpc('admin_deletion_requests_pending_count');
      if (error) throw error;
      return typeof data === 'number' ? data : 0;
    },
  });
}

/** Cancela a solicitação — a ação de RETENÇÃO, e a razão de a janela existir. */
export function useCancelDeletionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; tenantId: string | null }) => {
      if (USE_MOCK) return mockCancelDeletionRequest(id);
      const { error } = await supabase.rpc('admin_cancel_deletion_request', { p_id: id });
      if (error) throw error;
      return { id };
    },
    onSuccess: (_res, vars) => invalidateDeletion(qc, vars.tenantId),
  });
}

/**
 * Marca a entrega MANUALMENTE (o dono mandou o arquivo por fora, ou o webhook do
 * Resend nunca chegou). É a válvula de escape da trava de entrega: sem ela, uma
 * solicitação ficaria presa para sempre esperando um evento que não vem.
 */
export function useMarkExportSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; tenantId: string | null }) => {
      if (USE_MOCK) return mockMarkExportSent(id);
      const { error } = await supabase.rpc('admin_mark_export_sent', { p_id: id });
      if (error) throw error;
      return { id };
    },
    onSuccess: (_res, vars) => invalidateDeletion(qc, vars.tenantId),
  });
}

/**
 * "Excluir agora", sem esperar o prazo. Chama a Edge Function (só ela tem
 * service_role para apagar de auth.users). A função REVALIDA a trava de entrega
 * do lado do servidor — o botão desabilitado na tela é conveniência, não garantia.
 */
export function useExecuteDeletionNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; tenantId: string | null }) => {
      if (USE_MOCK) return mockExecuteDeletionNow(id);
      const { data, error } = await supabase.functions.invoke('process-deletion-requests', {
        body: { requestId: id },
      });
      if (error) throw error;
      const payload = data as { error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
      return { id };
    },
    onSuccess: (_res, vars) => invalidateDeletion(qc, vars.tenantId),
  });
}

// ── Solicitações de EXPORTAÇÃO de dados (MIGRATION_25) ───────────────────────
// Assunto separado das exclusões de propósito: aqui o cliente continua com a
// conta ativa, só pediu uma cópia. Misturar as duas filas numa tela só
// esconderia as exclusões, que são as que têm prazo.

export type DataExportFilters = {
  status?: ExportStatus | 'all';
  search?: string;
};

export function useDataExportRequests(filters: DataExportFilters) {
  return useQuery({
    queryKey: keys.dataExports(filters),
    queryFn: async (): Promise<DataExportRequest[]> => {
      if (USE_MOCK) return mockDataExportRequests(filters);
      const { data, error } = await supabase.rpc('admin_list_data_export_requests', {
        p_status: filters.status ?? 'pending',
        p_search: filters.search ?? null,
        p_limit: 200,
        p_offset: 0,
      });
      if (error) throw error;
      return (data ?? []) as DataExportRequest[];
    },
  });
}

/** Conta pendentes + enviadas sem confirmação — o que ainda precisa de olho. */
export function useDataExportPendingCount() {
  return useQuery({
    queryKey: keys.dataExportPendingCount,
    queryFn: async (): Promise<number> => {
      if (USE_MOCK) return mockDataExportPendingCount();
      const { data, error } = await supabase.rpc('admin_data_export_pending_count');
      if (error) throw error;
      return typeof data === 'number' ? data : 0;
    },
  });
}

/** Válvula de escape: o webhook não chegou, ou o arquivo foi enviado por fora. */
export function useMarkDataExportDelivered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (USE_MOCK) return mockMarkDataExportDelivered(id);
      const { error } = await supabase.rpc('admin_mark_data_export_delivered', { p_id: id });
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dataExports'] });
      void qc.invalidateQueries({ queryKey: keys.dataExportPendingCount });
    },
  });
}

function invalidateDeletion(qc: ReturnType<typeof useQueryClient>, tenantId: string | null) {
  void qc.invalidateQueries({ queryKey: ['deletionRequests'] });
  void qc.invalidateQueries({ queryKey: keys.deletionPendingCount });
  void qc.invalidateQueries({ queryKey: keys.tenants });
  if (tenantId) void qc.invalidateQueries({ queryKey: keys.tenant(tenantId) });
}

/** Lista de clientes (RPC admin_list_tenants_overview). */
export function useTenantsOverview() {
  return useQuery({
    queryKey: keys.tenants,
    queryFn: async (): Promise<TenantOverview[]> => {
      if (USE_MOCK) return mockTenants;
      const { data, error } = await supabase.rpc('admin_list_tenants_overview');
      if (error) throw error;
      return (data ?? []) as TenantOverview[];
    },
  });
}

/** Detalhe de um cliente. */
export function useTenantDetail(tenantId: string) {
  return useQuery({
    queryKey: keys.tenant(tenantId),
    queryFn: async (): Promise<TenantDetail | null> => {
      if (USE_MOCK) return mockTenantDetail(tenantId);
      const { data, error } = await supabase.rpc('admin_tenant_detail', { p_tenant_id: tenantId });
      if (error) throw error;
      return (data ?? null) as TenantDetail | null;
    },
  });
}

/** Botão on/off (RPC admin_set_tenant_access). */
export function useSetTenantAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, enabled }: { tenantId: string; enabled: boolean }) => {
      if (USE_MOCK) return { tenantId, enabled };
      const { error } = await supabase.rpc('admin_set_tenant_access', {
        p_tenant_id: tenantId,
        p_enabled: enabled,
      });
      if (error) throw error;
      return { tenantId, enabled };
    },
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: keys.tenants });
      void qc.invalidateQueries({ queryKey: keys.tenant(vars.tenantId) });
    },
  });
}

/** Prorroga o trial em N dias, a partir da data final vigente (RPC admin_extend_tenant_trial). */
export function useExtendTenantTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, days }: { tenantId: string; days: number }) => {
      if (USE_MOCK) return mockExtendTrial(tenantId, days);
      const { error } = await supabase.rpc('admin_extend_tenant_trial', {
        p_tenant_id: tenantId,
        p_days: days,
      });
      if (error) throw error;
    },
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: keys.tenants });
      void qc.invalidateQueries({ queryKey: keys.tenant(vars.tenantId) });
    },
  });
}

/** Define manualmente a data final do trial (RPC admin_set_tenant_trial_ends_at). */
export function useSetTenantTrialEndsAt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, trialEndsAt }: { tenantId: string; trialEndsAt: string }) => {
      if (USE_MOCK) return mockSetTrialEndsAt(tenantId, trialEndsAt);
      const { error } = await supabase.rpc('admin_set_tenant_trial_ends_at', {
        p_tenant_id: tenantId,
        p_trial_ends_at: trialEndsAt,
      });
      if (error) throw error;
    },
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: keys.tenants });
      void qc.invalidateQueries({ queryKey: keys.tenant(vars.tenantId) });
    },
  });
}

/** Ativa a assinatura — trial/past_due/canceled → active, vencimento = hoje + 1 mês (RPC admin_activate_tenant_subscription). */
export function useActivateTenantSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId }: { tenantId: string }) => {
      if (USE_MOCK) return mockActivateTenantSubscription(tenantId);
      const { error } = await supabase.rpc('admin_activate_tenant_subscription', {
        p_tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: keys.tenants });
      void qc.invalidateQueries({ queryKey: keys.tenant(vars.tenantId) });
    },
  });
}

/** Lançar pagamento manual (insert em payments). */
export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenantId: string;
      amount: number;
      method: PaymentMethod;
      referenceMonth: string;
    }) => {
      if (USE_MOCK) return input;
      const { error } = await supabase.from('payments').insert({
        tenant_id: input.tenantId,
        amount: input.amount,
        method: input.method,
        reference_month: input.referenceMonth,
        status: 'paid',
      });
      if (error) throw error;
      return input;
    },
    onSuccess: (input) => {
      void qc.invalidateQueries({ queryKey: keys.tenant(input.tenantId) });
      void qc.invalidateQueries({ queryKey: keys.finance });
    },
  });
}

/** Resumo financeiro (RPC admin_finance_summary). */
export function useFinanceSummary() {
  return useQuery({
    queryKey: keys.finance,
    queryFn: async (): Promise<FinanceSummary> => {
      if (USE_MOCK) return mockFinance;
      const { data, error } = await supabase.rpc('admin_finance_summary');
      if (error) throw error;
      return data as FinanceSummary;
    },
  });
}

/** Despesas da aplicação (table app_expenses, RLS super-admin). */
export function useExpenses() {
  return useQuery({
    queryKey: keys.expenses,
    queryFn: async (): Promise<Expense[]> => {
      if (USE_MOCK) return mockExpenses;
      const { data, error } = await supabase
        .from('app_expenses')
        .select('id, name, category, amount, incurred_at, recurring')
        .order('incurred_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        category: r.category as string,
        amount: Number(r.amount),
        incurredAt: r.incurred_at as string,
        recurring: r.recurring as boolean,
      }));
    },
  });
}

/** Cadastrar despesa. */
export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      category: string;
      amount: number;
      recurring: boolean;
    }) => {
      if (USE_MOCK) return input;
      const { error } = await supabase.from('app_expenses').insert({
        name: input.name,
        category: input.category,
        amount: input.amount,
        recurring: input.recurring,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.expenses });
      void qc.invalidateQueries({ queryKey: keys.finance });
    },
  });
}

/** Retenção configurada para a limpeza do histórico de preço (RPC admin_get_price_history_retention). */
export function usePriceHistoryRetention() {
  return useQuery({
    queryKey: keys.priceHistoryRetention,
    queryFn: async (): Promise<PriceHistoryRetention> => {
      if (USE_MOCK) return mockPriceHistoryRetention;
      const { data, error } = await supabase.rpc('admin_get_price_history_retention');
      if (error) throw error;
      return data as PriceHistoryRetention;
    },
  });
}

/** Salvar a retenção (meses) usada pela limpeza automática (RPC admin_set_price_history_retention). */
export function useSetPriceHistoryRetention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (months: number): Promise<PriceHistoryRetention> => {
      if (USE_MOCK) return { retentionMonths: months };
      const { data, error } = await supabase.rpc('admin_set_price_history_retention', { p_months: months });
      if (error) throw error;
      return data as PriceHistoryRetention;
    },
    onSuccess: (res) => {
      qc.setQueryData(keys.priceHistoryRetention, res);
    },
  });
}

/**
 * Log de erros do aplicativo (RPC admin_list_error_logs).
 * A busca casa com o código de referência, a ação ou a mensagem — é assim que se
 * encontra a ocorrência a partir do código que o cliente informou.
 */
export function useErrorLogs(filters: ErrorLogFilters) {
  return useQuery({
    queryKey: keys.errorLogs(filters),
    queryFn: async (): Promise<ErrorLog[]> => {
      if (USE_MOCK) return mockErrorLogs(filters);
      const { data, error } = await supabase.rpc('admin_list_error_logs', {
        p_tenant_id: filters.tenantId ?? null,
        p_severity: filters.severity ?? null,
        p_search: filters.search ?? null,
        p_limit: 200,
        p_offset: 0,
      });
      if (error) throw error;
      return (data ?? []) as ErrorLog[];
    },
  });
}

/** Detalhe de um erro: mensagem completa, stack e trilha do usuário. */
export function useErrorLogDetail(id: string | null) {
  return useQuery({
    queryKey: keys.errorLog(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<ErrorLogDetail | null> => {
      if (!id) return null;
      if (USE_MOCK) return mockErrorLogDetail(id);
      const { data, error } = await supabase.rpc('admin_error_log_detail', { p_id: id });
      if (error) throw error;
      return (data ?? null) as ErrorLogDetail | null;
    },
  });
}

// --- Saúde do sistema -------------------------------------------------

/** URL pública da Edge Function `health` (VITE_HEALTH_URL no .env). */
const HEALTH_URL = (import.meta.env.VITE_HEALTH_URL as string | undefined) ?? '';

/** Marcador para o card distinguir "falta configurar" de "backend caiu". */
export const HEALTH_URL_MISSING = 'health_url_missing';

/**
 * "Está no ar AGORA?" — ping direto na Edge Function `health`, sem passar pelo
 * supabase-js (funciona até com a sessão do painel expirada). Revalida a cada 30s.
 *
 * Importante: HTTP 503 NÃO é erro aqui — é o backend dizendo "o banco caiu", e o
 * corpo vem com o motivo. Erro de verdade (isError) significa que nem resposta
 * houve: Supabase inteiro fora, ou CORS/ALLOWED_ORIGIN mal configurado.
 */
export function useHealthNow() {
  return useQuery({
    queryKey: keys.healthNow,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
    gcTime: 0,
    queryFn: async (): Promise<HealthNow> => {
      if (USE_MOCK) return mockHealthNow;
      // Fora do modo mock, faltar a URL é ERRO — nunca cair no mock aqui. Um card
      // de saúde permanentemente verde por falta de config é pior que card nenhum:
      // ele mente exatamente na hora em que você mais precisa dele.
      if (!HEALTH_URL) throw new Error(HEALTH_URL_MISSING);
      const res = await fetch(HEALTH_URL, { cache: 'no-store' });
      return (await res.json()) as HealthNow;
    },
  });
}

/** Resumo de uptime do período (RPC admin_health_summary). */
export function useHealthSummary(days = 30) {
  return useQuery({
    queryKey: keys.healthSummary(days),
    queryFn: async (): Promise<HealthSummary> => {
      if (USE_MOCK) return mockHealthSummary;
      const { data, error } = await supabase.rpc('admin_health_summary', { p_days: days });
      if (error) throw error;
      return data as HealthSummary;
    },
  });
}

/** Histórico de quedas e retornos registrado pelo monitor externo. */
export function useHealthEvents(limit = 100) {
  return useQuery({
    queryKey: keys.healthEvents(limit),
    queryFn: async (): Promise<HealthEvent[]> => {
      if (USE_MOCK) return mockHealthEvents;
      const { data, error } = await supabase.rpc('admin_list_health_events', { p_limit: limit });
      if (error) throw error;
      return (data ?? []) as HealthEvent[];
    },
  });
}

/** Rodar a limpeza do histórico agora (RPC admin_run_price_history_cleanup). */
export function useRunPriceHistoryCleanup() {
  return useMutation({
    mutationFn: async (months?: number): Promise<PriceHistoryCleanupResult> => {
      if (USE_MOCK) return { retentionMonths: months ?? mockPriceHistoryRetention.retentionMonths, deletedCount: 3 };
      const { data, error } = await supabase.rpc('admin_run_price_history_cleanup', { p_months: months ?? null });
      if (error) throw error;
      return data as PriceHistoryCleanupResult;
    },
  });
}
