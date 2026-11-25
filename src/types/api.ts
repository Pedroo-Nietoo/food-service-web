export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'CASHIER'
  | 'ATTENDANT'
  | 'STOCK_MANAGER'
  | 'KITCHEN';

export interface AuthUser {
  id: string;
  name: string;
  login: string;
  email: string | null;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  id: string;
  productId: string;
  totalQuantity: number;
  minimumQuantity: number;
  inputQuantity: number;
  outputQuantity: number;
  updatedAt: string;
  lowStock?: boolean;
  product: {
    id: string;
    name: string;
    category: string;
    isActive: boolean;
  };
}

export type StockMovementType = 'ENTRY' | 'EXIT' | 'LOSS' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  productId: string;
  idempotencyKey: string | null;
  orderId: string | null;
  userId: string | null;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export type OrderStatus =
  | 'OPEN'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'PIX'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD';

export type PaymentStatus =
  | 'REFUND_PENDING'
  | 'PENDING'
  | 'PAID'
  | 'REFUNDED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface Payment {
  id: string;
  orderId: string;
  receivedById: string | null;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: string;
  transactionId: string | null;
  idempotencyKey: string | null;
  provider: string;
  receivedAmount: string | null;
  change: string | null;
  refundId: string | null;
  reversalReason: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string | null;
  cancellationReason: string | null;
  total: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments?: Payment[];
  paidAmount?: string;
  remainingAmount?: string;
}

export interface SalesReport {
  period: { from: string; to: string };
  orders: {
    count: number;
    total: string;
    averageTicket: string;
  };
  receiptsByMethod: {
    method: PaymentMethod;
    count: number;
    amount: string;
  }[];
}

export interface ProductsReportRow {
  productId: string;
  name: string;
  category: string;
  quantitySold: number;
  totalSold: string;
}

export interface StockReportRow {
  productId: string;
  name: string;
  isActive: boolean;
  currentQuantity: number;
  minimumQuantity: number;
  lowStock: boolean;
  entries: number;
  exits: number;
  losses: number;
  positiveAdjustments: number;
  negativeAdjustments: number;
  netMovement: number;
}
