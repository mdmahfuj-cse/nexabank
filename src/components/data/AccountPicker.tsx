import { Select } from '@/components/ui/Form';
import { cn } from '@/lib/cn';
import { maskAccount } from '@/lib/masking';
import type { Account } from '@/types/domain';

/**
 * Scope selector.
 *
 * Every figure on a page is either "all accounts" or one of them, and that
 * choice belongs in one control at the top rather than repeated per panel. The
 * masked number rides along with the name because two accounts can share one.
 */
export function AccountPicker({
  accounts,
  value,
  onChange,
  includeAll = true,
  label = 'Account',
  allLabel = 'All accounts',
  id = 'account-scope',
  className,
}: {
  accounts: Account[];
  value: string;
  onChange: (next: string) => void;
  includeAll?: boolean;
  label?: string;
  allLabel?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label htmlFor={id} className="eyebrow shrink-0 text-base-content/45">
        {label}
      </label>
      <Select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full text-[0.8rem] sm:w-64"
      >
        {includeAll ? <option value="all">{allLabel}</option> : null}
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} · {maskAccount(account.number)} · {account.currency}
          </option>
        ))}
      </Select>
    </div>
  );
}
