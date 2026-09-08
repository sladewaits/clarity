/**
 * Project Peptides service layer — the normalized internal API.
 *
 * UI/pages call these functions; they never import the mock dataset or a
 * pharmacy adapter directly. To move to a real database, reimplement these
 * functions against Prisma (see /prisma/schema.prisma) — signatures stay the
 * same, so no UI changes are required.
 */
import { evaluateAvailability } from "@/lib/availability";
import type {
  AvailabilityContext,
  AvailabilityResult,
  CanonicalProduct,
  Order,
  Patient,
  Pharmacy,
  PharmacyProduct,
  User,
} from "@/lib/types";
import { db, DEMO } from "./mock";

// --- session (demo) ----------------------------------------------------------
export const CURRENT_ORG_ID = DEMO.orgId;

export function getCurrentOrg() {
  return db.organizations.find((o) => o.id === CURRENT_ORG_ID)!;
}

/** The signed-in demo user. In production this comes from the auth adapter. */
export function getCurrentUser(): User {
  return db.users.find((u) => u.id === `usr_owner_${CURRENT_ORG_ID}`)!;
}

export function getUser(id: string) {
  return db.users.find((u) => u.id === id);
}

export function getTeam(orgId = CURRENT_ORG_ID) {
  return db.users.filter((u) => u.orgId === orgId);
}

export function getProviders(orgId = CURRENT_ORG_ID) {
  return db.users.filter((u) => u.orgId === orgId && u.role === "provider");
}

export function getLocations(orgId = CURRENT_ORG_ID) {
  return db.locations.filter((l) => l.orgId === orgId);
}

export function getLocation(id: string) {
  return db.locations.find((l) => l.id === id);
}

// --- patients ----------------------------------------------------------------
export function getPatients(orgId = CURRENT_ORG_ID): Patient[] {
  return db.patients.filter((p) => p.orgId === orgId);
}

export function getPatient(id: string) {
  return db.patients.find((p) => p.id === id);
}

export function getPatientOrders(patientId: string) {
  return db.orders.filter((o) => o.patientId === patientId);
}

// --- pharmacies --------------------------------------------------------------
export function getPharmacies(): Pharmacy[] {
  return db.pharmacies;
}
export function getPharmacy(id: string) {
  return db.pharmacies.find((p) => p.id === id);
}

// --- catalog -----------------------------------------------------------------
export function getCanonicalProducts(): CanonicalProduct[] {
  return db.canonicalProducts;
}
export function getCanonicalProduct(id: string) {
  return db.canonicalProducts.find((c) => c.id === id);
}
export function getPharmacyProductsFor(canonicalProductId: string): PharmacyProduct[] {
  return db.pharmacyProducts.filter((p) => p.canonicalProductId === canonicalProductId);
}

export interface CatalogRow {
  product: CanonicalProduct;
  offers: PharmacyProduct[];
  lowestPriceCents: number | null;
  fastestDays: number | null;
  pharmacyCount: number;
}

export function getCatalog(): CatalogRow[] {
  return db.canonicalProducts.map((product) => {
    const offers = getPharmacyProductsFor(product.id);
    const orderable = product.regulatoryStatus === "available";
    const prices = offers.filter((o) => o.inStock).map((o) => o.priceCents);
    const days = offers.map((o) => o.fulfillmentDays[0]);
    return {
      product,
      offers,
      lowestPriceCents: orderable && prices.length ? Math.min(...prices) : null,
      fastestDays: orderable && days.length ? Math.min(...days) : null,
      pharmacyCount: offers.length,
    };
  });
}

export function searchCatalog(query: string): CatalogRow[] {
  const q = query.trim().toLowerCase();
  const all = getCatalog();
  if (!q) return all;
  return all.filter(
    ({ product }) =>
      product.name.toLowerCase().includes(q) ||
      product.category.toLowerCase().includes(q) ||
      product.aliases.some((a) => a.toLowerCase().includes(q)) ||
      product.defaultForm.toLowerCase().includes(q) ||
      product.defaultRoute.toLowerCase().includes(q),
  );
}

/**
 * Product-detail comparison: pair each pharmacy offer with a per-context
 * availability decision from the regulatory engine.
 */
export interface OfferWithAvailability {
  offer: PharmacyProduct;
  pharmacy: Pharmacy;
  availability: AvailabilityResult;
}

export function getProductComparison(
  canonicalProductId: string,
  ctx?: Partial<AvailabilityContext>,
): { product: CanonicalProduct; rows: OfferWithAvailability[] } | null {
  const product = getCanonicalProduct(canonicalProductId);
  if (!product) return null;
  const offers = getPharmacyProductsFor(canonicalProductId);
  const rows = offers.map((offer) => {
    const pharmacy = getPharmacy(offer.pharmacyId)!;
    const availability = evaluateAvailability({
      product,
      pharmacy,
      sku: offer,
      ctx: {
        canonicalProductId,
        pharmacyId: pharmacy.id,
        pathway: pharmacy.pathway,
        patientState: ctx?.patientState,
        clinicState: ctx?.clinicState ?? getLocations()[0]?.state,
        providerLicenseStates: ctx?.providerLicenseStates,
      },
    });
    return { offer, pharmacy, availability };
  });
  // eligible first, then price
  rows.sort((a, b) => {
    if (a.availability.eligible !== b.availability.eligible) return a.availability.eligible ? -1 : 1;
    return a.offer.priceCents + a.offer.shippingCents - (b.offer.priceCents + b.offer.shippingCents);
  });
  return { product, rows };
}

// --- orders ------------------------------------------------------------------
export function getOrders(orgId = CURRENT_ORG_ID): Order[] {
  return db.orders.filter((o) => o.orgId === orgId);
}
export function getOrder(id: string) {
  return db.orders.find((o) => o.id === id);
}

// --- programs / education / support / billing --------------------------------
export function getPrograms(orgId = CURRENT_ORG_ID) {
  return db.programs.filter((p) => p.orgId === orgId);
}
export function getProgram(id: string) {
  return db.programs.find((p) => p.id === id);
}
export function getEducationModules() {
  return db.educationModules;
}
export function getEducationModule(id: string) {
  return db.educationModules.find((m) => m.id === id);
}
export function getEducationCompletions(orgId = CURRENT_ORG_ID) {
  const teamIds = new Set(getTeam(orgId).map((u) => u.id));
  return db.educationCompletions.filter((c) => teamIds.has(c.userId));
}
export function getSupportTickets(orgId = CURRENT_ORG_ID) {
  return db.supportTickets.filter((t) => t.orgId === orgId);
}
export function getSupportTicket(id: string) {
  return db.supportTickets.find((t) => t.id === id);
}
export function getInvoices(orgId = CURRENT_ORG_ID) {
  return db.invoices.filter((i) => i.orgId === orgId);
}
export function getPlans() {
  return db.plans;
}
export function getAlerts() {
  return db.alerts;
}
export function getActivity() {
  return db.activity;
}

// --- platform (PP admin) -----------------------------------------------------
export function getAllOrganizations() {
  return db.organizations;
}
export function getAllLocations() {
  return db.locations;
}
export function getAllPatients() {
  return db.patients;
}
export function getAllOrders() {
  return db.orders;
}
export function getAllUsers() {
  return db.users;
}
