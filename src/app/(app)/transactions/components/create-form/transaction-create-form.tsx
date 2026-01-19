'use client';

import { Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/forms/currency-input';
import { DatePickerField } from '@/components/forms/date-picker-field';
import { SelectField } from '@/components/forms/select-field';
import { cn } from '@/lib/utils';

import { transactionKindOptions, recurrenceOptions } from '../../constants';
import { useTransactionForm } from './use-transaction-form';

import type { Account, Category, CardItem, Tag } from '../../types';

type TransactionCreateFormProps = {
  accounts: Account[];
  categories: Category[];
  cards: CardItem[];
  tags: Tag[];
};

export function TransactionCreateForm(props: TransactionCreateFormProps) {
  const { accounts, categories, cards, tags } = props;

  const {
    form,
    transactionKind,
    selectedTags,
    isAccountLocked,
    isCreditAccountSelected,
    filteredCardOptions,
    shouldShowCard,
    hasSelectedCard,
    showInstallments,
    isRecurring,
    accountTypeMap,
    cardAccountMap,
    toggleTag,
    handleSubmit,
    isCreating,
    isToAccountCreditSelected,
    filteredToCardOptions,
    shouldShowToCard,
  } = useTransactionForm({ accounts, cards });

  const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }));
  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.name }));
  const transactionErrors = form.formState.errors;
  const isTransfer = transactionKind === 'transfer';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo lançamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Preencha só o essencial</p>
              <p className="text-sm text-muted-foreground">
                O restante fica nos detalhes. Menos campos na tela, mais fluidez no lançamento.
              </p>
            </div>
          </div>
          <div className="space-y-6">
            <section className="space-y-4 rounded-xl border bg-card p-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Essencial</h2>
                <p className="text-xs text-muted-foreground">Comece pelo básico para registrar rápido.</p>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Tipo da transação</Label>
                  <div className="grid auto-rows-fr gap-3 md:grid-cols-3">
                    {transactionKindOptions.map((option) => {
                      const isSelected = transactionKind === option.value;
                      const Icon = option.icon;

                      return (
                        <label
                          key={option.value}
                          className={cn(
                            'flex h-full cursor-pointer items-center gap-3 rounded-lg border p-3 transition hover:border-primary/60 hover:bg-muted/40 md:min-h-[92px]',
                            isSelected && 'border-primary bg-primary/10 shadow-sm',
                          )}
                        >
                          <input
                            type="radio"
                            value={option.value}
                            checked={isSelected}
                            onChange={() =>
                              form.setValue('kind', option.value, {
                                shouldValidate: true,
                                shouldDirty: true,
                              })
                            }
                            className="sr-only"
                          />
                          <div
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-md border bg-background',
                              isSelected && 'border-primary bg-primary/10 text-primary',
                            )}
                          >
                            <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                          </div>
                          <div className="flex flex-1 flex-col gap-1">
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {transactionErrors.kind && (
                    <p className="text-xs text-destructive">{transactionErrors.kind.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Supermercado, salário, aluguel"
                    {...form.register('description')}
                    className={cn(transactionErrors.description && 'border-destructive')}
                  />
                  {transactionErrors.description && (
                    <p className="text-xs text-destructive">{transactionErrors.description.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor</Label>
                  <Controller
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <CurrencyInput
                        id="amount"
                        name="amount"
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        className={cn(transactionErrors.amount && 'border-destructive')}
                      />
                    )}
                  />
                  {transactionErrors.amount && (
                    <p className="text-xs text-destructive">{transactionErrors.amount.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Use valores positivos. O tipo define o sentido.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occurred_on">Data</Label>
                  <Controller
                    control={form.control}
                    name="occurred_on"
                    render={({ field }) => (
                      <DatePickerField
                        id="occurred_on"
                        name="occurred_on"
                        value={field.value}
                        onChange={field.onChange}
                        className={cn(transactionErrors.occurred_on && 'border-destructive')}
                      />
                    )}
                  />
                  {transactionErrors.occurred_on && (
                    <p className="text-xs text-destructive">{transactionErrors.occurred_on.message}</p>
                  )}
                </div>
                <Controller
                  control={form.control}
                  name="account_id"
                  render={({ field }) => (
                    <SelectField
                      name="account_id"
                      label="Conta"
                      options={accountOptions}
                      value={field.value ?? ''}
                      disabled={isAccountLocked}
                      onValueChange={(nextAccountId) => {
                        field.onChange(nextAccountId);
                        const nextAccountType = accountTypeMap.get(nextAccountId);
                        if (nextAccountType === 'credit') {
                          const nextCardAccountId = form.getValues('card_id')
                            ? (cardAccountMap.get(form.getValues('card_id') ?? '') ?? '')
                            : '';
                          if (nextCardAccountId !== nextAccountId) {
                            form.setValue('card_id', '', { shouldValidate: true });
                            form.setValue('is_recurring', false, { shouldValidate: true });
                            form.setValue('show_installments', false, { shouldValidate: true });
                          }
                        } else {
                          form.setValue('card_id', '', { shouldValidate: true });
                          form.setValue('is_recurring', false, { shouldValidate: true });
                          form.setValue('show_installments', false, { shouldValidate: true });
                        }
                      }}
                    />
                  )}
                />
                {transactionErrors.account_id && (
                  <p className="text-xs text-destructive md:col-span-2">{transactionErrors.account_id.message}</p>
                )}
                <Controller
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <SelectField
                      name="category_id"
                      label="Categoria"
                      options={categoryOptions}
                      placeholder="Opcional"
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </div>
            </section>
            <section className="space-y-4 rounded-xl border bg-card p-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Detalhes</h2>
                <p className="text-xs text-muted-foreground">
                  Complete com cartão, parcelas e tags quando fizer sentido.
                </p>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                {transactionKind === 'transfer' ? (
                  <>
                    <Controller
                      control={form.control}
                      name="to_account_id"
                      render={({ field }) => (
                        <SelectField
                          name="to_account_id"
                          label="Conta destino"
                          options={accountOptions}
                          value={field.value ?? ''}
                          onValueChange={(nextAccountId) => {
                            field.onChange(nextAccountId);
                            const nextAccountType = accountTypeMap.get(nextAccountId);
                            if (nextAccountType !== 'credit') {
                              form.setValue('to_card_id', '', { shouldValidate: true });
                            }
                          }}
                        />
                      )}
                    />
                    {transactionErrors.to_account_id && (
                      <p className="text-xs text-destructive md:col-span-2">
                        {transactionErrors.to_account_id.message}
                      </p>
                    )}
                    {shouldShowToCard && (
                      <div className="space-y-1">
                        <Controller
                          control={form.control}
                          name="to_card_id"
                          render={({ field }) => (
                            <SelectField
                              name="to_card_id"
                              label="Cartão destino"
                              options={filteredToCardOptions}
                              placeholder={isToAccountCreditSelected ? 'Obrigatório' : 'Selecione a conta'}
                              value={field.value ?? ''}
                              disabled={!form.getValues('to_account_id') || !isToAccountCreditSelected}
                              onValueChange={field.onChange}
                            />
                          )}
                        />
                        {transactionErrors.to_card_id && (
                          <p className="text-xs text-destructive">{transactionErrors.to_card_id.message}</p>
                        )}
                        {isToAccountCreditSelected && (
                          <p className="text-xs text-muted-foreground">
                            Selecione um cartão vinculado à conta destino.
                          </p>
                        )}
                        {isToAccountCreditSelected && filteredToCardOptions.length === 0 && (
                          <p className="text-xs text-destructive">
                            Nenhum cartão vinculado à conta destino selecionada.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">
                    Conta destino aparece apenas para transferências.
                  </div>
                )}
                {isTransfer && isToAccountCreditSelected && (
                  <div className="space-y-2 md:col-span-2">
                    <Controller
                      control={form.control}
                      name="is_bill_payment"
                      render={({ field }) => (
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                          <Checkbox
                            id="bill-payment"
                            checked={field.value ?? false}
                            onCheckedChange={(value) => field.onChange(Boolean(value))}
                          />
                          <div className="flex flex-col gap-1">
                            <Label htmlFor="bill-payment" className="cursor-pointer font-medium">
                              Pagamento de fatura
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Marcar esta transferência como pagamento da fatura do cartão
                            </p>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                )}
                {shouldShowCard && !isTransfer && (
                  <div className="space-y-1">
                    <Controller
                      control={form.control}
                      name="card_id"
                      render={({ field }) => (
                        <SelectField
                          name="card_id"
                          label="Cartão"
                          options={filteredCardOptions}
                          placeholder={isCreditAccountSelected ? 'Obrigatório' : 'Selecione a conta'}
                          value={field.value ?? ''}
                          disabled={!form.getValues('account_id') || !isCreditAccountSelected}
                          onValueChange={(nextCardId) => {
                            field.onChange(nextCardId);
                            const nextLinkedAccountId = cardAccountMap.get(nextCardId) ?? '';
                            if (nextLinkedAccountId) {
                              form.setValue('account_id', nextLinkedAccountId, {
                                shouldValidate: true,
                              });
                            }
                            if (!nextCardId) {
                              form.setValue('is_recurring', false, { shouldValidate: true });
                              form.setValue('show_installments', false, { shouldValidate: true });
                            }
                          }}
                        />
                      )}
                    />
                    {transactionErrors.card_id && (
                      <p className="text-xs text-destructive">{transactionErrors.card_id.message}</p>
                    )}
                    {isCreditAccountSelected && (
                      <p className="text-xs text-muted-foreground">Selecione um cartão vinculado a esta conta.</p>
                    )}
                    {isCreditAccountSelected && filteredCardOptions.length === 0 && (
                      <p className="text-xs text-destructive">Nenhum cartão vinculado à conta selecionada.</p>
                    )}
                  </div>
                )}
                {hasSelectedCard && !isTransfer && (
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm font-medium">Opções do cartão</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="installments-enabled"
                          checked={showInstallments}
                          onCheckedChange={(value) =>
                            form.setValue('show_installments', Boolean(value), { shouldValidate: true })
                          }
                        />
                        <Label htmlFor="installments-enabled" className="cursor-pointer">
                          Parcelamento
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="recurrence-enabled"
                          checked={isRecurring}
                          onCheckedChange={(value) =>
                            form.setValue('is_recurring', Boolean(value), { shouldValidate: true })
                          }
                        />
                        <Label htmlFor="recurrence-enabled" className="cursor-pointer">
                          Recorrência
                        </Label>
                      </div>
                    </div>
                    {showInstallments ? (
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        ⚠️ Número de parcelas e data da primeira parcela são obrigatórios
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Ative para revelar as configurações específicas do cartão.
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Algum detalhe extra para lembrar depois?"
                    {...form.register('notes')}
                  />
                </div>
                {showInstallments && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="installments" className="flex items-center gap-1">
                        Parcelas
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="installments"
                        type="number"
                        min={2}
                        placeholder="Ex: 3"
                        {...form.register('installments')}
                        className={cn(transactionErrors.installments && 'border-destructive')}
                        required
                      />
                      {transactionErrors.installments && (
                        <p className="text-xs text-destructive">{transactionErrors.installments.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Mínimo de 2 parcelas</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="first_installment_on" className="flex items-center gap-1">
                        Primeira parcela
                        <span className="text-destructive">*</span>
                      </Label>
                      <Controller
                        control={form.control}
                        name="first_installment_on"
                        render={({ field }) => (
                          <DatePickerField
                            id="first_installment_on"
                            name="first_installment_on"
                            value={field.value}
                            onChange={field.onChange}
                            className={cn(transactionErrors.first_installment_on && 'border-destructive')}
                          />
                        )}
                      />
                      {transactionErrors.first_installment_on && (
                        <p className="text-xs text-destructive">{transactionErrors.first_installment_on.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Data de vencimento da 1ª parcela</p>
                    </div>
                  </>
                )}
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm font-medium">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.id);
                      return (
                        <div
                          key={tag.id}
                          className={cn(
                            'flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition',
                            isSelected && 'border-primary bg-primary/10 text-primary',
                          )}
                        >
                          <Checkbox
                            id={`tag-${tag.id}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleTag(tag.id)}
                          />
                          <Label htmlFor={`tag-${tag.id}`} className="cursor-pointer">
                            {tag.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
            {isRecurring && (
              <section className="space-y-4 rounded-xl border bg-card p-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold">Recorrência</h2>
                  <p className="text-xs text-muted-foreground">Configure se o lançamento se repete.</p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    Use recorrência para pagamentos fixos, assinaturas ou aportes periódicos.
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Controller
                      control={form.control}
                      name="recurrence_frequency"
                      render={({ field }) => (
                        <SelectField
                          name="recurrence_frequency"
                          label="Frequência"
                          options={recurrenceOptions}
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                        />
                      )}
                    />
                    {transactionErrors.recurrence_frequency && (
                      <p className="text-xs text-destructive md:col-span-3">
                        {transactionErrors.recurrence_frequency.message}
                      </p>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="recurrence_interval">Intervalo</Label>
                      <Input
                        id="recurrence_interval"
                        type="number"
                        min={1}
                        {...form.register('recurrence_interval')}
                        className={cn(transactionErrors.recurrence_interval && 'border-destructive')}
                      />
                      {transactionErrors.recurrence_interval && (
                        <p className="text-xs text-destructive">{transactionErrors.recurrence_interval.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recurrence_occurrences">Ocorrências</Label>
                      <Input
                        id="recurrence_occurrences"
                        type="number"
                        min={1}
                        {...form.register('recurrence_occurrences')}
                        className={cn(transactionErrors.recurrence_occurrences && 'border-destructive')}
                      />
                      {transactionErrors.recurrence_occurrences && (
                        <p className="text-xs text-destructive">{transactionErrors.recurrence_occurrences.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recurrence_end_on">Término</Label>
                      <Controller
                        control={form.control}
                        name="recurrence_end_on"
                        render={({ field }) => (
                          <DatePickerField
                            id="recurrence_end_on"
                            name="recurrence_end_on"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-muted-foreground">
              Dica: cadastre o essencial primeiro, depois refine nos detalhes se precisar.
            </p>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Salvando...' : 'Salvar lançamento'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
