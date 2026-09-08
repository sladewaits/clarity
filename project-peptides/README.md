# Project Peptides — Clinic Operating System

**The operating system for modern longevity medicine.** One platform for
pharmacy connectivity, program operations, education, patient fulfillment, and
growth — built for cash-pay medical practices, med spas, longevity, hormone, and
regenerative-medicine clinics.

> Project Peptides is **not a pharmacy**. Licensed clinicians remain responsible
> for prescribing; licensed pharmacies remain responsible for compounding,
> dispensing, and shipping. This is a **demonstration MVP** with **fictional
> data** — no real authentication, database, payments, or pharmacy
> integrations. See [`docs/COMPLIANCE-READINESS.md`](./docs/COMPLIANCE-READINESS.md).

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
# or a production build:
npm run build && npm run start
```

No database or environment variables are required — the demo runs on an
in-memory mock dataset.

## The demo

- **Marketing site** — `/` (Platform, Pharmacy Network, Programs, Education, For
  Clinics, Security, About, Book a Demo)
- **Sign in** — `/login` (no credentials required → "Enter clinic demo")
- **Clinic app** — `/app` (Apex Longevity, Jacksonville FL)
- **Admin console** — `/admin` (Project Peptides platform operator view)

Suggested walkthrough: open the dashboard → search a product (`sermorelin`) →
compare pharmacies → pick a patient → create a simulated prescription → **Submit
Demo Order** → track fulfillment → open a patient record → view analytics →
browse education.

## Architecture

| Concern | Where | Notes |
| --- | --- | --- |
| Domain types | `src/lib/types.ts` | Shared contract; mirrors the Prisma schema |
| Service layer (normalized API) | `src/data/service.ts` | UI calls this, never the DB/adapters directly |
| Mock data provider | `src/data/mock.ts` | Deterministic fictional dataset (5 clinics, 12 locations, 15+ providers, 100 patients, 5 pharmacies, 40 products, 100+ orders) |
| Analytics | `src/data/metrics.ts` | Pure aggregation functions |
| RBAC | `src/lib/rbac.ts` | 4 roles, additive permissions, `can()` |
| Availability engine | `src/lib/availability.ts` | Per-transaction eligibility; blocks when unverifiable |
| Pharmacy adapters | `src/lib/pharmacy/` | Provider-neutral `PharmacyAdapter` + mock adapters |
| Auth adapter | `src/lib/auth.ts` | Auth0/Clerk-compatible interface |
| Canonical data model | `prisma/schema.prisma` | Production target (UUIDs, indexes, enums) |

**Swapping mock → production:** reimplement the functions in
`src/data/service.ts` against Prisma (`prisma/schema.prisma`). The UI depends
only on the service layer and `src/lib/types.ts`, so no pages change.

## Key product guarantees

- **Availability is never assumed.** The engine evaluates product regulatory
  status, pharmacy state coverage, 503A/503B pathway, and provider licensure per
  transaction. If eligibility can't be established, the transaction is blocked
  ("Availability requires verification").
- **Compounded retatrutide** is marked *Unavailable for Compounded Clinical
  Ordering* and cannot be ordered. Regulatory statuses are data-driven.
- **No fake integrations.** Prescriptions are simulated; adapter responses are
  flagged `simulated`; demo orders carry `isDemo`. No legal signatures are
  captured.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn-style component
primitives · Recharts · Framer Motion · Zod · Prisma (schema) · lucide-react.

## Roles

- **Organization Owner** — org, locations, team, pharmacies, billing, analytics.
- **Provider** — patients, products, prescription/order workflows, pharmacies,
  clinical notes.
- **Clinic Staff** — patient onboarding, order monitoring, education (no
  provider-only clinical permissions).
- **Project Peptides Admin** — clinics, pharmacies, catalog, pricing, education,
  compliance (the `/admin` console).
