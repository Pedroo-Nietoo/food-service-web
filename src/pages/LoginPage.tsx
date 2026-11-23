import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

const SALES_BARS = [32, 49, 38, 65, 55, 82, 100];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!loginValue.trim() || !password) {
      setError('Preencha o login e a senha para continuar.');
      return;
    }

    setLoading(true);
    try {
      await login(loginValue.trim(), password, remember);
      navigate('/produtos');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível conectar ao servidor.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Painel esquerdo — Apresentação da marca */}
      <section className="flex flex-col justify-between bg-[#252824] px-8 py-10 text-white lg:w-[48%] lg:px-16 lg:py-12">
        <div>
          <p className="text-[36px] font-bold leading-none tracking-tight text-[#d64b19]">
            brasa.
          </p>
          <p className="mt-1.5 text-[10px] font-semibold tracking-[1.4px] text-[#a3a69e]">
            GESTÃO DE LANCHONETES
          </p>
        </div>

        <div className="my-10 space-y-8">
          <div className="space-y-3">
            <span className="inline-block rounded-full bg-[#353933] px-3 py-1 text-[11px] font-medium text-[#f59e0b]">
              Para a sua operação
            </span>
            <h1 className="text-[32px] font-bold leading-[1.2] tracking-tight sm:text-[38px]">
              Controle de pedidos, estoque e caixa em um só lugar.
            </h1>
            <p className="max-w-md text-[14px] leading-relaxed text-[#b7bab2]">
              Acompanhe vendas em tempo real, movimentações de estoque com
              rastreabilidade e fechamento financeiro integrado.
            </p>
          </div>

          <div className="rounded-[14px] border border-[#3a3e38] bg-[#2e322d] p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] text-[#a3a69e]">Operação integrada</p>
                <p className="mt-1 text-[26px] font-bold tracking-tight text-white">
                  Pedidos, Estoque e Caixa
                </p>
                <p className="mt-1 text-[12px] text-[#a3a69e]">
                  Conectado diretamente à Food Service API v1
                </p>
              </div>
              <div className="flex h-[78px] items-end gap-1.5">
                {SALES_BARS.map((height, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${height}%` }}
                    className={`w-3 rounded-t-[4px] ${
                      idx === SALES_BARS.length - 1
                        ? 'bg-[#d64b19]'
                        : 'bg-[#4b5049]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-[#a3a69e]">
          <span>Produtos</span>
          <span>•</span>
          <span>Pedidos</span>
          <span>•</span>
          <span>Estoque</span>
          <span>•</span>
          <span>Clientes</span>
          <span>•</span>
          <span>Relatórios</span>
        </div>
      </section>

      {/* Painel direito — Autenticação */}
      <section className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
        <div className="w-full max-w-[410px] space-y-7">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-[#252824]">
              Bem-vindo de volta
            </h2>
            <p className="mt-1.5 text-[14px] text-[#73766e]">
              Entre com seu login e senha para acessar o painel administrativo.
            </p>
          </div>

          {error && (
            <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="login"
                className="mb-1.5 block text-[12px] font-semibold text-[#252824]"
              >
                Login do operador
              </label>
              <input
                id="login"
                type="text"
                autoComplete="username"
                value={loginValue}
                onChange={(e) => setLoginValue(e.target.value)}
                placeholder="ex.: admin"
                className="h-[46px] w-full rounded-[10px] border border-[#e7e8e2] bg-[#f7f8f4] px-3.5 text-[14px] text-[#252824] outline-none transition focus:border-[#d64b19] focus:bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[12px] font-semibold text-[#252824]"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="h-[46px] w-full rounded-[10px] border border-[#e7e8e2] bg-[#f7f8f4] pl-3.5 pr-11 text-[14px] text-[#252824] outline-none transition focus:border-[#d64b19] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#73766e] hover:text-[#252824]"
                  aria-label="Alternar visibilidade da senha"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center text-[12px]">
              <label className="flex cursor-pointer items-center gap-2 text-[#252824]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 accent-[#d64b19]"
                />
                <span>Manter conectado</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-[48px] w-full rounded-[10px] bg-[#d64b19] text-[14px] font-semibold text-white transition hover:bg-[#be4014] disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar no sistema'}
            </button>
          </form>

          <div className="flex items-center gap-2 text-[12px] text-[#73766e]">
            <ShieldCheck className="size-4 shrink-0 text-[#277254]" />
            <span>Acesso protegido por JWT e controle de perfis RBAC.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
