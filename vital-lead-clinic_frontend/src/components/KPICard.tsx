import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  variant?: "default" | "primary" | "success" | "warning" | "info";
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-card border-primary/20",
  success: "bg-card border-success/20",
  warning: "bg-card border-warning/20",
  info: "bg-card border-info/20",
};

const iconVariantStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "gradient-primary text-primary-foreground",
  success: "gradient-success text-success-foreground",
  warning: "gradient-warning text-warning-foreground",
  info: "bg-info text-info-foreground",
};

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: KPICardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 animate-fade-in",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            iconVariantStyles[variant]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-left space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-extrabold text-card-foreground">{value}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        {subtitle && (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-[11px] font-semibold flex items-center gap-1",
              trend.positive ? "text-success" : "text-destructive"
            )}
          >
            {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% מהחודש שעבר
          </p>
        )}
      </div>
    </div>
  );
}
