import {
  Check,
  Clock,
  CopyPlus,
  CreditCard,
  Eye,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { Toast, type ToastMessage } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiRequest } from '../lib/api';
import {
  formatCurrency,
  formatDateTime,
  ORDER_STATUS_META,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../lib/format';
import type {
  Customer,
  Order,
  OrderStatus,
  PaginatedResponse,
  PaymentMethod,
  Product,
} from '../types/api';

const STATUS_OPTIONS: (OrderStatus | '')[] = [
  '',
  'OPEN',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
];

function computeRemainingAmount(order: Order): number {
  const total = Number(order.total);
  if (!Number.isFinite(total)) return 0;
  const paid = (order.payments ?? [])
    .filter(
      (p) =>
        p.status === 'PAID' ||
        p.status === 'PENDING' ||
        p.status === 'REFUND_PENDING',
    )
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const diff = total - paid;
  return diff > 0 ? Number(diff.toFixed(2)) : 0;
}

export function PedidosPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole('ADMIN', 'MANAGER', 'CASHIER', 'ATTENDANT');
  const canKitchen = hasRole('ADMIN', 'MANAGER', 'KITCHEN');
  const canCancel = hasRole('ADMIN', 'MANAGER');
  const canPay = hasRole('ADMIN', 'MANAGER', 'CASHIER');

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [draftItems, setDraftItems] = useState<{ product: Product; quantity: number }[]>([]);
  const [creating, setCreating] = useState(false);

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [payRemaining, setPayRemaining] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('PIX');
  const [payAmount, setPayAmount] = useState('');
  const [payReceived, setPayReceived] = useState('');
  const [paying, setPaying] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const [ordList, prodList, custPage] = await Promise.all([
        apiRequest<Order[]>(`/orders${query}`),
        apiRequest<Product[]>('/products'),
        hasRole('ADMIN', 'MANAGER', 'CASHIER', 'ATTENDANT')
          ? apiRequest<PaginatedResponse<Customer>>('/customers?limit=100')
          : Promise.resolve({
              data: [] as Customer[],
              meta: { page: 1, limit: 100, total: 0, totalPages: 1 },
            }),
      ]);
      setOrders(ordList);
      setProducts(prodList);
      setCustomers(custPage.data);
      if (prodList.length > 0 && !selectedProductId) {
        setSelectedProductId(prodList[0].id);
      }
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao carregar pedidos.',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, hasRole, selectedProductId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    if (paymentStatus === 'success') {
      setToast({
        type: 'success',
        text: 'Pagamento concluído na Stripe! O status será atualizado em instantes.',
      });
      window.history.replaceState({}, '', '/pedidos');
    } else if (paymentStatus === 'cancelled') {
      setToast({
        type: 'error',
        text: 'Pagamento na Stripe cancelado. Você pode tentar novamente quando quiser.',
      });
      window.history.replaceState({}, '', '/pedidos');
    }
  }, []);

  const productMap = useMemo(() => {
    const map: Record<string, Product> = {};
    for (const p of products) map[p.id] = p;
    return map;
  }, [products]);

  const customerMap = useMemo(() => {
    const map: Record<string, Customer> = {};
    for (const c of customers) map[c.id] = c;
    return map;
  }, [customers]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const idMatch = o.id.toLowerCase().includes(q);
      const custName = o.customerId
        ? (customerMap[o.customerId]?.name ?? '').toLowerCase()
        : '';
      return idMatch || custName.includes(q);
    });
  }, [orders, searchQuery, customerMap]);

  const draftTotal = useMemo(
    () =>
      draftItems.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
      ),
    [draftItems],
  );

  const summary = useMemo(() => {
    const preparing = orders.filter((o) => o.status === 'PREPARING').length;
    const ready = orders.filter((o) => o.status === 'READY').length;
    const completedTotal = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.total), 0);
    return {
      total: orders.length,
      preparing,
      ready,
      completedTotal,
    };
  }, [orders]);

  function addDraftItem() {
    const product = productMap[selectedProductId];
    const qty = Number(itemQty);
    if (!product) {
      setToast({ type: 'error', text: 'Selecione um produto válido.' });
      return;
    }
    if (!Number.isInteger(qty) || qty < 1) {
      setToast({ type: 'error', text: 'A quantidade deve ser um inteiro positivo.' });
      return;
    }
    setDraftItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i,
        );
      }
      return [...prev, { product, quantity: qty }];
    });
    setItemQty('1');
  }

  async function handleCreateOrder() {
    if (draftItems.length === 0) {
      setToast({ type: 'error', text: 'Adicione pelo menos um item ao pedido.' });
      return;
    }
    setCreating(true);
    try {
      await apiRequest<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...(customerId ? { customerId } : {}),
          items: draftItems.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
        }),
      });
      setDraftItems([]);
      setCustomerId('');
      setToast({ type: 'success', text: 'Pedido registrado com sucesso.' });
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao registrar pedido.',
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleTransition(
    orderId: string,
    action: 'confirm' | 'prepare' | 'ready' | 'complete',
  ) {
    try {
      await apiRequest(`/orders/${orderId}/${action}`, { method: 'POST' });
      setToast({ type: 'success', text: 'Status do pedido atualizado.' });
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao avançar pedido.',
      });
    }
  }

  async function handleCancelOrder(e: FormEvent) {
    e.preventDefault();
    if (!cancellingOrder) return;
    if (!cancelReason.trim()) {
      setToast({ type: 'error', text: 'Informe o motivo do cancelamento.' });
      return;
    }
    try {
      await apiRequest(`/orders/${cancellingOrder.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      setCancellingOrder(null);
      setCancelReason('');
      setToast({ type: 'success', text: 'Pedido cancelado com sucesso.' });
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao cancelar pedido.',
      });
    }
  }

  function handleRepeatOrder(order: Order) {
    const items = order.items
      .map((i) => {
        const product = productMap[i.productId];
        return product ? { product, quantity: i.quantity } : null;
      })
      .filter((x): x is { product: Product; quantity: number } => x !== null);

    if (items.length === 0) {
      setToast({
        type: 'error',
        text: 'Os produtos deste pedido não estão mais disponíveis.',
      });
      return;
    }

    setCustomerId(order.customerId ?? '');
    setDraftItems(items);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setToast({
      type: 'success',
      text: 'Itens copiados para o novo pedido.',
    });
  }

  async function openDetail(orderId: string) {
    try {
      const full = await apiRequest<Order>(`/orders/${orderId}`);
      setDetailOrder(full);
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao carregar detalhes.',
      });
    }
  }

  async function openPaymentModal(order: Order) {
    try {
      const full = await apiRequest<Order>(`/orders/${order.id}`);
      const remaining = computeRemainingAmount(full);
      setPayOrder(full);
      setPayRemaining(remaining);
      const formatted = remaining.toFixed(2);
      setPayAmount(formatted);
      setPayReceived(formatted);
      setPayMethod('PIX');
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao abrir pagamento.',
      });
    }
  }

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!payOrder) return;
    const amountNum = Number(payAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setToast({ type: 'error', text: 'O valor do pagamento deve ser maior que zero.' });
      return;
    }
    if (payMethod === 'CASH') {
      const receivedNum = Number(payReceived);
      if (!Number.isFinite(receivedNum) || receivedNum < amountNum) {
        setToast({
          type: 'error',
          text: 'O valor recebido em dinheiro deve ser maior ou igual ao valor do pagamento.',
        });
        return;
      }
    }

    setPaying(true);
    try {
      const result = await apiRequest<{
        payment: { id: string; status: string };
        checkoutUrl?: string | null;
      }>(`/orders/${payOrder.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          method: payMethod,
          amount: amountNum.toFixed(2),
          ...(payMethod === 'CASH'
            ? { receivedAmount: Number(payReceived).toFixed(2) }
            : {}),
          ...((payMethod === 'CREDIT_CARD' || payMethod === 'DEBIT_CARD')
            ? {
                successUrl: `${window.location.origin}/pedidos?payment=success`,
                cancelUrl: `${window.location.origin}/pedidos?payment=cancelled`,
              }
            : {}),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setPayOrder(null);
      setToast({ type: 'success', text: 'Pagamento registrado com sucesso.' });
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao registrar pagamento.',
      });
    } finally {
      setPaying(false);
    }
  }

  async function handleReversePayment(paymentId: string) {
    try {
      await apiRequest(`/payments/${paymentId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Estorno solicitado pelo operador' }),
      });
      setToast({ type: 'success', text: 'Pagamento estornado.' });
      if (detailOrder) await openDetail(detailOrder.id);
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao estornar pagamento.',
      });
    }
  }

  const todayLabel = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
  }).format(new Date());

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[1px] text-[#d64b19]">
              OPERAÇÃO
            </p>
            <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[#252824]">
              Gerenciamento de pedidos
            </h1>
            <p className="mt-1 text-[13px] text-[#73766e]">
              Do balcão à entrega, acompanhe cada pedido em tempo real.
            </p>
          </div>
          <span className="rounded-[10px] border border-[#e7e8e2] bg-white px-4 py-2 text-[13px] font-medium text-[#252824]">
            Hoje, {todayLabel}
          </span>
        </div>

        {/* Resumo dos pedidos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Pedidos listados
            </p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-[28px] font-bold text-[#252824]">
                {summary.total}
              </span>
              <span className="text-[11px] text-[#73766e]">Na fila atual</span>
            </div>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">Em preparo</p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-[28px] font-bold text-[#d64b19]">
                {summary.preparing}
              </span>
              <span className="text-[11px] text-[#73766e]">
                A cozinha está a todo vapor
              </span>
            </div>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Prontos para entrega
            </p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-[28px] font-bold text-[#277254]">
                {summary.ready}
              </span>
              <span className="text-[11px] text-[#73766e]">
                Aguardando retirada
              </span>
            </div>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Volume de pedidos
            </p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-[26px] font-bold text-[#252824]">
                {formatCurrency(summary.completedTotal)}
              </span>
              <span className="text-[11px] text-[#73766e]">
                Não cancelados
              </span>
            </div>
          </div>
        </div>

        {/* Registro de pedido — Layout 2 colunas (Formulário + Resumo creme) */}
        {canCreate && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5 lg:col-span-2">
              <h2 className="mb-4 text-[15px] font-semibold text-[#252824]">
                Novo pedido
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#252824]">
                    Cliente (opcional)
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-white px-3 text-[13px] outline-none focus:border-[#d64b19]"
                  >
                    <option value="">Balcão / Não identificado</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#252824]">
                    Produto *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-white px-3 text-[13px] outline-none focus:border-[#d64b19]"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {formatCurrency(p.price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-[#252824]">
                    Quantidade *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      className="h-[42px] w-20 rounded-[8px] border border-[#e7e8e2] bg-white px-3 text-[13px] outline-none focus:border-[#d64b19]"
                    />
                    <button
                      type="button"
                      onClick={addDraftItem}
                      className="flex-1 rounded-[8px] border border-[#d64b19] px-3 text-[13px] font-semibold text-[#d64b19] hover:bg-[#fff0e7]"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-[8px] bg-[#f7f8f4] px-3.5 py-2.5 text-[12px] text-[#73766e]">
                <Clock className="size-4 shrink-0 text-[#d64b19]" />
                <span>
                  O pedido é criado com status &ldquo;Aberto&rdquo; e debita o estoque ao confirmar.
                </span>
              </div>
            </div>

            {/* Card Resumo creme */}
            <div className="flex flex-col justify-between rounded-[12px] border border-[#f5ddd0] bg-[#fff8f3] p-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#d64b19]">
                  RESUMO · NOVO PEDIDO
                </p>
                {draftItems.length === 0 ? (
                  <p className="mt-3 text-[12px] text-[#73766e]">
                    Nenhum item adicionado ainda.
                  </p>
                ) : (
                  <div className="mt-3 max-h-32 space-y-2 overflow-y-auto pr-1">
                    {draftItems.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between text-[13px]"
                      >
                        <span className="truncate text-[#252824]">
                          {item.quantity} × {item.product.name}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium">
                            {formatCurrency(
                              Number(item.product.price) * item.quantity,
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setDraftItems((prev) =>
                                prev.filter((i) => i.product.id !== item.product.id),
                              )
                            }
                            className="text-[#73766e] hover:text-[#b91c1c]"
                            aria-label="Remover item"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-[#f5ddd0] pt-3">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-[13px] font-medium text-[#252824]">
                    Total
                  </span>
                  <span className="text-[22px] font-bold text-[#252824]">
                    {formatCurrency(draftTotal)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={creating || draftItems.length === 0}
                  className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#d64b19] text-[13px] font-semibold text-white transition hover:bg-[#be4014] disabled:opacity-50"
                >
                  <Plus className="size-4" />
                  <span>{creating ? 'Criando...' : 'Criar pedido'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pedidos recentes */}
        <div className="rounded-[12px] border border-[#e7e8e2] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e8e2] p-5">
            <h2 className="text-[15px] font-semibold text-[#252824]">
              Pedidos recentes
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#73766e]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar pedido ou cliente..."
                  className="h-[38px] rounded-[8px] border border-[#e7e8e2] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#d64b19]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
                className="h-[38px] rounded-[8px] border border-[#e7e8e2] bg-white px-3 text-[13px] outline-none focus:border-[#d64b19]"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st || 'ALL'} value={st}>
                    {st ? ORDER_STATUS_META[st].label : 'Todos os status'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#e7e8e2] bg-[#f7f8f4] text-[11px] font-semibold text-[#73766e]">
                <tr>
                  <th className="px-5 py-3">Pedido</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Itens</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Criado em</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e8e2]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[#73766e]">
                      Carregando pedidos...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[#73766e]">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const meta = ORDER_STATUS_META[order.status];
                    const custName = order.customerId
                      ? (customerMap[order.customerId]?.name ?? 'Cliente')
                      : 'Balcão';
                    return (
                      <tr key={order.id} className="hover:bg-[#f7f8f4]/60">
                        <td className="px-5 py-3.5 font-mono text-[12px] font-semibold text-[#d64b19]">
                          #{order.id.slice(0, 6)}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-[#252824]">
                          {custName}
                        </td>
                        <td className="px-5 py-3.5 text-[#73766e]">
                          {order.items.reduce((s, i) => s + i.quantity, 0)} un.
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-[#252824]">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex rounded-[6px] px-2.5 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.text}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[#73766e]">
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDetail(order.id)}
                              className="rounded-lg border border-[#e7e8e2] p-1.5 text-[#73766e] hover:bg-[#f7f8f4] hover:text-[#252824]"
                              title="Ver detalhes"
                            >
                              <Eye className="size-4" />
                            </button>

                            {canCreate && (
                              <button
                                type="button"
                                onClick={() => handleRepeatOrder(order)}
                                className="rounded-lg border border-[#e7e8e2] p-1.5 text-[#73766e] hover:bg-[#f7f8f4] hover:text-[#252824]"
                                title="Repetir pedido no formulário"
                              >
                                <CopyPlus className="size-4" />
                              </button>
                            )}

                            {order.status === 'OPEN' && canCreate && (
                              <button
                                type="button"
                                onClick={() => handleTransition(order.id, 'confirm')}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#fff0e7] px-2.5 py-1 text-[12px] font-medium text-[#d64b19] hover:bg-[#ffe2d0]"
                              >
                                <Check className="size-3.5" /> Confirmar
                              </button>
                            )}

                            {order.status === 'CONFIRMED' && canKitchen && (
                              <button
                                type="button"
                                onClick={() => handleTransition(order.id, 'prepare')}
                                className="rounded-lg bg-[#fef3c7] px-2.5 py-1 text-[12px] font-medium text-[#b45309]"
                              >
                                Preparar
                              </button>
                            )}

                            {order.status === 'PREPARING' && canKitchen && (
                              <button
                                type="button"
                                onClick={() => handleTransition(order.id, 'ready')}
                                className="rounded-lg bg-[#edf6ef] px-2.5 py-1 text-[12px] font-medium text-[#277254]"
                              >
                                Pronto
                              </button>
                            )}

                            {order.status === 'READY' && canCreate && (
                              <button
                                type="button"
                                onClick={() => handleTransition(order.id, 'complete')}
                                className="rounded-lg bg-[#277254] px-2.5 py-1 text-[12px] font-medium text-white"
                              >
                                Concluir
                              </button>
                            )}

                            {['CONFIRMED', 'PREPARING', 'READY'].includes(
                              order.status,
                            ) &&
                              canPay && (
                                <button
                                  type="button"
                                  onClick={() => openPaymentModal(order)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#e7e8e2] px-2.5 py-1 text-[12px] font-medium text-[#252824] hover:bg-[#f7f8f4]"
                                >
                                  <CreditCard className="size-3.5" /> Pagar
                                </button>
                              )}

                            {['OPEN', 'CONFIRMED'].includes(order.status) &&
                              canCancel && (
                                <button
                                  type="button"
                                  onClick={() => setCancellingOrder(order)}
                                  className="rounded-lg p-1.5 text-[#b91c1c] hover:bg-[#fef2f2]"
                                  title="Cancelar pedido"
                                >
                                  <X className="size-4" />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Modal
          open={Boolean(detailOrder)}
          onClose={() => setDetailOrder(null)}
          title={`Pedido #${detailOrder?.id.slice(0, 8) ?? ''}`}
          subtitle={
            detailOrder
              ? `${ORDER_STATUS_META[detailOrder.status].label} · ${formatDateTime(detailOrder.createdAt)}`
              : ''
          }
          maxWidth="max-w-2xl"
        >
          {detailOrder && (
            <div className="space-y-5 text-[13px]">
              {detailOrder.cancellationReason && (
                <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-2.5 text-[12px] text-[#b91c1c]">
                  <strong>Motivo do cancelamento:</strong>{' '}
                  {detailOrder.cancellationReason}
                </div>
              )}

              <div>
                <h3 className="mb-2 font-semibold text-[#252824]">Itens</h3>
                <div className="divide-y divide-[#e7e8e2] rounded-[10px] border border-[#e7e8e2]">
                  {detailOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <span>
                        <strong>{item.quantity}x</strong>{' '}
                        {productMap[item.productId]?.name ?? item.productId}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-[10px] bg-[#f7f8f4] p-4">
                <div>
                  <p className="text-[11px] text-[#73766e]">Total</p>
                  <p className="font-bold text-[#252824]">
                    {formatCurrency(detailOrder.total)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#73766e]">Pago</p>
                  <p className="font-bold text-[#277254]">
                    {formatCurrency(
                      (detailOrder.payments ?? [])
                        .filter((p) => p.status === 'PAID')
                        .reduce((s, p) => s + Number(p.amount), 0),
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#73766e]">Restante</p>
                  <p className="font-bold text-[#d64b19]">
                    {formatCurrency(computeRemainingAmount(detailOrder))}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-[#252824]">Pagamentos</h3>
                {!detailOrder.payments || detailOrder.payments.length === 0 ? (
                  <p className="text-[#73766e]">Nenhum pagamento registrado.</p>
                ) : (
                  <div className="divide-y divide-[#e7e8e2] rounded-[10px] border border-[#e7e8e2]">
                    {detailOrder.payments.map((pay) => (
                      <div
                        key={pay.id}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div>
                          <p className="font-medium text-[#252824]">
                            {PAYMENT_METHOD_LABELS[pay.method]} —{' '}
                            {formatCurrency(pay.amount)}
                          </p>
                          <p className="text-[11px] text-[#73766e]">
                            {PAYMENT_STATUS_LABELS[pay.status]} ({pay.provider})
                          </p>
                        </div>
                        {canCancel &&
                          ['PAID', 'PENDING'].includes(pay.status) &&
                          ['OPEN', 'CONFIRMED'].includes(detailOrder.status) && (
                            <button
                              type="button"
                              onClick={() => handleReversePayment(pay.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#e7e8e2] px-2.5 py-1 text-[12px] text-[#b91c1c] hover:bg-[#fef2f2]"
                            >
                              <RotateCcw className="size-3.5" /> Estornar
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        <Modal
          open={Boolean(payOrder)}
          onClose={() => setPayOrder(null)}
          title="Registrar pagamento"
          subtitle={`Total do pedido: ${formatCurrency(payOrder?.total ?? 0)} · Saldo restante: ${formatCurrency(payRemaining)}`}
        >
          <form onSubmit={handlePay} noValidate className="space-y-4">
            {payRemaining <= 0 && (
              <div className="rounded-[8px] border border-[#fde68a] bg-[#fef3c7] px-3 py-2 text-[12px] text-[#92400e]">
                Este pedido já possui o valor total pago ou reservado por um pagamento pendente. Consulte os detalhes do pedido.
              </div>
            )}
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                Método de pagamento
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19]"
              >
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                Valor aplicado (R$)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19]"
              />
            </div>
            {payMethod === 'CASH' && (
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                  Valor recebido em dinheiro (R$)
                </label>
                <input
                  type="number"
                  min={payAmount || '0.01'}
                  step="0.01"
                  value={payReceived}
                  onChange={(e) => setPayReceived(e.target.value)}
                  className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19]"
                />
                {Number(payReceived) >= Number(payAmount) && (
                  <p className="mt-1 text-[12px] text-[#277254]">
                    Troco:{' '}
                    {formatCurrency(Number(payReceived) - Number(payAmount))}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPayOrder(null)}
                className="rounded-[8px] border border-[#e7e8e2] px-4 py-2 text-[13px] font-medium text-[#73766e]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={paying || payRemaining <= 0}
                className="rounded-[8px] bg-[#d64b19] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#be4014] disabled:opacity-60"
              >
                {paying ? 'Processando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          open={Boolean(cancellingOrder)}
          onClose={() => setCancellingOrder(null)}
          title="Confirmar cancelamento do pedido"
          subtitle="Se o pedido já estiver confirmado, o estoque será estornado."
        >
          <form onSubmit={handleCancelOrder} noValidate className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                Motivo do cancelamento
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="ex.: Cliente desistiu do pedido"
                className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="rounded-[8px] border border-[#e7e8e2] px-4 py-2 text-[13px] font-medium text-[#73766e]"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="rounded-[8px] bg-[#b91c1c] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#991b1b]"
              >
                Cancelar pedido
              </button>
            </div>
          </form>
        </Modal>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
