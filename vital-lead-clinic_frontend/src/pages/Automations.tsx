// src/pages/Automations.tsx
import {
  Zap, Clock, MessageSquare, ToggleLeft, ToggleRight, Trash2, Info,
  Users, AlertCircle, CheckCircle, TrendingUp, Bell
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import StatusBadge from "@/components/StatusBadge";
import AutomationRuleDialog from "@/components/AutomationRuleDialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAutomations } from "@/hooks/useAutomations";
import { leadService } from "@/services/leadService";
import type { Automation } from "@/types/automation";
import type { LeadStatus } from "@/types/leads";

interface ExtendedAutomationRule extends Automation {
  triggerDays: number[];
  successRate?: number;
  totalExecutions?: number;
  replyCount?: number;
  notifyOnReply?: boolean;
  personalizationFields?: string[];
}

export default function Automations() {
  const { t, language } = useLanguage();
  const {
    automations,
    isLoading,
    error,
    stats,
    toggleAutomation,
    deleteAutomation,
    fetchAutomations,
    fetchStats
  } = useAutomations();

  const [rules, setRules] = useState<ExtendedAutomationRule[]>([]);
  const [followupNeeded, setFollowupNeeded] = useState<{ leadId: string; leadName: string; days: number }[]>([]);

  // Map backend automations into UI-friendly objects
  useEffect(() => {
    const mapped = automations.map((a) => ({
      ...a,
      triggerDays: a.trigger_days || [3, 7, 14],
      totalExecutions: a.total_executions || 0,
      replyCount: a.reply_count || 0,
      successRate: a.success_rate || 0,
      notifyOnReply: a.notify_on_reply ?? true,
      personalizationFields: a.personalization || [],
    }));
    setRules(mapped);
  }, [automations]);

  // Load follow-up needed leads (uses backend)
  useEffect(() => {
    const loadFollowups = async () => {
      try {
        const leads = await leadService.getFollowupNeeded();
        const mapped = leads.map((lead: any) => {
          const days = lead.last_contacted
            ? Math.floor((Date.now() - new Date(lead.last_contacted).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          return { leadId: lead.id, leadName: lead.name, days };
        });
        setFollowupNeeded(mapped);
      } catch (err) {
        console.error("Error loading followups", err);
      }
    };
    loadFollowups();
  }, []);

  const activeCount = rules.filter((r) => r.active).length;
  const totalExecutions = stats?.totals?.total_executions ?? rules.reduce((sum, r) => sum + (r.totalExecutions || 0), 0);
  const totalReplies = stats?.totals?.total_replies ?? rules.reduce((sum, r) => sum + (r.replyCount || 0), 0);
  const avgSuccessRate = totalExecutions > 0 ? Math.round((totalReplies / totalExecutions) * 100) : 0;

  const handleToggle = async (id: string) => {
    try {
      const updated = await toggleAutomation(id);
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: updated.active } : r)));
      fetchStats();
    } catch (_) { /* toast handled in hook */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAutomation(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      fetchStats();
    } catch (_) { /* toast handled */ }
  };

  const cards = useMemo(() => ([
    {
      title: t("messages_sent_month"),
      value: totalExecutions,
      icon: <TrendingUp className="h-3 w-3" />,
      accent: "success",
      detail: t("plus_percent_last_month").replace('%s', '23')
    },
    {
      title: t("responses_received"),
      value: totalReplies,
      icon: <MessageSquare className="h-3 w-3" />,
      accent: "success",
      detail: `${t("response_rate")} ${avgSuccessRate}%`
    },
    {
      title: t("returned_leads"),
      value: stats?.totals?.active_count ?? activeCount,
      icon: <CheckCircle className="h-3 w-3" />,
      accent: "success",
      detail: t("plus_percent_last_month").replace('%s', '18')
    },
    {
      title: t("followups_pending"),
      value: followupNeeded.length,
      icon: <Bell className="h-3 w-3" />,
      accent: "warning",
      detail: t("leads_waiting_reply")
    }
  ]), [t, totalExecutions, totalReplies, avgSuccessRate, activeCount, followupNeeded.length, stats?.totals?.active_count]);

  return (
    <div className="space-y-5 lg:space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground font-display">Automation Studio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build follow‑ups that feel personal and run on time, every time.
          </p>
        </div>
        <AutomationRuleDialog onSuccess={() => { fetchAutomations(); fetchStats(); }} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <Card key={idx} className="rounded-2xl border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <div className={cn("flex items-center gap-1 mt-1 text-xs",
                card.accent === "success" ? "text-success" : "text-warning")}>
                {card.icon}
                <span>{card.detail}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="rules">{t("rules")}</TabsTrigger>
          <TabsTrigger value="followups">{t("followups")}</TabsTrigger>
          <TabsTrigger value="insights">{t("insights")}</TabsTrigger>
        </TabsList>

        {/* Rules tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading && !rules.length && (
              <Card className="border-dashed border-2">
                <CardContent className="py-8 text-center text-muted-foreground">{t("loading")}</CardContent>
              </Card>
            )}
            {error && (
              <Card className="border-destructive/40">
                <CardContent className="py-6 flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{t("error_loading_automations")}</span>
                </CardContent>
              </Card>
            )}
            {rules.map((rule) => (
              <Card key={rule.id} className={cn("relative rounded-2xl border-2", rule.active ? "border-primary/30" : "border-border")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <Clock className="h-3.5 w-3.5" />
                        {t("every_days").replace("%s", (rule.triggerDays || []).join(", "))}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full text-xs">
                        {rule.target_status || "NEW"}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleToggle(rule.id)}>
                        {rule.active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">{rule.message}</p>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                      <Zap className="h-3 w-3" /> {t("auto_followups")}
                    </span>
                    {rule.notifyOnReply && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                        <Bell className="h-3 w-3" /> {t("notify_on_reply")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="font-bold text-foreground text-sm">{rule.totalExecutions ?? 0}</p>
                      <p className="text-muted-foreground mt-1">{t("messages_sent_month")}</p>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="font-bold text-foreground text-sm">{rule.replyCount ?? 0}</p>
                      <p className="text-muted-foreground mt-1">{t("responses_received")}</p>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="font-bold text-foreground text-sm">{rule.successRate ?? 0}%</p>
                      <p className="text-muted-foreground mt-1">{t("response_rate")}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <AutomationRuleDialog rule={rule} onSuccess={() => { fetchAutomations(); fetchStats(); }} />
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(rule.id)}>
                        {rule.active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("confirm_delete")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("rule_removed_successfully")}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(rule.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              {t("delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Followups tab */}
        <TabsContent value="followups">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t("followups_pending")}</CardTitle>
              <CardDescription>{t("leads_waiting_reply")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {followupNeeded.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("no_data")}</p>
              )}
              {followupNeeded.map((item) => (
                <div key={item.leadId} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{item.leadName}</p>
                      <p className="text-xs text-muted-foreground">{t("days_since_contact").replace("%s", String(item.days))}</p>
                    </div>
                  </div>
                  <StatusBadge status={"HOT" as LeadStatus} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights tab */}
        <TabsContent value="insights">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" /> {t("delivery_quality")}
                </CardTitle>
                <CardDescription>{t("last_30_days")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{t("delivery_rate")}</span>
                    <span>98%</span>
                  </div>
                  <Progress value={98} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{t("response_rate")}</span>
                    <span>{avgSuccessRate}%</span>
                  </div>
                  <Progress value={avgSuccessRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" /> {t("recent_activity")}
                </CardTitle>
                <CardDescription>{t("automation_activity_log")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {rules.slice(0, 4).map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div>
                      <p className="font-semibold">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">{t("messages_sent_month")}: {rule.totalExecutions ?? 0}</p>
                    </div>
                  </div>
                ))}
                {rules.length === 0 && <p className="text-sm text-muted-foreground">{t("no_data")}</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
