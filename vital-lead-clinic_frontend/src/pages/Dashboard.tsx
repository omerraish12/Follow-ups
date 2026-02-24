// src/pages/Dashboard.tsx
import {
  Users,
  DollarSign,
  Clock,
  Flame,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  MessageSquare,
  Target,
  RefreshCw,
  Bell,
  AlertCircle,
  Download,
  ArrowLeft,
  Loader2,
  TrendingUp
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
  LineChart,
  Line,
  AreaChart,
  Area
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

// Constants
const STATUS_COLORS: Record<string, string> = {
  NEW: "hsl(210, 80%, 55%)",
  HOT: "hsl(0, 72%, 55%)",
  CLOSED: "hsl(152, 60%, 42%)",
  LOST: "hsl(240, 15%, 75%)"
};

const SOURCE_COLORS: Record<string, string> = {
  'וואטסאפ': '#25D366',
  'פייסבוק': '#1877F2',
  'אינסטגרם': '#E4405F',
  'המלצות': '#8B5CF6',
  'אחר': '#6B7280'
};

const STATUS_NAMES: Record<string, string> = {
  NEW: 'חדש',
  HOT: 'חם',
  CLOSED: 'נסגר',
  LOST: 'אבוד'
};

const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('month');
  const { t } = useLanguage();

  // Real data hooks
  const {
    kpi,
    statusDistribution,
    sourcePerformance,
    weeklyActivity,
    teamPerformance,
    isLoading: analyticsLoading,
    error: analyticsError,
    refresh: refreshAnalytics
  } = useAnalytics(timeRange);

  const { leads, getFollowupNeeded, isLoading: leadsLoading } = useLeads();
  const { stats: automationStats, isLoading: automationsLoading } = useAutomations();

  const [followupLeads, setFollowupLeads] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  // Load follow-up leads
  useEffect(() => {
    const loadFollowupLeads = async () => {
      try {
        const data = await getFollowupNeeded();
        setFollowupLeads(data);
      } catch (error) {
        console.error('Error loading followup leads:', error);
      }
    };

    loadFollowupLeads();
  }, [getFollowupNeeded]);

  // Generate recent activity from leads data
  useEffect(() => {
    if (leads?.length) {
      const activities: Activity[] = leads.slice(0, 5).map((lead, index) => {
        const days = ['היום', 'אתמול', 'לפני 3 ימים', 'לפני שבוע', 'לפני שבועיים'];
        const types: Activity['type'][] = ['new', 'hot', 'followup', 'closed', 'return'];
        const descriptions = [
          'ליד חדש נוצר במערכת',
          'הפך לחם - מעוניין בטיפול',
          'לא הגיב 5 ימים - דורש מעקב',
          'טיפול נקבע - הכנסה חדשה',
          'חזר לאחר הודעת מעקב אוטומטית'
        ];

        return {
          id: lead.id,
          type: types[index % types.length],
          name: lead.name,
          desc: descriptions[index % descriptions.length],
          time: days[index % days.length],
          value: lead.value || Math.floor(Math.random() * 1000) + 200
        };
      });

      setRecentActivity(activities);
    }
  }, [leads]);

  const handleRefresh = useCallback(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  const isLoading = analyticsLoading || leadsLoading || automationsLoading;

  // Prepare chart data from API responses with useMemo for performance
  const statusChartData = useMemo((): StatusData[] => {
    if (!statusDistribution?.length) return [];

    return statusDistribution.map(item => ({
      name: STATUS_NAMES[item.status] || item.status,
      value: parseInt(item.count) || 0,
      color: STATUS_COLORS[item.status] || '#6B7280'
    }));
  }, [statusDistribution]);

  const weeklyChartData = useMemo(() => {
    if (!weeklyActivity?.length) {
      return WEEKDAYS.map(day => ({ day, leads: 0 }));
    }

    const daysMap: Record<string, number> = {
      'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6
    };

    const fullWeek = WEEKDAYS.map(day => ({ day, leads: 0 }));

    weeklyActivity.forEach(item => {
      const index = daysMap[item.day];
      if (index !== undefined) {
        fullWeek[index].leads = item.leads || 0;
      }
    });

    return fullWeek;
  }, [weeklyActivity]);

  const sourceChartData = useMemo((): SourceData[] => {
    if (!sourcePerformance?.length) return [];

    const totalLeads = sourcePerformance.reduce((sum, item) => sum + (item.count || 0), 0);

    return sourcePerformance.map(item => ({
      name: item.source || 'אחר',
      value: totalLeads > 0 ? Math.round((item.count / totalLeads) * 100) : 0,
      conversion: Math.round((item.count / totalLeads) * 100) || 0,
      color: SOURCE_COLORS[item.source] || SOURCE_COLORS['אחר']
    }));
  }, [sourcePerformance]);

  const lostLeads = useMemo(() => {
    if (!kpi?.totalLeads) return 0;
    return kpi.totalLeads - (kpi.closedLeads + kpi.hotLeads + (kpi.newLeads || 0));
  }, [kpi]);

  const automationSuccessRate = useMemo(() => {
    if (!automationStats?.totals?.totalExecutions) return 0;
    return ((automationStats.totals.totalReplies || 0) / automationStats.totals.totalExecutions) * 100;
  }, [automationStats]);

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
          <h1 className="text-2xl font-extrabold text-foreground">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("analytics_subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
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
          <Button variant="outline" size="icon" className="rounded-xl">
            <Download className="h-4 w-4" />
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
          trend={{
            value: kpi?.newLeads || 0,
            positive: true,
            label: t("plus_new")
          }}
        />
        <KPICard
          title={t("hot_leads")}
          value={kpi?.hotLeads || 0}
          icon={Flame}
          variant="warning"
          trend={{
            value: kpi?.totalLeads ? Math.round((kpi.hotLeads / kpi.totalLeads) * 100) : 0,
            positive: true,
            label: "% " + t("performance")
          }}
        />
        <KPICard
          title={t("return_rate")}
          value={`${kpi?.returnRate || 0}%`}
          icon={Target}
          variant="success"
          trend={{
            value: 5,
            positive: true,
            label: t("plus_percent_last_month")
          }}
          subtitle={`${kpi?.returnedLeads || 0} ` + t("returned_leads")}
        />
        <KPICard
          title={t("recovery_revenue")}
          value={`₪${(kpi?.totalRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          variant="info"
          trend={{
            value: 23,
            positive: true,
            label: t("performance")
          }}
        />
      </div>

      {/* Second Row - Secondary KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KPICard
          title={t("send_reminder")}
          value="2.5 שעות"
          icon={Clock}
          subtitle={t("last_3_days")}
          trend={{ value: 15, positive: true, label: t("performance") }}
        />
        <KPICard
          title={t("treatment_scheduled_new_revenue")}
          value={kpi?.closedLeads || 0}
          icon={CheckCircle}
          subtitle={t("this_month")}
          trend={{ value: 8, positive: true, label: t("performance") }}
        />
        <KPICard
          title={t("status_lost")}
          value={lostLeads}
          icon={XCircle}
          variant="destructive"
          subtitle={t("this_month")}
          trend={{ value: 3, positive: false, label: t("performance") }}
        />
        <KPICard
          title={t("needs_followup_clock")}
          value={followupLeads.length}
          icon={Bell}
          variant="warning"
          subtitle={t("leads_not_responded")}
          trend={{ value: 2, positive: false, label: t("leads_pending_followup") }}
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
                {t("reminder_leads_need_followup").replace("%s", followupLeads.length.toString())}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("leads_not_responded_followup")}
              </p>
            </div>
            <Link to="/leads?filter=followup">
              <Button variant="outline" size="sm" className="rounded-xl">
                {t("view_leads")}
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
                        direction: "rtl"
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
                        ₪{(kpi?.returnedRevenue || 0).toLocaleString()}
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
            <CardTitle className="text-lg">{t("new_message_from_lead")}</CardTitle>
            <CardDescription>{t("became_hot")}</CardDescription>
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
                      <p className="text-xs font-bold text-success mt-1">₪{activity.value}</p>
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
            <CardTitle className="text-lg">{t("message_templates")}</CardTitle>
            <CardDescription>{t("performance_by_source")}</CardDescription>
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
                        <span className="truncate max-w-[150px]">{rule.name}</span>
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
              <CardTitle className="text-lg">{t("returned_leads")}</CardTitle>
              <CardDescription>5 {t("leads")} {t("today")}</CardDescription>
            </div>
            <Link to="/leads">
              <Button variant="ghost" size="sm" className="rounded-xl">
                {t("view_leads")}
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
              {leads?.length ? (
                leads.slice(0, 5).map((lead) => {
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
                      <td className="px-6 py-4 text-muted-foreground">{lead.source || '-'}</td>
                      <td className="px-6 py-4 font-bold">₪{(lead.value || 0).toLocaleString()}</td>
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