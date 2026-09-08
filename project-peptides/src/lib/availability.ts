/**
 * Regulatory Availability Engine.
 *
 * The platform must NEVER infer "if a pharmacy sells it, therefore it is
 * legal." Availability is a function of product regulatory status, the
 * pharmacy's served states, the ordering pathway (503A patient-specific vs
 * 503B clinic-supply), provider licensure, and live stock — evaluated per
 * transaction. When eligibility cannot be positively established, the
 * transaction is BLOCKED and the UI surfaces "Availability requires
 * verification."
 *
 * Rules are data-driven so that regulatory/product status changes do not
 * require application-code changes (see CanonicalProduct.regulatoryStatus
 * and PharmacyProduct.statesAvailable).
 */
import type {
  AvailabilityContext,
  AvailabilityResult,
  CanonicalProduct,
  Pharmacy,
  PharmacyProduct,
} from "./types";

interface EvaluateArgs {
  ctx: AvailabilityContext;
  product: CanonicalProduct;
  pharmacy: Pharmacy;
  sku?: PharmacyProduct;
}

export function evaluateAvailability({
  ctx,
  product,
  pharmacy,
  sku,
}: EvaluateArgs): AvailabilityResult {
  const reasons: string[] = [];

  // 1. Regulatory status of the canonical product is authoritative.
  if (product.regulatoryStatus === "not_available_compounded") {
    return {
      eligible: false,
      status: "blocked",
      code: "REGULATORY_STATUS",
      reasons: [
        product.regulatoryNote ??
          `${product.name} is not available for compounded clinical ordering.`,
      ],
    };
  }

  if (
    product.regulatoryStatus === "restricted" ||
    product.regulatoryStatus === "verification_required"
  ) {
    return {
      eligible: false,
      status: "verification_required",
      code: "UNVERIFIED",
      reasons: [
        product.regulatoryNote ??
          "Availability requires verification for this product in the selected jurisdiction.",
      ],
    };
  }

  // 2. Pathway must be one this pharmacy supports. A 503A pharmacy cannot
  //    fulfill a clinic-supply (503B) order and vice versa.
  const pathwayOk =
    (ctx.pathway === "patient_specific" && pharmacy.type === "503A") ||
    (ctx.pathway === "clinic_supply" && pharmacy.type === "503B");
  if (!pathwayOk) {
    return {
      eligible: false,
      status: "blocked",
      code: "PATHWAY_UNSUPPORTED",
      reasons: [
        `${pharmacy.name} (${pharmacy.type}) does not support the ${
          ctx.pathway === "clinic_supply" ? "clinic-supply (503B)" : "patient-specific (503A)"
        } pathway for this order.`,
      ],
    };
  }

  // 3. Destination state must be served by the pharmacy. For patient-specific
  //    orders the destination is the patient's state; for clinic-supply it is
  //    the clinic's state.
  const destState =
    ctx.pathway === "patient_specific" ? ctx.patientState : ctx.clinicState;
  if (destState && !pharmacy.statesServed.includes(destState)) {
    return {
      eligible: false,
      status: "blocked",
      code: "PHARMACY_STATE",
      reasons: [`${pharmacy.name} does not currently ship to ${destState}.`],
    };
  }

  // 4. SKU-level state availability (integration/jurisdiction controlled).
  if (sku && destState && !sku.statesAvailable.includes(destState)) {
    return {
      eligible: false,
      status: "verification_required",
      code: "UNVERIFIED",
      reasons: [
        `This SKU is not confirmed available in ${destState}. Availability requires verification.`,
      ],
    };
  }

  // 5. Provider licensure (patient-specific pathway only).
  if (
    ctx.pathway === "patient_specific" &&
    ctx.providerLicenseStates &&
    ctx.patientState &&
    !ctx.providerLicenseStates.includes(ctx.patientState)
  ) {
    return {
      eligible: false,
      status: "blocked",
      code: "PROVIDER_LICENSE",
      reasons: [
        `The prescribing provider is not licensed in ${ctx.patientState}.`,
      ],
    };
  }

  // 6. Live stock.
  if (sku && !sku.inStock) {
    return {
      eligible: false,
      status: "verification_required",
      code: "OUT_OF_STOCK",
      reasons: [`${pharmacy.name} reports this item as temporarily unavailable.`],
    };
  }

  return {
    eligible: true,
    status: "eligible",
    code: "OK",
    reasons: reasons.length ? reasons : ["Eligibility confirmed for this order."],
  };
}
