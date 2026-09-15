import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useCancelDeletionRequest,
  useExecuteDeletionNow,
  useMarkExportSent,
} from '@/hooks/useAdmin';
import { formatDate, formatDateTime } from '@/lib/format';
import type { DeletionRequest } from '@/types';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs text-text-secondary">{label}</p>
      <p className="break-words text-sm text-text-primary">{value}</p>
    </div>
  );
}

function exportSummary(r: DeletionRequest): string {
  if (!r.exportRequested) return 'Não';
  switch (r.exportStatus) {
    case 'delivered':
      return `Sim — entregue em ${formatDate(r.exportDeliveredAt)}${r.exportDeliveryManual ? ' (manual)' : ''}`;
    case 'sent':
      return `Sim — enviado em ${formatDate(r.exportSentAt)}, aguardando confirmação`;
    case 'failed':
      return 'Sim — FALHA na entrega';
    default:
      return `Sim — enviar até ${formatDate(r.scheduledFor)}`;
  }
}

/**
 * Solicitação de exclusão no detalhe do cliente.
 *
 * Largura total e ACIMA do grid Assinatura/Dispositivos: ela muda o sentido de
 * tudo o que vem depois (a assinatura logo abaixo está a caminho da porta). E
 * largura total evita disputar atenção lado a lado com o card de Assinatura.
 *
 * Ordem das ações = ordem da intenção do dono: reter primeiro, administrar
 * depois, destruir por último e separado.
 */
export function DeletionRequestCard({ request }: { request: DeletionRequest }) {
  const cancel = useCancelDeletionRequest();
  const markSent = useMarkExportSent();
  const executeNow = useExecuteDeletionNow();

  const vars = { id: request.id, tenantId: request.tenantId };
  const entregaConfirmada = !request.exportRequested || request.exportStatus === 'delivered';

  const onCancel = () => {
    if (
      !window.confirm(
        `Cancelar a solicitação de exclusão de ${request.tenantName}?\n\n` +
          'A conta volta a funcionar normalmente e nada será excluído.',
      )
    )
      return;
    cancel.mutate(vars);
  };

  const onMarkSent = () => {
    if (
      !window.confirm(
        `Confirmar que o arquivo com os dados de ${request.tenantName} foi entregue a ${request.contactEmail ?? 'o cliente'}?`,
      )
    )
      return;
    markSent.mutate(vars);
  };

  const onExecuteNow = () => {
    // Trava 2: prova DIGITADA. O app já exige prova (senha/e-mail) do cliente
    // para solicitar — a coerência é exigir prova aqui também, para destruir.
    const typed = window.prompt(
      `Isto apaga AGORA a conta e todos os dados de ${request.tenantName}. Não há como desfazer.\n\n` +
        'Para confirmar, digite o nome da empresa:',
    );
    if (typed == null) return;
    if (typed.trim().toLowerCase() !== request.tenantName.trim().toLowerCase()) {
      window.alert('O nome não confere. Nada foi excluído.');
      return;
    }
    executeNow.mutate(vars);
  };

  return (
    <Card className="mb-4 border-yellow">
      <div className="mb-4 flex items-center justify-between gap-3">
        <CardTitle>Solicitação de exclusão de conta</CardTitle>
        <span className="inline-flex items-center rounded-full bg-yellow/15 px-2.5 py-0.5 text-xs font-medium text-yellow">
          {request.status === 'failed' ? 'Precisa de ação' : 'Pendente'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Solicitado em" value={formatDateTime(request.requestedAt)} />
        <Field label="Excluir em" value={formatDate(request.scheduledFor)} />
        <Field label="Exportação" value={exportSummary(request)} />
        <Field label="Responsável" value={request.contactName ?? '—'} />
        <Field label="Telefone" value={request.contactPhone ?? '—'} />
        <Field label="E-mail do usuário" value={request.contactEmail ?? '—'} />
      </div>

      {request.lastError && <p className="mt-3 text-sm text-danger">{request.lastError}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        {/* Dourado: retenção é o objetivo declarado da janela, então é o botão
            mais fácil de achar. */}
        <Button variant="gold" onClick={onCancel} disabled={cancel.isPending}>
          {cancel.isPending ? 'Cancelando…' : 'Cancelar solicitação (manter cliente)'}
        </Button>

        {request.exportRequested && request.exportStatus !== 'delivered' && (
          <div>
            <Button variant="outline" onClick={onMarkSent} disabled={markSent.isPending}>
              {markSent.isPending ? 'Marcando…' : 'Marcar entrega manualmente'}
            </Button>
            <p className="mt-1 text-xs text-text-secondary">
              Marcar a entrega não antecipa a exclusão.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-divider pt-4">
        <p className="mb-3 text-xs text-text-secondary">
          Excluir antes do prazo apaga a conta e todos os dados na hora. Use só se o cliente pedir.
        </p>
        <div className="flex justify-end">
          {/* Trava 1: bloqueado enquanto a exportação não foi entregue. É o erro
              mais caro que esta tela pode cometer — apagar os dados de quem pediu
              uma cópia deles, sem a cópia ter chegado. O servidor revalida isto. */}
          <Button
            variant="danger"
            onClick={onExecuteNow}
            disabled={executeNow.isPending || !entregaConfirmada}
            title={
              entregaConfirmada
                ? undefined
                : 'Marque a entrega da exportação antes de excluir — senão os dados são apagados sem o arquivo ir para o cliente.'
            }
          >
            {executeNow.isPending ? 'Excluindo…' : 'Excluir agora (não espera o prazo)'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
