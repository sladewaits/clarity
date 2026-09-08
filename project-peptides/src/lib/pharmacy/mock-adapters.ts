/**
 * Mock pharmacy adapters used for the demo environment.
 *
 * Each simulates a different transport and vendor vocabulary to prove the
 * normalization layer. NOTHING here transmits a real prescription; every
 * acknowledgement is marked `simulated: true`.
 *
 * To connect a real vendor, implement `PharmacyAdapter` against its API and
 * register it in `adapterRegistry` — no UI or service code changes.
 */
import type { OrderStatus } from "../types";
import {
  type AdapterAvailability,
  type AdapterCatalogItem,
  type AdapterOrderAck,
  type AdapterPricing,
  type AdapterTracking,
  type PharmacyAdapter,
  type SubmitClinicOrderInput,
  type SubmitPrescriptionInput,
} from "./adapter";

let seq = 40500;
function simulatedOrderId(prefix: string) {
  seq += 7;
  return `${prefix}-${seq}`;
}

abstract class BaseMockAdapter implements PharmacyAdapter {
  abstract key: string;
  abstract displayName: string;
  abstract transport: "API" | "Portal" | "Fax" | "EDI";
  protected abstract items: AdapterCatalogItem[];
  protected abstract pricing: Record<string, AdapterPricing>;
  protected abstract availability: Record<string, AdapterAvailability>;

  async getCatalog() {
    return this.items;
  }
  async getPricing(skus: string[]) {
    return skus.map((s) => this.pricing[s]).filter(Boolean);
  }
  async getAvailability(skus: string[]) {
    return skus.map((s) => this.availability[s]).filter(Boolean);
  }
  async submitPrescription(input: SubmitPrescriptionInput): Promise<AdapterOrderAck> {
    return {
      accepted: true,
      vendorOrderId: simulatedOrderId(this.key.toUpperCase()),
      status: "accepted",
      message: `[SIMULATED] ${this.displayName} acknowledged a demo patient-specific order for ${input.vendorSku}. No prescription was transmitted.`,
      simulated: true,
    };
  }
  async submitClinicOrder(input: SubmitClinicOrderInput): Promise<AdapterOrderAck> {
    return {
      accepted: true,
      vendorOrderId: simulatedOrderId(this.key.toUpperCase()),
      status: "accepted",
      message: `[SIMULATED] ${this.displayName} acknowledged a demo clinic-supply order for ${input.vendorSku}.`,
      simulated: true,
    };
  }
  async getOrderStatus(): Promise<OrderStatus> {
    return "processing";
  }
  async getTracking(vendorOrderId: string): Promise<AdapterTracking> {
    return {
      carrier: "UPS",
      trackingNumber: `1Z${vendorOrderId.replace(/\W/g, "")}US`,
      status: "shipped",
      estimatedDelivery: null,
    };
  }
  async cancelOrder() {
    return { cancelled: true };
  }
}

class PharmacyAAdapter extends BaseMockAdapter {
  key = "pharmacy_a";
  displayName = "Meridian Compounding";
  transport = "API" as const;
  protected items: AdapterCatalogItem[] = [];
  protected pricing = {};
  protected availability = {};
}

class PharmacyBAdapter extends BaseMockAdapter {
  key = "pharmacy_b";
  displayName = "Cypress Pharmacy";
  transport = "Portal" as const;
  protected items: AdapterCatalogItem[] = [];
  protected pricing = {};
  protected availability = {};
}

class PharmacyCAdapter extends BaseMockAdapter {
  key = "pharmacy_c";
  displayName = "Aegis BioSciences";
  transport = "EDI" as const;
  protected items: AdapterCatalogItem[] = [];
  protected pricing = {};
  protected availability = {};
}

class PharmacyDAdapter extends BaseMockAdapter {
  key = "pharmacy_d";
  displayName = "Northline Specialty";
  transport = "Fax" as const;
  protected items: AdapterCatalogItem[] = [];
  protected pricing = {};
  protected availability = {};
}

class PharmacyEAdapter extends BaseMockAdapter {
  key = "pharmacy_e";
  displayName = "Solace Outsourcing Facility";
  transport = "API" as const;
  protected items: AdapterCatalogItem[] = [];
  protected pricing = {};
  protected availability = {};
}

/**
 * Placeholder adapters for future vendor integrations. They advertise
 * capability but are not connected; the platform treats them as `pending`.
 */
export class FutureVITLAdapter extends BaseMockAdapter {
  key = "future_vitl";
  displayName = "VITL (future integration)";
  transport = "API" as const;
  protected items: AdapterCatalogItem[] = [];
  protected pricing = {};
  protected availability = {};
}

export class FutureDocRxAdapter extends BaseMockAdapter {
  key = "future_docrx";
  displayName = "DocRx (future integration)";
  transport = "API" as const;
  protected items: AdapterCatalogItem[] = [];
  protected pricing = {};
  protected availability = {};
}

export const adapterRegistry: Record<string, PharmacyAdapter> = {
  pharmacy_a: new PharmacyAAdapter(),
  pharmacy_b: new PharmacyBAdapter(),
  pharmacy_c: new PharmacyCAdapter(),
  pharmacy_d: new PharmacyDAdapter(),
  pharmacy_e: new PharmacyEAdapter(),
  future_vitl: new FutureVITLAdapter(),
  future_docrx: new FutureDocRxAdapter(),
};

export function getAdapter(key: string): PharmacyAdapter | undefined {
  return adapterRegistry[key];
}
