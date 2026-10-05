import { RISK_LABEL, RISK_TOKEN, type RiskLevel } from "@/lib/findssns/risk";
import { cn } from "@/lib/utils";

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
        RISK_TOKEN[level],
        className,
      )}
    >
      {RISK_LABEL[level]}
    </span>
  );
}