'use client';

import { Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/forms/currency-input';
import { DatePickerField } from '@/components/forms/date-picker-field';
import { cn } from '@/lib/utils';

import { EMPTY_SELECT_VALUE, transactionKindOptions } from '../../constants';
import { useEditTransaction } from './use-edit-transaction';

import type { Account, Category, CardItem, Transaction } from '../../types';

type TransactionEditDrawerProps = {
  accounts: Account[];
  categories: Category[];
  cards: CardItem[];
  transactions: Transaction[];
  editHook: ReturnType<typeof useEditTransaction>;
};

export function TransactionEditDrawer(props: TransactionEditDrawerProps) {
  const { accounts, categories, editHook } = props;

  const {
    editForm,
    editingTransactionId,
    editingTransaction,
    isEditTransfer,
    editIsCreditAccountSelected,
    editIsToAccountCreditSelected,
    editCardOptions,
    shouldShowEditCard,
    editIsInstallmentPayment,
    isSaving,
    editInstallmentConfirm,
    handleEditCancel,
    handleEditSubmit,
    handleConfirmEditInstallments,
  } = editHook;

  const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }));
  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.name }));
  const editErrors = editForm.formState.errors;

  return (
    <>
      <AlertDialog
        open={Boolean(editInstallmentConfirm)}
        onOpenChange={(open) => (!open ? handleConfirmEditInstallments(false) : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lançar parcelas futuras?</AlertDialogTitle>
            <AlertDialogDescription>
              A transação atual tem parcelas restantes. Você quer lançar as parcelas futuras automaticamente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving} onClick={() => handleConfirmEditInstallments(false)}>
              Apenas esta
            </AlertDialogCancel>
            <AlertDialogAction disabled={isSaving} onClick={() => handleConfirmEditInstallments(true)}>
              {isSaving ? 'Salvando...' : 'Lançar futuras'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Drawer open={Boolean(editingTransactionId)} onOpenChange={(open) => (!open ? handleEditCancel() : null)}>
        <DrawerContent className="flex max-h-[90vh] flex-col">
          <DrawerHeader className="text-left">
            <DrawerTitle>Editar transação</DrawerTitle>
            <DrawerDescription>Atualize data, valores e classificação antes de salvar.</DrawerDescription>
          </DrawerHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleEditSubmit(editingTransactionId ?? '')}>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                {editingTransaction?.description ?? 'Transação sem descrição'}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-occurred-on">Data</Label>
                  <Controller
                    control={editForm.control}
                    name="occurred_on"
                    render={({ field }) => (
                      <DatePickerField
                        id="edit-occurred-on"
                        name="occurred_on"
                        value={field.value}
                        onChange={field.onChange}
                        className={cn(editErrors.occurred_on && 'border-destructive')}
                      />
                    )}
                  />
                  {editErrors.occurred_on && (
                    <p className="text-xs text-destructive">{editErrors.occurred_on.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Input
                    id="edit-description"
                    {...editForm.register('description')}
                    placeholder="Descrição"
                    disabled={isSaving}
                    className={cn(editErrors.description && 'border-destructive')}
                  />
                  {editErrors.description && (
                    <p className="text-xs text-destructive">{editErrors.description.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Controller
                    control={editForm.control}
                    name="kind"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={isSaving}>
                        <SelectTrigger className={cn(editErrors.kind && 'border-destructive')}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {transactionKindOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {editErrors.kind && <p className="text-xs text-destructive">{editErrors.kind.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Controller
                    control={editForm.control}
                    name="account_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={isSaving}>
                        <SelectTrigger className={cn(editErrors.account_id && 'border-destructive')}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {accountOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {editErrors.account_id && <p className="text-xs text-destructive">{editErrors.account_id.message}</p>}
                </div>
                {isEditTransfer && (
                  <div className="space-y-2">
                    <Label>Conta destino</Label>
                    <Controller
                      control={editForm.control}
                      name="to_account_id"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={isSaving}>
                          <SelectTrigger className={cn(editErrors.to_account_id && 'border-destructive')}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {accountOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {editErrors.to_account_id && (
                      <p className="text-xs text-destructive">{editErrors.to_account_id.message}</p>
                    )}
                  </div>
                )}
                {isEditTransfer && editIsToAccountCreditSelected && (
                  <div className="space-y-2 md:col-span-2">
                    <Controller
                      control={editForm.control}
                      name="is_bill_payment"
                      render={({ field }) => (
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                          <Checkbox
                            id="edit-bill-payment"
                            checked={field.value ?? false}
                            onCheckedChange={(value) => field.onChange(Boolean(value))}
                            disabled={isSaving}
                          />
                          <div className="flex flex-col gap-1">
                            <Label htmlFor="edit-bill-payment" className="cursor-pointer font-medium">
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
                {shouldShowEditCard && (
                  <div className="space-y-2">
                    <Label>Cartão</Label>
                    <Controller
                      control={editForm.control}
                      name="card_id"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={isSaving}>
                          <SelectTrigger className={cn(editErrors.card_id && 'border-destructive')}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {editCardOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {editErrors.card_id && <p className="text-xs text-destructive">{editErrors.card_id.message}</p>}
                    {editIsCreditAccountSelected && editCardOptions.length === 0 && (
                      <p className="text-xs text-destructive">Nenhum cartão vinculado à conta selecionada.</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Controller
                    control={editForm.control}
                    name="category_id"
                    render={({ field }) => (
                      <Select
                        value={field.value || EMPTY_SELECT_VALUE}
                        onValueChange={(value) => field.onChange(value === EMPTY_SELECT_VALUE ? '' : value)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className={cn(editErrors.category_id && 'border-destructive')}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56 overflow-y-auto">
                          <SelectItem value={EMPTY_SELECT_VALUE}>Sem categoria</SelectItem>
                          {categoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {editErrors.category_id && (
                    <p className="text-xs text-destructive">{editErrors.category_id.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Controller
                    control={editForm.control}
                    name="amount"
                    render={({ field }) => (
                      <CurrencyInput
                        value={field.value}
                        onValueChange={field.onChange}
                        className={cn(editErrors.amount && 'border-destructive')}
                        disabled={isSaving}
                      />
                    )}
                  />
                  {editErrors.amount && <p className="text-xs text-destructive">{editErrors.amount.message}</p>}
                </div>
              </div>
              {editIsInstallmentPayment && (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Detalhes do Parcelamento</p>
                    <p className="text-xs text-muted-foreground">Informações sobre as parcelas desta transação.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-installment-number">Parcela atual</Label>
                      <Input
                        id="edit-installment-number"
                        type="number"
                        min={1}
                        placeholder="Ex: 2"
                        {...editForm.register('installment_number')}
                        disabled={isSaving}
                        className={cn(editErrors.installment_number && 'border-destructive')}
                      />
                      {editErrors.installment_number && (
                        <p className="text-xs text-destructive">{editErrors.installment_number.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-total-installments">Total de parcelas</Label>
                      <Input
                        id="edit-total-installments"
                        type="number"
                        min={1}
                        placeholder="Ex: 6"
                        {...editForm.register('total_installments')}
                        disabled={isSaving}
                        className={cn(editErrors.total_installments && 'border-destructive')}
                      />
                      {editErrors.total_installments && (
                        <p className="text-xs text-destructive">{editErrors.total_installments.message}</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <DrawerFooter className="border-t">
              <Button type="submit" disabled={isSaving || !editingTransactionId}>
                {isSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>
                  Cancelar
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}
