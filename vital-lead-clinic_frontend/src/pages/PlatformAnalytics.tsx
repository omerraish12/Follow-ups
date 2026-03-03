import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { platformService, type PlatformAnalyticsPayload } from "@/services/platformService";

const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US").format(value || 0);

const formatDate = (value: string, locale: string) => {
  if (!value) return value;
  try {
    return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
      month: "short",
      day: "numeric"
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function PlatformAnalytics() {
  const { t, language } = useLanguage();
  const [analytics, setAnalytics] = useState<PlatformAnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await platformService.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error("Error loading platform analytics:", err);
      setError(t("platform_analytics_error"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = analytics?.totals ?? {
    totalSent: 0,
    totalReceived: 0,
    totalMessages: 0,
    estimatedCostUsd: 0,
    costPerMessageUsd: 0
  };

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language === "he" ? "he-IL" : "en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2
      }),
    [language]
  );

  const lastUpdated = analytics?.generatedAt
    ? new Date(analytics.generatedAt)
    : null;
  const lastUpdatedLabel = lastUpdated
    ? new Intl.DateTimeFormat(language === "he" ? "he-IL" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(lastUpdated)
    : null;

  const last30Days = analytics?.messagesLast30Days || [];
  const clinics = analytics?.clinics || [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("platform_analytics_title")}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">{t("platform_analytics_description")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={loadAnalytics} disabled={isLoading}>
              {t("platform_analytics_refresh")}
            </Button>
            {lastUpdatedLabel && (
              <p className="text-xs text-muted-foreground">
                {t("platform_analytics_generated_at").replace("{0}", lastUpdatedLabel)}
              </p>
            )}
          </div>
        </div>
        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      <Card className="rounded-2xl border border-border bg-card shadow-card">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{t("platform_analytics_totals_title")}</CardTitle>
              <CardDescription>{t("platform_analytics_last30days_description")}</CardDescription>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.3em]">
              {t("platform_analytics_totals_total")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1 rounded-2xl border border-border/70 bg-card/80 p-4 text-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{t("platform_analytics_totals_sent")}</p>
            <p className="text-2xl font-semibold text-foreground">{formatNumber(totals.totalSent, language)}</p>
            <p className="text-[11px] text-muted-foreground">{t("platform_analytics_totals_sent")} • {formatNumber(totals.totalSent, language)}</p>
          </div>
          <div className="space-y-1 rounded-2xl border border-border/70 bg-card/80 p-4 text-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{t("platform_analytics_totals_received")}</p>
            <p className="text-2xl font-semibold text-foreground">{formatNumber(totals.totalReceived, language)}</p>
            <p className="text-[11px] text-muted-foreground">{t("platform_analytics_totals_received")} • {formatNumber(totals.totalReceived, language)}</p>
          </div>
          <div className="space-y-1 rounded-2xl border border-border/70 bg-card/80 p-4 text-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{t("platform_analytics_totals_total")}</p>
            <p className="text-2xl font-semibold text-foreground">{formatNumber(totals.totalMessages, language)}</p>
            <p className="text-[11px] text-muted-foreground">
              {currencyFormatter.format(totals.estimatedCostUsd)}
            </p>
          </div>
          <div className="space-y-1 rounded-2xl border border-border/70 bg-card/80 p-4 text-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{t("platform_analytics_totals_cost")}</p>
            <p className="text-2xl font-semibold text-foreground">{currencyFormatter.format(totals.estimatedCostUsd)}</p>
            <p className="text-[11px] text-muted-foreground">{t("platform_analytics_cost_per_message")}: {currencyFormatter.format(totals.costPerMessageUsd)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border bg-card shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t("platform_analytics_last30days_title")}</CardTitle>
          <CardDescription>{t("platform_analytics_last30days_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {last30Days.map((day) => (
              <div key={day.day} className="rounded-2xl border border-border/70 bg-card/80 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{formatDate(day.day, language)}</p>
                <p className="text-lg font-semibold text-foreground">{formatNumber(day.sent, language)} {t("platform_analytics_totals_sent")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatNumber(day.received, language)} {t("platform_analytics_totals_received")}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border bg-card shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t("platform_analytics_per_clinic_title")}</CardTitle>
          <CardDescription>{t("platform_analytics_per_clinic_description")}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">{t("clinic_name")}</th>
                <th className="px-3 py-2 text-right">{t("platform_analytics_table_sent")}</th>
                <th className="px-3 py-2 text-right">{t("platform_analytics_table_received")}</th>
                <th className="px-3 py-2 text-right">{t("platform_analytics_table_leads")}</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="border-t border-border/70">
                  <td className="px-3 py-2 font-semibold text-foreground">{clinic.name}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(clinic.sent, language)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(clinic.received, language)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(clinic.leads, language)}</td>
                </tr>
              ))}
              {!clinics.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-5 text-center text-muted-foreground">
                    {t("no_data")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
