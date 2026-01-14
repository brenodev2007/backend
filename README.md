# Stock Savvy Backend

Backend API construído com Node.js, Express, TypeORM e MySQL.

## 🚀 Instalação

```bash
cd backend
npm install
```

## ⚙️ Configuração

1. Configure o MySQL (local ou remoto)
2. Edite o arquivo `.env` com suas credenciais:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=sua_senha
DATABASE_NAME=stock_savvy

JWT_SECRET=sua-chave-secreta-aqui
PORT=3001

MP_ACCESS_TOKEN=seu-token-mercado-pago
```

## 🏃 Executar

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

## 📡 Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário autenticado

### Produtos
- `GET /api/products` - Listar produtos
- `POST /api/products` - Criar produto
- `PUT /api/products/:id` - Atualizar produto
- `DELETE /api/products/:id` - Deletar produto

### Depósitos
- `GET /api/warehouses` - Listar depósitos
- `POST /api/warehouses` - Criar depósito
- `PUT /api/warehouses/:id` - Atualizar depósito
- `DELETE /api/warehouses/:id` - Deletar depósito

### Estoque
- `GET /api/stock/balances` - Saldos de estoque
- `GET /api/stock/movements` - Movimentações
- `POST /api/stock/movements` - Registrar movimentação

### Finanças
- `GET /api/finance/transactions` - Transações financeiras
- `POST /api/finance/transactions` - Criar transação

### Assinatura
- `POST /api/subscription/checkout` - Criar checkout Mercado Pago

## 🔐 Autenticação

Todas as rotas (exceto `/auth/register` e `/auth/login`) requerem token JWT no header:

```
Authorization: Bearer seu-token-aqui
```

## 🗄️ Banco de Dados

O TypeORM está configurado com `synchronize: true` para desenvolvimento. As tabelas serão criadas automaticamente na primeira execução.

**⚠️ IMPORTANTE**: Em produção, desabilite `synchronize` e use migrations.
