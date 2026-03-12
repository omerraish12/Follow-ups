// src/pages/Automations.tsx
import {
  Zap, Clock, MessageSquare, ToggleLeft, ToggleRight, Trash2, Info,
  Users, AlertCircle, CheckCircle, TrendingUp, Bell, Rocket, ArrowRight, Phone, Plus, X
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAutomations } from "@/hooks/useAutomations";
import { leadService } from "@/services/leadService";
import { useIntegrationLogs } from "@/hooks/useIntegrationLogs";
import { useAutomationReplies } from "@/hooks/useAutomationReplies";
import { whatsappService, type WhatsAppProvider } from "@/services/whatsappService";
import type { Automation, AutomationComponent } from "@/types/automation";
import { integrationLogService } from "@/services/integrationLogService";

const MAX_QUICK_REPLIES = 3;
import type { LeadStatus } from "@/types/leads";
import { automationService } from "@/services/automationService";

interface ExtendedAutomationRule extends Automation {
  triggerDays: number[];
  successRate?: number;
  totalExecutions?: number;
  replyCount?: number;
  notifyOnReply?: boolean;
  personalizationFields?: string[];
  displayName?: string;
  displayMessage?: string;
}

export default function Automations() {
  const { t, language } = useLanguage();
  const isRTL = language === "he";
  const {
    automations,
    isLoading,
    error,
    stats,
    toggleAutomation,
    deleteAutomation,
    fetchAutomations,
    fetchStats,
    addAutomation,
    resubmitTemplate,
    refreshTemplateStatus,
    approveTemplate,
    approvingTemplateId
  } = useAutomations({ seedDefaultsOnEmpty: true });
  const { logs, isLoading: logsLoading, error: logsError, refreshLogs } = useIntegrationLogs(5);
  const { replies, isLoading: repliesLoading, error: repliesError, refresh: refreshReplies } = useAutomationReplies(5);
  const [deliveryStats, setDeliveryStats] = useState<{ queued: number; sent: number; delivered: number; read: number; failed: number }>({
    queued: 0, sent: 0, delivered: 0, read: 0, failed: 0
  });
  const [waIssues, setWaIssues] = useState<string | null>(null);

  const [rules, setRules] = useState<ExtendedAutomationRule[]>([]);
  const [followupNeeded, setFollowupNeeded] = useState<{ leadId: string; leadName: string; days: number }[]>([]);
  const [activeTab, setActiveTab] = useState("rules");
  const [templateName, setTemplateName] = useState("");
  const [templateMessage, setTemplateMessage] = useState("");
  const [includeMedia, setIncludeMedia] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(["new_lead"]);
  const [templateLanguage, setTemplateLanguage] = useState("en");
  const [inactiveDays, setInactiveDays] = useState(60);
  const [whProvider, setWhProvider] = useState<WhatsAppProvider>("wa_web");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [quickReplies, setQuickReplies] = useState<AutomationComponent[]>([]);
  const [resubmittingTemplateId, setResubmittingTemplateId] = useState<string | null>(null);
  const [refreshingTemplateId, setRefreshingTemplateId] = useState<string | null>(null);

  const INACTIVE_TRIGGER_KEY = "inactive_no_visit";
  const DEFAULT_INACTIVE_DAYS = 60;
  const isBridgeProvider = whProvider === "wa_web";

  useEffect(() => {
    const loadProvider = async () => {
      try {
        const config = await whatsappService.getConfig();
        setWhProvider(config.provider);
      } catch (error) {
        console.error("Failed to load WhatsApp provider", error);
      }
    };
    loadProvider();
    automationService.getDeliveryStats().then(setDeliveryStats).catch(() => {});
    integrationLogService.getSystemLogs(5).then((logs) => {
      const issue = logs.find(
        (log) =>
          (log.type === "whatsapp_send" || log.type === "whatsapp_health") &&
          (log.level === "error" || log.level === "warning")
      );
      if (issue) setWaIssues(issue.message);
    }).catch(() => {});
  }, []);

  const addQuickReply = () => {
    setQuickReplies((prev) =>
      prev.length >= MAX_QUICK_REPLIES
        ? prev
        : [...prev, { type: "quick_reply", title: "", payload: "" }]
    );
  };

  const updateQuickReply = (index: number, value: Partial<AutomationComponent>) => {
    setQuickReplies((prev) =>
      prev.map((reply, idx) => (idx === index ? { ...reply, ...value } : reply))
    );
  };

  const removeQuickReply = (index: number) => {
    setQuickReplies((prev) => prev.filter((_, idx) => idx !== index));
  };

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
        const mapped = leads.map((lead: { id: string | number; name?: string; last_contacted?: string | null }) => {
          const days = lead.last_contacted
            ? Math.floor((Date.now() - new Date(lead.last_contacted).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          return { leadId: String(lead.id), leadName: lead.name || t("unknown_lead"), days };
        });
        setFollowupNeeded(mapped);
      } catch (err) {
        console.error("Error loading followups", err);
      }
    };
    loadFollowups();
  }, [t]);

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

  const handleResubmitTemplate = async (ruleId: string) => {
    setResubmittingTemplateId(ruleId);
    try {
      await resubmitTemplate(ruleId);
    } finally {
      setResubmittingTemplateId(null);
    }
  };

  const handleRefreshTemplateStatus = async (ruleId: string) => {
    setRefreshingTemplateId(ruleId);
    try {
      await refreshTemplateStatus(ruleId);
    } finally {
      setRefreshingTemplateId(null);
    }
  };

  const handleApproveTemplate = async (rule: ExtendedAutomationRule) => {
    if (!rule.template_name) {
      toast({
        title: t("error"),
        description: t("approve_template_no_template"),
        variant: "destructive"
      });
      return;
    }
    try {
      await approveTemplate(rule.id);
    } catch (_) { /* toast handled in hook */ }
  };

  const handleToggleTrigger = (key: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const triggerDayMap: Record<string, number> = {
    new_lead: 0,
    missing_reply: 3,
    appointment_missed: 5,
    high_value: 1
  };

  const resolveTriggerDays = () => {
    const numericInactiveDays = Number(inactiveDays) || DEFAULT_INACTIVE_DAYS;
    return Array.from(
      new Set(
        selectedTriggers.map((trigger) =>
          trigger === INACTIVE_TRIGGER_KEY
            ? numericInactiveDays
            : triggerDayMap[trigger] ?? 3
        )
      )
    );
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !templateMessage.trim()) {
      toast({
        title: t("template_error_required_title"),
        description: t("template_error_required_description"),
        variant: "destructive"
      });
      return;
    }

    setIsSavingTemplate(true);
    try {
      const triggerDays = resolveTriggerDays();
      const messageText = templateMessage.trim();
      const quickReplyComponents = quickReplies
        .map((reply) => {
          const title = reply?.title?.trim();
          if (!title) return null;
          return {
            type: "quick_reply" as const,
            title,
            payload: reply?.payload?.trim() || title
          };
        })
        .filter(Boolean);

      await addAutomation({
        name: templateName.trim(),
        templateName: templateName.trim(),
        templateLanguage,
        mediaUrl: includeMedia ? mediaUrl.trim() : null,
        components: quickReplyComponents,
        message: messageText,
        triggerDays,
        targetStatus: "NEW",
        personalization: ["name", "service", "appointment_date"],
        notifyOnReply: true,
        active: true
      });

      setTemplateName("");
      setTemplateMessage("");
      setIncludeMedia(false);
      setMediaUrl("");
      setSelectedTriggers(["new_lead"]);
      setTemplateLanguage("en");
      setQuickReplies([]);
    } catch {
      // addAutomation already surfaces errors via toast
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const automationLocalization: Record<string, { nameKey: string; messageKey: string }> = {
    "Test Template": {
      nameKey: "automation_rule_test_name",
      messageKey: "automation_rule_test_message"
    },
    "14-Day Win-back": {
      nameKey: "automation_rule_winback_name",
      messageKey: "automation_rule_winback_message"
    },
    "7-Day Reminder": {
      nameKey: "automation_rule_7day_name",
      messageKey: "automation_rule_7day_message"
    },
    "3-Day Follow-up": {
      nameKey: "automation_rule_3day_name",
      messageKey: "automation_rule_3day_message"
    }
  };

  const localizedRules = useMemo(
    () =>
      rules.map((rule) => {
        const override = automationLocalization[rule.name];
        if (!override) return rule;
        return {
          ...rule,
          displayName: t(override.nameKey),
          displayMessage: t(override.messageKey)
        };
      }),
    [rules, t]
  );

  const followupAutomation = localizedRules.find(
    (rule) =>
      rule.template_name === 'three_week_followup' ||
      rule.name === '3-Week Follow-up'
  );
  const followupStatusRaw = (followupAutomation?.template_status || 'pending').toLowerCase();
  const isFollowupApproved = isBridgeProvider || followupStatusRaw === 'approved';
  const followupStatusLabelKey = isBridgeProvider
    ? 'template_status_ready_tag'
    : followupStatusRaw === 'approved'
      ? 'template_status_approved_tag'
      : followupStatusRaw === 'rejected'
        ? 'template_status_rejected_tag'
        : 'template_status_pending_tag';
  const followupStatusHelpKey = isBridgeProvider
    ? 'template_status_ready_help'
    : followupStatusRaw === 'rejected'
      ? 'template_status_rejected_help'
      : 'template_status_pending_help';
  const followupQuickReplies = (followupAutomation?.components || []).filter(
    (component) => component?.type === 'quick_reply'
  );

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
      title: t("delivery_status"),
      value: `${deliveryStats.delivered + deliveryStats.read}/${deliveryStats.sent + deliveryStats.delivered + deliveryStats.read}`,
      icon: <CheckCircle className="h-3 w-3" />,
      accent: "success",
      detail: `${t("queued")}: ${deliveryStats.queued} · ${t("failed")}: ${deliveryStats.failed}`
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

  const workflowSteps = useMemo(() => ([
    {
      title: t("automation_workflow_step_reply_title"),
      desc: t("automation_workflow_step_reply_desc")
    },
    {
      title: t("automation_workflow_step_template_title"),
      desc: t("automation_workflow_step_template_desc")
    },
    {
      title: t("automation_workflow_step_status_title"),
      desc: t("automation_workflow_step_status_desc")
    },
    {
      title: t("automation_workflow_step_activity_title"),
      desc: t("automation_workflow_step_activity_desc")
    },
  ]), [t]);

  const showcaseStats = useMemo(() => ([
    {
      value: "78%",
      label: t("landing_stat_return_rate"),
      icon: CheckCircle,
      iconClass: "bg-success/10 text-success",
    },
    {
      value: "45K",
      label: t("landing_stat_monthly_revenue"),
      icon: TrendingUp,
      iconClass: "bg-primary/10 text-primary",
    },
    {
      value: "24/7",
      label: t("landing_stat_auto_followup"),
      icon: Clock,
      iconClass: "bg-warning/10 text-warning",
    },
    {
      value: "3.2x",
      label: t("landing_stat_roi"),
      icon: Zap,
      iconClass: "bg-primary/10 text-primary",
    }
  ]), [t]);

  const setupSteps = useMemo(() => ([
    {
      icon: MessageSquare,
      title: t("landing_how_step1_title"),
      desc: t("landing_how_step1_desc"),
      stats: t("landing_how_step1_stats")
    },
    {
      icon: Zap,
      title: t("landing_how_step2_title"),
      desc: t("landing_how_step2_desc"),
      stats: t("landing_how_step2_stats")
    },
    {
      icon: Rocket,
      title: t("landing_how_step3_title"),
      desc: t("landing_how_step3_desc"),
      stats: t("landing_how_step3_stats")
    }
  ]), [t]);

  return (
    <div className="space-y-5 lg:space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
      {waIssues && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm shadow-sm">
          <div className="font-semibold">{t("whatsapp_issue_title")}</div>
          <div className="text-destructive/80">{waIssues}</div>
          <button
            onClick={() => refreshLogs()}
            className="mt-2 inline-flex items-center rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold hover:bg-destructive/20"
          >
            {t("view_logs")}
          </button>
        </div>
      )}
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-secondary/10 to-card p-6 md:p-8 shadow-none">
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-48 w-48 rounded-full bg-secondary/25 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-4xl">
            <Badge variant="outline" className="w-fit rounded-full border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white backdrop-blur">
              WhatsApp automation
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-display font-semibold text-foreground">
                {t("automations_title")}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground">
                {t("automations_subtitle")}
              </p>
              <p className="text-sm text-muted-foreground/90">
                {t("automation_workflow_description")}
              </p>
              <p className="text-sm text-muted-foreground/80">
                {t("automation_followup_story")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AutomationRuleDialog onSuccess={() => { fetchAutomations(); fetchStats(); }} />
          </div>
        </div>
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

      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/90 to-card p-6 shadow-xl shadow-primary/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <Badge variant="outline" className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
              WhatsApp
            </Badge>
            <div className="flex items-start gap-1">
              <h3 className="text-2xl font-bold text-foreground">{t("whatsapp_builder_title")}</h3>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px] text-[11px] leading-snug">
                    {t("automation_template_tooltip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {t("whatsapp_builder_subtitle")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("automation_builder_help")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("automation_builder_template_note")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-primary" />
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
              {t("whatsapp_builder_tag")}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{t("template_name_label")}</p>
                <Input
                  placeholder={t("template_name_placeholder")}
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="rounded-2xl bg-card"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{t("template_language_label")}</p>
                <Select value={templateLanguage} onValueChange={setTemplateLanguage}>
                  <SelectTrigger className="rounded-2xl bg-card">
                    <SelectValue placeholder={t("template_language_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t("english")}</SelectItem>
                    <SelectItem value="he">{t("hebrew")}</SelectItem>
                    <SelectItem value="es">{t("spanish")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{t("template_message_label")}</p>
              <Textarea
                placeholder={t("template_message_placeholder")}
                value={templateMessage}
                onChange={(e) => setTemplateMessage(e.target.value)}
                className="rounded-2xl bg-card"
                rows={5}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{t("quick_replies_label")}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full border border-muted/40 px-4 py-1 text-[10px]"
                  onClick={addQuickReply}
                  disabled={quickReplies.length >= MAX_QUICK_REPLIES}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t("automation_add_quick_reply")}
                </Button>
              </div>
              <div className="space-y-2">
                {quickReplies.length ? (
                  quickReplies.map((reply, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={reply.title}
                        onChange={(event) => updateQuickReply(index, { title: event.target.value })}
                        placeholder={t("quick_reply_placeholder")}
                        className="flex-1 rounded-2xl bg-card"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeQuickReply(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">{t("quick_reply_empty")}</p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{t("quick_reply_help")}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {t("template_triggers_label")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
              {[
                { key: "new_lead", label: t("template_trigger_new_lead") },
                { key: "missing_reply", label: t("template_trigger_missing_reply") },
                { key: "appointment_missed", label: t("template_trigger_appointment_missed") },
                { key: "high_value", label: t("template_trigger_high_value") },
                { key: "inactive_no_visit", label: t("template_trigger_inactive_no_visit") }
              ].map((trigger) => {
                const active = selectedTriggers.includes(trigger.key);
                return (
                  <Button
                      key={trigger.key}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "rounded-full px-4 py-1 text-xs uppercase tracking-[0.25em] transition",
                      active
                        ? "bg-primary text-white"
                        : "bg-muted/30 text-muted-foreground hover:bg-primary/10"
                      )}
                      onClick={() => handleToggleTrigger(trigger.key)}
                    >
                      {trigger.label}
                    </Button>
                  );
                })}
             </div>
              {selectedTriggers.includes(INACTIVE_TRIGGER_KEY) && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <label className="mr-2">{t("inactive_days_label")}</label>
                  <Input
                    type="number"
                    value={inactiveDays}
                    onChange={(e) => setInactiveDays(Math.max(7, Number(e.target.value) || 0))}
                    min={7}
                    className="w-24 rounded-full bg-card/80"
                  />
                </div>
              )}
            </div>

            <div
              className={cn(
                "flex items-center gap-3",
                isRTL ? "flex-row-reverse justify-end" : "justify-between"
              )}
            >
              <p className={cn("text-sm font-semibold text-foreground", isRTL && "text-right")}>
                {t("template_media_label")}
              </p>
              <Switch checked={includeMedia} onCheckedChange={setIncludeMedia} />
            </div>
            {includeMedia && (
              <Input
                placeholder={t("template_media_placeholder")}
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="rounded-2xl bg-card"
              />
            )}
            <Button
              size="lg"
              className="w-full rounded-2xl"
              onClick={handleCreateTemplate}
              disabled={isSavingTemplate}
            >
              {t("template_create_button")}
            </Button>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/90 p-6 text-sm text-foreground space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("template_preview_title")}</span>
              <Badge variant="outline" className="rounded-full text-[10px] text-primary">
                {t("template_preview_channel")}
              </Badge>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {templateName || t("template_preview_placeholder_name")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {templateMessage || t("template_preview_placeholder_message")}
              </p>
            </div>
            <div className="space-y-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <p>{t("template_variables_label")}</p>
              <div className="flex flex-wrap gap-2">
                {["{name}", "{service}", "{appointment_date}"].map((token) => (
                  <span key={token} className="rounded-full bg-muted/20 px-3 py-1 text-[11px] font-semibold">
                    {token}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{t("template_preview_footer").replace('%s', selectedTriggers.length.toString())}</div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-7 lg:p-9 shadow-card">
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-warning/10 blur-3xl" />

        <div className="relative space-y-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {showcaseStats.map((item) => (
              <Card key={item.label} className="rounded-2xl border border-border/70 bg-card/90 shadow-sm">
                <CardContent className="p-4 text-center sm:p-5">
                  <div className={cn("mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl", item.iconClass)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-extrabold text-foreground sm:text-3xl">{item.value}</div>
                  <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold tracking-wide text-primary"
            >
              {t("landing_how_badge")}
            </Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("landing_how_title")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t("landing_how_subtitle")}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {setupSteps.map((step, index) => (
              <Card
                key={step.title}
                className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.desc}</p>
                  <Badge variant="secondary" className="mt-5 bg-primary/10 text-primary hover:bg-primary/15">
                    {step.stats}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => setActiveTab("rules")} className="rounded-full gradient-primary text-primary-foreground shadow-card">
              {t("automations_tab_rules")}
              <ArrowRight className={cn("h-4 w-4", language === "he" ? "mr-2" : "ml-2")} />
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab("insights")}
              className="rounded-full border-primary/30 bg-card/80 hover:bg-card"
            >
              {t("automations_tab_insights")}
            </Button>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="rules">{t("automations_tab_rules")}</TabsTrigger>
          <TabsTrigger value="followups">{t("automations_tab_followups")}</TabsTrigger>
          <TabsTrigger value="insights">{t("automations_tab_insights")}</TabsTrigger>
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
          {localizedRules.map((rule) => {
              const templateStatusRaw = (rule.template_status || "pending").toLowerCase();
              const isTemplateApproved = isBridgeProvider || templateStatusRaw === "approved";
              const statusLabelKey = isBridgeProvider
                ? "template_status_ready_tag"
                : templateStatusRaw === "approved"
                  ? "template_status_approved_tag"
                  : templateStatusRaw === "rejected"
                    ? "template_status_rejected_tag"
                    : "template_status_pending_tag";
              const statusHelpKey = isBridgeProvider
                ? "template_status_ready_help"
                : templateStatusRaw === "rejected"
                  ? "template_status_rejected_help"
                  : "template_status_pending_help";
              const quickReplyCount = Array.isArray(rule.components)
                ? rule.components.filter((component) => component?.type === "quick_reply").length
                : 0;
              return (
              <Card
                key={rule.id}
                className={cn(
                  "relative rounded-2xl border-2",
                  rule.active ? "border-primary/30" : "border-border",
                  !isTemplateApproved && "border-warning/40 bg-warning/5"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{rule.displayName || rule.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 text-xs">
                          <Clock className="h-3.5 w-3.5" />
                          {t("every_days").replace("%s", (rule.triggerDays || []).join(", "))}
                        </CardDescription>
                      </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full text-xs">
                        {rule.target_status ? t(`status_${rule.target_status.toLowerCase()}` as any) : t("all_leads")}
                      </Badge>
                      <Badge
                        variant={isTemplateApproved ? "secondary" : "destructive"}
                        className="rounded-full text-[10px]"
                      >
                        {t(statusLabelKey)}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleToggle(rule.id)}>
                        {rule.active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">{rule.displayMessage || rule.message}</p>

                  <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs">{t("automation_template_label")}:</span>
                    <span>{rule.template_name || rule.name}</span>
                    {rule.template_language && (
                      <span className="uppercase font-mono tracking-[0.3em]">{rule.template_language}</span>
                    )}
                  </div>
                  {rule.template_sid && !isBridgeProvider && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {t("template_sid_label")}: <span className="font-mono">{rule.template_sid}</span>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                      <Zap className="h-3 w-3" /> {t("auto_followups")}
                    </span>
                    {rule.notifyOnReply && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                        <Bell className="h-3 w-3" /> {t("notify_on_reply")}
                      </span>
                    )}
                    <Badge
                      variant={quickReplyCount ? "secondary" : "outline"}
                      className="rounded-full px-2 py-1 uppercase tracking-[0.2em] text-[10px]"
                    >
                      {quickReplyCount
                        ? t("quick_reply_count").replace("%s", String(quickReplyCount))
                        : t("quick_reply_none")}
                    </Badge>
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

                  <div className="flex flex-col gap-3 pt-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <AutomationRuleDialog rule={rule} onSuccess={() => { fetchAutomations(); fetchStats(); }} />
                      {!isTemplateApproved && !isBridgeProvider && (
                        <TooltipProvider delayDuration={100}>
                          <div className="flex flex-wrap gap-2">
                            {rule.template_name && (
                              <>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleResubmitTemplate(rule.id)}
                                  disabled={resubmittingTemplateId === rule.id}
                                  className="uppercase tracking-[0.3em] text-[10px] px-3 py-1"
                                >
                                  {resubmittingTemplateId === rule.id ? t("resubmitting") : t("resubmit_template")}
                                </Button>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() => handleRefreshTemplateStatus(rule.id)}
                                      disabled={refreshingTemplateId === rule.id || !rule.template_sid}
                                      className="uppercase tracking-[0.3em] text-[10px] px-3 py-1"
                                    >
                                      {refreshingTemplateId === rule.id ? t("refreshing") : t("refresh_template_status")}
                                    </Button>
                                  </TooltipTrigger>
                                  {!rule.template_sid && (
                                    <TooltipContent side="top">
                                      {t("refresh_template_requires_submission")}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </TooltipProvider>
                      )}
                    </div>
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
            );
          })}
          </div>
        </TabsContent>

        {/* Followups tab */}
        <TabsContent value="followups">
          <div className="space-y-4">
            {followupAutomation ? (
              <Card className="rounded-2xl border border-border bg-card shadow-card">
                <CardHeader className="pb-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{t("followup_automation_card_title")}</CardTitle>
                      <CardDescription>{t("followup_automation_card_description")}</CardDescription>
                    </div>
                    <Badge
                      variant={isFollowupApproved ? "secondary" : "destructive"}
                      className="rounded-full text-[10px] uppercase tracking-[0.2em]"
                    >
                      {t(followupStatusLabelKey)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      {t("followup_automation_message_preview_label")}
                    </p>
                    <p className="text-sm font-medium text-foreground leading-relaxed line-clamp-3">
                      {followupAutomation.displayMessage || followupAutomation.message || t("no_data")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      {t("followup_automation_quick_replies_label")}
                    </p>
                    {followupQuickReplies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {followupQuickReplies.map((reply, index) => (
                          <Badge
                            key={`${reply.payload || reply.title || index}`}
                            variant="outline"
                            className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
                          >
                            {reply.title || reply.payload}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t("quick_reply_none")}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t(followupStatusHelpKey)}</p>
                  <div className="flex flex-wrap gap-2">
                    <AutomationRuleDialog
                      rule={followupAutomation}
                      onSuccess={() => {
                        fetchAutomations();
                        fetchStats();
                      }}
                      trigger={
                        <Button size="sm" variant="outline">
                          {t("preview")}
                        </Button>
                      }
                    />
                    <Button
                      size="sm"
                      variant={followupAutomation.active ? "destructive" : "secondary"}
                      onClick={() => handleToggle(followupAutomation.id)}
                    >
                      {followupAutomation.active
                        ? t("followup_automation_toggle_disable")
                        : t("followup_automation_toggle_enable")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl border border-border bg-card shadow-card">
                <CardHeader className="pb-1">
                  <CardTitle className="text-lg">{t("followup_automation_no_rule_title")}</CardTitle>
                  <CardDescription>{t("followup_automation_no_rule_description")}</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end">
                  <AutomationRuleDialog
                    onSuccess={() => {
                      fetchAutomations();
                      fetchStats();
                    }}
                    trigger={<Button variant="outline">{t("followup_automation_create_button")}</Button>}
                  />
                </CardContent>
              </Card>
            )}
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
          </div>
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
                {localizedRules.slice(0, 4).map((rule) => (
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

      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-card/90 to-card p-6 shadow-xl shadow-primary/20">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("recent_replies_tag")}</p>
            <h3 className="text-xl font-semibold text-foreground">{t("recent_replies_title")}</h3>
            <p className="text-sm text-muted-foreground">{t("recent_replies_subtitle")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={refreshReplies}
            disabled={repliesLoading}
          >
            {repliesLoading ? t("loading") : t("recent_replies_refresh")}
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {repliesLoading && (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          )}
          {repliesError && (
            <p className="text-sm text-destructive">{repliesError}</p>
          )}
          {!repliesLoading && !replies.length && (
            <p className="text-sm text-muted-foreground">{t("recent_replies_empty")}</p>
          )}
          {!repliesLoading && replies.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <span>{item.automation_name}</span>
                <span>{new Date(item.replied_at).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{item.lead_name}</p>
              <p className="text-xs text-muted-foreground">{item.message}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-card/80 to-card p-6 shadow-xl shadow-primary/20">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("system_logs_tag")}</p>
            <h3 className="text-xl font-semibold text-foreground">{t("system_logs_title")}</h3>
            <p className="text-sm text-muted-foreground">{t("system_logs_subtitle")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={refreshLogs}
            disabled={logsLoading}
          >
            {logsLoading ? t("loading") : t("system_logs_refresh")}
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {logsLoading && (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          )}
          {logsError && (
            <p className="text-sm text-destructive">{logsError}</p>
          )}
          {!logsLoading && !logs.length && (
            <p className="text-sm text-muted-foreground">{t("system_logs_empty")}</p>
          )}
          {!logsLoading && logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm transition hover:border-primary/60">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <span>{log.type.replace(/_/g, " ")}</span>
                <span>{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{log.message}</p>
              {log.metadata && (
                <pre className="mt-3 overflow-x-auto text-[11px] text-muted-foreground">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
