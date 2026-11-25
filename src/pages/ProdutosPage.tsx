import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { SearchableSelect } from '../components/SearchableSelect';
import { Toast, type ToastMessage } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { ApiError, apiRequest, exportCsv } from '../lib/api';
import { formatCurrency } from '../lib/format';
import type { Product, StockItem } from '../types/api';

export function ProdutosPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN', 'MANAGER');

  const [products, setProducts] = useState<Product[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, StockItem>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [minimumStock, setMinimumStock] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [deleting, setDeleting] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (categoryFilter) params.set('category', categoryFilter);
      const query = params.toString() ? `?${params.toString()}` : '';

      const [prodList, stockList] = await Promise.all([
        apiRequest<Product[]>(`/products${query}`),
        apiRequest<StockItem[]>('/stock'),
      ]);
      setProducts(prodList);
      const map: Record<string, StockItem> = {};
      for (const s of stockList) map[s.productId] = s;
      setStockMap(map);
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao carregar produtos.',
      });
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  );

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * 20;
    return products.slice(start, start + 20);
  }, [products, page]);

  const summary = useMemo(() => {
    let lowStock = 0;
    let outOfStock = 0;
    for (const p of products) {
      const st = stockMap[p.id];
      const qty = st?.totalQuantity ?? 0;
      const min = st?.minimumQuantity ?? 0;
      if (qty === 0) outOfStock++;
      else if (qty < min) lowStock++;
    }
    return {
      total: products.length,
      categories: categories.length,
      lowStock,
      outOfStock,
    };
  }, [products, stockMap, categories]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !category.trim()) {
      setToast({ type: 'error', text: 'Informe o nome e a categoria do produto.' });
      return;
    }
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setToast({ type: 'error', text: 'O preço do produto deve ser maior que zero.' });
      return;
    }
    const parsedInitialStock = Number(initialStock === '' ? '0' : initialStock);
    if (!Number.isInteger(parsedInitialStock) || parsedInitialStock < 0) {
      setToast({
        type: 'error',
        text: 'O estoque inicial deve ser um número inteiro maior ou igual a zero.',
      });
      return;
    }
    const parsedMinimumStock = Number(minimumStock === '' ? '0' : minimumStock);
    if (!Number.isInteger(parsedMinimumStock) || parsedMinimumStock < 0) {
      setToast({
        type: 'error',
        text: 'O estoque mínimo deve ser um número inteiro maior ou igual a zero.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<Product>('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          price: parsedPrice,
          initialStock: parsedInitialStock,
          minimumStock: parsedMinimumStock,
        }),
      });
      setName('');
      setCategory('');
      setPrice('');
      setInitialStock('0');
      setMinimumStock('0');
      setToast({ type: 'success', text: 'Produto cadastrado com sucesso.' });
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao cadastrar produto.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(p: Product) {
    setEditing(p);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditPrice(String(Number(p.price)));
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editName.trim() || !editCategory.trim()) {
      setToast({ type: 'error', text: 'Informe o nome e a categoria do produto.' });
      return;
    }
    const parsedPrice = Number(editPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setToast({ type: 'error', text: 'O preço do produto deve ser maior que zero.' });
      return;
    }

    try {
      await apiRequest<Product>(`/products/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory.trim(),
          price: parsedPrice,
        }),
      });
      setEditing(null);
      setToast({ type: 'success', text: 'Produto atualizado com sucesso.' });
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao atualizar produto.',
      });
    }
  }

  async function handleDeactivate() {
    if (!deleting) return;
    try {
      await apiRequest(`/products/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      setToast({ type: 'success', text: 'Produto desativado com sucesso.' });
      await loadData();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao desativar produto.',
      });
    }
  }

  function handleExport() {
    exportCsv(
      'produtos.csv',
      ['ID', 'Nome', 'Categoria', 'Preço', 'Estoque'],
      products.map((p) => [
        p.id,
        p.name,
        p.category,
        Number(p.price).toFixed(2),
        stockMap[p.id]?.totalQuantity ?? 0,
      ]),
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[1px] text-[#d64b19]">
              CATÁLOGO
            </p>
            <h1 className="mt-1 text-[26px] font-bold tracking-tight text-[#252824]">
              Cadastro de produtos
            </h1>
            <p className="mt-1 text-[13px] text-[#73766e]">
              Organize seu cardápio e mantenha tudo pronto para vender.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[#e7e8e2] bg-white px-4 py-2.5 text-[13px] font-medium text-[#252824] transition hover:bg-[#f7f8f4]"
          >
            <Download className="size-4" />
            <span>Exportar</span>
          </button>
        </div>

        {/* Resumo do catálogo — valor + legenda lado a lado */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Produtos cadastrados
            </p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-[28px] font-bold text-[#252824]">
                {summary.total}
              </span>
              <span className="text-[11px] text-[#73766e]">
                Seu cardápio completo
              </span>
            </div>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">Categorias</p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-[28px] font-bold text-[#252824]">
                {summary.categories}
              </span>
              <span className="text-[11px] text-[#73766e]">
                Sabores bem organizados
              </span>
            </div>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">Estoque baixo</p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-[28px] font-bold text-[#d64b19]">
                {summary.lowStock}
              </span>
              <span className="text-[11px] text-[#73766e]">
                Precisam de reposição
              </span>
            </div>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">Esgotados</p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="text-[28px] font-bold text-[#b91c1c]">
                {summary.outOfStock}
              </span>
              <span className="text-[11px] text-[#73766e]">
                Indisponível para pedidos
              </span>
            </div>
          </div>
        </div>

        {/* Formulário Novo produto */}
        {canManage && (
          <form
            onSubmit={handleCreate}
            noValidate
            className="rounded-[12px] border border-[#e7e8e2] bg-white p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#252824]">
                Novo produto
              </h2>
              <span className="text-[11px] text-[#73766e]">
                * Campos obrigatórios
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#252824]">
                  Nome do produto *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Burger da casa"
                  className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-white px-3 text-[13px] outline-none focus:border-[#d64b19]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#252824]">
                  Categoria *
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex.: Hambúrgueres"
                  className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-white px-3 text-[13px] outline-none focus:border-[#d64b19]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#252824]">
                  Preço de venda (R$) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="28.90"
                  className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-white px-3 text-[13px] outline-none focus:border-[#d64b19]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#252824]">
                  Estoque inicial
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  placeholder="0"
                  className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-white px-3 text-[13px] outline-none focus:border-[#d64b19]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[#252824]">
                  Estoque mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(e.target.value)}
                  placeholder="0"
                  className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-white px-3 text-[13px] outline-none focus:border-[#d64b19]"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-[#73766e]">
                O ID do produto é gerado automaticamente ao cadastrar.
              </span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setCategory('');
                    setPrice('');
                    setInitialStock('0');
                    setMinimumStock('0');
                  }}
                  className="rounded-[8px] border border-[#e7e8e2] px-4 py-2 text-[13px] font-medium text-[#252824] hover:bg-[#f7f8f4]"
                >
                  Limpar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-[8px] bg-[#d64b19] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#be4014] disabled:opacity-60"
                >
                  <Plus className="size-4" />
                  <span>{submitting ? 'Salvando...' : 'Cadastrar produto'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tabela */}
        <div className="rounded-[12px] border border-[#e7e8e2] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e8e2] p-5">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-[#252824]">
                Produtos cadastrados
              </h2>
              <span className="rounded-[6px] bg-[#f7f8f4] px-2 py-0.5 text-[11px] font-semibold text-[#73766e]">
                {products.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#73766e]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  placeholder="Buscar nome ou categoria..."
                  className="h-[38px] rounded-[8px] border border-[#e7e8e2] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#d64b19]"
                />
              </div>
              <SearchableSelect
                value={categoryFilter}
                onChange={(val) => {
                  setPage(1);
                  setCategoryFilter(val);
                }}
                compact
                className="w-48"
                emptyOptionLabel="Todas as categorias"
                searchPlaceholder="Buscar categoria..."
                emptyText="Nenhuma categoria encontrada."
                options={categories.map((cat) => ({
                  value: cat,
                  label: cat,
                }))}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#e7e8e2] bg-[#f7f8f4] text-[11px] font-semibold text-[#73766e]">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-5 py-3">Categoria</th>
                  <th className="px-5 py-3">Preço</th>
                  <th className="px-5 py-3">Em estoque</th>
                  {canManage && <th className="px-5 py-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e8e2]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[#73766e]">
                      Carregando produtos...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[#73766e]">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p) => {
                    const stock = stockMap[p.id];
                    const qty = stock?.totalQuantity ?? 0;
                    const min = stock?.minimumQuantity ?? 0;
                    const statusBadge =
                      qty === 0
                        ? { label: 'Esgotado', cls: 'bg-[#fee2e2] text-[#b91c1c]' }
                        : qty < min
                          ? { label: 'Estoque baixo', cls: 'bg-[#fff0e7] text-[#d64b19]' }
                          : { label: 'Disponível', cls: 'bg-[#edf6ef] text-[#277254]' };
                    return (
                      <tr key={p.id} className="hover:bg-[#f7f8f4]/60">
                        <td className="px-5 py-3.5 font-mono text-[12px] text-[#73766e]">
                          #{p.id.slice(0, 6)}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-[#252824]">
                          {p.name}
                        </td>
                        <td className="px-5 py-3.5 text-[#73766e]">{p.category}</td>
                        <td className="px-5 py-3.5 font-semibold text-[#252824]">
                          {formatCurrency(p.price)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#252824]">
                              {qty} un.
                            </span>
                            <span
                              className={`inline-flex rounded-[6px] px-2 py-0.5 text-[11px] font-medium ${statusBadge.cls}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>
                        </td>
                        {canManage && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => openEdit(p)}
                                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#252824] hover:text-[#d64b19]"
                              >
                                <Pencil className="size-3.5" />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleting(p)}
                                className="text-[#b91c1c] hover:opacity-75"
                                title="Desativar"
                              >
                                <Trash2 className="size-4" />
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
          <Pagination
            page={page}
            pageSize={20}
            totalItems={products.length}
            itemLabel="produtos"
            onPageChange={setPage}
          />
        </div>

        <Modal
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          title="Consultar e editar produto"
          subtitle={editing?.name}
        >
          <form onSubmit={handleUpdate} noValidate className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                Nome
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                Categoria
              </label>
              <input
                type="text"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                Preço (R$)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19] focus:bg-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-[8px] border border-[#e7e8e2] px-4 py-2 text-[13px] font-medium text-[#73766e]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-[8px] bg-[#d64b19] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#be4014]"
              >
                Salvar alterações
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          open={Boolean(deleting)}
          onClose={() => setDeleting(null)}
          title="Confirmar desativação"
          subtitle="O produto deixará de aparecer para novos pedidos."
        >
          <p className="text-[13px] text-[#73766e]">
            Deseja desativar o produto{' '}
            <strong className="text-[#252824]">{deleting?.name}</strong>?
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="rounded-[8px] border border-[#e7e8e2] px-4 py-2 text-[13px] font-medium text-[#73766e]"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleDeactivate}
              className="rounded-[8px] bg-[#b91c1c] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#991b1b]"
            >
              Confirmar desativação
            </button>
          </div>
        </Modal>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
