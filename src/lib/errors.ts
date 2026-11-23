const EXACT_TRANSLATIONS: Record<string, string> = {
  'Invalid credentials': 'Login ou senha inválidos.',
  'Authentication is required': 'Autenticação obrigatória. Faça login novamente.',
  'Insufficient permissions': 'Seu perfil não tem permissão para esta ação.',
  'Forbidden resource': 'Seu perfil não tem permissão para acessar este recurso.',
  'User is inactive or does not exist': 'Sua conta está inativa ou não existe.',
  'Product not found': 'Produto não encontrado.',
  'Customer not found': 'Cliente não encontrado.',
  'Order not found': 'Pedido não encontrado.',
  'Payment not found': 'Pagamento não encontrado.',
  'Stock not found': 'Registro de estoque não encontrado.',
  'User not found': 'Usuário não encontrado.',
  'Insufficient stock': 'Estoque insuficiente para realizar a operação.',
  'An order product is inactive': 'Um ou mais produtos do pedido estão inativos.',
  'Order must be fully paid': 'O pedido precisa estar totalmente pago para ser concluído.',
  'Order is not eligible for payment': 'Este pedido não está em um status válido para pagamento.',
  'Amount must be positive': 'O valor deve ser maior que zero.',
  'Amount exceeds unreserved balance': 'O valor informado ultrapassa o saldo restante do pedido.',
  'Cash received must cover payment amount': 'O valor recebido em dinheiro deve cobrir o valor do pagamento.',
  'Received amount is only valid for cash': 'O valor recebido só pode ser informado para pagamentos em dinheiro.',
  'Cancellation reason is required': 'Informe o motivo do cancelamento.',
  'Cancellation is only allowed before preparation': 'O cancelamento só é permitido antes do início do preparo.',
  'Reverse active payments before cancelling': 'Estorne os pagamentos ativos antes de cancelar o pedido.',
  'Resolve pending refunds before advancing the order': 'Aguarde a resolução dos estornos pendentes antes de avançar o pedido.',
  'Invalid order transition': 'Transição de status inválida para este pedido.',
  'Invalid date range': 'A data inicial deve ser anterior ou igual à data final.',
  'from must be earlier than to': 'A data inicial deve ser anterior à data final.',
  'Order total exceeds limit': 'O valor total do pedido ultrapassa o limite permitido.',
  'Products must exist and be active': 'Todos os produtos do pedido devem existir e estar ativos.',
  'Quantity must be a positive integer': 'A quantidade deve ser um número inteiro positivo.',
  'Quantity cannot be zero': 'A quantidade não pode ser zero.',
  'Integer counter limit exceeded': 'Limite máximo de quantidade em estoque atingido.',
  'Idempotency key already used with different parameters': 'Esta operação já foi enviada com parâmetros diferentes.',
  'Conflict: A record with the specified unique constraint already exists.': 'Já existe um registro cadastrado com esses dados únicos.',
  'Not found: The requested record does not exist.': 'Registro não encontrado.',
  'Internal server error': 'Erro interno no servidor. Tente novamente.',
};

const PATTERN_TRANSLATIONS: [RegExp, string][] = [
  [/must be a positive number/i, 'O valor informado deve ser um número positivo (maior que zero).'],
  [/must not be less than/i, 'O valor informado está abaixo do mínimo permitido.'],
  [/must be an integer number/i, 'O campo deve conter um número inteiro.'],
  [/should not be empty/i, 'Preencha todos os campos obrigatórios.'],
  [/must be a string/i, 'Formato de texto inválido.'],
  [/must be a number/i, 'Informe um valor numérico válido.'],
  [/must be a valid Brazilian CPF/i, 'Informe um CPF válido com 11 dígitos.'],
  [/must contain a Brazilian area code/i, 'Informe um telefone válido com DDD (10 ou 11 dígitos).'],
  [/already exists/i, 'Já existe um registro com esses dados.'],
  [/Stripe BRL payments require at least 0\.50/i, 'Pagamentos com cartão via Stripe exigem valor mínimo de R$ 0,50.'],
  [/Stripe webhook secret is not configured/i, 'Integração Stripe não configurada no servidor.'],
  [/Stripe is unavailable/i, 'Serviço Stripe indisponível no momento. Tente novamente.'],
];

function translateSingle(msg: string): string {
  const trimmed = msg.trim();
  if (EXACT_TRANSLATIONS[trimmed]) {
    return EXACT_TRANSLATIONS[trimmed];
  }
  for (const [pattern, replacement] of PATTERN_TRANSLATIONS) {
    if (pattern.test(trimmed)) {
      return replacement;
    }
  }
  return trimmed;
}

export function translateApiError(
  raw: string | string[] | undefined,
  status?: number,
): string {
  if (Array.isArray(raw) && raw.length > 0) {
    const translated = Array.from(new Set(raw.map(translateSingle)));
    return translated.join(' ');
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return translateSingle(raw);
  }
  if (status === 401) return 'Sessão expirada ou credenciais inválidas.';
  if (status === 403) return 'Você não tem permissão para realizar esta ação.';
  if (status === 404) return 'Registro não encontrado.';
  if (status === 409) return 'Conflito: registro já existente ou operação inválida.';
  if (status === 429) return 'Muitas requisições em sequência. Aguarde alguns segundos.';
  return `Erro inesperado (${status ?? 'rede'}).`;
}
