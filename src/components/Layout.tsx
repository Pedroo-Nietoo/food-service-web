import {
  BarChart3,
  Boxes,
  ChevronRight,
  HelpCircle,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/format';
import type { UserRole } from '../types/api';
import { Modal } from './Modal';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Package;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/produtos', label: 'Produtos', icon: Package },
  {
    to: '/pedidos',
    label: 'Pedidos',
    icon: ShoppingBag,
    roles: ['ADMIN', 'MANAGER', 'CASHIER', 'ATTENDANT', 'KITCHEN'],
  },
  { to: '/estoque', label: 'Estoque', icon: Boxes },
  {
    to: '/clientes',
    label: 'Clientes',
    icon: Users,
    roles: ['ADMIN', 'MANAGER', 'CASHIER', 'ATTENDANT'],
  },
  {
    to: '/relatorios',
    label: 'Relatórios',
    icon: BarChart3,
    roles: ['ADMIN', 'MANAGER'],
  },
];

const ROUTE_TITLES: Record<string, string> = {
  '/produtos': 'Produtos',
  '/pedidos': 'Pedidos',
  '/estoque': 'Estoque',
  '/clientes': 'Clientes',
  '/relatorios': 'Relatórios',
};

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const currentTitle = ROUTE_TITLES[location.pathname] ?? 'Operação';

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roles || hasRole(...item.roles),
  );

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between px-5 pb-6 pt-8">
      <div className="flex flex-col gap-7">
        {/* Marca */}
        <div className="px-1">
          <p className="text-[36px] font-bold leading-none tracking-tight text-[#d64b19]">
            brasa.
          </p>
          <p className="mt-1.5 text-[9px] font-semibold tracking-[1.2px] text-[#73766e]">
            GESTÃO DE LANCHONETES
          </p>
        </div>

        {/* Menu principal */}
        <nav className="flex flex-col gap-1.5">
          <p className="mb-1 px-2 text-[10px] font-semibold tracking-[1px] text-[#73766e]">
            PRINCIPAL
          </p>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-[8px] px-3 py-3 text-[13px] font-medium transition ${
                    isActive
                      ? 'bg-[#fff0e7] text-[#d64b19]'
                      : 'text-[#73766e] hover:bg-[#f7f8f4] hover:text-[#252824]'
                  }`
                }
              >
                <Icon className="size-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Rodapé da navegação */}
      <div className="flex flex-col gap-1 border-t border-[#e7e8e2] pt-4">
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[13px] font-medium text-[#73766e] transition hover:bg-[#f7f8f4] hover:text-[#252824]"
        >
          <HelpCircle className="size-5 shrink-0" />
          <span>Central de ajuda</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[13px] font-medium text-[#73766e] transition hover:bg-[#fef2f2] hover:text-[#b91c1c]"
        >
          <LogOut className="size-5 shrink-0" />
          <span>Sair da conta</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#f7f8f4]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-[232px] shrink-0 border-r border-[#e7e8e2] bg-white lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-50 w-[232px] bg-white">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-[#73766e]"
              aria-label="Fechar menu"
            >
              <X className="size-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-[80px] shrink-0 items-center justify-between border-b border-[#e7e8e2] bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-[#73766e] hover:bg-[#f7f8f4] lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-[#73766e]">Workspace</span>
              <ChevronRight className="size-3 text-[#73766e]" />
              <span className="font-medium text-[#252824]">{currentTitle}</span>
            </div>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[12px] font-semibold text-[#252824]">
              {user?.name ?? 'Operador'}
            </span>
            <span className="text-[10px] text-[#73766e]">
              {user ? ROLE_LABELS[user.role] : ''}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Central de ajuda"
        subtitle="Integração com a Food Service API"
      >
        <div className="space-y-3 text-[13px] text-[#73766e]">
          <p>
            Esta interface está conectada diretamente à{' '}
            <strong className="text-[#252824]">Food Service API</strong> (
            <code className="rounded bg-[#f7f8f4] px-1.5 py-0.5 text-[12px]">
              /api/v1
            </code>
            ), respeitando as regras de RBAC, idempotência e máquina de estados
            do backend.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="text-[#252824]">Produtos e Relatórios:</strong>{' '}
              criação, edição e relatórios exigem perfil{' '}
              <code>ADMIN</code> ou <code>MANAGER</code>.
            </li>
            <li>
              <strong className="text-[#252824]">Estoque:</strong> entradas,
              saídas, perdas e ajustes exigem perfil{' '}
              <code>STOCK_MANAGER</code>, <code>MANAGER</code> ou{' '}
              <code>ADMIN</code>.
            </li>
            <li>
              <strong className="text-[#252824]">Pedidos:</strong> após
              confirmar, o estoque é debitado automaticamente; a conclusão exige
              pagamento integral.
            </li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}
