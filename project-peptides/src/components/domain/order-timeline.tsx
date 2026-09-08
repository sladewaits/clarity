import { Check } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const FLOW: { status: OrderStatus; label: string }[] = [
  { status: "draft", label: "Draft created" },
  { status: "provider_review", label: "Provider review" },
  { status: "submitted", label: "Submitted to pharmacy" },
  { status: "accepted", label: "Accepted by pharmacy" },
  { status: "processing", label: "Processing" },
  { status: "compounding", label: "Compounding / preparing" },
  { status: "quality_review", label: "Quality review" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];

export function OrderTimeline({ order }: { order: Order }) {
  const eventMap = new Map(order.timeline.map((e) => [e.status, e]));
  const terminal = order.status === "exception" || order.status === "cancelled";
  const currentIdx = FLOW.findIndex((f) => f.status === order.status);

  return (
    <ol className="relative">
      {FLOW.map((step, i) => {
        const event = eventMap.get(step.status);
        const done = !terminal && currentIdx >= 0 && i <= currentIdx;
        const isCurrent = !terminal && i === currentIdx;
        const last = i === FLOW.length - 1;
        return (
          <li key={step.status} className="flex gap-4 pb-1">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 transition-colors",
                  done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/15",
                )}
              >
                {done ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              {!last && <span className={cn("w-0.5 flex-1", done ? "bg-primary/40" : "bg-border")} style={{ minHeight: 28 }} />}
            </div>
            <div className={cn("pb-5", !done && "opacity-60")}>
              <p className={cn("text-sm font-medium", isCurrent && "text-primary")}>{step.label}</p>
              {event ? (
                <>
                  <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                  {event.note && <p className="mt-0.5 text-xs text-muted-foreground">{event.note}</p>}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Pending</p>
              )}
            </div>
          </li>
        );
      })}
      {terminal && (
        <li className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="flex size-7 items-center justify-center rounded-full border-2 border-destructive bg-destructive text-destructive-foreground">!</span>
          </div>
          <div>
            <p className="text-sm font-medium text-destructive capitalize">{order.status}</p>
            <p className="text-xs text-muted-foreground">{eventMap.get(order.status)?.note}</p>
          </div>
        </li>
      )}
    </ol>
  );
}
