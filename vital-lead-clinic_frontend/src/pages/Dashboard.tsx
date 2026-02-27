// src/pages/Dashboard.tsx
import {
  Users,
  DollarSign,
  Clock,
  Flame,
  CheckCircle,
  XCircle,
  MessageSquare,
  Target,
  RefreshCw,
  Bell,
  AlertCircle,
  Download,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import KPICard from "@/components/KPICard";
import StatusBadge from "@/components/StatusBadge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useLeads } from "@/hooks/useLeads";
import { useAutomations } from "@/hooks/useAutomations";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { translateAutomationName } from "@/lib/automationNames";

// Types
interface Activity {
  id: string;
  type: 'new' | 'hot' | 'followup' | 'closed' | 'return';
  name: string;
  desc: string;
  time: string;
  value: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface SourceData {
  name: string;
  value: number;
  conversion: number;
  color: string;
}

interface FollowupLead {
  id: string | number;
  name?: string;
  status?: string;
  last_contacted?: string | null;
}

// Constants
const STATUS_COLORS: Record<string, string> = {
  ALL: "hsl(210, 10%, 50%)",
  NEW: "hsl(210, 80%, 55%)",
  HOT: "hsl(0, 72%, 55%)",
  CLOSED: "hsl(152, 60%, 42%)",
  LOST: "hsl(240, 15%, 75%)"
};

const SOURCE_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  facebook: "#1877F2",
  instagram: "#E4405F",
  website: "#8B5CF6",
  other: "#6B7280"
};

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('month');
  const [isExporting, setIsExporting] = useState(false);
  const { t, language } = useLanguage();
  const statusNames = useMemo(() => ({
    ALL: t("all_leads"),
    NEW: t("status_new"),
    HOT: t("status_hot"),
    CLOSED: t("status_closed"),
    LOST: t("status_lost")
  }), [t]);

  const weekDays = useMemo(() => [
    t("sunday"),
    t("monday"),
    t("tuesday"),
    t("wednesday"),
    t("thursday"),
    t("friday"),
    t("saturday"),
  ], [t]);

  const formatCurrency = useCallback((value?: number | null) => {
    const formatter = new Intl.NumberFormat(language === "he" ? "he-IL" : "en-US", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return formatter.format(value || 0);
  }, [language]);

  const formatSourceLabel = useCallback((source?: string) => {
    const value = (source || "").toLowerCase().trim();
    if (value.includes("whatsapp") || value.includes("וואטסאפ")) return t("source_whatsapp");
    if (value.includes("facebook") || value.includes("פייסבוק")) return t("source_facebook");
    if (value.includes("instagram") || value.includes("אינסטגרם")) return t("source_instagram");
    if (value.includes("site") || value.includes("website") || value.includes("אתר")) return t("source_website");
    if (!source) return "-";
    return source;
  }, [t]);

  // Real data hooks
  const {
    kpi,
    statusDistribution,
    sourcePerformance,
    weeklyActivity,
    teamPerformance,
    isLoading: analyticsLoading,
    error: analyticsError,
    refresh: refreshAnalytics,
    setPeriod
  } = useAnalytics(timeRange);

  const {
    leads,
    filters,
    setFilters,
    getFollowupNeeded,
    fetchLeads,
    isLoading: leadsLoading
  } = useLeads();
  const { stats: automationStats, fetchAutomations, fetchStats, isLoading: automationsLoading } = useAutomations();

  const [followupLeads, setFollowupLeads] = useState<FollowupLead[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>(() => filters.status || "all");

  const loadFollowupLeads = useCallback(async () => {
    try {
      const data = await getFollowupNeeded();
      setFollowupLeads(data);
    } catch (error) {
      console.error('Error loading followup leads:', error);
    }
  }, [getFollowupNeeded]);

  // Load follow-up leads
  useEffect(() => {
    loadFollowupLeads();
  }, [loadFollowupLeads]);

  const normalizedStatusFilter = statusFilter === "followup" ? "followup" : statusFilter?.toUpperCase();

  const displayLeads = useMemo(() => {
    if (normalizedStatusFilter === "followup") {
      return followupLeads;
    }

    if (!normalizedStatusFilter || normalizedStatusFilter === "ALL") {
      return leads;
    }

    return leads.filter((lead) => (lead.status || "").toUpperCase() === normalizedStatusFilter);
  }, [normalizedStatusFilter, followupLeads, leads]);

  useEffect(() => {
    if (statusFilter === "followup") {
      loadFollowupLeads();
    }
  }, [statusFilter, loadFollowupLeads]);

  // Generate recent activity from leads data
  useEffect(() => {
    if (displayLeads?.length) {
      const descriptionSets = language === "he"
        ? [
            "ליד חדש נוסף למערכת",
            "הפך לחם - מוכן לטיפול",
            "לא הגיב 5 ימים - דורש מעקב",
            "טיפול נסגר - הכנסה חדשה",
            "חזר לאחר הודעות מעקב אוטומטיות"
          ]
        : [
            "New lead captured",
            "Lead marked as hot - ready for treatment",
            "No reply for 5 days - follow up needed",
            "Deal closed - new revenue added",
            "Lead returned after automated follow-up"
          ];

      const daysAgo = (count: number) =>
        language === "he"
          ? t("days_ago").replace("%s", String(count))
          : `${count} ${t("days_ago").toLowerCase()}`;

      const days = [
        t("today"),
        t("yesterday"),
        daysAgo(3),
        daysAgo(7),
        daysAgo(14),
      ];

      const types: Activity['type'][] = ['new', 'hot', 'followup', 'closed', 'return'];

      const activities: Activity[] = displayLeads.slice(0, 5).map((lead, index) => ({
        id: lead.id,
        type: types[index % types.length],
        name: lead.name,
        desc: descriptionSets[index % descriptionSets.length],
        time: days[index % days.length],
        value: lead.value || Math.floor(Math.random() * 1000) + 200
      }));

      setRecentActivity(activities);
    }
  }, [displayLeads, language, t]);

  const handleTimeRangeChange = useCallback((value: string) => {
    setTimeRange(value);
    setPeriod(value);
  }, [setPeriod]);

  const handleStatusFilterChange = useCallback((filterKey: string) => {
    setStatusFilter(filterKey);
    setFilters((prev) => {
      const next = { ...prev };
      if (filterKey === "all" || filterKey === "followup") {
        delete next.status;
      } else {
        next.status = filterKey;
      }
      return next;
    });
  }, [setFilters]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refreshAnalytics(),
      fetchLeads(),
      fetchAutomations(),
      fetchStats(),
      loadFollowupLeads()
    ]);
  }, [refreshAnalytics, fetchLeads, fetchAutomations, fetchStats, loadFollowupLeads]);

  const isLoading = analyticsLoading || leadsLoading || automationsLoading;

  // Prepare chart data from API responses with useMemo for performance
  const statusCounts = useMemo(() => {
    const distributionMap: Record<string, number> = {
      ALL: kpi?.totalLeads || leads.length || 0,
      NEW: 0,
      HOT: 0,
      CLOSED: 0,
      LOST: 0
    };

    statusDistribution?.forEach(item => {
      const key = (item.status || "").toUpperCase();
      const count = typeof item.count === "string" ? parseInt(item.count, 10) : item.count || 0;
      distributionMap[key] = Math.max(distributionMap[key] || 0, count || 0);
    });

    if (!distributionMap.ALL) {
      const fallbackTotal = Object.entries(distributionMap).reduce((sum, [key, value]) => {
        if (key === "ALL") return sum;
        return sum + (value || 0);
      }, 0);
      if (fallbackTotal) {
        distributionMap.ALL = fallbackTotal;
      }
    }

    return distributionMap;
  }, [statusDistribution, kpi?.totalLeads, leads.length]);

  const statusFilterOptions = useMemo(() => {
    const options = [
      {
        key: "all",
        label: statusNames.ALL,
        count: statusCounts.ALL || kpi?.totalLeads || leads.length
      },
      {
        key: "NEW",
        label: statusNames.NEW,
        count: statusCounts.NEW
      },
      {
        key: "HOT",
        label: statusNames.HOT,
        count: statusCounts.HOT
      },
      {
        key: "CLOSED",
        label: statusNames.CLOSED,
        count: statusCounts.CLOSED
      },
      {
        key: "LOST",
        label: statusNames.LOST,
        count: statusCounts.LOST
      },
      {
        key: "followup",
        label: t("needs_followup_clock"),
        count: followupLeads.length
      }
    ];
    return options;
  }, [statusCounts, statusNames, kpi?.totalLeads, leads.length, followupLeads.length, t]);

  const statusChartData = useMemo((): StatusData[] => {
    if (!statusDistribution?.length) return [];

    return statusDistribution.map(item => ({
      name: statusNames[item.status] || item.status,
      value: parseInt(item.count) || 0,
      color: STATUS_COLORS[item.status] || '#6B7280'
    }));
  }, [statusDistribution, statusNames]);

  const weeklyChartData = useMemo(() => {
    const baseDays = [
      { key: "sunday", label: weekDays[0] },
      { key: "monday", label: weekDays[1] },
      { key: "tuesday", label: weekDays[2] },
      { key: "wednesday", label: weekDays[3] },
      { key: "thursday", label: weekDays[4] },
      { key: "friday", label: weekDays[5] },
      { key: "saturday", label: weekDays[6] },
    ];

    if (!weeklyActivity?.length) {
      return baseDays.map(({ label }) => ({ day: label, leads: 0 }));
    }

    const normalizeDay = (value: string) => {
      const cleaned = (value || "").toLowerCase().replace(/[^a-z\u0590-\u05ff×־]/g, "");
      const map: Record<string, string> = {
        sunday: "sunday",
        sun: "sunday",
        monday: "monday",
        mon: "monday",
        tuesday: "tuesday",
        tue: "tuesday",
        wednesday: "wednesday",
        wed: "wednesday",
        thursday: "thursday",
        thu: "thursday",
        friday: "friday",
        fri: "friday",
        saturday: "saturday",
        sat: "saturday",
        "ראשון": "sunday",
        "שני": "monday",
        "שלישי": "tuesday",
        "רביעי": "wednesday",
        "חמישי": "thursday",
        "שישי": "friday",
        "שבת": "saturday",
        "×¨××©×•×Ÿ": "sunday",
        "×©× ×™": "monday",
        "×©×œ×™×©×™": "tuesday",
        "×¨×‘×™×¢×™": "wednesday",
        "×—×ž×™×©×™": "thursday",
        "×©×™×©×™": "friday",
        "×©×‘×ª": "saturday",
      };
      return map[cleaned];
    };

    const fullWeek = baseDays.map(({ label }) => ({ day: label, leads: 0 }));

    weeklyActivity.forEach(item => {
      const key = normalizeDay(item.day);
      const index = baseDays.findIndex(d => d.key === key);
      if (index !== -1) {
        fullWeek[index].leads = item.leads || 0;
      }
    });

    return fullWeek;
  }, [weeklyActivity, weekDays]);

  const sourceChartData = useMemo((): SourceData[] => {
    if (!sourcePerformance?.length) return [];

    const normalizeSource = (source?: string) => {
      const value = (source || "").toLowerCase().trim();
      if (value.includes("whatsapp") || value.includes("וואטסאפ") || value === "×•×•××˜×¡××¤") return "whatsapp";
      if (value.includes("facebook") || value.includes("פייסבוק") || value === "×¤×™×™×¡×‘×•×§") return "facebook";
      if (value.includes("instagram") || value.includes("אינסטגרם") || value === "××™× ×¡×˜×’×¨×") return "instagram";
      if (value.includes("site") || value.includes("website") || value.includes("אתר") || value === "×”×ž×œ×¦×•×ª") return "website";
      return "other";
    };

    const totalLeads = sourcePerformance.reduce((sum, item) => sum + (item.count || 0), 0);

    return sourcePerformance.map(item => {
      const normalized = normalizeSource(item.source);
      return {
        name: item.source || t("other") || "Other",
        value: totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0,
        conversion: Math.round((item.count / totalLeads) * 100) || 0,
        color: SOURCE_COLORS[normalized] || SOURCE_COLORS.other
      };
    });
  }, [sourcePerformance, t]);

  const lostLeads = useMemo(() => {
    if (kpi?.lostLeads !== undefined) return kpi.lostLeads;
    if (!kpi?.totalLeads) return 0;
    return kpi.totalLeads - (kpi.closedLeads + kpi.hotLeads + (kpi.newLeads || 0));
  }, [kpi]);

  const automationSuccessRate = useMemo(() => {
    if (!automationStats?.totals?.totalExecutions) return 0;
    return ((automationStats.totals.totalReplies || 0) / automationStats.totals.totalExecutions) * 100;
  }, [automationStats]);

  const normalizeTrendLabel = useCallback((template: string, fallback = "") => {
    const cleaned = template
      .replace(/\+?%s%?/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    return cleaned || fallback;
  }, []);

  const toCsvCell = useCallback((value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined) {
      return "";
    }

    const asText = String(value).replace(/"/g, '""');
    return /[",\n]/.test(asText) ? `"${asText}"` : asText;
  }, []);

  const toCsvRow = useCallback((values: Array<string | number | boolean | null | undefined>) => {
    return values.map(toCsvCell).join(",");
  }, [toCsvCell]);

  const handleExport = useCallback(() => {
    try {
      setIsExporting(true);

      const rows: string[] = [];
      const now = new Date();

      rows.push(toCsvRow(["Dashboard export"]));
      rows.push(toCsvRow(["Generated at", now.toISOString()]));
      rows.push(toCsvRow(["Period", timeRange]));
      rows.push("");

      rows.push(toCsvRow(["KPI", "Value"]));
      rows.push(toCsvRow([t("total_leads"), kpi?.totalLeads || 0]));
      rows.push(toCsvRow([t("hot_leads"), kpi?.hotLeads || 0]));
      rows.push(toCsvRow([t("return_rate"), `${kpi?.returnRate || 0}%`]));
      rows.push(toCsvRow([t("recovery_revenue"), kpi?.totalRevenue || 0]));
      rows.push(toCsvRow([t("needs_followup_clock"), followupLeads.length]));
      rows.push("");

      rows.push(toCsvRow(["Status", "Count"]));
      statusChartData.forEach((item) => {
        rows.push(toCsvRow([item.name, item.value]));
      });
      rows.push("");

      rows.push(toCsvRow(["Source", "Share (%)"]));
      sourceChartData.forEach((item) => {
        rows.push(toCsvRow([item.name, item.value]));
      });
      rows.push("");

      rows.push(toCsvRow(["Weekday", "Leads"]));
      weeklyChartData.forEach((item) => {
        rows.push(toCsvRow([item.day, item.leads]));
      });
      rows.push("");

      rows.push(toCsvRow([t("recent_leads_title")]));
      rows.push(toCsvRow([t("full_name"), t("status"), t("source"), t("value_shekels")]));
      displayLeads.slice(0, 20).forEach((lead) => {
        rows.push(toCsvRow([lead.name || "-", lead.status || "-", lead.source || "-", lead.value || 0]));
      });

      const csvContent = rows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dashboard-${timeRange}-${now.toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t("export"),
        description: "Dashboard CSV downloaded.",
      });
    } catch (error) {
      console.error("Error exporting dashboard:", error);
      toast({
        title: "Export failed",
        description: "Unable to export dashboard data.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [kpi, followupLeads.length, statusChartData, sourceChartData, weeklyChartData, leads, toCsvRow, timeRange, t]);

  // Show error state
  if (analyticsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">{t("error_loading_data")}</h2>
        <p className="text-muted-foreground mb-4">{analyticsError}</p>
        <Button onClick={handleRefresh}>{t("try_again")}</Button>
      </div>
    );
  }

  // Show loading state
  if (isLoading && !kpi) {
    return (
      <div className="space-y-6">
        {/* Header skeletons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>

        {/* First row KPI skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>

        {/* Second row KPI skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>

        {/* Chart skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>

        {/* Activity feed skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground font-display">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("dashboard_subtitle")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusFilterOptions.map((option) => {
              const isActive = statusFilter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleStatusFilterChange(option.key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-muted/10 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                  )}
                >
                  <span>{option.label}</span>
                  {typeof option.count === "number" && (
                    <span className="text-[11px] text-muted-foreground">{option.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue placeholder={t("date_range")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t("last_week_option")}</SelectItem>
              <SelectItem value="month">{t("last_month_option")}</SelectItem>
              <SelectItem value="quarter">{t("last_quarter_option")}</SelectItem>
              <SelectItem value="year">{t("last_year_option")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={handleExport}
            disabled={isExporting}
            title={t("export")}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* First Row - Main KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KPICard
          title={t("total_leads")}
          value={kpi?.totalLeads || 0}
          icon={Users}
          variant="primary"
          trend={
            kpi?.totalLeads
              ? {
                value: Math.round(((kpi.newLeads || 0) / kpi.totalLeads) * 100),
                positive: true,
                label: normalizeTrendLabel(t("plus_new"), t("new"))
              }
              : undefined
          }
        />
        <KPICard
          title={t("hot_leads")}
          value={kpi?.hotLeads || 0}
          icon={Flame}
          variant="warning"
          trend={
            kpi?.totalLeads
              ? {
                value: Math.round(((kpi.hotLeads || 0) / kpi.totalLeads) * 100),
                positive: true,
                label: t("performance")
              }
              : undefined
          }
        />
        <KPICard
          title={t("return_rate")}
          value={`${kpi?.returnRate || 0}%`}
          icon={Target}
          variant="success"
          subtitle={`${kpi?.returnedLeads || 0} ` + t("returned_leads")}
        />
        <KPICard
          title={t("recovery_revenue")}
          value={formatCurrency(kpi?.totalRevenue)}
          icon={DollarSign}
          variant="info"
        />
      </div>

      {/* Second Row - Secondary KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KPICard
          title={t("send_reminder")}
          value={`${(kpi?.avgResponseHours ?? 0).toFixed(1)} ${language === "he" ? "שעות" : "hrs"}`}
          icon={Clock}
          subtitle={t("last_3_days")}
        />
        <KPICard
          title={t("treatment_scheduled_new_revenue")}
          value={kpi?.closedLeads || 0}
          icon={CheckCircle}
          subtitle={t("this_month")}
          trend={
            kpi?.totalLeads
              ? {
                value: Math.round(((kpi.closedLeads || 0) / kpi.totalLeads) * 100),
                positive: true,
                label: t("performance")
              }
              : undefined
          }
        />
        <KPICard
          title={t("status_lost")}
          value={lostLeads}
          icon={XCircle}
          variant="destructive"
          subtitle={t("this_month")}
          trend={
            kpi?.totalLeads
              ? {
                value: Math.round((lostLeads / kpi.totalLeads) * 100),
                positive: false,
                label: t("performance")
              }
              : undefined
          }
        />
        <KPICard
          title={t("needs_followup_clock")}
          value={kpi?.followupNeeded ?? followupLeads.length}
          icon={Bell}
          variant="warning"
          subtitle={t("leads_not_responded")}
          trend={
            kpi?.totalLeads
              ? {
                value: Math.round(((kpi.followupNeeded || 0) / kpi.totalLeads) * 100),
                positive: false,
                label: t("leads_pending_followup")
              }
              : undefined
          }
        />
      </div>

      {/* Follow-up Alert */}
      {followupLeads.length > 0 && (
        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-warning" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {followupLeads.length} {t("followup_banner_title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("followup_banner_subtitle")}
              </p>
            </div>
            <Link to="/leads?filter=followup">
              <Button variant="outline" size="sm" className="rounded-xl">
                {t("review_followups")}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Charts Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="recovery">{t("customer_recovery")}</TabsTrigger>
          <TabsTrigger value="sources">{t("lead_sources")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Weekly chart */}
            <Card className="lg:col-span-2 rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("sent_messages_month")}</CardTitle>
                <CardDescription>{t("status_distribution")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 12%, 90%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(0, 0%, 100%)",
                        border: "1px solid hsl(240, 12%, 90%)",
                        borderRadius: "10px",
                        direction: language === "he" ? "rtl" : "ltr"
                      }}
                      formatter={(value: number) => [value, t("leads")]}
                    />
                    <Bar
                      dataKey="leads"
                      name={t("leads")}
                      fill="hsl(210, 80%, 55%)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status distribution */}
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("status_distribution")}</CardTitle>
                <CardDescription>{t("segmentation_by_status")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {statusChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recovery Tab */}
        <TabsContent value="recovery" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Recovery metrics */}
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("customer_recovery")}</CardTitle>
                <CardDescription>{t("track_recovered_customers")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{t("return_rate")}</span>
                      <span className="text-sm font-bold">{kpi?.returnRate || 0}%</span>
                    </div>
                    <Progress value={kpi?.returnRate || 0} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded-xl">
                      <p className="text-2xl font-bold text-success">{kpi?.returnedLeads || 0}</p>
                      <p className="text-xs text-muted-foreground">{t("client_returned")}</p>
                    </div>
                    <div className="text-center p-4 bg-muted/30 rounded-xl">
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(kpi?.returnedRevenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("recovery_revenue")}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Automation performance */}
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("automation_performance")}</CardTitle>
                <CardDescription>{t("performance_by_source")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("days")}</span>
                    <span className="font-bold">{automationStats?.totals?.totalExecutions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("responses_received")}</span>
                    <span className="font-bold text-success">{automationStats?.totals?.totalReplies || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("active")}</span>
                    <span className="font-bold">{automationStats?.totals?.activeCount || 0}</span>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{t("response_rate")}</span>
                      <span className="text-sm font-bold">{Math.round(automationSuccessRate)}%</span>
                    </div>
                    <Progress value={automationSuccessRate} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("lead_sources")}</CardTitle>
                <CardDescription>{t("quality_by_source")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sourceChartData.length > 0 ? sourceChartData.map((source) => (
                    <div key={source.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{source.name}</span>
                        <span className="font-bold">{source.value}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${source.value}%`, backgroundColor: source.color }}
                        />
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-4">{t("no_data")}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("performance_by_source")}</CardTitle>
                <CardDescription>{t("quality_by_source")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamPerformance?.length ? (
                    teamPerformance.slice(0, 5).map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.leadsAssigned || 0} {t("leads")} | {member.conversions || 0} {t("conversion")}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-success">
                            {member.leadsAssigned ? Math.round((member.conversions / member.leadsAssigned) * 100) : 0}%
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">{t("no_data")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card className="rounded-2xl border-border">
          <CardHeader>
          <CardTitle className="text-lg">{t("recent_activity_title")}</CardTitle>
          <CardDescription>{t("recent_activity_subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn(
                      "text-xs",
                      activity.type === 'return' && "bg-success/10 text-success",
                      activity.type === 'hot' && "bg-warning/10 text-warning",
                      activity.type === 'followup' && "bg-info/10 text-info",
                      activity.type === 'closed' && "bg-primary/10 text-primary",
                    )}>
                      {activity.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{activity.name}</p>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.desc}</p>
                    {activity.value > 0 && (
                      <p className="text-xs font-bold text-success mt-1">{formatCurrency(activity.value)}</p>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-center text-muted-foreground py-4">{t("no_data")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Rules */}
        <Card className="rounded-2xl border-border">
          <CardHeader>
          <CardTitle className="text-lg">{t("top_automations_title")}</CardTitle>
          <CardDescription>{t("top_automations_subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {automationStats?.stats?.length ? (
                automationStats.stats
                  .sort((a, b) => (b.successRate || 0) - (a.successRate || 0))
                  .slice(0, 5)
                  .map((rule) => (
                    <div key={rule.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                      <span className="truncate max-w-[150px]">{translateAutomationName(rule.name, t)}</span>
                          <span className="text-success">{Math.round(rule.successRate || 0)}%</span>
                        </div>
                      <Progress value={rule.successRate || 0} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t("sent_messages_month")}: {rule.totalExecutions || 0}</span>
                        <span>{t("responses_received")}: {rule.replyCount || 0}</span>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-center text-muted-foreground py-4">{t("no_data")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads Table */}
      <Card className="rounded-2xl border-border overflow-hidden">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t("recent_leads_title")}</CardTitle>
              <CardDescription>{t("recent_leads_subtitle")}</CardDescription>
            </div>
            <Link to="/leads">
              <Button variant="ghost" size="sm" className="rounded-xl">
                {t("view_all")}
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="border-b border-border">
                <th className="text-right px-6 py-3 font-medium">{t("full_name")}</th>
                <th className="text-right px-6 py-3 font-medium">{t("service")}</th>
                <th className="text-right px-6 py-3 font-medium">{t("status")}</th>
                <th className="text-right px-6 py-3 font-medium">{t("source")}</th>
                <th className="text-right px-6 py-3 font-medium">{t("value_shekels")}</th>
                <th className="text-right px-6 py-3 font-medium">{t("last_3_days")}</th>
                <th className="text-right px-6 py-3 font-medium">{t("next_followup")}</th>
              </tr>
            </thead>
            <tbody>
              {displayLeads?.length ? (
                displayLeads.slice(0, 5).map((lead) => {
                  const daysSinceLastContact = lead.last_contacted
                    ? Math.floor((new Date().getTime() - new Date(lead.last_contacted).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                  return (
                    <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {lead.name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{lead.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{lead.service || '-'}</td>
                      <td className="px-6 py-4"><StatusBadge status={lead.status} /></td>
                      <td className="px-6 py-4 text-muted-foreground">{formatSourceLabel(lead.source)}</td>
                      <td className="px-6 py-4 font-bold">{formatCurrency(lead.value)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {daysSinceLastContact === 0 ? t("today") :
                              daysSinceLastContact === 1 ? t("yesterday") :
                                daysSinceLastContact > 0 ? `${t("days_ago")} ${daysSinceLastContact}` : t("minutes_ago")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {daysSinceLastContact >= 3 && lead.status !== 'CLOSED' && lead.status !== 'LOST' ? (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            {t("needs_followup_clock")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            {t("status_closed")}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t("no_clinic_data")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
