import { Calendar, Download } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Toast, type ToastMessage } from '../components/Toast';
import { ApiError, apiRequest, exportCsv } from '../lib/api';
import { formatCurrency, PAYMENT_METHOD_LABELS } from '../lib/format';
import type {
  PaginatedResponse,
  ProductsReportRow,
  SalesReport,
  StockReportRow,
} from '../types/api';

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function RelatoriosPage() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toInputDate(d);
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toInputDate(d);
  });

  const [sales, setSales] = useState<SalesReport | null>(null);
  const [products, setProducts] = useState<ProductsReportRow[]>([]);
  const [stockRows, setStockRows] = useState<StockReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadReports = useCallback(async () => {
    if (!fromDate || !toDate || fromDate >= toDate) {
      setToast({
        type: 'error',
        text: 'A data inicial deve ser anterior à data final.',
      });
      return;
    }

    setLoading(true);
    try {
      const from = `${fromDate}T00:00:00Z`;
      const to = `${toDate}T00:00:00Z`;
      const params = new URLSearchParams({ from, to });
      const paged = new URLSearchParams({ from, to, page: '1', limit: '20' });

      const [salesData, prodData, stockData] = await Promise.all([
        apiRequest<SalesReport>(`/reports/sales?${params.toString()}`),
        apiRequest<PaginatedResponse<ProductsReportRow>>(
          `/reports/products?${paged.toString()}`,
        ),
        apiRequest<PaginatedResponse<StockReportRow> & { asOf: string }>(
          `/reports/stock?${paged.toString()}`,
        ),
      ]);
      setSales(salesData);
      setProducts(prodData.data);
      setStockRows(stockData.data);
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao gerar relatórios.',
      });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  function applyPreset(days: number) {
    const end = new Date();
    end.setDate(end.getDate() + 1);
    const start = new Date();
    start.setDate(start.getDate() - days);
    setFromDate(toInputDate(start));
    setToDate(toInputDate(end));
  }

  function handleExport() {
    exportCsv(
      `relatorio-produtos-${fromDate}-${toDate}.csv`,
      ['Produto', 'Categoria', 'Qtd Vendida', 'Total Vendido'],
      products.map((p) => [p.name, p.category, p.quantitySold, p.totalSold]),
    );
  }

  const lowStockCount = stockRows.filter((r) => r.lowStock).length;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#252824]">
              Relatórios
            </h1>
            <p className="mt-1 text-[13px] text-[#73766e]">
              Consolidado de vendas, recebimentos por método e movimentações de estoque.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyPreset(0)}
              className="rounded-[8px] border border-[#e7e8e2] bg-white px-3 py-2 text-[12px] font-medium text-[#73766e] hover:bg-[#f7f8f4]"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="rounded-[8px] border border-[#e7e8e2] bg-white px-3 py-2 text-[12px] font-medium text-[#73766e] hover:bg-[#f7f8f4]"
            >
              7 dias
            </button>
            <button
              type="button"
              onClick={() => applyPreset(30)}
              className="rounded-[8px] border border-[#e7e8e2] bg-white px-3 py-2 text-[12px] font-medium text-[#73766e] hover:bg-[#f7f8f4]"
            >
              30 dias
            </button>
            <div className="flex items-center gap-2 rounded-[10px] border border-[#e7e8e2] bg-white px-3 py-2 text-[12px]">
              <Calendar className="size-4 text-[#73766e]" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="outline-none"
              />
              <span className="text-[#73766e]">até</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-[10px] border border-[#e7e8e2] bg-white px-4 py-2 text-[13px] font-medium text-[#252824] hover:bg-[#f7f8f4]"
            >
              <Download className="size-4" />
              <span>Exportar relatório</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Vendas no período
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#d64b19]">
              {formatCurrency(sales?.orders.total ?? '0.00')}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Pedidos concluídos
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#252824]">
              {sales?.orders.count ?? 0}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">Ticket médio</p>
            <p className="mt-2 text-[28px] font-bold text-[#252824]">
              {formatCurrency(sales?.orders.averageTicket ?? '0.00')}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Itens com estoque baixo
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#b45309]">
              {lowStockCount}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-[#252824]">
              Recebimentos por método
            </h2>
            {loading ? (
              <p className="text-[13px] text-[#73766e]">Carregando...</p>
            ) : !sales || sales.receiptsByMethod.length === 0 ? (
              <p className="text-[13px] text-[#73766e]">
                Nenhum recebimento no período.
              </p>
            ) : (
              <div className="divide-y divide-[#e7e8e2] text-[13px]">
                {sales.receiptsByMethod.map((r) => (
                  <div
                    key={r.method}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium text-[#252824]">
                        {PAYMENT_METHOD_LABELS[r.method] ?? r.method}
                      </p>
                      <p className="text-[11px] text-[#73766e]">
                        {r.count} pagamento(s)
                      </p>
                    </div>
                    <span className="font-semibold text-[#277254]">
                      {formatCurrency(r.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-[#252824]">
              Produtos vendidos no período
            </h2>
            {loading ? (
              <p className="text-[13px] text-[#73766e]">Carregando...</p>
            ) : products.length === 0 ? (
              <p className="text-[13px] text-[#73766e]">
                Nenhuma venda registrada no período.
              </p>
            ) : (
              <div className="divide-y divide-[#e7e8e2] text-[13px]">
                {products.map((p) => (
                  <div
                    key={p.productId}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium text-[#252824]">{p.name}</p>
                      <p className="text-[11px] text-[#73766e]">
                        {p.category} · {p.quantitySold} un.
                      </p>
                    </div>
                    <span className="font-semibold text-[#252824]">
                      {formatCurrency(p.totalSold)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[12px] border border-[#e7e8e2] bg-white">
          <div className="border-b border-[#e7e8e2] p-5">
            <h2 className="text-[15px] font-semibold text-[#252824]">
              Movimentações de estoque no período
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#e7e8e2] bg-[#f7f8f4] text-[11px] font-semibold uppercase tracking-wider text-[#73766e]">
                <tr>
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-5 py-3">Saldo atual</th>
                  <th className="px-5 py-3">Entradas</th>
                  <th className="px-5 py-3">Saídas</th>
                  <th className="px-5 py-3">Perdas</th>
                  <th className="px-5 py-3">Saldo líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e8e2]">
                {stockRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[#73766e]">
                      Sem dados de estoque.
                    </td>
                  </tr>
                ) : (
                  stockRows.map((r) => (
                    <tr key={r.productId} className="hover:bg-[#f7f8f4]/60">
                      <td className="px-5 py-3.5 font-medium text-[#252824]">
                        {r.name}
                      </td>
                      <td className="px-5 py-3.5">{r.currentQuantity}</td>
                      <td className="px-5 py-3.5 text-[#277254]">+{r.entries}</td>
                      <td className="px-5 py-3.5 text-[#73766e]">-{r.exits}</td>
                      <td className="px-5 py-3.5 text-[#b91c1c]">-{r.losses}</td>
                      <td className="px-5 py-3.5 font-semibold">
                        {r.netMovement}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
