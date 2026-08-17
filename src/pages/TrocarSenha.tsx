import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';

type Phase = 'verifying' | 'ready' | 'invalid' | 'success';

/**
 * Destino do link "Reset password" do Supabase (redirect_to). Rota pública —
 * coexiste com o fluxo de deep link do app mobile (services/auth.ts), não o substitui.
 */
export function TrocarSenha() {
  const [params] = useSearchParams();
  const [phase, setPhase] = useState<Phase>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      if (params.get('error_description')) {
        if (active) setPhase('invalid');
        return;
      }

      const code = params.get('code');
      const tokenHash = params.get('token_hash');

      let ok = false;
      if (code) {
        const { error: e } = await supabase.auth.exchangeCodeForSession(code);
        ok = !e;
      } else if (tokenHash) {
        const { error: e } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        ok = !e;
      } else {
        const { data } = await supabase.auth.getSession();
        ok = !!data.session;
      }

      if (active) setPhase(ok ? 'ready' : 'invalid');
    })();

    return () => {
      active = false;
    };
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    const { error: e2 } = await supabase.auth.updateUser({ password });
    await supabase.auth.signOut();
    setLoading(false);
    if (e2) {
      setError('Não foi possível salvar a nova senha. Tente novamente.');
      return;
    }
    setPhase('success');
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-divider bg-surface p-6 sm:p-8">
        <p className="mb-6 text-center text-2xl font-bold text-gold">Sir Barbecue</p>

        {phase === 'verifying' && (
          <div className="flex flex-col items-center">
            <Spinner className="mb-4 h-8 w-8" />
            <p className="text-sm text-text-secondary">Verificando link…</p>
          </div>
        )}

        {phase === 'invalid' && (
          <div className="text-center">
            <p className="mb-2 text-lg font-semibold text-text-primary">Link inválido ou expirado</p>
            <p className="text-sm text-text-secondary">
              Volte ao app e solicite um novo link em "Esqueci minha senha".
            </p>
          </div>
        )}

        {phase === 'success' && (
          <div className="text-center">
            <p className="mb-2 text-lg font-semibold text-text-primary">Senha alterada!</p>
            <p className="text-sm text-text-secondary">
              Sua senha foi atualizada. Volte para o app Sir Barbecue e faça login com a nova senha.
            </p>
          </div>
        )}

        {phase === 'ready' && (
          <form onSubmit={onSubmit}>
            <p className="mb-4 text-center text-sm text-text-secondary">Defina sua nova senha de acesso.</p>

            <label className="mb-1 block text-sm text-text-secondary">Nova senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
              autoComplete="new-password"
              required
              className="mb-4"
            />

            <label className="mb-1 block text-sm text-text-secondary">Confirmar senha</label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="repita a senha"
              autoComplete="new-password"
              required
              className="mb-4"
            />

            {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
