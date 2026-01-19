# Módulo de Transações

Este módulo foi refatorado para usar uma arquitetura modular com definições de tipos baseadas em Zod.

## Estrutura

```
transactions/
├── transactions-client.tsx          # Orquestrador principal (~100 linhas)
├── types.ts                         # Schemas Zod e tipos inferidos
├── constants.ts                     # Constantes e opções
├── utils.ts                         # Funções auxiliares
├── actions.ts                       # Server actions
└── components/
    ├── filters/                     # Filtros de transações
    ├── table/                       # Tabela com colunas
    ├── create-form/                 # Formulário de criação
    ├── edit-drawer/                 # Drawer de edição
    └── import-sheet/                # Importação de CSV
```

## Tipos e Validação com Zod

### Schemas Base

Todos os tipos principais são definidos como schemas Zod em `types.ts`:

```typescript
import {
  accountSchema,
  categorySchema,
  transactionSchema,
  type Account,
  type Category,
  type Transaction,
} from './types';
```

### Validação de Dados

Use as funções helper para validar dados vindos do servidor:

```typescript
import { validateTransaction, validateTransactions } from './types';

// Validar uma transação
const result = validateTransaction(data);
if (result.success) {
  const transaction: Transaction = result.data;
} else {
  console.error(result.error);
}

// Validar array de transações
const results = validateTransactions(data);
```

### Enums Disponíveis

```typescript
import { accountTypeEnum, transactionKindEnum } from './types';

// Tipos de conta: "checking" | "savings" | "credit" | "investment"
// Tipos de transação: "income" | "expense" | "transfer" | "investment_contribution" | "investment_withdrawal"
```

## Componentes

### TransactionFilters

Componente de filtros com hook dedicado:

```typescript
import { useTransactionFilters } from './components/filters/use-transaction-filters';

const filters = useTransactionFilters(transactions);
```

### TransactionTable

Tabela com seleção e ações em lote:

```typescript
<TransactionTable
  transactions={filteredTransactions}
  transactionInstallments={transactionInstallments}
  accounts={accounts}
  categories={categories}
  cards={cards}
  onEditStart={handleEditStart}
/>
```

### TransactionCreateForm

Formulário completo com validação Zod:

```typescript
<TransactionCreateForm
  accounts={accounts}
  categories={categories}
  cards={cards}
  tags={tags}
/>
```

### TransactionEditDrawer

Drawer de edição com gestão de parcelas:

```typescript
<TransactionEditDrawer
  accounts={accounts}
  categories={categories}
  cards={cards}
  transactions={transactions}
/>
```

### TransactionImportSheet

Importação de CSV com IA:

```typescript
<TransactionImportSheet
  accounts={accounts}
  categories={categories}
  cards={cards}
/>
```

## Hooks Customizados

Cada componente complexo tem seu próprio hook:

- `useTransactionFilters` - Gerencia filtros e dados filtrados
- `useTransactionForm` - Gerencia formulário de criação
- `useEditTransaction` - Gerencia edição de transações
- `useImportTransactions` - Gerencia importação de CSV

## Schemas de Formulário

Cada formulário tem seu schema Zod específico:

- `create-schema.ts` - Validação do formulário de criação
- `edit-schema.ts` - Validação do formulário de edição
- `import-schema.ts` - Validação do formulário de importação

## Benefícios da Arquitetura

1. **Type Safety com Runtime Validation**: Zod valida dados em runtime
2. **Redução de Duplicação**: Types inferidos dos schemas
3. **Manutenibilidade**: Cada feature isolada
4. **Testabilidade**: Componentes e hooks independentes
5. **Performance**: Re-renders granulares
6. **Navegabilidade**: Estrutura collocated

## Exemplo de Uso Completo

```typescript
import { TransactionsClient } from './transactions-client';
import { validateTransactionsClientProps } from './types';

export default function TransactionsPage({ data }) {
  // Validar props antes de passar ao componente
  const validationResult = validateTransactionsClientProps(data);
  
  if (!validationResult.success) {
    throw new Error('Invalid data structure');
  }

  return <TransactionsClient {...validationResult.data} />;
}
```

## Debugging

Todos os logs de debug foram mantidos nas seguintes funções:
- `applyCategorySuggestions` (import hook)
- `requestCategorySuggestions` (import hook)
- `handleImportFileChange` (import hook)

Os logs usam o formato:
```typescript
fetch("http://127.0.0.1:7244/ingest/...", {
  method: "POST",
  body: JSON.stringify({ hypothesisId, location, message, data, timestamp })
})
```
