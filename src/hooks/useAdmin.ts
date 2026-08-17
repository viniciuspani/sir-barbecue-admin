import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  mockErrorLogDetail,
  mockErrorLogs,
  mockExpenses,
  mockFinance,
  mockHealthEvents,
  mockHealthNow,
  mockHealthSummary,
  mockPriceHistoryRetention,
  mockTenantDetail,
  mockTenants,
} from '@/lib/mock';
import { supabase, USE_MOCK } from '@/lib/supabase';
import type {
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
};

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
