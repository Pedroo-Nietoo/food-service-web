import { Download, History, Plus, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { Toast, type ToastMessage } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiRequest, exportCsv } from '../lib/api';
import { formatDateTime, MOVEMENT_TYPE_LABELS } from '../lib/format';
import type { StockItem, StockMovement, StockMovementType } from '../types/api';

export function EstoquePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN', 'MANAGER', 'STOCK_MANAGER');

  const [items, setItems] = useState<StockItem[]>([]);
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [productId, setProductId] = useState('');
  const [type, setType] = useState<StockMovementType>('ENTRY');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [minItem, setMinItem] = useState<StockItem | null>(null);
  const [minQty, setMinQty] = useState('0');

  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      const query = lowOnly ? '?lowStock=true' : '';
      const data = await apiRequest<StockItem[]>(`/stock${query}`);
      setItems(data);
      if (data.length > 0 && !productId) {
        setProductId(data[0].productId);
      }
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao carregar estoque.',
      });
    } finally {
      setLoading(false);
    }
  }, [lowOnly, productId]);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const summary = useMemo(() => {
    const totalUnits = items.reduce((s, i) => s + i.totalQuantity, 0);
    const entries = items.reduce((s, i) => s + i.inputQuantity, 0);
    const exits = items.reduce((s, i) => s + i.outputQuantity, 0);
    const attention = items.filter((i) => i.totalQuantity < i.minimumQuantity).length;
    return { totalUnits, entries, exits, attention };
  }, [items]);

  async function handleMove(e: FormEvent) {
    e.preventDefault();
    if (!productId) {
      setToast({ type: 'error', text: 'Selecione um produto.' });
      return;
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty === 0) {
      setToast({
        type: 'error',
        text: 'A quantidade deve ser um número inteiro diferente de zero.',
      });
      return;
    }
    if (type !== 'ADJUSTMENT' && qty < 1) {
      setToast({
        type: 'error',
        text: 'Para entrada, saída ou perda, a quantidade deve ser maior que zero.',
      });
      return;
    }
    if (!reason.trim()) {
      setToast({ type: 'error', text: 'Informe o motivo da movimentação.' });
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/stock/${productId}/movements`, {
        method: 'POST',
        body: JSON.stringify({
          type,
          quantity: qty,
          reason: reason.trim(),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setReason('');
      setQuantity('1');
      setToast({ type: 'success', text: 'Movimentação registrada com sucesso.' });
      await loadStock();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro na movimentação.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function openHistory(item: StockItem) {
    setHistoryItem(item);
    try {
      const data = await apiRequest<StockMovement[]>(
        `/stock/${item.productId}/movements`,
      );
      setMovements(data);
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao carregar histórico.',
      });
    }
  }

  async function handleSaveMinimum(e: FormEvent) {
    e.preventDefault();
    if (!minItem) return;
    const min = Number(minQty);
    if (!Number.isInteger(min) || min < 0) {
      setToast({
        type: 'error',
        text: 'A quantidade mínima deve ser um inteiro maior ou igual a zero.',
      });
      return;
    }

    try {
      await apiRequest(`/stock/${minItem.productId}/minimum`, {
        method: 'PATCH',
        body: JSON.stringify({ minimumQuantity: min }),
      });
      setMinItem(null);
      setToast({ type: 'success', text: 'Estoque mínimo atualizado.' });
      await loadStock();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao atualizar mínimo.',
      });
    }
  }

  function handleExport() {
    exportCsv(
      'estoque.csv',
      ['Produto', 'Categoria', 'Saldo', 'Mínimo', 'Entradas', 'Saídas'],
      items.map((i) => [
        i.product.name,
        i.product.category,
        i.totalQuantity,
        i.minimumQuantity,
        i.inputQuantity,
        i.outputQuantity,
      ]),
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#252824]">
              Estoque
            </h1>
            <p className="mt-1 text-[13px] text-[#73766e]">
              Controle de saldo, mínimo de segurança e movimentações idempotentes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[#e7e8e2] bg-white px-4 py-2.5 text-[13px] font-medium text-[#252824] hover:bg-[#f7f8f4]"
          >
            <Download className="size-4" />
            <span>Exportar posição</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Unidades disponíveis
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#252824]">
              {summary.totalUnits}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Entradas acumuladas
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#277254]">
              {summary.entries}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Saídas acumuladas
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#252824]">
              {summary.exits}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Precisam de atenção
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#d64b19]">
              {summary.attention}
            </p>
          </div>
        </div>

        {canManage && (
          <form
            onSubmit={handleMove}
            noValidate
            className="rounded-[12px] border border-[#e7e8e2] bg-white p-5"
          >
            <h2 className="mb-4 text-[15px] font-semibold text-[#252824]">
              Registrar movimentação
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                  Produto
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19]"
                >
                  {items.map((i) => (
                    <option key={i.productId} value={i.productId}>
                      {i.product.name} (saldo: {i.totalQuantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                  Tipo
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as StockMovementType)}
                  className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19]"
                >
                  {(Object.keys(MOVEMENT_TYPE_LABELS) as StockMovementType[]).map(
                    (t) => (
                      <option key={t} value={t}>
                        {MOVEMENT_TYPE_LABELS[t]}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                  Quantidade {type === 'ADJUSTMENT' ? '(+ ou -)' : ''}
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                  Motivo
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="ex.: Reposição de fornecedor"
                  className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19]"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[#d64b19] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#be4014] disabled:opacity-60"
              >
                <Plus className="size-4" />
                <span>{submitting ? 'Registrando...' : 'Registrar movimentação'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="rounded-[12px] border border-[#e7e8e2] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e8e2] p-5">
            <h2 className="text-[15px] font-semibold text-[#252824]">
              Disponibilidade por produto
            </h2>
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#252824]">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
                className="size-4 accent-[#d64b19]"
              />
              <span>Apenas estoque abaixo do mínimo</span>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#e7e8e2] bg-[#f7f8f4] text-[11px] font-semibold uppercase tracking-wider text-[#73766e]">
                <tr>
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-5 py-3">Categoria</th>
                  <th className="px-5 py-3">Saldo atual</th>
                  <th className="px-5 py-3">Mínimo</th>
                  <th className="px-5 py-3">Status</th>
                  {canManage && <th className="px-5 py-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e8e2]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[#73766e]">
                      Carregando estoque...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[#73766e]">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isLow = item.totalQuantity < item.minimumQuantity;
                    return (
                      <tr key={item.id} className="hover:bg-[#f7f8f4]/60">
                        <td className="px-5 py-3.5 font-medium text-[#252824]">
                          {item.product.name}
                        </td>
                        <td className="px-5 py-3.5 text-[#73766e]">
                          {item.product.category}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-[#252824]">
                          {item.totalQuantity}
                        </td>
                        <td className="px-5 py-3.5 text-[#73766e]">
                          {item.minimumQuantity}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              isLow
                                ? 'bg-[#fef3c7] text-[#b45309]'
                                : 'bg-[#edf6ef] text-[#277254]'
                            }`}
                          >
                            {isLow ? 'Estoque baixo' : 'Normal'}
                          </span>
                        </td>
                        {canManage && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openHistory(item)}
                                className="rounded-lg p-1.5 text-[#73766e] hover:bg-[#f7f8f4] hover:text-[#252824]"
                                title="Histórico de movimentações"
                              >
                                <History className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMinItem(item);
                                  setMinQty(String(item.minimumQuantity));
                                }}
                                className="rounded-lg p-1.5 text-[#73766e] hover:bg-[#f7f8f4] hover:text-[#252824]"
                                title="Definir mínimo"
                              >
                                <Settings2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Modal
          open={Boolean(historyItem)}
          onClose={() => setHistoryItem(null)}
          title={`Histórico — ${historyItem?.product.name ?? ''}`}
          subtitle="Últimas movimentações registradas"
          maxWidth="max-w-2xl"
        >
          <div className="max-h-96 overflow-y-auto">
            {movements.length === 0 ? (
              <p className="text-[13px] text-[#73766e]">
                Nenhuma movimentação encontrada.
              </p>
            ) : (
              <div className="divide-y divide-[#e7e8e2] text-[13px]">
                {movements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-medium text-[#252824]">
                        {MOVEMENT_TYPE_LABELS[m.type]} ({m.quantity})
                      </p>
                      <p className="text-[11px] text-[#73766e]">
                        {m.reason ?? 'Sem motivo informado'}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#73766e]">
                      {formatDateTime(m.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>

        <Modal
          open={Boolean(minItem)}
          onClose={() => setMinItem(null)}
          title="Definir estoque mínimo"
          subtitle={minItem?.product.name}
        >
          <form onSubmit={handleSaveMinimum} noValidate className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                Quantidade mínima
              </label>
              <input
                type="number"
                min={0}
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMinItem(null)}
                className="rounded-[8px] border border-[#e7e8e2] px-4 py-2 text-[13px] font-medium text-[#73766e]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-[8px] bg-[#d64b19] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#be4014]"
              >
                Salvar mínimo
              </button>
            </div>
          </form>
        </Modal>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
