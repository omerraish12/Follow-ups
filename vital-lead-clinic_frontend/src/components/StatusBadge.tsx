import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/data/sampleData";
import { useLanguage } from "@/contexts/LanguageContext";

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "חדש", className: "bg-info/10 text-info border-info/20" },
  hot: { label: "חם 🔥", className: "bg-destructive/10 text-destructive border-destructive/20" },
  closed: { label: "נסגר ✓", className: "bg-success/10 text-success border-success/20" },
  lost: { label: "אבוד", className: "bg-muted text-muted-foreground border-border" },
};

export default function StatusBadge({ status }: { status: LeadStatus }) {
  const { t } = useLanguage();
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
