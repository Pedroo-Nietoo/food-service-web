import { Download, Pencil, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { Toast, type ToastMessage } from '../components/Toast';
import { ApiError, apiRequest, exportCsv } from '../lib/api';
import { formatCpf, formatDateTime, formatPhone } from '../lib/format';
import type { Customer, PaginatedResponse } from '../types/api';

export function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (search.trim()) params.set('search', search.trim());
      const res = await apiRequest<PaginatedResponse<Customer>>(
        `/customers?${params.toString()}`,
      );
      setCustomers(res.data);
      setTotal(res.meta.total);
      setTotalPages(Math.max(1, res.meta.totalPages));
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao carregar clientes.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setToast({ type: 'error', text: 'Informe o nome do cliente.' });
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest<Customer>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          cpf: cpf.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      setName('');
      setCpf('');
      setPhone('');
      setToast({ type: 'success', text: 'Cliente cadastrado com sucesso.' });
      await loadCustomers();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao cadastrar cliente.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setEditName(c.name);
    setEditCpf(c.cpf ?? '');
    setEditPhone(c.phone ?? '');
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editName.trim()) {
      setToast({ type: 'error', text: 'Informe o nome do cliente.' });
      return;
    }

    try {
      await apiRequest<Customer>(`/customers/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName.trim(),
          cpf: editCpf.trim() ? editCpf.trim() : null,
          phone: editPhone.trim() ? editPhone.trim() : null,
        }),
      });
      setEditing(null);
      setToast({ type: 'success', text: 'Cliente atualizado com sucesso.' });
      await loadCustomers();
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'Erro ao atualizar cliente.',
      });
    }
  }

  function handleExport() {
    exportCsv(
      'clientes.csv',
      ['ID', 'Nome', 'CPF', 'Telefone', 'Criado em'],
      customers.map((c) => [
        c.id,
        c.name,
        formatCpf(c.cpf),
        formatPhone(c.phone),
        c.createdAt,
      ]),
    );
  }

  const withCpf = customers.filter((c) => Boolean(c.cpf)).length;
  const withPhone = customers.filter((c) => Boolean(c.phone)).length;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#252824]">
              Clientes
            </h1>
            <p className="mt-1 text-[13px] text-[#73766e]">
              Cadastro e consulta por nome, CPF ou telefone normalizados.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[#e7e8e2] bg-white px-4 py-2.5 text-[13px] font-medium text-[#252824] hover:bg-[#f7f8f4]"
          >
            <Download className="size-4" />
            <span>Exportar clientes</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Clientes cadastrados
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#252824]">{total}</p>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Com CPF na página
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#252824]">{withCpf}</p>
          </div>
          <div className="rounded-[12px] border border-[#e7e8e2] bg-white p-5">
            <p className="text-[12px] font-medium text-[#73766e]">
              Com telefone na página
            </p>
            <p className="mt-2 text-[28px] font-bold text-[#252824]">{withPhone}</p>
          </div>
        </div>

        <form
          onSubmit={handleCreate}
          noValidate
          className="rounded-[12px] border border-[#e7e8e2] bg-white p-5"
        >
          <h2 className="mb-4 text-[15px] font-semibold text-[#252824]">
            Novo cliente
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex.: Maria Silva"
                className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                CPF (opcional)
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                Telefone com DDD (opcional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-8888"
                className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19] focus:bg-white"
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
              <span>{submitting ? 'Salvando...' : 'Cadastrar cliente'}</span>
            </button>
          </div>
        </form>

        <div className="rounded-[12px] border border-[#e7e8e2] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e8e2] p-5">
            <h2 className="text-[15px] font-semibold text-[#252824]">
              Base de clientes
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#73766e]" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Nome, CPF ou telefone..."
                className="h-[38px] rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] pl-9 pr-3 text-[13px] outline-none focus:border-[#d64b19] focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#e7e8e2] bg-[#f7f8f4] text-[11px] font-semibold uppercase tracking-wider text-[#73766e]">
                <tr>
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">CPF</th>
                  <th className="px-5 py-3">Telefone</th>
                  <th className="px-5 py-3">Cadastro</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e8e2]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-[#73766e]">
                      Carregando clientes...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-[#73766e]">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#f7f8f4]/60">
                      <td className="px-5 py-3.5 font-medium text-[#252824]">
                        {c.name}
                      </td>
                      <td className="px-5 py-3.5 text-[#73766e]">
                        {formatCpf(c.cpf)}
                      </td>
                      <td className="px-5 py-3.5 text-[#73766e]">
                        {formatPhone(c.phone)}
                      </td>
                      <td className="px-5 py-3.5 text-[#73766e]">
                        {formatDateTime(c.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="rounded-lg p-1.5 text-[#73766e] hover:bg-[#f7f8f4] hover:text-[#252824]"
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#e7e8e2] px-5 py-3 text-[12px] text-[#73766e]">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-[8px] border border-[#e7e8e2] px-3 py-1.5 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-[8px] border border-[#e7e8e2] px-3 py-1.5 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>

        <Modal
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          title="Consultar e editar cliente"
          subtitle="Deixe CPF ou telefone em branco para limpar o campo."
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
                CPF
              </label>
              <input
                type="text"
                value={editCpf}
                onChange={(e) => setEditCpf(e.target.value)}
                className="h-[42px] w-full rounded-[8px] border border-[#e7e8e2] bg-[#f7f8f4] px-3 text-[13px] outline-none focus:border-[#d64b19] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#73766e]">
                Telefone
              </label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
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
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
