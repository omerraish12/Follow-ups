// src/pages/Automations.tsx
import { Zap, Clock, MessageSquare, ToggleLeft, ToggleRight, Trash2, Info, Users, AlertCircle, CheckCircle, TrendingUp, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import StatusBadge from "@/components/StatusBadge";
import AutomationRuleDialog from "@/components/AutomationRuleDialog";
import { sampleAutomationRules, type AutomationRule } from "@/data/sampleData";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ExtendedAutomationRule extends AutomationRule {
  triggerDays: number[]; // ימים להפעלה (2-14)
  lastExecuted?: string;
  successRate?: number;
  totalExecutions?: number;
  replyCount?: number;
  notifyOnReply: boolean;
  notifyEmail?: string;
  personalizationFields: string[];
  abTesting?: {
    enabled: boolean;
    variants: {
      id: string;
      message: string;
      sentCount: number;
      replyCount: number;
    }[];
  };
}

export default function Automations() {
  const { t, language } = useLanguage();
  const [rules, setRules] = useState<ExtendedAutomationRule[]>(
    sampleAutomationRules.map(rule => ({
      ...rule,
      triggerDays: [3, 7, 14], // Default days
      notifyOnReply: true,
      personalizationFields: ['name', 'service'],
      totalExecutions: Math.floor(Math.random() * 100) + 50,
      replyCount: Math.floor(Math.random() * 30) + 10,
      successRate: Math.floor(Math.random() * 30) + 60,
      abTesting: {
        enabled: rule.id === '1',
        variants: [
          { id: 'a', message: t('hi_name_check_treatment'), sentCount: 45, replyCount: 28 },
          { id: 'b', message: t('hello_name_reminder'), sentCount: 42, replyCount: 31 }
        ]
      }
    }))
  );

  const [followupNeeded, setFollowupNeeded] = useState<{ leadId: string; leadName: string; days: number }[]>([]);
  const [recentReplies, setRecentReplies] = useState<{ leadName: string; ruleName: string; time: string }[]>([]);

  // Simulate follow-up tracking
  useEffect(() => {
    const mockFollowups = [
      { leadId: '1', leadName: 'דנה כהן', days: 5 },
      { leadId: '2', leadName: 'יוסי לוי', days: 8 },
      { leadId: '3', leadName: 'מיכל גולן', days: 12 },
    ];
    setFollowupNeeded(mockFollowups);

    const mockReplies = [
      { leadName: 'משה גולן', ruleName: t('follow_up_1_week'), time: t('minutes_ago') + ' 10' },
      { leadName: 'שרה כהן', ruleName: t('follow_up_3_days'), time: t('minutes_ago') + ' 25' },
    ];
    setRecentReplies(mockReplies);
  }, [t]);

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    const rule = rules.find(r => r.id === id);
    toast({
      title: rule?.active ? t("rule_disabled") : t("rule_enabled"),
      description: t("rule") + " \"" + rule?.name + "\" " + (rule?.active ? t("rule_disabled") : t("rule_enabled")) + " " + t("success")
    });
  };

  const saveRule = (rule: ExtendedAutomationRule) => {
    setRules((prev) => {
      const exists = prev.find((r) => r.id === rule.id);
      if (exists) {
        toast({ title: t("rule_updated"), description: t("rule_updated_successfully") });
        return prev.map((r) => (r.id === rule.id ? rule : r));
      }
      toast({ title: t("rule_created"), description: t("rule_created_successfully") });
      return [...prev, { ...rule, totalExecutions: 0, replyCount: 0, successRate: 0 }];
    });
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast({ title: t("rule_deleted"), description: t("rule_removed_successfully") });
  };

  const activeCount = rules.filter((r) => r.active).length;
  const totalExecutions = rules.reduce((sum, r) => sum + (r.totalExecutions || 0), 0);
  const totalReplies = rules.reduce((sum, r) => sum + (r.replyCount || 0), 0);
  const avgSuccessRate = totalExecutions > 0 ? Math.round((totalReplies / totalExecutions) * 100) : 0;

  return (
    <div className="space-y-5 lg:space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{t("automations")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("automations_subtitle")}</p>
        </div>
        <AutomationRuleDialog onSuccess={() => { /* Refresh automations */ }} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("messages_sent_month")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalExecutions}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" />
              <span>{t("plus_percent_last_month").replace('%s', '23')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("responses_received")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalReplies}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <MessageSquare className="h-3 w-3" />
              <span>{t("response_rate")} {avgSuccessRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("returned_leads")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">18</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <CheckCircle className="h-3 w-3" />
              <span>{t("recovery_revenue")}: ₪27,000</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("leads_pending_followup")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{followupNeeded.length}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-warning">
              <Clock className="h-3 w-3" />
              <span>{t("requires_attention")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up Alerts */}
      {followupNeeded.length > 0 && (
        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">{t("leads_requiring_followup")}</p>
              <div className="mt-2 space-y-2">
                {followupNeeded.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{item.leadName}</span>
                    <span className="text-muted-foreground">{t("days_without_response")} {item.days} {t("days")}</span>
                    <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs">
                      {t("send_reminder")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Replies */}
      {recentReplies.length > 0 && (
        <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">{t("responses_received")}</p>
              <div className="mt-2 space-y-2">
                {recentReplies.map((reply, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{reply.leadName} {t("responded_to")} "{reply.ruleName}"</span>
                    <span className="text-muted-foreground">{reply.time}</span>
                    <Badge variant="outline" className="bg-success/10 text-success">{t("became_hot")}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="active">{t("active_rules")} ({activeCount})</TabsTrigger>
          <TabsTrigger value="scheduled">{t("times_scheduled")}</TabsTrigger>
          <TabsTrigger value="performance">{t("times_performance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Rules */}
          <div className="space-y-3">
            {rules.filter(r => r.active).map((rule, i) => (
              <div
                key={rule.id}
                className={cn(
                  "rounded-2xl border bg-card p-4 lg:p-5 shadow-card transition-all animate-fade-in hover:shadow-card-hover",
                  "border-primary/20"
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 lg:gap-4 flex-1 min-w-0">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary shadow-sm">
                      <Zap className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground">{rule.name}</h3>
                        <StatusBadge status={rule.targetStatus} />
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {rule.triggerDays.length} {t("occasions")}
                        </Badge>
                      </div>

                      {/* Trigger Days */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rule.triggerDays.map(day => (
                          <Badge key={day} variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 ml-1" />
                            {day === 0 ? t("immediate") : t("after_days_count").replace('{count}', day.toString())}
                          </Badge>
                        ))}
                      </div>

                      {/* Message with personalization */}
                      <div className="mt-3 rounded-xl bg-muted/60 border border-border/50 p-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          "{rule.message}"
                        </p>
                        {rule.personalizationFields.length > 0 && (
                          <div className="mt-2 flex gap-2 text-xs">
                            <span className="text-muted-foreground">{t("custom_fields")}</span>
                            {rule.personalizationFields.map(field => (
                              <Badge key={field} variant="outline" className="bg-primary/5">
                                {'{'}{field}{'}'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* A/B Testing Info */}
                      {rule.abTesting?.enabled && (
                        <div className="mt-3 p-3 bg-primary/5 rounded-xl">
                          <p className="text-xs font-semibold mb-2">{t("a_b_testing")}</p>
                          <div className="space-y-2">
                            {rule.abTesting.variants.map(v => (
                              <div key={v.id} className="flex items-center gap-2 text-xs">
                                <span className="w-6">{t("variant")} {v.id}:</span>
                                <Progress value={(v.replyCount / v.sentCount) * 100} className="h-1.5 flex-1" />
                                <span className="text-muted-foreground">{Math.round((v.replyCount / v.sentCount) * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notification Settings */}
                      {rule.notifyOnReply && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Bell className="h-3 w-3" />
                          <span>{t("get_notification_on_first_reply")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className="hover:scale-110 transition-transform"
                      title={t("delete")}
                    >
                      <ToggleRight className="h-8 w-8 text-primary" />
                    </button>
                    <div className="flex gap-1">
                      <AutomationRuleDialog rule={rule} onSuccess={() => { /* Refresh automations */ }} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="rounded-xl text-destructive hover:text-destructive h-8 w-8 p-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("delete_rule")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("delete_rule_confirmation").replace('{name}', rule.name)}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className={language === 'he' ? 'flex-row-reverse gap-2' : 'gap-2'}>
                            <AlertDialogCancel className="rounded-xl">{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRule(rule.id)} className="bg-destructive text-destructive-foreground rounded-xl">
                              {t("delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold mb-4">{t("scheduled_times")}</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">{t("follow_up_1_week")}</p>
                      <p className="text-xs text-muted-foreground">5 {t("leads_waiting")}</p>
                    </div>
                  </div>
                  <div className={language === 'he' ? 'text-left' : 'text-right'}>
                    <p className="text-sm font-bold">{t("tomorrow")}, 10:00</p>
                    <p className="text-xs text-muted-foreground">{t("in_hours").replace('{count}', '14')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold mb-4">{t("rule_performance")}</h3>
            <div className="space-y-4">
              {rules.map(rule => (
                <div key={rule.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{rule.name}</span>
                    <span className="text-success">{rule.successRate}% {t("success_rate")}</span>
                  </div>
                  <Progress value={rule.successRate} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t("sent")} {rule.totalExecutions}</span>
                    <span>{t("responses_received")}: {rule.replyCount}</span>
                    <span>{t("conversions")}: {Math.round((rule.replyCount || 0) * 0.7)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {rules.filter(r => r.active).length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <Zap className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 font-bold text-foreground">{t("no_active_rules")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("create_first_automation")}</p>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info/5 p-4 text-sm">
        <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">{t("tip")}</p>
          <p className="text-muted-foreground mt-0.5">
            {t("automation_info")}
          </p>
        </div>
      </div>
    </div>
  );
}