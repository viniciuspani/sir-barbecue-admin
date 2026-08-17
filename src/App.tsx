import { Navigate, Route, Routes } from 'react-router-dom';

import { CenteredSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth';
import { ClienteDetalhe } from '@/pages/ClienteDetalhe';
import { Clientes } from '@/pages/Clientes';
import { Configuracoes } from '@/pages/Configuracoes';
import { ConfirmarEmail } from '@/pages/ConfirmarEmail';
import { Dashboard } from '@/pages/Dashboard';
import { Erros } from '@/pages/Erros';
import { Financeiro } from '@/pages/Financeiro';
import { Login } from '@/pages/Login';
import { Saude } from '@/pages/Saude';
import { TrocarSenha } from '@/pages/TrocarSenha';

export function App() {
  return (
    <Routes>
      {/* Rotas públicas: destino dos redirects de e-mail do Supabase (confirmação de
          cadastro e recuperação de senha). Quem chega aqui é um usuário comum do app,
          não o dono autenticado — por isso ficam fora do gate de admin abaixo. */}
      <Route path="/confirmar-email" element={<ConfirmarEmail />} />
      <Route path="/trocar-senha" element={<TrocarSenha />} />
      <Route path="*" element={<AdminApp />} />
    </Routes>
  );
}

function AdminApp() {
  const { loading, isAuthenticated, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="h-full">
        <CenteredSpinner />
      </div>
    );
  }

  // Gate: só super-admin autenticado entra; o resto vê o login.
  if (!isAuthenticated || !isAdmin) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/clientes" element={<Clientes />} />
      <Route path="/clientes/:tenantId" element={<ClienteDetalhe />} />
      <Route path="/financeiro" element={<Financeiro />} />
      <Route path="/erros" element={<Erros />} />
      <Route path="/saude" element={<Saude />} />
      <Route path="/configuracoes" element={<Configuracoes />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
