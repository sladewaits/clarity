# Compliance Readiness — Project Peptides

**Project Peptides is not HIPAA compliant today, and this MVP must not be used
with real PHI.** The presence of security-oriented features (RBAC, audit-log
architecture, PHI-safe logging patterns) does **not** by itself constitute
compliance. This document is an honest accounting of what exists and what
remains.

## What Project Peptides is — and is not

- Project Peptides is a **technology, education, workflow, and connectivity
  layer**. It is **not a pharmacy**.
- **Licensed clinicians** remain responsible for clinical decision-making and
  prescribing.
- **Licensed pharmacies** remain responsible for compounding, dispensing,
  labeling, shipping, and pharmacy compliance.
- The platform does not provide medical protocols or dosing recommendations.
  Clinical content is placeholder pending medical review and approval.

## Current status (MVP)

| Area | Status | Notes |
| --- | --- | --- |
| RBAC & minimum-necessary access | ✅ Implemented | `src/lib/rbac.ts` |
| Availability / jurisdiction engine | ✅ Implemented | `src/lib/availability.ts` |
| Pharmacy adapter boundary | ✅ Implemented (mock) | `src/lib/pharmacy/` |
| Audit log data model | ✅ Modeled | `prisma/schema.prisma` (`AuditLog`) |
| PHI-safe logging pattern | ✅ Documented | metadata stores references, not PHI |
| Authentication | ⚠️ Adapter only | No real auth; wire Auth0/Clerk |
| Database & encryption at rest | ⚠️ Schema only | Demo uses in-memory mock data |
| Encryption in transit | ⚠️ Deployment concern | TLS at the edge |
| Real e-prescribing / transmission | ❌ Not implemented | Simulated only |
| Payments | ❌ Not implemented | Stripe abstraction only |
| Credential verification source | ❌ Not implemented | Self-reported; architecture ready to ingest authoritative sources |

## Required before production use with PHI

1. **Business Associate Agreements (BAAs)** — execute BAAs with every
   subprocessor that touches PHI (hosting, database, logging, email, analytics,
   auth provider, pharmacy integrations).
2. **Authentication & session security** — connect Auth0/Clerk via the
   `AuthAdapter`; enforce MFA, session expiry, and device/session revocation.
3. **Encryption** — TLS 1.2+ in transit; encryption at rest for database,
   backups, and object storage; managed keys (KMS).
4. **Audit logging** — wire the `AuditLog` model to every PHI read/write and
   administrative action; ship immutable, retained audit trails.
5. **Data retention & deletion** — implement retention schedules and verified
   deletion / de-identification workflows.
6. **Access reviews** — periodic review of user access, credential status, and
   location scoping.
7. **PHI-safe logging in practice** — verify no PHI reaches application logs,
   error trackers, or analytics; scrub and test.
8. **Real integrations** — implement compliant e-prescribing / pharmacy vendor
   adapters (`PharmacyAdapter`), credential verification from authoritative
   sources, and Stripe billing — none may be faked.
9. **Risk analysis & policies** — HIPAA Security Rule risk analysis, written
   policies/procedures, workforce training, incident response, and breach
   notification processes.
10. **Penetration testing & monitoring** — third-party pen test, vulnerability
    management, and runtime security monitoring/alerting.

## Guardrails already enforced in code

- The regulatory availability engine **blocks** transactions that cannot be
  positively established as eligible.
- Compounded **retatrutide** is explicitly marked *Unavailable for Compounded
  Clinical Ordering* and cannot be ordered; product/regulatory statuses are
  data-driven so they can change without code changes.
- No fake legal signatures are ever captured; no demo prescription is claimed to
  have been transmitted.
