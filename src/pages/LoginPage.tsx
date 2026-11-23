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
      {/* Painel esquerdo — Apresentação da marca (#4D2014) */}
      <section className="flex flex-col justify-between bg-[#4d2014] px-8 py-10 text-white lg:w-[48%] lg:px-16 lg:py-12">
        <div className="flex items-center justify-between">
          <p className="text-[36px] font-bold leading-none tracking-tight text-[#e47948]">
            brasa.
          </p>
          <p className="text-[10px] font-semibold tracking-[1.4px] text-[#d9c1b5]">
            GESTÃO QUE DÁ GOSTO.
          </p>
        </div>

        <div className="my-10 space-y-8">
          <div className="space-y-4">
            <span className="inline-block rounded-full bg-[#663322] px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.8px] text-[#f3d8ca]">
              FEITO PARA QUEM ALIMENTA BONS MOMENTOS
            </span>
            <h1 className="text-[36px] font-bold leading-[1.12] tracking-tight sm:text-[44px]">
              O seu balcão,
              <br />
              na sua melhor
              <br />
              versão.
            </h1>
            <p className="max-w-sm text-[14px] leading-relaxed text-[#d9c1b5]">
              Menos planilhas. Mais sabor.
              <br />
              Toda a sua lanchonete em um só lugar.
            </p>
          </div>

          {/* Card creme de prévia */}
          <div className="rounded-[14px] bg-[#faf1e6] p-6 text-[#4d2014] shadow-sm">
            <p className="text-[13px] font-semibold text-[#4d2014]">
              Um bom dia de vendas.
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.8px] text-[#8b6658]">
                  OPERAÇÃO INTEGRADA
                </p>
                <p className="mt-1 text-[24px] font-bold tracking-tight text-[#4d2014]">
                  Tempo real
                </p>
              </div>
              <div className="flex h-[70px] items-end gap-1.5">
                {SALES_BARS.map((height, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${height}%` }}
                    className={`w-3 rounded-t-[4px] ${
                      idx === SALES_BARS.length - 1
                        ? 'bg-[#d64b19]'
                        : 'bg-[#eccab6]'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#ead8c8] pt-3 text-[11px]">
              <span className="text-[#8b6658]">Pedidos, estoque e caixa</span>
              <span className="font-medium text-[#277254]">Tudo sob controle.</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-4 text-[11px] font-medium text-[#f3d8ca]">
            <span>Cardápio</span>
            <span>Pedidos</span>
            <span>Estoque</span>
            <span>Clientes</span>
          </div>
          <p className="text-[11px] text-[#b89688]">
            Da primeira chapa ao último pedido.
          </p>
        </div>
      </section>

      {/* Painel direito — Autenticação */}
      <section className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
        <div className="w-full max-w-[410px] space-y-6">
          <div>
            <p className="text-[10px] font-semibold tracking-[1.2px] text-[#d64b19]">
              ACESSO DA EQUIPE
            </p>
            <h2 className="mt-1.5 text-[28px] font-bold tracking-tight text-[#252824]">
              Bem-vindo de volta.
            </h2>
            <p className="mt-1 text-[13px] text-[#73766e]">
              Entre com suas credenciais e vamos abrir os trabalhos.
            </p>
          </div>

          {error && (
            <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                className="h-[46px] w-full rounded-[10px] border border-[#e7e8e2] bg-white px-3.5 text-[14px] text-[#252824] outline-none transition focus:border-[#d64b19]"
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
                  className="h-[46px] w-full rounded-[10px] border border-[#e7e8e2] bg-white pl-3.5 pr-11 text-[14px] text-[#252824] outline-none transition focus:border-[#d64b19]"
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
              <label className="flex cursor-pointer items-center gap-2 text-[#73766e]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="size-4 rounded accent-[#d64b19]"
                />
                <span>Manter conectado</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-[46px] w-full rounded-[10px] bg-[#d64b19] text-[14px] font-semibold text-white transition hover:bg-[#be4014] disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar no sistema'}
            </button>
          </form>

          <div className="flex items-center gap-2 text-[11px] text-[#73766e]">
            <ShieldCheck className="size-4 shrink-0 text-[#73766e]" />
            <span>Acesso exclusivo para funcionários e administradores.</span>
          </div>

          <p className="text-center text-[12px] text-[#73766e]">
            Precisa de acesso?{' '}
            <span className="font-medium text-[#d64b19]">
              Fale com seu administrador
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
