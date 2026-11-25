import { Calendar, Download } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pagination } from '../components/Pagination';
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
  const [productsPage, setProductsPage] = useState(1);
  const [productsTotal, setProductsTotal] = useState(0);
  const [stockRows, setStockRows] = useState<StockReportRow[]>([]);
  const [stockPage, setStockPage] = useState(1);
  const [stockTotal, setStockTotal] = useState(0);
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
      const productsParams = new URLSearchParams({
        from,
        to,
        page: String(productsPage),
        limit: '20',
      });
      const stockParams = new URLSearchParams({
        from,
        to,
        page: String(stockPage),
        limit: '20',
      });

      const [salesData, prodData, stockData] = await Promise.all([
        apiRequest<SalesReport>(`/reports/sales?${params.toString()}`),
        apiRequest<PaginatedResponse<ProductsReportRow>>(
          `/reports/products?${productsParams.toString()}`,
        ),
        apiRequest<PaginatedResponse<StockReportRow> & { asOf: string }>(
          `/reports/stock?${stockParams.toString()}`,
        ),
      ]);
      setSales(salesData);
      setProducts(prodData.data);
      setProductsTotal(prodData.meta.total);
      setStockRows(stockData.data);
      setStockTotal(stockData.meta.total);
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao gerar relatórios.',
      });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, productsPage, stockPage]);

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

  const totalProductsRevenue = useMemo(
    () => products.reduce((sum, p) => sum + Number(p.totalSold), 0),
    [products],
  );

  const totalReceipts = useMemo(
    () =>
      (sales?.receiptsByMethod ?? []).reduce(
        (sum, r) => sum + Number(r.amount),
        0,
      ),
    [sales],
  );

  const salesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const key = p.category || 'Outros';
      map.set(key, (map.get(key) ?? 0) + Number(p.totalSold));
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [products]);

  const stockTotals = useMemo(
    () =>
      stockRows.reduce(
        (acc, r) => ({
          entries: acc.entries + r.entries,
          exits: acc.exits + r.exits + r.losses,
          net: acc.net + r.netMovement,
        }),
        { entries: 0, exits: 0, net: 0 },
      ),
    [stockRows],
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[1px] text-[#d64b19]">
              INTELIGÊNCIA DO NEGÓCIO
            </p>
            <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[#252824]">
              Relatórios
            </h1>
            <p className="mt-1 text-[13px] text-[#73766e]">
              Transforme os números da sua lanchonete em boas decisões.
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
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#d64b19] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#be4014]"
            >
              <Download className="size-4" />
              <span>Exportar relatório</span>
            </button>
          </div>
        </div>

        {/* 4 KPI cards — primeiro em destaque laranja #D64B19 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[12px] bg-[#d64b19] p-5 text-white">
            <p className="text-[12px] font-medium text-white/85">
              Vendas no período
            </p>
            <p className="mt-2 text-[28px] font-bold">
              {formatCurrency(sales?.orders.total ?? '0.00')}
            </p>
            <p className="mt-1 text-[11px] text-white/80">
              Pedidos concluídos no intervalo
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Pedidos concluídos
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#252824]">
              {sales?.orders.count ?? 0}
            </p>
            <p className="mt-1 text-[11px] text-[#277254]">
              Faturados no período
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">Ticket médio</p>
            <p className="mt-2 text-[28px] font-bold text-[#252824]">
              {formatCurrency(sales?.orders.averageTicket ?? '0.00')}
            </p>
            <p className="mt-1 text-[11px] text-[#73766e]">
              Por pedido concluído
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Movimentações
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#252824]">
              {stockTotals.entries + stockTotals.exits}
            </p>
            <p className="mt-1 text-[11px] text-[#73766e]">
              Entradas e saídas de estoque
            </p>
          </div>
        </div>

        {/* Linha do meio: Recebimentos por método + Vendas por categoria com barras de progresso */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5 lg:col-span-6">
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
              <div className="space-y-4">
                {sales.receiptsByMethod.map((r) => {
                  const pct =
                    totalReceipts > 0
                      ? Math.round((Number(r.amount) / totalReceipts) * 100)
                      : 0;
                  return (
                    <div key={r.method}>
                      <div className="mb-1 flex items-center justify-between text-[13px]">
                        <span className="font-semibold text-[#252824]">
                          {PAYMENT_METHOD_LABELS[r.method] ?? r.method}
                        </span>
                        <span className="font-semibold text-[#252824]">
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#f0f1ec]">
                        <div
                          className="h-full rounded-full bg-[#d64b19]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-[#73766e]">
                        {formatCurrency(r.amount)} · {r.count} pagamento(s)
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5 lg:col-span-6">
            <h2 className="mb-4 text-[15px] font-semibold text-[#252824]">
              Vendas por categoria
            </h2>
            {loading ? (
              <p className="text-[13px] text-[#73766e]">Carregando...</p>
            ) : salesByCategory.length === 0 ? (
              <p className="text-[13px] text-[#73766e]">
                Nenhuma venda registrada no período.
              </p>
            ) : (
              <div className="space-y-4">
                {salesByCategory.map((cat, idx) => {
                  const pct =
                    totalProductsRevenue > 0
                      ? Math.round((cat.amount / totalProductsRevenue) * 100)
                      : 0;
                  const barColors = [
                    'bg-[#d64b19]',
                    'bg-[#e47948]',
                    'bg-[#b58059]',
                    'bg-[#4f775d]',
                  ];
                  const barColor = barColors[idx % barColors.length];
                  return (
                    <div key={cat.category}>
                      <div className="mb-1 flex items-center justify-between text-[13px]">
                        <span className="font-semibold text-[#252824]">
                          {cat.category}
                        </span>
                        <span className="font-semibold text-[#252824]">
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#f0f1ec]">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-[#73766e]">
                        {formatCurrency(cat.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Produtos mais vendidos */}
        <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#252824]">
                Produtos mais vendidos
              </h2>
              <span className="text-[11px] text-[#73766e]">
                Top do período
              </span>
            </div>
            {loading ? (
              <p className="text-[13px] text-[#73766e]">Carregando...</p>
            ) : products.length === 0 ? (
              <p className="text-[13px] text-[#73766e]">
                Nenhuma venda registrada no período.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-[#e7e8e2] text-[11px] font-semibold text-[#73766e]">
                    <tr>
                      <th className="pb-2.5">Produto</th>
                      <th className="pb-2.5">Qtd.</th>
                      <th className="pb-2.5">Receita</th>
                      <th className="pb-2.5 text-right">Participação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7e8e2]">
                    {products.map((p) => {
                      const share =
                        totalProductsRevenue > 0
                          ? (
                              (Number(p.totalSold) / totalProductsRevenue) *
                              100
                            ).toFixed(1)
                          : '0.0';
                      return (
                        <tr key={p.productId}>
                          <td className="py-3 font-semibold text-[#252824]">
                            {p.name}
                          </td>
                          <td className="py-3 text-[#73766e]">{p.quantitySold}</td>
                          <td className="py-3 font-semibold text-[#252824]">
                            {formatCurrency(p.totalSold)}
                          </td>
                          <td className="py-3 text-right text-[#73766e]">
                            {share}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={productsPage}
              pageSize={20}
              totalItems={productsTotal}
              itemLabel="produtos"
              onPageChange={setProductsPage}
            />
          </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white lg:col-span-8">
            <div className="border-b border-[#e7e8e2] p-5">
              <h2 className="text-[15px] font-semibold text-[#252824]">
                Movimentações de estoque no período
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-[#e7e8e2] bg-[#f7f8f4] text-[11px] font-semibold text-[#73766e]">
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
            <Pagination
              page={stockPage}
              pageSize={20}
              totalItems={stockTotal}
              itemLabel="itens"
              onPageChange={setStockPage}
            />
          </div>

          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5 lg:col-span-4">
            <h2 className="text-[15px] font-semibold text-[#252824]">
              Resumo da operação
            </h2>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.8px] text-[#73766e]">
              MOVIMENTAÇÕES DE ESTOQUE
            </p>
            <div className="mt-3 space-y-2.5 rounded-[10px] bg-[#f7f8f4] p-4 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[#73766e]">Entradas / saídas</span>
                <span className="font-semibold text-[#252824]">
                  +{stockTotals.entries} / -{stockTotals.exits} un.
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#73766e]">Saldo do período</span>
                <span className="font-semibold text-[#277254]">
                  {stockTotals.net >= 0 ? `+${stockTotals.net}` : stockTotals.net} un.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
