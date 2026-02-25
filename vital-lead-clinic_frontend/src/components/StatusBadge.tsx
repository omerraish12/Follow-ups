import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types/leads";
import { useLanguage } from "@/contexts/LanguageContext";

const statusConfig = (t: (key: string) => string): Record<LeadStatus, { label: string; className: string }> => ({
  NEW: { label: t("filters_status_new"), className: "bg-info/10 text-info border-info/20" },
  HOT: { label: t("filters_status_hot"), className: "bg-destructive/10 text-destructive border-destructive/20" },
  CLOSED: { label: t("filters_status_closed"), className: "bg-success/10 text-success border-success/20" },
  LOST: { label: t("filters_status_lost"), className: "bg-muted text-muted-foreground border-border" },
});

export default function StatusBadge({ status }: { status: LeadStatus }) {
  const { t } = useLanguage();
  const config = statusConfig(t)[status];

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
