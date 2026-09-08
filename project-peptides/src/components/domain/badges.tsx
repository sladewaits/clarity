import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  IntegrationStatus,
  OrderStatus,
  PharmacyType,
  RegulatoryStatus,
} from "@/lib/types";

const ORDER_STATUS: Record<OrderStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "muted" | "secondary" }> = {
  draft: { label: "Draft", variant: "muted" },
  provider_review: { label: "Provider Review", variant: "warning" },
  submitted: { label: "Submitted", variant: "secondary" },
  accepted: { label: "Accepted", variant: "default" },
  processing: { label: "Processing", variant: "default" },
  compounding: { label: "Compounding", variant: "default" },
  quality_review: { label: "Quality Review", variant: "default" },
  shipped: { label: "Shipped", variant: "secondary" },
  delivered: { label: "Delivered", variant: "success" },
  exception: { label: "Exception", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = ORDER_STATUS[status];
  return <Badge variant={s.variant} className={className}>{s.label}</Badge>;
}

export function PharmacyTypeBadge({ type, pathway }: { type: PharmacyType; pathway?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant={type === "503A" ? "default" : "secondary"} className="font-mono">{type}</Badge>
      {pathway && (
        <span className="text-xs text-muted-foreground">
          {pathway === "patient_specific" ? "Patient-Specific" : "Clinic Supply"}
        </span>
      )}
    </span>
  );
}

export function IntegrationBadge({ status }: { status: IntegrationStatus }) {
  const map: Record<IntegrationStatus, { label: string; variant: "success" | "warning" | "muted" | "secondary"; dot: string }> = {
    connected: { label: "Connected", variant: "success", dot: "bg-success" },
    manual: { label: "Manual", variant: "secondary", dot: "bg-muted-foreground" },
    pending: { label: "Pending", variant: "warning", dot: "bg-warning" },
    unavailable: { label: "Unavailable", variant: "muted", dot: "bg-muted-foreground" },
  };
  const s = map[status];
  return (
    <Badge variant={s.variant}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </Badge>
  );
}

export function RegulatoryBadge({ status }: { status: RegulatoryStatus }) {
  const map: Record<RegulatoryStatus, { label: string; variant: "success" | "warning" | "destructive" | "muted" }> = {
    available: { label: "Available", variant: "success" },
    restricted: { label: "Restricted", variant: "warning" },
    verification_required: { label: "Verification Required", variant: "warning" },
    not_available_compounded: { label: "Unavailable for Compounded Ordering", variant: "destructive" },
  };
  const s = map[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function CredentialBadge({ status }: { status: "verified" | "pending" | "expired" }) {
  const map = {
    verified: { label: "Verified", variant: "success" as const },
    pending: { label: "Pending", variant: "warning" as const },
    expired: { label: "Expired", variant: "destructive" as const },
  };
  return <Badge variant={map[status].variant}>{map[status].label}</Badge>;
}
