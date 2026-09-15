// Contrato de dados espelhando o backend de licenciamento (ver docs/assinatura-app/licenciamento-saas.md).

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export type PaymentMethod = 'pix' | 'cash' | 'credit_card' | 'debit_card' | 'boleto';

/** Situação de uma solicitação de exclusão de conta (MIGRATION_24). */
export type DeletionRequestStatus = 'pending' | 'canceled' | 'completed' | 'failed';

/**
 * Estágio da entrega do e-mail com a exportação. `delivered` é o ÚNICO estado
 * que destrava a exclusão definitiva — ver a D9 do plano.
 */
export type ExportStatus = 'not_requested' | 'pending' | 'sent' | 'delivered' | 'failed';

/**
 * Estados de `data_exports` (exportação avulsa). Conjunto DIFERENTE do
 * `ExportStatus` acima de propósito: aqui não existe 'not_requested' (a linha só
 * nasce quando alguém pede) e existe 'ready', herdado da função síncrona antiga,
 * que gravava o zip sem mandar e-mail.
 */
export type DataExportStatus = 'pending' | 'ready' | 'sent' | 'delivered' | 'failed';

/** Solicitação de exclusão de conta (RPC admin_list_deletion_requests). */
export type DeletionRequest = {
  id: string;
  /** null depois que a empresa foi apagada — o histórico sobrevive à exclusão. */
  tenantId: string | null;
  tenantName: string;
  requestedAt: string;
  scheduledFor: string;
  exportRequested: boolean;
  status: DeletionRequestStatus;
  exportStatus: ExportStatus;
  exportSentAt: string | null;
  exportDeliveredAt: string | null;
  exportOpenedAt: string | null;
  exportDeliveryManual: boolean;
  /** Contato para a ligação de retenção. null depois da exclusão (anonimizado). */
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  canceledAt: string | null;
  canceledByAdmin: boolean;
  completedAt: string | null;
  lastError: string | null;
};

/**
 * Solicitação de EXPORTAÇÃO de dados (MIGRATION_25) — assunto separado da
 * exclusão de conta: aqui o cliente continua com a conta ativa, só pediu uma
 * cópia. Vem de `data_exports` (RPC admin_list_data_export_requests).
 */
export type DataExportRequest = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantPhone: string | null;
  createdAt: string;
  status: DataExportStatus;
  contactEmail: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  deliveryManual: boolean;
  completedAt: string | null;
  errorMessage: string | null;
};

/** Resumo da solicitação pendente, embutido nas telas de cliente. */
export type DeletionRequestSummary = {
  id: string;
  scheduledFor: string;
  exportRequested: boolean;
  exportStatus: ExportStatus;
  status: DeletionRequestStatus;
};

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
  /** Solicitação de exclusão PENDENTE, quando houver. */
  deletionRequest: DeletionRequestSummary | null;
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

/**
 * Detalhe completo de um cliente.
 * `Omit` do `deletionRequest`: aqui ele é o objeto COMPLETO, não o resumo da
 * listagem — intersectar os dois tipos geraria um `A & B` confuso.
 */
export type TenantDetail = Omit<TenantOverview, 'deletionRequest'> & {
  cnpj: string | null;
  phone: string | null;
  /** E-mail de login do dono da empresa (auth.users.email via tenants.owner_user_id). */
  email: string | null;
  devices: TenantDevice[];
  payments: Payment[];
  /**
   * No detalhe vem a solicitação COMPLETA (com contato e trilha de entrega), e
   * inclui as `failed` — são exatamente as que precisam de contato manual.
   */
  deletionRequest: DeletionRequest | null;
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
