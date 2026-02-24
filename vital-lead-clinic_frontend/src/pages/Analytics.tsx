// src/pages/Analytics.tsx
import { useState } from "react";
import {
  TrendingUp, Users, DollarSign, Clock, Calendar,
  Download, Filter, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, Target, Award, MessageSquare,
  Smartphone, Mail, ChevronLeft, ChevronRight, Bell,
  AlertCircle, CheckCircle, XCircle, Activity, RefreshCw,
  Loader2
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Area, AreaChart
} from "recharts";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useLeads } from "@/hooks/useLeads";
import { useAutomations } from "@/hooks/useAutomations";

const statusColors = {
  NEW: "hsl(210, 80%, 55%)",
  HOT: "hsl(0, 72%, 55%)",
  CLOSED: "hsl(152, 60%, 42%)",
  LOST: "hsl(240, 15%, 75%)"
};

const sourceColors: Record<string, string> = {
  'וואטסאפ': '#25D366',
  'פייסבוק': '#1877F2',
  'אינסטגרם': '#E4405F',
  'המלצות': '#8B5CF6',
  'אחר': '#6B7280'
};

interface StatusDataItem {
  name: string;
  value: number;
  color: string;
}

interface SourceDataItem {
  name: string;
  value: number;
  conversion: number;
  color: string;
}

interface WeeklyDataItem {
  day: string;
  leads: number;
  returned: number;
}

interface MonthlyDataItem {
  month: string;
  leads: number;
  returned: number;
  revenue: number;
  recovered: number;
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState('month');
  const { t, language } = useLanguage();

  // Hooks
  const {
    kpi,
    statusDistribution,
    sourcePerformance,
    weeklyActivity,
    isLoading: analyticsLoading,
    error: analyticsError,
    refresh,
    period,
    setPeriod
  } = useAnalytics(dateRange);

  const { leads } = useLeads();
  const { stats: automationStats, isLoading: automationsLoading } = useAutomations();

  // Prepare chart data
  const prepareStatusData = (): StatusDataItem[] => {
    if (!statusDistribution || statusDistribution.length === 0) {
      return [];
    }

    return statusDistribution.map(item => ({
      name: item.status === 'NEW' ? t("new_status") :
        item.status === 'HOT' ? t("hot_status") :
          item.status === 'CLOSED' ? t("closed_status") : t("lost_status"),
      value: parseInt(item.count) || 0,
      color: statusColors[item.status as keyof typeof statusColors] || '#6B7280'
    }));
  };

  const prepareWeeklyData = (): WeeklyDataItem[] => {
    if (!weeklyActivity || weeklyActivity.length === 0) {
      return [
        { day: t("sunday"), leads: 0, returned: 0 },
        { day: t("monday"), leads: 0, returned: 0 },
        { day: t("tuesday"), leads: 0, returned: 0 },
        { day: t("wednesday"), leads: 0, returned: 0 },
        { day: t("thursday"), leads: 0, returned: 0 },
        { day: t("friday"), leads: 0, returned: 0 },
        { day: t("saturday"), leads: 0, returned: 0 }
      ];
    }

    const daysMap: Record<string, number> = {
      [t("sunday")]: 0, [t("monday")]: 1, [t("tuesday")]: 2,
      [t("wednesday")]: 3, [t("thursday")]: 4, [t("friday")]: 5, [t("saturday")]: 6
    };

    const fullWeek: WeeklyDataItem[] = [
      t("sunday"), t("monday"), t("tuesday"), t("wednesday"),
      t("thursday"), t("friday"), t("saturday")
    ].map(day => ({
      day,
      leads: 0,
      returned: 0
    }));

    weeklyActivity.forEach(item => {
      const index = daysMap[item.day];
      if (index !== undefined) {
        fullWeek[index].leads = item.leads || 0;
        fullWeek[index].returned = Math.floor((item.leads || 0) * 0.3);
      }
    });

    return fullWeek;
  };

  const prepareSourceData = (): SourceDataItem[] => {
    if (!sourcePerformance || sourcePerformance.length === 0) {
      return [];
    }

    const totalLeads = sourcePerformance.reduce((sum, item) => sum + (item.count || 0), 0);

    return sourcePerformance.map(item => ({
      name: item.source || t("other"),
      value: totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0,
      conversion: Math.round((item.count / totalLeads) * 100) || 0,
      color: sourceColors[item.source || t("other")] || sourceColors['אחר']
    }));
  };

  const prepareMonthlyData = (): MonthlyDataItem[] => {
    // Generate mock monthly data based on actual totals
    const months = [t("jan"), t("feb"), t("mar"), t("apr"), t("may"), t("jun")];
    const totalLeads = kpi?.totalLeads || 100;

    return months.map((month, i) => ({
      month,
      leads: Math.floor(totalLeads * (0.1 + i * 0.03)),
      returned: Math.floor(totalLeads * 0.1 * (1 + i * 0.1)),
      revenue: Math.floor((totalLeads * 1500) * (0.8 + i * 0.1)),
      recovered: Math.floor((totalLeads * 500) * (0.8 + i * 0.1))
    }));
  };

  const statusChartData = prepareStatusData();
  const weeklyChartData = prepareWeeklyData();
  const sourceChartData = prepareSourceData();
  const monthlyChartData = prepareMonthlyData();

  // Handle refresh
  const handleRefresh = () => {
    refresh();
  };

  // Handle date range change
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    setPeriod(value);
  };

  const averageLeadValue = kpi?.totalLeads && kpi?.totalLeads > 0
    ? Math.round((kpi.totalRevenue || 0) / kpi.totalLeads)
    : 0;

  // Loading state
  if (analyticsLoading && !kpi) {
    return (
      <div className="space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (analyticsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]" dir={language === 'he' ? 'rtl' : 'ltr'}>
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">{t("error_loading_data")}</h2>
        <p className="text-muted-foreground mb-4">{analyticsError}</p>
        <Button onClick={handleRefresh}>{t("try_again")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{t("analytics_title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("analytics_subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
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
            disabled={analyticsLoading}
          >
            <RefreshCw className={`h-4 w-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border shadow-card hover:shadow-card-hover transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("return_rate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{kpi?.returnRate || 0}%</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <ArrowUpRight className="h-3 w-3" />
              <span>{t("plus_percent_last_month").replace('%s', '12.5')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-card hover:shadow-card-hover transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("recovery_revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ₪{(kpi?.totalRevenue || 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <ArrowUpRight className="h-3 w-3" />
              <span>{t("plus_percent_last_month").replace('%s', '23')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-card hover:shadow-card-hover transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("hot_leads")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{kpi?.hotLeads || 0}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
              <ArrowDownRight className="h-3 w-3" />
              <span>{t("performance")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-card hover:shadow-card-hover transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("avg_value_per_lead")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ₪{averageLeadValue}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>{t("target")}: ₪2,500</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 rounded-xl">
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="recovery">{t("customer_recovery")}</TabsTrigger>
          <TabsTrigger value="sources">{t("lead_sources")}</TabsTrigger>
          <TabsTrigger value="automation">{t("automation_performance")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("conversion_trends")}</CardTitle>
              <CardDescription>{t("comparison_leads_conversions")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 12%, 90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(0, 0%, 100%)",
                        border: "1px solid hsl(240, 12%, 90%)",
                        borderRadius: "10px",
                        direction: language === 'he' ? 'rtl' : 'ltr'
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="leads"
                      name={t("leads")}
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="returned"
                      name={t("returned_leads")}
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      name={t("revenue") || "הכנסות (₪)"}
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("status_distribution")}</CardTitle>
                <CardDescription>{t("segmentation_by_status")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {statusChartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                      <span className="text-sm font-bold text-foreground mr-auto">
                        {item.value}
                      </span>
                    </div>
                  ))}
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
                  {sourceChartData.length > 0 ? sourceChartData.map((source) => (
                    <div key={source.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{source.name}</span>
                        <span className="font-bold text-foreground">{source.value}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${source.value}%`, backgroundColor: source.color }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t("conversion")}: {Math.round(source.value * 0.4)}%</span>
                        <span>{t("avg_value")}: ₪{(source.value * 100).toFixed(0)}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-muted-foreground py-4">{t("no_data")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recovery Tab */}
        <TabsContent value="recovery" className="space-y-4">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("customer_recovery")}</CardTitle>
              <CardDescription>{t("track_recovered_customers")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 12%, 90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(0, 0%, 100%)",
                        border: "1px solid hsl(240, 12%, 90%)",
                        borderRadius: "10px",
                        direction: language === 'he' ? 'rtl' : 'ltr'
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="returned"
                      name={t("returned_leads")}
                      stackId="1"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("success_rate")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{kpi?.returnRate || 0}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("returned_leads")}
                </p>
                <div className="mt-4 h-2 bg-muted rounded-full">
                  <div
                    className="h-2 bg-success rounded-full"
                    style={{ width: `${kpi?.returnRate || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("avg_value")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">5.2 {t("days")}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("days_since_last_message")}
                </p>
                <div className="flex items-center gap-2 mt-4 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>{t("performance")}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("recovery_revenue")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  ₪{(kpi?.totalRevenue || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("this_month")}
                </p>
                <div className="flex items-center gap-2 mt-4 text-xs text-success">
                  <TrendingUp className="h-3 w-3" />
                  <span>{t("performance")}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recovery Table */}
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("returned_leads")}</CardTitle>
              <CardDescription>{t("track_recovered_customers")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-right py-3 font-semibold">{t("full_name")}</th>
                      <th className="text-right py-3 font-semibold">{t("lost_status")}</th>
                      <th className="text-right py-3 font-semibold">{t("returned_leads")}</th>
                      <th className="text-right py-3 font-semibold">{t("days")}</th>
                      <th className="text-right py-3 font-semibold">{t("messages_count").replace('{count}', '')}</th>
                      <th className="text-right py-3 font-semibold">{t("value")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads && leads.slice(0, 5).map((lead, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-3 font-medium">{lead.name}</td>
                        <td className="py-3 text-muted-foreground">15/02/2025</td>
                        <td className="py-3 text-muted-foreground">22/02/2025</td>
                        <td className="py-3 text-muted-foreground">7</td>
                        <td className="py-3 text-muted-foreground">4</td>
                        <td className="py-3 font-bold">₪{(lead.value || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name={t("leads")} fill="#3B82F6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                  {sourceChartData.map((source) => (
                    <div key={source.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${source.color}20` }}>
                          <MessageSquare className="h-4 w-4" style={{ color: source.color }} />
                        </div>
                        <div>
                          <p className="font-medium">{source.name}</p>
                          <p className="text-xs text-muted-foreground">{t("value")}: ₪{(source.value * 50).toFixed(0)}</p>
                        </div>
                      </div>
                      <div className={language === 'he' ? 'text-left' : 'text-right'}>
                        <p className="font-bold text-success">₪{(source.value * 200).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">ROI: {source.value * 4}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-border lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">{t("automation_performance")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("messages_sent_month")}</p>
                  <p className="text-2xl font-bold">{automationStats?.totals?.totalExecutions || 0}</p>
                  <p className="text-xs text-success mt-1">{t("plus_percent_last_month").replace('%s', '23')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("response_rate")}</p>
                  <p className="text-2xl font-bold">
                    {automationStats?.totals?.totalExecutions && automationStats?.totals?.totalExecutions > 0
                      ? Math.round((automationStats.totals.totalReplies || 0) / automationStats.totals.totalExecutions * 100)
                      : 0}%
                  </p>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className="h-2 bg-primary rounded-full"
                      style={{
                        width: automationStats?.totals?.totalExecutions && automationStats?.totals?.totalExecutions > 0
                          ? `${(automationStats.totals.totalReplies || 0) / automationStats.totals.totalExecutions * 100}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("active_rules")}</p>
                  <p className="text-2xl font-bold">{automationStats?.totals?.activeCount || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg">{t("rule_performance")}</CardTitle>
                <CardDescription>{t("performance_by_source")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="returned" name={t("returned_leads")} stroke="#10B981" strokeWidth={2} />
                      <Line type="monotone" dataKey="leads" name={t("leads")} stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}