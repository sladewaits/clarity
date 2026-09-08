import type { Permission } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide icon name
  requires?: Permission[]; // any-of
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const APP_NAV: NavSection[] = [
  {
    items: [
      { label: "Home", href: "/app", icon: "LayoutDashboard" },
      { label: "Patients", href: "/app/patients", icon: "Users", requires: ["patients:read"] },
      { label: "Prescriptions / Orders", href: "/app/orders", icon: "ClipboardList", requires: ["orders:read"] },
    ],
  },
  {
    title: "Sourcing",
    items: [
      { label: "Pharmacy Network", href: "/app/pharmacies", icon: "Building2" },
      { label: "Catalog", href: "/app/catalog", icon: "Search" },
    ],
  },
  {
    title: "Operate",
    items: [
      { label: "Programs", href: "/app/programs", icon: "LayoutGrid", requires: ["programs:manage", "patients:read"] },
      { label: "Education", href: "/app/education", icon: "GraduationCap", requires: ["education:read"] },
      { label: "Analytics", href: "/app/analytics", icon: "BarChart3", requires: ["analytics:view"] },
      { label: "Locations", href: "/app/locations", icon: "MapPin", requires: ["locations:manage", "analytics:view"] },
      { label: "Team", href: "/app/team", icon: "IdCard", requires: ["team:manage", "patients:read"] },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Support", href: "/app/support", icon: "LifeBuoy", requires: ["support:create"] },
      { label: "Settings", href: "/app/settings", icon: "Settings" },
    ],
  },
];
