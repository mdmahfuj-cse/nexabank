/** Masking helpers. Sensitive digits stay hidden until someone asks for them. */

const DOT = '•';

/** "4821" → "•••• 4821" */
export function maskAccount(accountNumber: string, visible = 4): string {
  const digits = accountNumber.replace(/\s+/g, '');
  return `${DOT.repeat(4)} ${digits.slice(-visible)}`;
}

/** "4024 0071 3925 4821" → "•••• •••• •••• 4821" */
export function maskPan(pan: string): string {
  const groups = pan.split(' ');
  const last = groups[groups.length - 1];
  return `${Array(groups.length - 1).fill(DOT.repeat(4)).join(' ')} ${last}`;
}

/** Group an IBAN in fours for readability. */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

export function maskIban(iban: string): string {
  const compact = iban.replace(/\s+/g, '');
  return `${compact.slice(0, 4)} ${DOT.repeat(4)} ${DOT.repeat(4)} ${compact.slice(-4)}`;
}

/** "Ada Okonkwo" → "AO" */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** "ada@nexabank.io" → "a••@nexabank.io" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 1)}${DOT.repeat(Math.max(local.length - 1, 2))}@${domain}`;
}
