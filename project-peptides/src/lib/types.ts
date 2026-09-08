/**
 * Project Peptides — Core domain types.
 *
 * These mirror the Prisma schema in /prisma/schema.prisma. The application
 * talks to a service layer (src/data/service.ts) typed against these
 * interfaces, so the mock provider used for the demo can be swapped for a
 * Prisma-backed provider without touching UI code.
 */

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------

export type RoleKey =
  | "org_owner"
  | "provider"
  | "clinic_staff"
  | "pp_admin";

export type Permission =
  // organization
  | "org:manage"
  | "org:billing"
  | "locations:manage"
  | "team:manage"
  | "pharmacies:approve"
  | "analytics:view"
  // clinical
  | "patients:read"
  | "patients:write"
  | "prescriptions:create"
  | "prescriptions:review"
  | "orders:read"
  | "orders:create"
  | "clinical:notes"
  // staff/admin
  | "patients:onboard"
  | "orders:monitor"
  | "education:read"
  | "education:assign"
  | "programs:manage"
  | "support:create"
  // platform admin
  | "platform:admin"
  | "platform:pharmacies"
  | "platform:catalog"
  | "platform:pricing"
  | "platform:compliance";

// ---------------------------------------------------------------------------
// Regulatory / pharmacy pathway
// ---------------------------------------------------------------------------

export type PharmacyType = "503A" | "503B";
export type OrderPathway = "patient_specific" | "clinic_supply";
export type Route = "SubQ" | "IM" | "IV" | "Oral" | "Nasal" | "Topical" | "Sublingual";
export type DosageForm =
  | "Injectable"
  | "Capsule"
  | "Tablet"
  | "Nasal Spray"
  | "Troche"
  | "Cream"
  | "Solution";

/** Regulatory / ordering status attached to a canonical product. */
export type RegulatoryStatus =
  | "available"
  | "restricted"
  | "not_available_compounded"
  | "verification_required";

export type IntegrationStatus =
  | "connected"
  | "manual"
  | "pending"
  | "unavailable";

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: PlanKey;
  createdAt: string;
  locationIds: string[];
}

export interface Location {
  id: string;
  orgId: string;
  name: string;
  city: string;
  state: string; // 2-letter
  addressLine: string;
  phone: string;
  activePatients: number;
  monthlyRevenueCents: number;
}

export interface User {
  id: string;
  orgId: string | null; // null for PP admins
  name: string;
  email: string;
  role: RoleKey;
  title?: string;
  locationIds: string[];
  npi?: string;
  licenseStates?: string[];
  credentialStatus?: "verified" | "pending" | "expired";
  active: boolean;
}

export interface Patient {
  id: string;
  orgId: string;
  locationId: string;
  firstName: string;
  lastName: string;
  dob: string;
  sex: "M" | "F" | "X";
  email: string;
  phone: string;
  state: string;
  programId: string | null;
  providerId: string;
  status: "active" | "onboarding" | "paused" | "inactive";
  lastOrderAt: string | null;
  nextFollowUpAt: string | null;
  preferredPharmacyId: string | null;
  createdAt: string;
}

export interface PharmacyCredential {
  id: string;
  label: string;
  authority: string; // e.g. "State Board of Pharmacy"
  status: "verified" | "pending" | "expired";
  lastVerifiedAt: string;
  documentUrl?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  type: PharmacyType;
  pathway: OrderPathway;
  blurb: string;
  statesServed: string[];
  productCategories: string[];
  typicalFulfillmentDays: [number, number];
  shippingOptions: string[];
  integrationStatus: IntegrationStatus;
  orderingMethod: "API" | "Portal" | "Fax" | "EDI";
  supportEmail: string;
  supportPhone: string;
  credentials: PharmacyCredential[];
  lastCredentialCheck: string;
  adapterKey: string; // maps to a PharmacyAdapter implementation
}

export interface CanonicalProduct {
  id: string;
  name: string; // canonical display, e.g. "Sermorelin"
  category: string;
  aliases: string[];
  defaultRoute: Route;
  defaultForm: DosageForm;
  strengths: string[]; // e.g. ["5 mg", "10 mg"]
  regulatoryStatus: RegulatoryStatus;
  regulatoryNote?: string;
  requiresPrescription: boolean;
  summary: string;
  educationModuleId?: string;
}

export interface PharmacyProduct {
  id: string;
  canonicalProductId: string;
  pharmacyId: string;
  pharmacyName: string; // pharmacy's own label, e.g. "Sermorelin Acetate 5MG"
  type: PharmacyType;
  pathway: OrderPathway;
  strength: string;
  form: DosageForm;
  route: Route;
  priceCents: number;
  shippingCents: number;
  fulfillmentDays: [number, number];
  statesAvailable: string[]; // subset where this SKU can be dispensed
  inStock: boolean;
}

export interface Program {
  id: string;
  orgId: string;
  name: string;
  category: string;
  description: string;
  color: string;
  status: "active" | "draft";
  enrolledPatients: number;
  monthlyPriceCents: number;
  productIds: string[]; // canonical product ids
  providerIds: string[];
  requiredLabs: string[];
  followUpCadence: string;
  educationModuleIds: string[];
  kpis: { label: string; value: string; delta?: string }[];
}

export type OrderStatus =
  | "draft"
  | "provider_review"
  | "submitted"
  | "accepted"
  | "processing"
  | "compounding"
  | "quality_review"
  | "shipped"
  | "delivered"
  | "exception"
  | "cancelled";

export interface OrderEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  ref: string; // human ref e.g. RX-10432
  orgId: string;
  locationId: string;
  patientId: string;
  providerId: string;
  pharmacyId: string;
  pathway: OrderPathway;
  type: PharmacyType;
  canonicalProductId: string;
  pharmacyProductId: string;
  strength: string;
  form: DosageForm;
  route: Route;
  directions: string;
  quantity: number;
  refills: number;
  priceCents: number;
  shippingCents: number;
  status: OrderStatus;
  isDemo: boolean;
  trackingCarrier?: string;
  trackingNumber?: string;
  timeline: OrderEvent[];
  createdAt: string;
}

export interface EducationModule {
  id: string;
  title: string;
  category: string;
  durationMin: number;
  description: string;
  version: string;
  lastReviewedAt: string;
  reviewer: string;
  audience: ("provider" | "staff" | "patient")[];
}

export interface EducationCompletion {
  id: string;
  moduleId: string;
  userId: string;
  status: "assigned" | "in_progress" | "completed";
  completedAt: string | null;
  certificateExpiresAt: string | null;
}

export interface SupportTicket {
  id: string;
  ref: string;
  orgId: string;
  subject: string;
  category:
    | "order"
    | "pharmacy"
    | "fulfillment"
    | "platform"
    | "billing"
    | "program"
    | "general";
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_progress" | "waiting" | "resolved";
  assignee: string; // PP rep
  relatedOrderId?: string;
  relatedPatientId?: string;
  createdAt: string;
  updatedAt: string;
  messages: { author: string; role: "clinic" | "pp"; body: string; at: string }[];
}

export interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  at: string;
}

export interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  detail: string;
  at: string;
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export type PlanKey = "founding" | "growth" | "enterprise";

export interface Plan {
  key: PlanKey;
  name: string;
  priceCents: number | null; // null = custom
  cadence: "month";
  tagline: string;
  features: string[];
  seatLimit: number | null;
  locationLimit: number | null;
}

export interface Invoice {
  id: string;
  orgId: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  amountCents: number;
  status: "paid" | "open" | "void";
}

// ---------------------------------------------------------------------------
// Availability engine result
// ---------------------------------------------------------------------------

export interface AvailabilityContext {
  canonicalProductId: string;
  pharmacyId: string;
  patientState?: string;
  clinicState?: string;
  providerLicenseStates?: string[];
  pathway: OrderPathway;
}

export interface AvailabilityResult {
  eligible: boolean;
  status: "eligible" | "blocked" | "verification_required";
  reasons: string[];
  code:
    | "OK"
    | "REGULATORY_STATUS"
    | "PHARMACY_STATE"
    | "PROVIDER_LICENSE"
    | "PATHWAY_UNSUPPORTED"
    | "OUT_OF_STOCK"
    | "UNVERIFIED";
}
