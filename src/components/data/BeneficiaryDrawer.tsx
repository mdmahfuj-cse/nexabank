import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Drawer } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { ChoiceGroup, Field, Input, Select, Toggle } from '@/components/ui/Form';
import { InlineAlert } from '@/components/ui/Feedback';
import { useToast } from '@/providers/ToastProvider';
import { api } from '@/mocks/api';
import { BENEFICIARY_KINDS, BENEFICIARY_KIND_KEYS } from '@/lib/taxonomy';
import { CURRENCIES, CURRENCY_CODES } from '@/lib/money';
import type { Beneficiary, BeneficiaryKind, CurrencyCode } from '@/types/domain';

/** Non-empty tuples, so the enums stay tied to the domain lists. */
const currencyValues = CURRENCY_CODES as [CurrencyCode, ...CurrencyCode[]];
const kindValues = BENEFICIARY_KIND_KEYS as [BeneficiaryKind, ...BeneficiaryKind[]];

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter the name on the receiving account'),
    nickname: z.string().trim().max(24, 'Keep the nickname under 24 characters'),
    bank: z.string().trim().min(2, 'Enter the receiving bank'),
    accountNumber: z
      .string()
      .trim()
      .min(6, 'Account numbers are at least six characters')
      .max(34, 'That is longer than an IBAN'),
    swift: z.string().trim(),
    country: z.string().trim().min(2, 'Enter the country'),
    currency: z.enum(currencyValues),
    kind: z.enum(kindValues),
    favourite: z.boolean(),
  })
  .superRefine((values, context) => {
    // A cross-border payment without a BIC is a payment that gets returned, so
    // the requirement appears the moment the rail is chosen — not on submit.
    if (values.kind === 'international' && !/^[A-Za-z0-9]{8,11}$/.test(values.swift)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['swift'],
        message: 'International payments need an 8–11 character SWIFT/BIC.',
      });
    }
  });

type Values = z.infer<typeof schema>;

const BLANK: Values = {
  name: '',
  nickname: '',
  bank: '',
  accountNumber: '',
  swift: '',
  country: '',
  currency: 'USD',
  kind: 'domestic',
  favourite: false,
};

const FORM_ID = 'beneficiary-form';

/**
 * Add or edit a beneficiary.
 *
 * One drawer for both, because the fields are identical and a separate "edit"
 * screen is how the two drift apart. Passing a beneficiary puts it in edit mode.
 */
export function BeneficiaryDrawer({
  open,
  beneficiary,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Present for an edit, absent for a new record. */
  beneficiary?: Beneficiary | null;
  onClose: () => void;
  onSaved: (saved: Beneficiary) => void;
}) {
  const toast = useToast();
  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: BLANK });

  const kind = watch('kind');
  const favourite = watch('favourite');
  const currency = watch('currency');
  const editing = Boolean(beneficiary);

  // Opening the drawer is what loads the record, so a cancelled edit leaves no
  // half-typed state behind for the next one.
  useEffect(() => {
    if (!open) return;
    setFailure(null);
    reset(
      beneficiary
        ? {
            name: beneficiary.name,
            nickname: beneficiary.nickname ?? '',
            bank: beneficiary.bank,
            accountNumber: beneficiary.accountNumber,
            swift: beneficiary.swift ?? '',
            country: beneficiary.country,
            currency: beneficiary.currency,
            kind: beneficiary.kind,
            favourite: beneficiary.favourite,
          }
        : BLANK,
    );
  }, [open, beneficiary, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);

    const payload = {
      name: values.name,
      nickname: values.nickname ? values.nickname : undefined,
      bank: values.bank,
      accountNumber: values.accountNumber,
      swift: values.kind === 'international' ? values.swift.toUpperCase() : undefined,
      country: values.country,
      currency: values.currency,
      kind: values.kind,
      favourite: values.favourite,
    };

    try {
      const saved = beneficiary
        ? await api.updateBeneficiary(beneficiary.id, payload)
        : await api.createBeneficiary(payload);

      onSaved(saved);
      toast.success(
        editing ? 'Beneficiary updated' : 'Beneficiary saved',
        `${saved.name} · ${saved.bank}`,
      );
      onClose();
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : 'The beneficiary could not be saved.',
      );
    }
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={editing ? 'Edit beneficiary' : 'New beneficiary'}
      title={editing ? (beneficiary?.name ?? 'Beneficiary') : 'Add a beneficiary'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Save beneficiary'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        {failure ? <InlineAlert className="mb-5">{failure}</InlineAlert> : null}

        <Field label="Rail" hint={BENEFICIARY_KINDS[kind].description}>
          <ChoiceGroup
            name="Rail"
            columns={1}
            value={kind}
            onChange={(next) => setValue('kind', next, { shouldValidate: true })}
            options={BENEFICIARY_KIND_KEYS.map((key) => ({
              value: key,
              label: BENEFICIARY_KINDS[key].label,
              description: BENEFICIARY_KINDS[key].description,
            }))}
          />
        </Field>

        <Field label="Account name" htmlFor="ben-name" error={errors.name?.message}>
          <Input
            id="ben-name"
            placeholder="Meridian Logistics Ltd"
            invalid={Boolean(errors.name)}
            {...register('name')}
          />
        </Field>

        <Field
          label="Nickname"
          htmlFor="ben-nickname"
          optional
          hint="What you call them, if it is not the legal name."
          error={errors.nickname?.message}
        >
          <Input
            id="ben-nickname"
            placeholder="Freight"
            invalid={Boolean(errors.nickname)}
            {...register('nickname')}
          />
        </Field>

        <Field label="Bank" htmlFor="ben-bank" error={errors.bank?.message}>
          <Input
            id="ben-bank"
            placeholder="Sterling Union Bank"
            invalid={Boolean(errors.bank)}
            {...register('bank')}
          />
        </Field>

        <Field
          label="Account number or IBAN"
          htmlFor="ben-account"
          error={errors.accountNumber?.message}
        >
          <Input
            id="ben-account"
            className="amount font-mono"
            placeholder="GB29 NWBK 6016 1331 9268 19"
            invalid={Boolean(errors.accountNumber)}
            {...register('accountNumber')}
          />
        </Field>

        {kind === 'international' ? (
          <Field
            label="SWIFT / BIC"
            htmlFor="ben-swift"
            error={errors.swift?.message}
            hint="Eight or eleven characters, from their bank."
          >
            <Input
              id="ben-swift"
              className="amount font-mono uppercase"
              placeholder="NWBKGB2L"
              maxLength={11}
              invalid={Boolean(errors.swift)}
              {...register('swift')}
            />
          </Field>
        ) : null}

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="Country" htmlFor="ben-country" error={errors.country?.message}>
            <Input
              id="ben-country"
              placeholder="United Kingdom"
              invalid={Boolean(errors.country)}
              {...register('country')}
            />
          </Field>

          <Field
            label="Currency"
            htmlFor="ben-currency"
            hint={`They receive ${CURRENCIES[currency].name.toLowerCase()}.`}
          >
            <Select id="ben-currency" {...register('currency')}>
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code} · {CURRENCIES[code].name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Toggle
          checked={favourite}
          onChange={(next) => setValue('favourite', next)}
          label="Pin to favourites"
          description="Favourites sit at the top of the book and in the quick-pay row."
        />
      </form>
    </Drawer>
  );
}
