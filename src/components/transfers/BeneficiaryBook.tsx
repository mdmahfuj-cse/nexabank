import { useMemo, useState } from 'react';
import { Pencil, Star, Trash2, UserPlus } from 'lucide-react';
import { PanelBody, PanelHeader } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/Controls';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/Feedback';
import { useConfirm } from '@/providers/ConfirmProvider';
import { useToast } from '@/providers/ToastProvider';
import { api } from '@/mocks/api';
import { cn } from '@/lib/cn';
import { maskAccount } from '@/lib/masking';
import { fmtRelative } from '@/lib/dates';
import { BENEFICIARY_KINDS } from '@/lib/taxonomy';
import type { Beneficiary } from '@/types/domain';

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Try again in a moment.';

/** Two letters from a name, for the row marker. */
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || '—';

/**
 * The saved payees.
 *
 * Ordered favourites first, then by how recently they were paid — the list a
 * person actually reaches for, rather than the alphabet.
 */
export function BeneficiaryBook({
  beneficiaries,
  loading,
  initialLoading,
  error,
  onRetry,
  onAdd,
  onEdit,
  onPay,
  onPatched,
  onRemoved,
}: {
  beneficiaries: Beneficiary[];
  loading: boolean;
  initialLoading: boolean;
  error?: Error | undefined;
  onRetry: () => void;
  onAdd: () => void;
  onEdit: (beneficiary: Beneficiary) => void;
  onPay: (beneficiary: Beneficiary) => void;
  onPatched: (beneficiary: Beneficiary) => void;
  onRemoved: (id: string) => void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matches = needle
      ? beneficiaries.filter((item) =>
          [item.name, item.nickname ?? '', item.bank, item.accountNumber, item.country]
            .join(' ')
            .toLowerCase()
            .includes(needle),
        )
      : beneficiaries.slice();

    return matches.sort((a, b) => {
      if (a.favourite !== b.favourite) return a.favourite ? -1 : 1;
      const aUsed = a.lastUsedAt ?? '';
      const bUsed = b.lastUsedAt ?? '';
      if (aUsed !== bUsed) return bUsed.localeCompare(aUsed);
      return a.name.localeCompare(b.name);
    });
  }, [beneficiaries, search]);

  const toggleFavourite = async (beneficiary: Beneficiary) => {
    const next = !beneficiary.favourite;
    onPatched({ ...beneficiary, favourite: next });
    try {
      onPatched(await api.updateBeneficiary(beneficiary.id, { favourite: next }));
    } catch (error_) {
      onPatched(beneficiary);
      toast.error('That did not save', errorMessage(error_));
    }
  };

  const remove = async (beneficiary: Beneficiary) => {
    const confirmed = await confirm({
      title: `Remove ${beneficiary.name}?`,
      description:
        'Payments already sent keep their receipts. You can add this payee again at any time.',
      confirmLabel: 'Remove payee',
      danger: true,
    });
    if (!confirmed) return;

    setBusyId(beneficiary.id);
    try {
      await api.deleteBeneficiary(beneficiary.id);
      onRemoved(beneficiary.id);
      toast.success('Payee removed', `${beneficiary.name} · ${beneficiary.bank}`);
    } catch (error_) {
      toast.error('That could not be removed', errorMessage(error_));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PanelHeader
        eyebrow="Beneficiary book"
        title="Payees"
        description={
          beneficiaries.length > 0
            ? `${beneficiaries.length} saved · ${
                beneficiaries.filter((item) => item.favourite).length
              } pinned`
            : undefined
        }
        actions={
          <IconButton label="Add a beneficiary" variant="quiet" onClick={onAdd}>
            <UserPlus className="size-4" />
          </IconButton>
        }
      />

      {error && beneficiaries.length === 0 ? (
        <ErrorState title="The book did not load" error={error} onRetry={onRetry} />
      ) : initialLoading ? (
        <SkeletonRows rows={5} columns={3} />
      ) : beneficiaries.length === 0 ? (
        <EmptyState
          title="The book is empty"
          description="Add the people and businesses you pay and they will be one tap away."
          icon={<UserPlus className="size-5" />}
          action={
            <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={onAdd}>
              Add a beneficiary
            </Button>
          }
        />
      ) : (
        <>
          <PanelBody className="border-b border-base-300 !py-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search payees, banks, accounts"
              aria-label="Search beneficiaries"
            />
          </PanelBody>

          {rows.length === 0 ? (
            <EmptyState
              title="No payees match"
              description={`Nothing in the book matches “${search.trim()}”.`}
              action={
                <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <ul
              className={cn(
                'max-h-[32rem] divide-y divide-[var(--rule)] overflow-y-auto transition-opacity',
                loading && !initialLoading && 'opacity-55',
              )}
            >
              {rows.map((item) => {
                const kind = BENEFICIARY_KINDS[item.kind];
                const busy = busyId === item.id;

                return (
                  <li
                    key={item.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-base-200/40 sm:px-5',
                      busy && 'pointer-events-none opacity-45',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="amount mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border border-base-300 bg-base-200/60 font-mono text-[0.7rem] text-base-content/60"
                    >
                      {initialsOf(item.name)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onPay(item)}
                        className="flex max-w-full items-center gap-2 text-left"
                      >
                        <span className="truncate text-sm font-medium underline-offset-4 hover:underline">
                          {item.nickname ?? item.name}
                        </span>
                        <Badge tone={kind.tone} className="shrink-0">
                          {kind.label}
                        </Badge>
                      </button>

                      <p className="mt-0.5 truncate text-xs text-base-content/55">
                        {item.bank} ·{' '}
                        <span className="amount font-mono">
                          {maskAccount(item.accountNumber)}
                        </span>{' '}
                        · {item.currency}
                      </p>
                      <p className="mt-0.5 truncate text-[0.7rem] text-base-content/40">
                        {item.lastUsedAt
                          ? `Last paid ${fmtRelative(item.lastUsedAt)}`
                          : 'Not paid yet'}
                        {item.nickname ? ` · ${item.name}` : ''}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center">
                      <IconButton
                        label={
                          item.favourite
                            ? `Unpin ${item.name} from favourites`
                            : `Pin ${item.name} to favourites`
                        }
                        aria-pressed={item.favourite}
                        onClick={() => void toggleFavourite(item)}
                      >
                        <Star
                          className={cn(
                            'size-4',
                            item.favourite && 'fill-warning text-warning',
                          )}
                        />
                      </IconButton>
                      <IconButton
                        label={`Edit ${item.name}`}
                        onClick={() => onEdit(item)}
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label={`Remove ${item.name}`}
                        className="hover:text-error"
                        onClick={() => void remove(item)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </>
  );
}
