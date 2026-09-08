/**
 * Deterministic mock dataset for the Project Peptides demo.
 *
 * Fictional data ONLY. No real patients, providers, pharmacies, or pricing.
 * A seeded PRNG makes the dataset stable across renders so the demo is
 * coherent (the same patient always has the same orders, etc.).
 *
 * The exported `db` object is consumed by the service layer
 * (src/data/service.ts). Swapping to Prisma means replacing the service
 * layer's reads — this file and the UI stay untouched.
 */
import type {
  ActivityItem,
  Alert,
  CanonicalProduct,
  EducationCompletion,
  EducationModule,
  Invoice,
  Location,
  Order,
  OrderEvent,
  OrderStatus,
  Organization,
  Patient,
  Pharmacy,
  PharmacyProduct,
  Plan,
  Program,
  SupportTicket,
  User,
} from "@/lib/types";

// --- seeded PRNG (mulberry32) ------------------------------------------------
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260908);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const pickN = <T,>(arr: T[], n: number) => {
  const c = [...arr];
  const out: T[] = [];
  while (out.length < n && c.length) out.push(c.splice(Math.floor(rand() * c.length), 1)[0]);
  return out;
};
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

// --- reference data ----------------------------------------------------------
const STATES = ["FL", "GA", "TX", "TN", "NC", "SC", "CA", "AZ", "CO", "NY"];
const FIRST = ["James","Mary","Robert","Patricia","Michael","Jennifer","David","Linda","William","Elizabeth","Richard","Barbara","Joseph","Susan","Thomas","Jessica","Chris","Sarah","Daniel","Karen","Matthew","Nancy","Anthony","Lisa","Mark","Betty","Paul","Sandra","Steven","Ashley","Andrew","Kimberly","Joshua","Emily","Kevin","Donna","Brian","Michelle","George","Carol","Ana","Diego","Priya","Wei","Omar","Fatima","Luca","Sofia"];
const LAST = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores"];

// --- Plans -------------------------------------------------------------------
export const PLANS: Plan[] = [
  {
    key: "founding",
    name: "Founding Clinic",
    priceCents: 100000,
    cadence: "month",
    tagline: "For a single location launching its first specialty program.",
    features: ["1 location", "Up to 8 seats", "Pharmacy network access", "Program & education library", "Standard support"],
    seatLimit: 8,
    locationLimit: 1,
  },
  {
    key: "growth",
    name: "Growth",
    priceCents: 150000,
    cadence: "month",
    tagline: "For multi-provider clinics scaling programs across locations.",
    features: ["Up to 4 locations", "Up to 25 seats", "Advanced analytics", "Multi-location controls", "Priority support", "Program KPIs"],
    seatLimit: 25,
    locationLimit: 4,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    priceCents: null,
    cadence: "month",
    tagline: "For groups and DSOs standardizing programs across a portfolio.",
    features: ["Unlimited locations", "Unlimited seats", "Corporate roll-up analytics", "SSO & audit exports", "Dedicated success manager", "Custom integrations"],
    seatLimit: null,
    locationLimit: null,
  },
];

// --- Organizations & Locations ----------------------------------------------
const orgSeed: { id: string; name: string; slug: string; plan: Plan["key"]; locs: { city: string; state: string }[] }[] = [
  { id: "org_apex", name: "Apex Longevity", slug: "apex-longevity", plan: "growth", locs: [
    { city: "Jacksonville", state: "FL" }, { city: "Tampa", state: "FL" }, { city: "Orlando", state: "FL" }, { city: "Miami", state: "FL" },
  ]},
  { id: "org_revive", name: "Revive Longevity", slug: "revive", plan: "enterprise", locs: [
    { city: "Atlanta", state: "GA" }, { city: "Nashville", state: "TN" }, { city: "Charlotte", state: "NC" },
  ]},
  { id: "org_meridian", name: "Meridian Wellness Group", slug: "meridian", plan: "growth", locs: [
    { city: "Austin", state: "TX" }, { city: "Dallas", state: "TX" },
  ]},
  { id: "org_vitalis", name: "Vitalis MedSpa", slug: "vitalis", plan: "founding", locs: [
    { city: "Scottsdale", state: "AZ" },
  ]},
  { id: "org_north", name: "Northstar Regenerative", slug: "northstar", plan: "founding", locs: [
    { city: "Denver", state: "CO" }, { city: "Boulder", state: "CO" },
  ]},
];

export const organizations: Organization[] = [];
export const locations: Location[] = [];
let locCounter = 0;
for (const o of orgSeed) {
  const locIds: string[] = [];
  for (const l of o.locs) {
    const id = `loc_${++locCounter}`;
    locIds.push(id);
    locations.push({
      id,
      orgId: o.id,
      name: `${o.name} — ${l.city}`,
      city: l.city,
      state: l.state,
      addressLine: `${int(100, 9800)} ${pick(["Riverside","Park","Bayshore","Summit","Grove","Highland","Market","Lakeview"])} Ave, Suite ${int(100, 480)}`,
      phone: `(${int(200, 989)}) ${int(200, 989)}-${int(1000, 9999)}`,
      activePatients: 0,
      monthlyRevenueCents: 0,
    });
  }
  organizations.push({
    id: o.id, name: o.name, slug: o.slug, plan: o.plan,
    createdAt: daysAgo(int(120, 620)), locationIds: locIds,
  });
}

const DEMO_ORG_ID = "org_apex";
export const DEMO = { orgId: DEMO_ORG_ID, locationId: "loc_1" };

// --- Users (owners, providers, staff) + PP admins ---------------------------
export const users: User[] = [];
function makeEmail(name: string, org: string) {
  return `${name.toLowerCase().replace(/[^a-z]/g, ".")}@${org}.health`;
}

const PROVIDER_TITLES = ["MD", "DO", "NP", "PA-C"];
for (const org of organizations) {
  // one owner
  const ownerName = `${pick(FIRST)} ${pick(LAST)}`;
  users.push({
    id: `usr_owner_${org.id}`, orgId: org.id, name: ownerName, email: makeEmail(ownerName, org.slug),
    role: "org_owner", title: "Founder & CEO", locationIds: org.locationIds, active: true,
  });
  // 2-4 providers per org
  const nProv = org.id === DEMO_ORG_ID ? 4 : int(2, 3);
  for (let i = 0; i < nProv; i++) {
    const nm = `Dr. ${pick(FIRST)} ${pick(LAST)}`;
    const homeLoc = pick(org.locationIds);
    users.push({
      id: `usr_prov_${org.id}_${i}`, orgId: org.id, name: nm, email: makeEmail(nm.replace("Dr. ", ""), org.slug),
      role: "provider", title: pick(PROVIDER_TITLES),
      locationIds: org.id === DEMO_ORG_ID ? org.locationIds : [homeLoc],
      npi: `1${int(100000000, 999999999)}`,
      licenseStates: pickN(STATES, int(1, 3)).concat(org.locationIds.map((lid) => locations.find((l) => l.id === lid)!.state)).filter((v, idx, a) => a.indexOf(v) === idx),
      credentialStatus: pick(["verified", "verified", "verified", "pending"]) as User["credentialStatus"],
      active: true,
    });
  }
  // staff
  const nStaff = org.id === DEMO_ORG_ID ? 3 : int(1, 2);
  for (let i = 0; i < nStaff; i++) {
    const nm = `${pick(FIRST)} ${pick(LAST)}`;
    users.push({
      id: `usr_staff_${org.id}_${i}`, orgId: org.id, name: nm, email: makeEmail(nm, org.slug),
      role: "clinic_staff", title: pick(["Patient Coordinator", "Program Manager", "Front Desk Lead", "Medical Assistant"]),
      locationIds: [pick(org.locationIds)], active: true,
    });
  }
}
// PP admins
users.push({ id: "usr_pp_1", orgId: null, name: "Jordan Vance", email: "jordan@projectpeptides.com", role: "pp_admin", title: "Head of Clinic Success", locationIds: [], active: true });
users.push({ id: "usr_pp_2", orgId: null, name: "Riley Chen", email: "riley@projectpeptides.com", role: "pp_admin", title: "Pharmacy Integrations", locationIds: [], active: true });

export const providers = users.filter((u) => u.role === "provider");

// --- Pharmacies --------------------------------------------------------------
export const pharmacies: Pharmacy[] = [
  {
    id: "ph_meridian", name: "Meridian Compounding", type: "503A", pathway: "patient_specific",
    blurb: "Patient-specific 503A compounding pharmacy focused on peptide and hormone therapies.",
    statesServed: ["FL","GA","TX","TN","NC","SC","CO","AZ"],
    productCategories: ["Peptides","Hormone","Weight Management","Recovery"],
    typicalFulfillmentDays: [2, 3], shippingOptions: ["UPS 2-Day","UPS Ground","Overnight (cold-chain)"],
    integrationStatus: "connected", orderingMethod: "API",
    supportEmail: "orders@meridianrx.example", supportPhone: "(904) 555-0140",
    credentials: [
      { id: "cr1", label: "State Board License", authority: "FL Board of Pharmacy", status: "verified", lastVerifiedAt: daysAgo(24) },
      { id: "cr2", label: "PCAB Accreditation", authority: "ACHC/PCAB", status: "verified", lastVerifiedAt: daysAgo(64) },
    ],
    lastCredentialCheck: daysAgo(24), adapterKey: "pharmacy_a",
  },
  {
    id: "ph_cypress", name: "Cypress Pharmacy", type: "503A", pathway: "patient_specific",
    blurb: "Boutique 503A pharmacy with a broad injectable formulary and cold-chain logistics.",
    statesServed: ["FL","GA","NC","SC","NY","CA"],
    productCategories: ["Peptides","Weight Management","Wellness","Sexual Health"],
    typicalFulfillmentDays: [3, 4], shippingOptions: ["FedEx 2-Day","FedEx Overnight"],
    integrationStatus: "connected", orderingMethod: "Portal",
    supportEmail: "care@cypressrx.example", supportPhone: "(813) 555-0177",
    credentials: [
      { id: "cr3", label: "State Board License", authority: "FL Board of Pharmacy", status: "verified", lastVerifiedAt: daysAgo(41) },
    ],
    lastCredentialCheck: daysAgo(41), adapterKey: "pharmacy_b",
  },
  {
    id: "ph_aegis", name: "Aegis BioSciences", type: "503B", pathway: "clinic_supply",
    blurb: "503B outsourcing facility for office-use clinic supply of eligible sterile products.",
    statesServed: ["FL","GA","TX","TN","NC","CO","AZ","CA"],
    productCategories: ["Clinic Supply","Injectables","IV Therapy"],
    typicalFulfillmentDays: [4, 6], shippingOptions: ["Freight (cold-chain)","FedEx 2-Day"],
    integrationStatus: "manual", orderingMethod: "EDI",
    supportEmail: "b2b@aegisbio.example", supportPhone: "(512) 555-0199",
    credentials: [
      { id: "cr4", label: "FDA 503B Registration", authority: "U.S. FDA", status: "verified", lastVerifiedAt: daysAgo(88) },
      { id: "cr5", label: "cGMP Inspection", authority: "U.S. FDA", status: "verified", lastVerifiedAt: daysAgo(120) },
    ],
    lastCredentialCheck: daysAgo(88), adapterKey: "pharmacy_c",
  },
  {
    id: "ph_northline", name: "Northline Specialty", type: "503A", pathway: "patient_specific",
    blurb: "Regional 503A pharmacy; fax/portal ordering with strong recovery & hormone catalog.",
    statesServed: ["CO","AZ","TX","CA"],
    productCategories: ["Hormone","Recovery","Peptides"],
    typicalFulfillmentDays: [3, 5], shippingOptions: ["UPS Ground","UPS 2-Day"],
    integrationStatus: "pending", orderingMethod: "Fax",
    supportEmail: "rx@northlinerx.example", supportPhone: "(303) 555-0122",
    credentials: [
      { id: "cr6", label: "State Board License", authority: "CO Board of Pharmacy", status: "pending", lastVerifiedAt: daysAgo(210) },
    ],
    lastCredentialCheck: daysAgo(210), adapterKey: "pharmacy_d",
  },
  {
    id: "ph_solace", name: "Solace Outsourcing Facility", type: "503B", pathway: "clinic_supply",
    blurb: "503B facility specializing in office-administered injectables and IV nutrient therapy.",
    statesServed: ["FL","GA","TX","NC","SC","TN"],
    productCategories: ["Clinic Supply","IV Therapy","Injectables"],
    typicalFulfillmentDays: [5, 7], shippingOptions: ["Freight (cold-chain)"],
    integrationStatus: "connected", orderingMethod: "API",
    supportEmail: "supply@solacerx.example", supportPhone: "(919) 555-0165",
    credentials: [
      { id: "cr7", label: "FDA 503B Registration", authority: "U.S. FDA", status: "verified", lastVerifiedAt: daysAgo(52) },
    ],
    lastCredentialCheck: daysAgo(52), adapterKey: "pharmacy_e",
  },
];

// --- Canonical products (40) -------------------------------------------------
type PSeed = [name: string, category: string, form: CanonicalProduct["defaultForm"], route: CanonicalProduct["defaultRoute"], strengths: string[], status?: CanonicalProduct["regulatoryStatus"], note?: string];
const productSeed: PSeed[] = [
  ["Sermorelin", "Peptides", "Injectable", "SubQ", ["5 mg","10 mg","15 mg"]],
  ["Ipamorelin", "Peptides", "Injectable", "SubQ", ["5 mg","10 mg"]],
  ["CJC-1295", "Peptides", "Injectable", "SubQ", ["2 mg","5 mg"]],
  ["Ipamorelin / CJC-1295", "Peptides", "Injectable", "SubQ", ["5 mg / 2 mg"]],
  ["BPC-157", "Recovery", "Injectable", "SubQ", ["5 mg","10 mg"]],
  ["TB-500", "Recovery", "Injectable", "SubQ", ["5 mg","10 mg"]],
  ["Semaglutide", "Weight Management", "Injectable", "SubQ", ["2.5 mg","5 mg","10 mg"]],
  ["Tirzepatide", "Weight Management", "Injectable", "SubQ", ["10 mg","20 mg","40 mg"]],
  ["Retatrutide", "Weight Management", "Injectable", "SubQ", ["10 mg"], "not_available_compounded", "Retatrutide is an investigational agent and is not available for compounded clinical ordering. Educational listing only."],
  ["Glutathione", "IV Therapy", "Injectable", "IM", ["200 mg/mL"]],
  ["NAD+", "IV Therapy", "Injectable", "IV", ["100 mg/mL","500 mg"]],
  ["Testosterone Cypionate", "Hormone", "Injectable", "IM", ["200 mg/mL"], "restricted", "Controlled substance workflows require verified provider licensure and state eligibility before ordering."],
  ["Estradiol", "Hormone", "Cream", "Topical", ["1 mg/g"]],
  ["Progesterone", "Hormone", "Capsule", "Oral", ["100 mg","200 mg"]],
  ["DHEA", "Hormone", "Capsule", "Oral", ["25 mg","50 mg"]],
  ["Oxytocin", "Sexual Health", "Troche", "Sublingual", ["50 IU","100 IU"]],
  ["PT-141", "Sexual Health", "Injectable", "SubQ", ["10 mg"]],
  ["Sildenafil / Tadalafil", "Sexual Health", "Troche", "Sublingual", ["50/10 mg"]],
  ["Methylcobalamin (B12)", "Wellness", "Injectable", "IM", ["1 mg/mL"]],
  ["MIC + B12 (Lipo)", "Weight Management", "Injectable", "IM", ["1 mL"]],
  ["Thymosin Alpha-1", "Wellness", "Injectable", "SubQ", ["5 mg"]],
  ["GHK-Cu", "Recovery", "Injectable", "SubQ", ["50 mg"]],
  ["Selank", "Wellness", "Nasal Spray", "Nasal", ["1 mg/mL"]],
  ["Semax", "Wellness", "Nasal Spray", "Nasal", ["1 mg/mL"]],
  ["Naltrexone (LDN)", "Wellness", "Capsule", "Oral", ["1.5 mg","4.5 mg"]],
  ["Sermorelin / GHRP-2", "Peptides", "Injectable", "SubQ", ["5 mg / 5 mg"]],
  ["Tesamorelin", "Peptides", "Injectable", "SubQ", ["2 mg"]],
  ["AOD-9604", "Weight Management", "Injectable", "SubQ", ["2 mg"]],
  ["Kisspeptin-10", "Hormone", "Injectable", "SubQ", ["5 mg"], "verification_required", "State and pathway eligibility must be verified before this product can be ordered."],
  ["Melanotan II", "Wellness", "Injectable", "SubQ", ["10 mg"], "restricted", "Availability varies by jurisdiction; verification required."],
  ["Enclomiphene", "Hormone", "Capsule", "Oral", ["12.5 mg","25 mg"]],
  ["Anastrozole", "Hormone", "Tablet", "Oral", ["0.5 mg","1 mg"]],
  ["Vitamin D3 / K2", "Wellness", "Capsule", "Oral", ["5000 IU"]],
  ["Amino Blend", "IV Therapy", "Solution", "IV", ["500 mL"]],
  ["Ketamine (Rapid)", "Wellness", "Troche", "Sublingual", ["50 mg"], "restricted", "Controlled substance; requires verified provider and program eligibility."],
  ["Pentadeca (PDA)", "Recovery", "Injectable", "SubQ", ["10 mg"]],
  ["Epithalon", "Wellness", "Injectable", "SubQ", ["10 mg"]],
  ["L-Carnitine", "Weight Management", "Injectable", "IM", ["500 mg/mL"]],
  ["Glutathione (Oral)", "Wellness", "Capsule", "Oral", ["500 mg"]],
  ["Zofran (Ondansetron)", "Clinic Supply", "Solution", "IV", ["2 mg/mL"]],
];

export const canonicalProducts: CanonicalProduct[] = productSeed.map((p, i) => {
  const [name, category, form, route, strengths, status = "available", note] = p;
  return {
    id: `cp_${i + 1}`,
    name,
    category,
    aliases: [`${name} ${strengths[0]}`, `${name.replace(/[^A-Za-z0-9]/g, "")}`],
    defaultRoute: route,
    defaultForm: form,
    strengths,
    regulatoryStatus: status,
    regulatoryNote: note,
    requiresPrescription: true,
    summary: `${name} — ${category.toLowerCase()} therapy. Educational information only; clinical decisions remain the responsibility of the prescribing provider.`,
    educationModuleId: undefined,
  };
});

// --- PharmacyProducts (normalized SKUs) -------------------------------------
export const pharmacyProducts: PharmacyProduct[] = [];
const vendorNameStyle: Record<string, (n: string, s: string) => string> = {
  ph_meridian: (n, s) => `${n} ${s.toUpperCase()}`,
  ph_cypress: (n, s) => `${n} ${s} Injection`,
  ph_aegis: (n, s) => `${n} (Office Use) ${s}`,
  ph_northline: (n, s) => `${n}-${s}`,
  ph_solace: (n, s) => `${n} Sterile ${s}`,
};
for (const cp of canonicalProducts) {
  for (const ph of pharmacies) {
    // A pharmacy only lists a product if its category matches and it isn't blocked outright.
    const categoryMatch =
      ph.productCategories.includes(cp.category) ||
      (ph.type === "503B" && cp.category === "Clinic Supply") ||
      (ph.productCategories.includes("Injectables") && cp.defaultForm === "Injectable");
    if (!categoryMatch) continue;
    if (cp.regulatoryStatus === "not_available_compounded") continue; // never listed as orderable
    // 503B only carries a subset (clinic-supply eligible) — do not assume everything is 503B-eligible.
    if (ph.type === "503B" && !["IV Therapy", "Clinic Supply", "Wellness"].includes(cp.category)) continue;
    if (rand() < 0.12) continue; // some gaps in coverage

    const strength = pick(cp.strengths);
    const base = int(6900, 42900);
    pharmacyProducts.push({
      id: `pp_${cp.id}_${ph.id}`,
      canonicalProductId: cp.id,
      pharmacyId: ph.id,
      pharmacyName: (vendorNameStyle[ph.id] ?? ((n, s) => `${n} ${s}`))(cp.name, strength),
      type: ph.type,
      pathway: ph.pathway,
      strength,
      form: cp.defaultForm,
      route: cp.defaultRoute,
      priceCents: base,
      shippingCents: pick([0, 0, 1500, 2500, 3500]),
      fulfillmentDays: ph.typicalFulfillmentDays,
      statesAvailable: cp.regulatoryStatus === "available" ? ph.statesServed : pickN(ph.statesServed, Math.max(1, ph.statesServed.length - 3)),
      inStock: rand() > 0.08,
    });
  }
}

// --- Programs ----------------------------------------------------------------
// Brand-consistent categorical palette (Deep Petrol / Clinical Teal anchored)
const programSeed = [
  { name: "Weight Management Program", category: "Metabolic", color: "#0F3B52", cats: ["Weight Management"] },
  { name: "Hormone Optimization", category: "Hormone", color: "#2E6E8E", cats: ["Hormone"] },
  { name: "Recovery & Regenerative", category: "Recovery", color: "#C2683A", cats: ["Recovery","Peptides"] },
  { name: "Longevity Program", category: "Longevity", color: "#00C2B3", cats: ["Peptides","Wellness"] },
  { name: "Sexual Wellness", category: "Wellness", color: "#7A5A86", cats: ["Sexual Health"] },
];
export const programs: Program[] = [];
for (const org of organizations) {
  const n = org.id === DEMO_ORG_ID ? programSeed.length : int(2, 3);
  for (let i = 0; i < n; i++) {
    const s = programSeed[i % programSeed.length];
    const prods = canonicalProducts.filter((c) => s.cats.includes(c.category) && c.regulatoryStatus === "available");
    const orgProviders = users.filter((u) => u.orgId === org.id && u.role === "provider");
    programs.push({
      id: `prog_${org.id}_${i}`,
      orgId: org.id,
      name: s.name,
      category: s.category,
      description: `${s.name} — a structured, provider-supervised program with approved products, protocols placeholders, required labs, and a defined follow-up cadence.`,
      color: s.color,
      status: rand() > 0.15 ? "active" : "draft",
      enrolledPatients: 0,
      monthlyPriceCents: pick([29900, 39900, 49900, 59900]),
      productIds: pickN(prods, Math.min(5, prods.length)).map((p) => p.id),
      providerIds: pickN(orgProviders, Math.min(2, orgProviders.length)).map((p) => p.id),
      requiredLabs: pickN(["CBC","CMP","Lipid Panel","HbA1c","Testosterone (total/free)","IGF-1","TSH","Estradiol","PSA"], int(2, 4)),
      followUpCadence: pick(["Every 4 weeks","Every 6 weeks","Every 8 weeks","Monthly"]),
      educationModuleIds: [],
      kpis: [
        { label: "Avg. patient value", value: `$${int(280, 620)}/mo`, delta: `+${int(3, 18)}%` },
        { label: "Retention (90d)", value: `${int(76, 94)}%`, delta: `+${int(1, 6)}%` },
        { label: "Adherence", value: `${int(70, 92)}%` },
      ],
    });
  }
}

// --- Patients (100) ----------------------------------------------------------
export const patients: Patient[] = [];
const orgWeights: [string, number][] = [["org_apex", 42], ["org_revive", 24], ["org_meridian", 16], ["org_vitalis", 8], ["org_north", 10]];
let pid = 0;
for (const [orgId, count] of orgWeights) {
  const org = organizations.find((o) => o.id === orgId)!;
  const orgProviders = users.filter((u) => u.orgId === orgId && u.role === "provider");
  const orgPrograms = programs.filter((p) => p.orgId === orgId);
  for (let i = 0; i < count; i++) {
    const locId = pick(org.locationIds);
    const loc = locations.find((l) => l.id === locId)!;
    const prog = rand() > 0.1 ? pick(orgPrograms) : null;
    const prov = pick(orgProviders);
    const status = pick(["active","active","active","active","onboarding","paused","inactive"]) as Patient["status"];
    const hasOrder = status !== "onboarding";
    patients.push({
      id: `pat_${++pid}`,
      orgId, locationId: locId,
      firstName: pick(FIRST), lastName: pick(LAST),
      dob: new Date(int(1955, 2000), int(0, 11), int(1, 28)).toISOString().slice(0, 10),
      sex: pick(["M","F","F","M","X"]) as Patient["sex"],
      email: `patient${pid}@example.com`,
      phone: `(${int(200, 989)}) ${int(200, 989)}-${int(1000, 9999)}`,
      state: loc.state,
      programId: prog?.id ?? null,
      providerId: prov.id,
      status,
      lastOrderAt: hasOrder ? daysAgo(int(1, 90)) : null,
      nextFollowUpAt: status === "active" ? daysAhead(int(3, 60)) : null,
      preferredPharmacyId: pick(pharmacies.filter((p) => p.type === "503A")).id,
      createdAt: daysAgo(int(10, 400)),
    });
  }
}

// roll up program enrollment + location metrics
for (const prog of programs) prog.enrolledPatients = patients.filter((p) => p.programId === prog.id).length;
for (const loc of locations) {
  const locPatients = patients.filter((p) => p.locationId === loc.id);
  loc.activePatients = locPatients.filter((p) => p.status === "active").length;
  loc.monthlyRevenueCents = locPatients.length * int(28000, 62000);
}

// --- Orders (100+) -----------------------------------------------------------
const STATUS_FLOW: OrderStatus[] = ["draft","provider_review","submitted","accepted","processing","compounding","quality_review","shipped","delivered"];
function timelineFor(status: OrderStatus, createdAt: string): OrderEvent[] {
  const idx = STATUS_FLOW.indexOf(status);
  const events: OrderEvent[] = [];
  const start = new Date(createdAt).getTime();
  const labelNote: Partial<Record<OrderStatus, string>> = {
    submitted: "Transmitted to pharmacy queue (simulated).",
    accepted: "Pharmacy acknowledged the order.",
    compounding: "Preparation in progress.",
    quality_review: "Final quality verification.",
    shipped: "Handed to carrier.",
    delivered: "Signed for at destination.",
  };
  const steps = idx >= 0 ? STATUS_FLOW.slice(0, idx + 1) : ["draft"] as OrderStatus[];
  steps.forEach((s, k) => {
    events.push({ status: s, at: new Date(start + k * int(6, 40) * 3600000).toISOString(), note: labelNote[s] });
  });
  if (status === "exception") events.push({ status: "exception", at: new Date(start + 3 * 86400000).toISOString(), note: "Address verification required by pharmacy." });
  if (status === "cancelled") events.push({ status: "cancelled", at: new Date(start + 1 * 86400000).toISOString(), note: "Cancelled before transmission." });
  return events;
}

export const orders: Order[] = [];
let oid = 10400;
const orderablePatients = patients.filter((p) => p.status !== "onboarding");
for (let i = 0; i < 108; i++) {
  const pat = pick(orderablePatients);
  const org = organizations.find((o) => o.id === pat.orgId)!;
  const sku503a = pharmacyProducts.filter((pp) => pp.pathway === "patient_specific" && pp.statesAvailable.includes(pat.state));
  if (!sku503a.length) continue;
  const sku = pick(sku503a);
  const cp = canonicalProducts.find((c) => c.id === sku.canonicalProductId)!;
  const ph = pharmacies.find((p) => p.id === sku.pharmacyId)!;
  const status = pick<OrderStatus>(["delivered","delivered","delivered","shipped","compounding","processing","accepted","submitted","provider_review","exception","cancelled"]);
  const createdAt = daysAgo(int(0, 120));
  const isDemo = pat.orgId === DEMO_ORG_ID && i % 9 === 0;
  const timeline = timelineFor(status, createdAt);
  orders.push({
    id: `ord_${++oid}`, ref: `RX-${oid}`,
    orgId: pat.orgId, locationId: pat.locationId, patientId: pat.id, providerId: pat.providerId,
    pharmacyId: ph.id, pathway: "patient_specific", type: ph.type,
    canonicalProductId: cp.id, pharmacyProductId: sku.id,
    strength: sku.strength, form: sku.form, route: sku.route,
    directions: `Inject ${pick(["0.25 mL","0.5 mL","10 units","0.2 mL"])} ${pick(["subcutaneously","intramuscularly"])} ${pick(["once daily","5 days on / 2 off","twice weekly","every morning"])}.`,
    quantity: pick([1, 1, 1, 2, 3]), refills: pick([0, 0, 1, 2, 3]),
    priceCents: sku.priceCents, shippingCents: sku.shippingCents,
    status, isDemo,
    trackingCarrier: ["shipped","delivered"].includes(status) ? "UPS" : undefined,
    trackingNumber: ["shipped","delivered"].includes(status) ? `1Z${int(100000, 999999)}US${int(1000, 9999)}` : undefined,
    timeline, createdAt,
  });
}
orders.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

// --- Education ---------------------------------------------------------------
const eduSeed: [title: string, category: string, min: number, audience: EducationModule["audience"]][] = [
  ["Peptide Therapy Foundations", "Clinical Education", 45, ["provider"]],
  ["GLP-1 Program Clinical Overview", "Clinical Education", 60, ["provider"]],
  ["Hormone Optimization Essentials", "Clinical Education", 55, ["provider"]],
  ["Injectable Handling & Cold-Chain", "Medication Education", 30, ["staff","provider"]],
  ["Reconstitution & Dosing Basics", "Medication Education", 35, ["staff","provider"]],
  ["503A vs 503B: What Staff Need to Know", "Compliance", 25, ["staff","provider"]],
  ["Patient Onboarding Playbook", "Staff Training", 40, ["staff"]],
  ["Front Desk: Order Status Communication", "Staff Training", 20, ["staff"]],
  ["HIPAA & Minimum Necessary Access", "Compliance", 30, ["staff","provider"]],
  ["Program Launch Checklist", "Program Launch", 50, ["staff","provider"]],
  ["Talking to Patients About Weight Management", "Patient Communication", 25, ["staff","provider"]],
  ["Adverse Event Reporting Workflow", "Compliance", 20, ["provider","staff"]],
  ["Longevity Program Operations", "Operations", 45, ["staff","provider"]],
  ["Pharmacy Selection & Fulfillment", "Operations", 30, ["staff","provider"]],
  ["Patient Education: Self-Injection Basics", "Patient Communication", 15, ["patient"]],
];
export const educationModules: EducationModule[] = eduSeed.map((e, i) => ({
  id: `edu_${i + 1}`, title: e[0], category: e[1], durationMin: e[2],
  description: `${e[0]} — approved training content. Placeholder body; clinical content requires medical review and approval before publication.`,
  version: `v${int(1, 3)}.${int(0, 9)}`, lastReviewedAt: daysAgo(int(10, 180)),
  reviewer: pick(["Clinical Advisory Board","Dr. Morgan Ellis, MD","PP Compliance"]), audience: e[3],
}));

export const educationCompletions: EducationCompletion[] = [];
let ecid = 0;
for (const u of users.filter((x) => x.orgId === DEMO_ORG_ID)) {
  for (const m of pickN(educationModules, int(4, 9))) {
    const status = pick(["completed","completed","completed","in_progress","assigned"]) as EducationCompletion["status"];
    educationCompletions.push({
      id: `ec_${++ecid}`, moduleId: m.id, userId: u.id, status,
      completedAt: status === "completed" ? daysAgo(int(1, 120)) : null,
      certificateExpiresAt: status === "completed" && rand() > 0.7 ? daysAhead(int(-10, 60)) : null,
    });
  }
}

// --- Support tickets ---------------------------------------------------------
export const supportTickets: SupportTicket[] = [];
const ticketSeed: [subject: string, cat: SupportTicket["category"], pri: SupportTicket["priority"]][] = [
  ["Order RX-10412 stuck in Quality Review", "order", "high"],
  ["Cypress Pharmacy portal login not working", "pharmacy", "normal"],
  ["Patient reports package not delivered", "fulfillment", "urgent"],
  ["Add a new provider seat", "billing", "low"],
  ["How do I assign an education module?", "platform", "low"],
  ["Weight Management program pricing question", "program", "normal"],
  ["Request new pharmacy relationship (Texas)", "pharmacy", "normal"],
  ["Invoice discrepancy for August", "billing", "high"],
];
let tid = 8800;
ticketSeed.forEach((t, i) => {
  const created = daysAgo(int(1, 30));
  supportTickets.push({
    id: `tick_${++tid}`, ref: `PP-${tid}`, orgId: DEMO_ORG_ID,
    subject: t[0], category: t[1], priority: t[2],
    status: pick(["open","in_progress","waiting","resolved"]) as SupportTicket["status"],
    assignee: pick(["Jordan Vance","Riley Chen"]),
    relatedOrderId: t[1] === "order" ? orders.find((o) => o.orgId === DEMO_ORG_ID)?.id : undefined,
    createdAt: created, updatedAt: daysAgo(int(0, 3)),
    messages: [
      { author: "Clinic", role: "clinic", body: t[0] + ". Can you help?", at: created },
      { author: pick(["Jordan Vance","Riley Chen"]), role: "pp", body: "Thanks for reaching out — I'm looking into this now and will update you shortly.", at: daysAgo(int(0, 2)) },
    ],
  });
});

// --- Invoices ----------------------------------------------------------------
export const invoices: Invoice[] = [];
for (const org of organizations) {
  const plan = PLANS.find((p) => p.key === org.plan)!;
  const amount = plan.priceCents ?? 350000;
  for (let m = 0; m < 6; m++) {
    invoices.push({
      id: `inv_${org.id}_${m}`, orgId: org.id,
      number: `${org.slug.toUpperCase().slice(0, 3)}-2026${String(9 - m).padStart(2, "0")}`,
      periodStart: daysAgo((m + 1) * 30), periodEnd: daysAgo(m * 30),
      amountCents: amount, status: m === 0 ? "open" : "paid",
    });
  }
}

// --- Alerts & activity (demo org) -------------------------------------------
export const alerts: Alert[] = [
  { id: "al1", severity: "warning", title: "2 staff certifications expire soon", detail: "HIPAA & Minimum Necessary Access certificates lapse within 14 days.", at: daysAgo(0) },
  { id: "al2", severity: "info", title: "Pharmacy pricing updated", detail: "Meridian Compounding refreshed pricing on 6 SKUs.", at: daysAgo(1) },
  { id: "al3", severity: "critical", title: "1 order exception", detail: "RX-10420 requires address verification before shipment.", at: daysAgo(0) },
  { id: "al4", severity: "info", title: "New education module available", detail: "‘GLP-1 Program Clinical Overview’ was published to your library.", at: daysAgo(2) },
];
export const activity: ActivityItem[] = [
  { id: "ac1", icon: "clipboard", title: "12 prescriptions require review", detail: "Across Jacksonville and Tampa", at: daysAgo(0) },
  { id: "ac2", icon: "truck", title: "3 orders shipped today", detail: "Meridian Compounding · Cypress Pharmacy", at: daysAgo(0) },
  { id: "ac3", icon: "tag", title: "Pharmacy pricing updated", detail: "Meridian Compounding · 6 SKUs", at: daysAgo(1) },
  { id: "ac4", icon: "book", title: "New education module available", detail: "GLP-1 Program Clinical Overview", at: daysAgo(2) },
  { id: "ac5", icon: "award", title: "2 staff certifications expire soon", detail: "Renew before they lapse", at: daysAgo(2) },
  { id: "ac6", icon: "user", title: "5 new patients onboarded", detail: "This week", at: daysAgo(3) },
];

export const db = {
  organizations, locations, users, providers, pharmacies,
  canonicalProducts, pharmacyProducts, programs, patients, orders,
  educationModules, educationCompletions, supportTickets, invoices,
  alerts, activity, plans: PLANS,
};
