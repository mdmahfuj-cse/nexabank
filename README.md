# NexaBank

An enterprise-style digital banking portal, built as a frontend. It is the kind
of interface a commercial bank puts in front of a finance team rather than a
balance-and-transfer toy: five working areas, a mock API that behaves like a
network, and every screen written to survive the four states real data arrives
in — loading, empty, failed, settled.

There is no backend and no cloud project behind it. The data is a deterministic
seeded dataset served through a fake async API, which means anyone who clones
this repository sees exactly the same bank, and the demo cannot break because a
key expired.

---

## Try it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

Sign in with **any email address** and the password **`nexa1234`**, then enter
**any six digits** at the verification step. The two-factor screen is part of
the flow on purpose — a banking portal that logs you straight in does not look
like a banking portal.

Other scripts:

```bash
npm run typecheck   # tsc against the app config
npm run build       # typecheck, then a production build
npm run preview     # serve the build
```

Node 20 or newer.

---

## What is in it

**Dashboard.** Total position across five accounts, income and expense for the
selected range with period-on-period movement, a balance trend, spending by
category and the most recent movements. The range and the account scope are one
control each at the top, not repeated per panel.

**Transactions.** A server-shaped ledger: free-text search, date range presets
plus a custom range, direction, status, category, method and account filters,
sortable columns, pagination and page sizes, CSV export, and a detail drawer for
any row. Every filter lives in the URL, so a filtered view is a link you can
send to somebody.

**Cards.** A carousel of physical and virtual cards with the engraved plate
rendered in the browser, freeze and unfreeze, contactless, online and ATM
controls, monthly and per-transaction limits with utilisation, reveal-on-demand
card numbers that re-mask themselves after twenty seconds, virtual card issuance,
and a per-card ledger with its own six-month spending chart.

**Transfers.** A four-step payment: details, review, verification, receipt. The
amount is entered in the beneficiary's currency, the fee and the debit are quoted
in the account's, and the shortfall check runs against available rather than
book balance. The beneficiary book sits beside the form — searchable, favourites
pinned, add and edit in one drawer, SWIFT required the moment a payment becomes
cross-border. Every completed payment files a receipt you can download.

**Analytics.** Cash flow with money in above the line and money out below it,
category distribution, a thirty-day trend that separates volume from payment
count, monthly outgoings, and six financial KPIs including burn rate and runway.
Scope by account, and by six, twelve or twenty-four months.

**Throughout.** Display currency across USD, EUR, GBP, JPY and BDT; light and
dark themes that persist; toasts, confirmation dialogs and inline validation;
a bottom bar on phones and a fixed rail on desktop.

### Demo controls

The flask icon in the top bar dials the mock network: response time and failure
rate. Turn failures on and the retry paths, error panels and rollback behaviour
become visible — they are the parts of a real frontend that usually go
undemonstrated because a local demo never fails.

---

## How it is built

React 19, TypeScript, Vite 6, Tailwind CSS v4 with daisyUI v5, React Router 7,
Recharts, React Hook Form with Zod, date-fns and lucide-react. No state
management library and no data-fetching library.

**The mock API pretends to be a network.** `src/mocks/api.ts` takes time to
respond, can be told to fail, and does its work on its side of the wire:
filtering, sorting and pagination all happen there, so components are written
exactly as they would be against a real service. Swapping the file for `fetch`
calls would not change a single page.

**Money is integers.** Every amount travels as minor units — cents, pence, yen —
and conversion happens once, at the display edge, through a single helper.
Aggregate endpoints normalise to USD minor units and the currency provider
restates them, which is why switching currency does not trigger a refetch.

**Reporting converts; instruments do not.** The dashboard, ledger, cards and
analytics screens all format through the display currency. Transfers do not: a
payment instruction and a receipt stay in the currency they were made in,
because a document that reads differently depending on a dropdown is not a
receipt.

**Four states, everywhere.** `useApi` returns `loading`, `initialLoading`,
`error` and `data`. First load draws a skeleton shaped like the content it stands
in for; a refetch dims the existing content instead of blanking it, so the page
never loses your place. Errors say what happened and offer the retry.

**The URL is the state.** Transactions derives its filters from
`useSearchParams` rather than mirroring them into React state, which removes the
class of bug where the two disagree.

**Optimistic where it is safe.** Card controls and beneficiary favourites apply
immediately and roll back with a toast if the call fails. Anything that moves
money does not: it goes through confirmation and verification first.

**Accessibility and motion.** One skip link, labelled controls, focus returned
when overlays close, escape closes everything, `aria-live` on toasts, and tabular
numerals so figures align in columns. Every animation is disabled under
`prefers-reduced-motion`.

### Design

The visual signature is engraving: guilloché rosettes generated as SVG paths
from a seeded PRNG, hairline rules instead of drop shadows, and surfaces that
read like plates on a press sheet rather than floating cards. Bodoni Moda for
display, Archivo for the interface, IBM Plex Mono for every figure. Two custom
daisyUI themes, `nexadark` and `nexalight`, defined in `src/styles/theme.css`
alongside the handful of `@utility` classes the design leans on.

### Structure

```
src/
  components/
    brand/     wordmark, guilloché, card face, amount roll
    charts/    Recharts wrappers over one shared theme and frame
    data/      ledger, drawers, stat tiles, receipt, pickers
    layout/    shell, rail, top bar, bottom bar, page header
    transfers/ payment wizard, beneficiary book, history
    ui/        buttons, forms, overlays, badges, table, toast, popover
  hooks/       useApi, useDebounce, useLocalStorage, useMediaQuery, useCountUp
  lib/         money, dates, csv, masking, taxonomy, guilloché geometry
  mocks/       seeded PRNG, dataset, API
  pages/       five app pages plus the auth flow
  providers/   auth, currency, theme, toast, confirm
  routes/      guards and the router error boundary
```

`PLAN.md` holds the architecture and design plan the build followed.

---

## What it deliberately is not

The authentication is theatre: the session is a record in `localStorage`, the
password check is a string comparison, and the OTP accepts any six digits.
Nothing here is a security model, and no real credential should ever be typed
into it.

There is no persistence beyond the current tab — reload and the seeded bank
returns to its opening position, which is the right behaviour for something
anyone can open and click through. There are no automated tests and no linter
configured; the type checker is the safety net.

The exchange rates are static and indicative. Every name, number, account and
balance is synthetic.

---

Built by Mahfuj as a portfolio piece. MIT licensed — take any part of it.
