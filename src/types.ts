// Contrato de dados espelhando o backend de licenciamento (ver docs/assinatura-app/licenciamento-saas.md).

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export type PaymentMethod = 'pix' | 'cash' | 'credit_card' | 'debit_card' | 'boleto';

/** Linha da visão geral de clientes (RPC admin_list_tenants_overview). */
export type TenantOverview = {
  tenantId: string;
  name: string;
  status: SubscriptionStatus;
  /** false = bloqueado pelo dono (kill switch). */
  enabled: boolean;
  monthlyPrice: number;
  paymentMethod: PaymentMethod | null;
  /** Início do trial (null se o cliente nunca teve trial). */
  trialStartedAt: string | null;
  /** Início do relacionamento com o cliente (data da contratação). */
  contractStartedAt: string | null;
  /** Fim do trial ou do período pago vigente. */
  endsAt: string | null;
  deviceCount: number;
  lastPaymentAt: string | null;
};

export type TenantDevice = {
  deviceId: string;
  platform: string | null;
  active: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type Payment = {
  id: string;
  tenantId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  referenceMonth: string; // 'YYYY-MM'
  status: 'paid' | 'pending';
};

export type Expense = {
  id: string;
  name: string;
  category: string;
  amount: number;
  incurredAt: string;
  recurring: boolean;
};

/** Detalhe completo de um cliente. */
export type TenantDetail = TenantOverview & {
  cnpj: string | null;
  phone: string | null;
  devices: TenantDevice[];
  payments: Payment[];
};

/** Config de limpeza do histórico de preço (RPC admin_get/set_price_history_retention). */
export type PriceHistoryRetention = {
  retentionMonths: number;
};

/** Resultado de rodar a limpeza agora (RPC admin_run_price_history_cleanup). */
export type PriceHistoryCleanupResult = {
  retentionMonths: number;
  deletedCount: number;
};

export type ErrorSeverity = 'error' | 'fatal';

/** Linha da lista de erros do app (RPC admin_list_error_logs). */
export type ErrorLog = {
  id: string;
  /** Código curto que o cliente lê para o suporte (ex.: "7F3A2K"). */
  refCode: string;
  /** Data e hora em que o erro ocorreu no aparelho. */
  occurredAt: string;
  severity: ErrorSeverity;
  /** Null quando o erro aconteceu antes do vínculo com uma empresa. */
  tenantId: string | null;
  tenantName: string | null;
  userId: string | null;
  userEmail: string | null;
  /** Rota em que o usuário estava (ex.: /venda/fechar). */
  screen: string | null;
  /** O que ele estava fazendo (ex.: "Fechar venda"). */
  action: string | null;
  message: string;
  /** Mensagem amigável que foi exibida na tela. */
  userMessage: string | null;
  appVersion: string | null;
  platform: string | null;
};

/** Passo da trilha de navegação anexada ao erro. */
export type ErrorBreadcrumb = {
  at: number;
  kind: 'screen' | 'action';
  label: string;
};

export type ErrorLogContext = {
  breadcrumbs?: ErrorBreadcrumb[];
  isOnline?: boolean;
  role?: string | null;
  membershipStatus?: string | null;
  preAuth?: boolean;
  meta?: Record<string, unknown> | null;
};

/** Detalhe completo de um erro (RPC admin_error_log_detail). */
export type ErrorLogDetail = ErrorLog & {
  createdAt: string;
  /** Mensagem técnica completa: stack + code/details/hint do Postgres. */
  detail: string | null;
  context: ErrorLogContext | null;
  osVersion: string | null;
};

/** Filtros da lista de erros. */
export type ErrorLogFilters = {
  tenantId?: string | null;
  severity?: ErrorSeverity | null;
  search?: string | null;
};

// --- Saúde do sistema -------------------------------------------------
// Duas fontes distintas: o endpoint /health responde "está no ar AGORA" (ping ao
// vivo, sem passar pelo banco); health_events guarda o histórico de quedas, que
// chega pelo webhook do monitor externo.

export type HealthProbe = { ok: boolean; latency_ms: number; error?: string };

/** Resposta crua da Edge Function `health` (endpoint público). */
export type HealthNow = {
  status: 'ok' | 'down';
  service: string;
  version: string;
  checks: { edge: HealthProbe; database: HealthProbe };
  ts: string;
};

/** Evento de queda/retorno registrado pelo monitor (RPC admin_list_health_events). */
export type HealthEvent = {
  id: string;
  monitorName: string;
  status: 'online' | 'offline';
  occurredAt: string;
  /** Motivos por localidade quando caiu: ["timeout", "keyword not found"]. */
  errors: string[];
};

/** Resumo do período (RPC admin_health_summary). */
export type HealthSummary = {
  days: number;
  /** 'unknown' = o monitor ainda não registrou nenhum evento. */
  currentStatus: 'online' | 'offline' | 'unknown';
  /** Desde quando está nesse estado. */
  since: string | null;
  incidents: number;
  downtimeMinutes: number;
  uptimePercent: number;
};

/** Resumo financeiro (RPC admin_finance_summary). */
export type FinanceSummary = {
  monthlyRevenue: number; // MRR
  monthlyExpense: number;
  monthlyProfit: number;
  activeCount: number;
  trialCount: number;
  pastDueCount: number;
  /** Série mensal para o gráfico. */
  series: { month: string; revenue: number; expense: number }[];
};
