# Security Architecture — Project Peptides

Project Peptides handles Protected Health Information (PHI) and is designed as
healthcare infrastructure. This document describes the security architecture of
the platform and its current implementation status in this MVP.

> **This MVP is a demonstration.** It ships with fictional data and no real
> authentication, database, payment, or pharmacy integrations. The controls
> below describe the intended production architecture. See
> [`COMPLIANCE-READINESS.md`](./COMPLIANCE-READINESS.md) for what remains before
> production use.

## Identity & access

- **Authentication** — provider-neutral `AuthAdapter` interface
  (`src/lib/auth.ts`), designed to be satisfied by **Auth0** or **Clerk** (or a
  custom OIDC provider). The demo uses a static session; no credentials are
  validated.
- **Role-Based Access Control** — four roles (`org_owner`, `provider`,
  `clinic_staff`, `pp_admin`) with additive, role-scoped permissions
  (`src/lib/rbac.ts`). Navigation and actions are gated with `can()`/`canAny()`.
- **Minimum necessary access** — a HIPAA principle enforced in the permission
  model: Clinic Staff never inherit provider-only clinical permissions
  (`clinical:notes`, `prescriptions:*`). Location-scoped access is modeled via
  `LocationMembership` so location managers see only authorized locations.
- **Server-side enforcement** — RBAC checks must be re-evaluated in server
  actions/route handlers, never trusted from the client alone.

## Data protection

- **Encryption in transit** — TLS everywhere (target: HSTS, TLS 1.2+).
- **Encryption at rest** — database and object storage encryption (target).
- **PHI-safe logging** — logs must never contain PHI. The `AuditLog.metadata`
  field is documented to store references (ids), never PHI values.
- **Secret management** — secrets via environment/secret manager
  (`DATABASE_URL`, provider keys). No secrets are committed. `.env.example`
  documents required variables.

## Auditability

- **Audit logging** — `AuditLog` captures actor, action, entity, and timestamp
  for sensitive operations (patient view, order create, credential changes).
- **User access history** — modeled as audit events keyed by `actorId`.
- **Credential status** — provider credential status (`User.credentialStatus`)
  and pharmacy credential status (`PharmacyCredential.status`) are first-class
  and surfaced in the UI.

## Regulatory / jurisdiction controls

- **Availability engine** (`src/lib/availability.ts`) evaluates every
  transaction against product regulatory status, pharmacy state coverage,
  ordering pathway (503A/503B), and provider licensure. If eligibility cannot be
  positively established, the transaction is **blocked** and the UI displays
  "Availability requires verification."
- The platform **never** infers legality from the fact that a pharmacy lists a
  product.

## Pharmacy integration boundary

- All pharmacy communication goes through the provider-neutral
  `PharmacyAdapter` interface (`src/lib/pharmacy/adapter.ts`). The rest of the
  app talks only to the normalized Project Peptides service layer
  (`src/data/service.ts`).
- No real prescriptions are transmitted in the MVP. Adapter acknowledgements are
  marked `simulated: true`, and demo orders carry `isDemo`.

## Data handling in the MVP

- All data is **fictional**. No real patient, provider, pharmacy, or pricing
  data is used.
- Nothing is persisted server-side in the demo (mock data is in-memory);
  interactive actions (prescribe, support replies) are simulated client-side.
