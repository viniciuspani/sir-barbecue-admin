import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';
import { USE_MOCK } from '@/lib/supabase';

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-[var(--radius-lg)] border border-divider bg-surface p-6 sm:p-8">
        <p className="text-center text-2xl font-bold text-gold">Sir Barbecue</p>
        <p className="mb-6 text-center text-sm text-text-secondary">Painel do dono</p>

        <label className="mb-1 block text-sm text-text-secondary">E-mail</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="dono@sirbarbecue.app"
          required
          className="mb-4"
        />

        <label className="mb-1 block text-sm text-text-secondary">Senha</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required={!USE_MOCK}
          className="mb-4"
        />

        {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>

        {USE_MOCK ? (
          <p className="mt-4 text-center text-xs text-text-secondary">
            Modo demonstração — qualquer credencial entra.
          </p>
        ) : null}

        <p className="mt-6 text-center text-xs text-text-secondary">
          <Link to="/termos-de-uso" className="hover:text-text-primary">
            Termos de Uso
          </Link>
          {' · '}
          <Link to="/politica-de-privacidade" className="hover:text-text-primary">
            Política de Privacidade
          </Link>
        </p>
      </form>
    </div>
  );
}
