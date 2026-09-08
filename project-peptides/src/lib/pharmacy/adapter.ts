/**
 * Pharmacy Adapter Layer.
 *
 * Every pharmacy exposes a different surface (REST API, portal, EDI, fax).
 * Project Peptides normalizes all of them behind a single `PharmacyAdapter`
 * interface. The rest of the application talks ONLY to the normalized
 * Project Peptides API (src/data/service.ts) — never to a pharmacy API
 * directly. New pharmacies/vendors are onboarded by implementing this
 * interface (PharmacyAAdapter, FutureVITLAdapter, FutureDocRxAdapter, ...).
 *
 * NOTE: These are MOCK adapters for the demo. No real prescription is
 * transmitted. `submitPrescription` returns a simulated acknowledgement and
 * every resulting order is flagged `isDemo`.
 */
import type {
  DosageForm,
  OrderPathway,
  OrderStatus,
  PharmacyType,
  Route,
} from "../types";

export interface AdapterCatalogItem {
  vendorSku: string;
  vendorName: string; // pharmacy's own product label
  canonicalHint: string; // used by normalization to map to a CanonicalProduct
  strength: string;
  form: DosageForm;
  route: Route;
  type: PharmacyType;
  pathway: OrderPathway;
}

export interface AdapterPricing {
  vendorSku: string;
  priceCents: number;
  shippingCents: number;
  fulfillmentDays: [number, number];
}

export interface AdapterAvailability {
  vendorSku: string;
  inStock: boolean;
  statesAvailable: string[];
}

export interface SubmitPrescriptionInput {
  vendorSku: string;
  patientRef: string;
  providerRef: string;
  strength: string;
  directions: string;
  quantity: number;
  refills: number;
  destinationState: string;
}

export interface SubmitClinicOrderInput {
  vendorSku: string;
  clinicRef: string;
  quantity: number;
  destinationState: string;
}

export interface AdapterOrderAck {
  accepted: boolean;
  vendorOrderId: string;
  status: OrderStatus;
  message: string;
  simulated: boolean;
}

export interface AdapterTracking {
  carrier: string | null;
  trackingNumber: string | null;
  status: OrderStatus;
  estimatedDelivery: string | null;
}

/**
 * Provider-neutral pharmacy interface. Concrete adapters implement each
 * capability against the vendor's real transport. Capabilities a vendor
 * does not support should throw `NotSupportedError` so the platform can
 * fall back (e.g. to manual/portal ordering) rather than fabricating data.
 */
export interface PharmacyAdapter {
  readonly key: string;
  readonly displayName: string;
  readonly transport: "API" | "Portal" | "Fax" | "EDI";

  getCatalog(): Promise<AdapterCatalogItem[]>;
  getPricing(vendorSkus: string[]): Promise<AdapterPricing[]>;
  getAvailability(vendorSkus: string[]): Promise<AdapterAvailability[]>;
  submitPrescription(input: SubmitPrescriptionInput): Promise<AdapterOrderAck>;
  submitClinicOrder(input: SubmitClinicOrderInput): Promise<AdapterOrderAck>;
  getOrderStatus(vendorOrderId: string): Promise<OrderStatus>;
  getTracking(vendorOrderId: string): Promise<AdapterTracking>;
  cancelOrder(vendorOrderId: string): Promise<{ cancelled: boolean }>;
}

export class NotSupportedError extends Error {
  constructor(capability: string, vendor: string) {
    super(`${vendor} does not support "${capability}" via its current integration.`);
    this.name = "NotSupportedError";
  }
}
