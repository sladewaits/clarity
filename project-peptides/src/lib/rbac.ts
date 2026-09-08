/**
 * Role-Based Access Control.
 *
 * Permissions are additive and role-scoped. The UI uses `can()` to gate
 * actions and nav; server actions must re-check with the same helper.
 * "Minimum necessary access" is a HIPAA principle — staff never inherit
 * provider-only clinical permissions.
 */
import type { Permission, RoleKey } from "./types";

export const ROLE_LABELS: Record<RoleKey, string> = {
  org_owner: "Organization Owner",
  provider: "Provider",
  clinic_staff: "Clinic Staff",
  pp_admin: "Project Peptides Admin",
};

export const ROLE_DESCRIPTIONS: Record<RoleKey, string> = {
  org_owner:
    "Full control over the organization: locations, team, pharmacies, billing, analytics, and permissions.",
  provider:
    "Clinical role. Manages patients, reviews products, creates prescription/order workflows, and selects pharmacies.",
  clinic_staff:
    "Administrative role. Onboards patients, monitors orders, communicates status, and accesses approved education.",
  pp_admin:
    "Platform operator. Manages clinic accounts, pharmacy integrations, catalog, pricing feeds, education, and compliance.",
};

const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  org_owner: [
    "org:manage",
    "org:billing",
    "locations:manage",
    "team:manage",
    "pharmacies:approve",
    "analytics:view",
    "patients:read",
    "orders:read",
    "orders:monitor",
    "education:read",
    "education:assign",
    "programs:manage",
    "support:create",
  ],
  provider: [
    "patients:read",
    "patients:write",
    "prescriptions:create",
    "prescriptions:review",
    "orders:read",
    "orders:create",
    "clinical:notes",
    "analytics:view",
    "education:read",
    "support:create",
  ],
  clinic_staff: [
    "patients:read",
    "patients:onboard",
    "orders:read",
    "orders:monitor",
    "education:read",
    "support:create",
  ],
  pp_admin: [
    "platform:admin",
    "platform:pharmacies",
    "platform:catalog",
    "platform:pricing",
    "platform:compliance",
    "analytics:view",
    "support:create",
  ],
};

export function permissionsFor(role: RoleKey): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function can(role: RoleKey, permission: Permission): boolean {
  return permissionsFor(role).includes(permission);
}

export function canAny(role: RoleKey, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}
