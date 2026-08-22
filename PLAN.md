# NexaBank — Project Plan

A frontend-only enterprise digital banking portal, built as a portfolio piece.
No backend: a seeded mock data layer emulates a real API (latency, pagination,
server-side filtering, failure injection) so every loading, empty and error state
in the UI is genuine rather than decorative.

---

## 1. Product decisions

| Decision | Choice |
| --- | --- |
| Auth | Mock auth — email/password + 6-digit OTP, session persisted to `localStorage`. Anyone can clone and log in with no keys. |
| Data | Deterministic seeded generator (mulberry32 PRNG) → accounts, ~420 transactions across 14 months, cards, beneficiaries. Served through a fake async API. |
| Theming | Two hand-authored daisyUI themes, `nexadark` and `nexalight`, with a persisted switcher. |
| Scope | All five areas: Dashboard, Transactions, Cards, Transfers, Analytics — plus auth, settings, 404. |

Demo credentials: `ada@nexabank.io` / `nexa1234`, OTP `000000` (any 6 digits accepted).

---

## 2. Design direction

### The thesis

Banks have their own visual world, and it is not the world of SaaS dashboards. It
is **security printing**: intaglio-engraved banknotes, guilloché rosettes on share
certificates, foil-stamped card faces, ruled ledger paper, tabular figures set to
align to the penny. NexaBank borrows from that world instead of from other
dashboards.

### Signature element

**The guilloché position panel.** The primary account panel — and the face of every
card — carries a procedurally generated guilloché rosette, drawn as SVG from
epicycloid math (the same family of curves used as anti-counterfeiting engraving on
real currency). It is generated per account from a numeric seed, so each account has
its own unrepeatable engraving. It rotates once, very slowly, on mount, and holds
still for anyone with `prefers-reduced-motion`. Balances land with a digit roll,
like a teller's counter settling.

That is where the boldness is spent. Everything around it is hairline rules,
disciplined spacing, and right-aligned tabular numerals.

### Palette

Named from the subject, not from a swatch generator.

| Token | Dark (`nexadark`) | Light (`nexalight`) | Role |
| --- | --- | --- | --- |
| `engravers-ink` | `#0B1014` | — | Canvas |
| `vault-steel` | `#121A21` | — | Raised surface |
| `ledger-grey` | — | `#EDF0F3` | Canvas (cool, deliberately not cream) |
| `plate-white` | — | `#FFFFFF` | Raised surface |
| `intaglio-green` | `#2FBF8F` | `#0F7355` | Primary — credits, actions, brand |
| `copper-foil` | `#D98A4B` | `#B06427` | Secondary — cards, highlights, warnings |
| `sapphire-plate` | `#5B8DD9` | `#2B5FA8` | Third data series, informational |
| `seal-red` | `#E06A5C` | `#B4453A` | Debits, destructive, errors |

Credits are green, debits are red, and nothing else in the interface is allowed to
use those two hues. Money keeps the color; chrome stays neutral.

### Typography

Three roles, none of them the usual pick.

- **Display — Bodoni Moda.** A didone: literally the letterform of banknotes and
  stock certificates. Used with restraint — wordmark, page titles, the hero balance.
- **UI — Archivo.** A slightly narrow, sturdy grotesque. Carries labels, buttons,
  navigation, body copy. Chosen over Inter because Inter is the default everywhere.
- **Data — IBM Plex Mono.** Account numbers, references, timestamps, deltas.
  Anything that should read as a machine record.

All currency amounts run through `font-variant-numeric: tabular-nums` so columns
align down the page like a real statement.

### Layout

```
┌───────┬──────────────────────────────────────────────────────────────┐
│ RAIL  │ TOPBAR  search ⌘K │ account ▾ │ USD ▾ │ ☾ │ bell │ avatar    │
│ 240px ├──────────────────────────────────────────────────────────────┤
│       │ ┌── PRIMARY POSITION ───────────┬─ KPI ──┬─ KPI ──┬─ KPI ──┐ │
│ ⌂ Ove │ │  guilloché engraving          │ volume │ in     │ out    │ │
│ ▤ Txn │ │  $1,284,930.22                │ 1,204  │ +412k  │ −298k  │ │
│ ▭ Crd │ └───────────────────────────────┴────────┴────────┴────────┘ │
│ ⇄ Trf │ ┌── CASH FLOW · 12 months ──────────────┬── ALLOCATION ────┐ │
│ ◈ Anl │ └───────────────────────────────────────┴──────────────────┘ │
│       │ ┌── RECENT ACTIVITY (ledger) ───────────┬── SPEND BY CAT ──┐ │
│ ⚙ Set │ └───────────────────────────────────────┴──────────────────┘ │
└───────┴──────────────────────────────────────────────────────────────┘
```

Fixed left rail collapsing to icons at `lg`, replaced by a bottom tab bar plus
slide-over menu below `md`. Content grid is 12-column, `max-w-[1560px]`, generous
gutters, hairline `1px` borders instead of drop shadows. Structural labels are
small-caps eyebrows with a rule — they name the section, they do not decorate it.

---

## 3. Stack

- **Vite + React + TypeScript** (strict)
- **Tailwind CSS + daisyUI** — two custom themes, `data-theme` on `<html>`
- **React Router** — nested routes, layout routes, protected routes
- **Recharts** — area, bar, line, pie/donut, composed
- **React Hook Form + Zod** — transfer flow, beneficiaries, auth, settings
- **lucide-react** icons, **date-fns** dates, **clsx** class merging

No state library: React Context for auth, currency, theme and toasts; a hand-rolled
`useApi` hook for async reads with `loading / error / data / refetch`.

---

## 4. Architecture

```
src/
  main.tsx  ·  App.tsx  ·  router.tsx
  styles/theme.css              tailwind + daisyUI themes + tokens + keyframes
  types/                        domain models (Account, Transaction, Card, ...)
  mocks/
    prng.ts                     seeded deterministic random
    seed.ts                     builds the whole bank from one seed
    api.ts                      fake async API: latency, filters, pagination, errors
  lib/
    money.ts                    currency formatting + FX conversion
    dates.ts   csv.ts   cn.ts   guilloche.ts   masking.ts
  hooks/
    useApi.ts  useDebounce.ts  useLocalStorage.ts  useMediaQuery.ts
    useCountUp.ts  useKeyboardShortcut.ts
  providers/
    AuthProvider  CurrencyProvider  ThemeProvider  ToastProvider
  components/
    layout/     Shell, SideRail, TopBar, MobileNav, PageHeader
    ui/         Card, Button, Badge, StatusPill, Table, Pagination, Drawer,
                Dialog, Toast, Skeleton, EmptyState, ErrorState, Tabs,
                Select, DateRange, Stepper, OtpInput, Segmented, Sparkline
    charts/     AreaCashFlow, BarMonthlySpend, DonutCategory, LineTrend,
                ChartFrame (title + legend + empty/loading wrapper)
    brand/      Guilloche, Wordmark, CardFace, AmountRoll
  features/
    auth/  dashboard/  transactions/  cards/  transfers/  analytics/  settings/
  pages/                        route-level composition only
```

Rules the code follows: pages compose, features own logic, `components/ui` knows
nothing about banking. Every list view handles four states — loading, empty, error,
loaded. Every mutation is optimistic-free but confirmed: dialog → request → toast.

---

## 5. Build phases

1. Scaffold, themes, tokens, fonts, UI primitives
2. Mock data layer + fake API + formatters + hooks
3. App shell (rail, topbar, currency, theme, toasts, mobile nav)
4. Auth (login, signup, OTP, forgot, guards)
5. Dashboard
6. Transactions (filters, pagination, detail drawer)
7. Cards (carousel, freeze, limits, virtual card)
8. Transfers (multi-step, beneficiaries, OTP, receipt, history)
9. Analytics
10. Responsive + a11y + motion pass, README
11. Typecheck, build, screenshot review in both themes

---

## 6. What makes this read as senior work

Server-shaped pagination and filtering rather than client-side `.filter()` on a
fixed array. Failure injection so error states are provable. Currency conversion
that reformats every amount in the app from one selector. Money handled in integer
minor units, never floats. A domain type layer that the mock API and the UI both
compile against. Confirmation → request → toast on every state change, so no
destructive action is one click away.
