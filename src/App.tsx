import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClientesPage } from './pages/ClientesPage';
import { EstoquePage } from './pages/EstoquePage';
import { LoginPage } from './pages/LoginPage';
import { PedidosPage } from './pages/PedidosPage';
import { ProdutosPage } from './pages/ProdutosPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import type { UserRole } from './types/api';

function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const { token, hasRole } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) {
    return (
      <Layout>
        <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-8 text-center">
          <h2 className="text-[18px] font-bold text-[#252824]">
            Acesso restrito
          </h2>
          <p className="mt-2 text-[13px] text-[#73766e]">
            Seu perfil não possui permissão para acessar esta seção.
          </p>
        </div>
      </Layout>
    );
  }
  return <Layout>{children}</Layout>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/produtos"
            element={
              <ProtectedRoute>
                <ProdutosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pedidos"
            element={
              <ProtectedRoute
                roles={['ADMIN', 'MANAGER', 'CASHIER', 'ATTENDANT', 'KITCHEN']}
              >
                <PedidosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estoque"
            element={
              <ProtectedRoute>
                <EstoquePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <ProtectedRoute
                roles={['ADMIN', 'MANAGER', 'CASHIER', 'ATTENDANT']}
              >
                <ClientesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                <RelatoriosPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/produtos" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
