import type { OrderStatus, PaymentMethod, PaymentStatus, StockMovementType, UserRole } from '../types/api';

export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(num) ? num : 0);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatCpf(cpf: string | null): string {
  if (!cpf) return '—';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatPhone(phone: string | null): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador(a)',
  MANAGER: 'Gerente',
  CASHIER: 'Caixa',
  ATTENDANT: 'Atendente',
  STOCK_MANAGER: 'Estoquista',
  KITCHEN: 'Cozinha',
};

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; bg: string; text: string }
> = {
  OPEN: { label: 'Aberto', bg: 'bg-[#f7f8f4]', text: 'text-[#73766e]' },
  CONFIRMED: { label: 'Confirmado', bg: 'bg-[#fff0e7]', text: 'text-[#d64b19]' },
  PREPARING: { label: 'Em preparo', bg: 'bg-[#fef3c7]', text: 'text-[#b45309]' },
  READY: { label: 'Pronto', bg: 'bg-[#edf6ef]', text: 'text-[#277254]' },
  COMPLETED: { label: 'Concluído', bg: 'bg-[#edf6ef]', text: 'text-[#277254]' },
  CANCELLED: { label: 'Cancelado', bg: 'bg-[#fee2e2]', text: 'text-[#b91c1c]' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  REFUND_PENDING: 'Estorno Pendente',
  REFUNDED: 'Estornado',
  CANCELLED: 'Cancelado',
};

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  ENTRY: 'Entrada',
  EXIT: 'Saída',
  LOSS: 'Perda',
  ADJUSTMENT: 'Ajuste',
};
