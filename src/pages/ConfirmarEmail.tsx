import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';

type Phase = 'verifying' | 'success' | 'invalid';

/**
 * Destino do link "Confirm signup" do Supabase (redirect_to). Rota pública —
 * quem clica aqui é um usuário comum do app, não o dono autenticado no painel.
 */
export function ConfirmarEmail() {
  const [params] = useSearchParams();
  const [phase, setPhase] = useState<Phase>('verifying');

  useEffect(() => {
    let active = true;

    (async () => {
      const errorDescription = params.get('error_description');
      if (errorDescription) {
        if (active) setPhase('invalid');
        return;
      }

      const code = params.get('code');
      const tokenHash = params.get('token_hash');
      const type = params.get('type');

      let ok = false;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        ok = !error;
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'email',
        });
        ok = !error;
      } else {
        const { data } = await supabase.auth.getSession();
        ok = !!data.session;
      }

      // Não há motivo pra manter sessão aberta neste navegador — a sessão de
      // verdade é a do app mobile.
      if (ok) await supabase.auth.signOut();

      if (active) setPhase(ok ? 'success' : 'invalid');
    })();

    return () => {
      active = false;
    };
  }, [params]);

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-divider bg-surface p-8 text-center">
        <p className="mb-6 text-2xl font-bold text-gold">Sir Barbecue</p>

        {phase === 'verifying' && (
          <>
            <Spinner className="mx-auto mb-4 h-8 w-8" />
            <p className="text-sm text-text-secondary">Confirmando seu e-mail…</p>
          </>
        )}

        {phase === 'success' && (
          <>
            <p className="mb-2 text-lg font-semibold text-text-primary">E-mail confirmado!</p>
            <p className="text-sm text-text-secondary">
              Sua conta foi confirmada com sucesso. Volte para o app Sir Barbecue e faça login.
            </p>
          </>
        )}

        {phase === 'invalid' && (
          <>
            <p className="mb-2 text-lg font-semibold text-text-primary">Link inválido ou expirado</p>
            <p className="mb-6 text-sm text-text-secondary">
              Este link de confirmação não é mais válido. Abra o app e solicite um novo e-mail de
              confirmação na tela de cadastro.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
