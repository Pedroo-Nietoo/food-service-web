# Food Service Web (`brasa.`)

Frontend em **React + TypeScript + Vite + Tailwind CSS** gerado a partir do protótipo do Figma e integrado diretamente à **Food Service API** (`/api/v1`).

## Telas implementadas
- **Login (`/login`)**: autenticação via `POST /api/v1/auth/login` com JWT e persistência configurável.
- **Produtos (`/produtos`)**: catálogo, filtros, KPIs de estoque, cadastro/edição/desativação (RBAC `ADMIN`/`MANAGER`) e exportação CSV.
- **Pedidos (`/pedidos`)**: criação de pedidos, máquina de estados (`OPEN` -> `CONFIRMED` -> `PREPARING` -> `READY` -> `COMPLETED` / `CANCELLED`), registro de pagamentos (`CASH`, `PIX`, `CREDIT_CARD`, `DEBIT_CARD`, `MEAL_VOUCHER`) e estorno.
- **Estoque (`/estoque`)**: saldo por produto, alerta de estoque baixo, movimentações idempotentes (`ENTRY`, `EXIT`, `LOSS`, `ADJUSTMENT`), definição de mínimo e histórico.
- **Clientes (`/clientes`)**: listagem paginada, busca por nome/CPF/telefone, cadastro e edição.
- **Relatórios (`/relatorios`)**: vendas, recebimentos por método, produtos vendidos e movimentações de estoque por período (RBAC `ADMIN`/`MANAGER`).

## Como executar
```bash
pnpm install
cp .env.example .env
pnpm run dev
```
> Certifique-se de que o backend (`food-service-api`) esteja rodando em `http://localhost:3000` (ou ajuste `API_PROXY` / `API_URL`).
