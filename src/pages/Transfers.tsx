import { useRef, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/Feedback';
import { BeneficiaryDrawer } from '@/components/data/BeneficiaryDrawer';
import { TransferWizard, type PayRequest } from '@/components/transfers/TransferWizard';
import { BeneficiaryBook } from '@/components/transfers/BeneficiaryBook';
import { TransferHistory } from '@/components/transfers/TransferHistory';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/providers/ToastProvider';
import { api } from '@/mocks/api';
import type { Beneficiary, Transfer } from '@/types/domain';

/**
 * Transfers: raise a payment, keep the book, read the history.
 *
 * Deliberately one screen rather than three tabs — the payee list is what you
 * look at while filling the form, so hiding it behind a tab would mean holding
 * an account number in your head.
 */
export default function Transfers() {
  const toast = useToast();

  const accounts = useApi(() => api.getAccounts(), []);
  const beneficiaries = useApi(() => api.getBeneficiaries(), []);
  const transfers = useApi(() => api.getTransfers(), []);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [payRequest, setPayRequest] = useState<PayRequest | null>(null);
  const wizardRef = useRef<HTMLDivElement | null>(null);

  const accountList = accounts.data ?? [];
  const book = beneficiaries.data ?? [];

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (beneficiary: Beneficiary) => {
    setEditing(beneficiary);
    setDrawerOpen(true);
  };

  /** Upsert, so the drawer can serve both an edit and a new record. */
  const patchBook = (saved: Beneficiary) => {
    const known = book.some((item) => item.id === saved.id);
    beneficiaries.setData(
      known ? book.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...book],
    );
  };

  const dropFromBook = (id: string) => {
    beneficiaries.setData(book.filter((item) => item.id !== id));
    if (payRequest?.beneficiaryId === id) setPayRequest(null);
  };

  /** A fresh token every time, so asking twice for the same payee still lands. */
  const startPayment = (beneficiary: Beneficiary) => {
    setPayRequest({ beneficiaryId: beneficiary.id, token: Date.now() });
    wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onSent = (transfer: Transfer) => {
    // The balance, the history and the payee's last-used date all moved.
    accounts.refetch();
    transfers.refetch();
    beneficiaries.refetch();
    toast.success(
      transfer.status === 'completed' ? 'Payment settled' : 'Payment raised',
      `${transfer.beneficiaryName} · ${transfer.receiptNumber}`,
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Transfers"
        title="Send money"
        description="Raise a payment, keep the beneficiary book tidy, and pull a receipt for anything that has already gone out."
        actions={
          <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={openAdd}>
            Add beneficiary
          </Button>
        }
      />

      {accounts.error && accountList.length === 0 ? (
        <InlineAlert className="mb-4">
          Your accounts did not load, so a payment cannot be raised yet.{' '}
          <button type="button" className="underline" onClick={accounts.refetch}>
            Try again
          </button>
          .
        </InlineAlert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <div ref={wizardRef} className="xl:col-span-2">
          <Panel>
            <TransferWizard
              accounts={accountList}
              beneficiaries={book}
              loading={accounts.initialLoading || beneficiaries.initialLoading}
              payRequest={payRequest}
              onAddBeneficiary={openAdd}
              onSent={onSent}
            />
          </Panel>
        </div>

        <Panel as="aside">
          <BeneficiaryBook
            beneficiaries={book}
            loading={beneficiaries.loading}
            initialLoading={beneficiaries.initialLoading}
            error={beneficiaries.error}
            onRetry={beneficiaries.refetch}
            onAdd={openAdd}
            onEdit={openEdit}
            onPay={startPayment}
            onPatched={patchBook}
            onRemoved={dropFromBook}
          />
        </Panel>
      </div>

      <Panel className="mt-4">
        <TransferHistory
          transfers={transfers.data ?? []}
          accounts={accountList}
          beneficiaries={book}
          loading={transfers.loading}
          initialLoading={transfers.initialLoading}
          error={transfers.error}
          onRetry={transfers.refetch}
        />
      </Panel>

      <BeneficiaryDrawer
        open={drawerOpen}
        beneficiary={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={(saved) => {
          patchBook(saved);
          // A payee added mid-payment is almost always the one being paid.
          if (!editing) startPayment(saved);
        }}
      />
    </div>
  );
}
