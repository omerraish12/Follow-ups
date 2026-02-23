// src/pages/Automations.tsx
import {
  Zap, Clock, MessageSquare, ToggleLeft, ToggleRight, Trash2,
  Info, Users, AlertCircle, CheckCircle, TrendingUp, Bell,
  BarChart3, Target, Award, Activity
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
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
  const [rules, setRules] = useState<ExtendedAutomationRule[]>(
    sampleAutomationRules.map(rule => ({
      ...rule,
      triggerDays: [3, 7, 14], // ימי ברירת מחדל
      notifyOnReply: true,
      personalizationFields: ['name', 'service'],
      totalExecutions: Math.floor(Math.random() * 100) + 50,
      replyCount: Math.floor(Math.random() * 30) + 10,
      successRate: Math.floor(Math.random() * 30) + 60,
      abTesting: {
        enabled: rule.id === '1',
        variants: [
          { id: 'a', message: 'היי {name}, רצינו לבדוק אם הגעת לטיפול? 😊', sentCount: 45, replyCount: 28 },
          { id: 'b', message: 'שלום {name}, מזכירים לך שאצלנו תמיד אפשר לקבוע תור חוזר! 🦷', sentCount: 42, replyCount: 31 }
        ]
      }
    }))
  );

  const [followupNeeded, setFollowupNeeded] = useState<{ leadId: string; leadName: string; days: number }[]>([]);
  const [recentReplies, setRecentReplies] = useState<{ leadName: string; ruleName: string; time: string }[]>([]);

  // סימולציה של מעקב אחר תגובות
  useEffect(() => {
    // מייצר התראות על לידים שצריכים מעקב
    const mockFollowups = [
      { leadId: '1', leadName: 'דנה כהן', days: 5 },
      { leadId: '2', leadName: 'יוסי לוי', days: 8 },
      { leadId: '3', leadName: 'מיכל גולן', days: 12 },
    ];
    setFollowupNeeded(mockFollowups);

    // מייצר התראות על תגובות שהתקבלו
    const mockReplies = [
      { leadName: 'משה גולן', ruleName: 'מעקב אחרי שבוע', time: 'לפני 10 דקות' },
      { leadName: 'שרה כהן', ruleName: 'מעקב אחרי 3 ימים', time: 'לפני 25 דקות' },
    ];
    setRecentReplies(mockReplies);
  }, []);

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    const rule = rules.find(r => r.id === id);
    toast({
      title: rule?.active ? "חוק הושבת" : "חוק הופעל",
      description: `החוק "${rule?.name}" ${rule?.active ? 'הושבת' : 'הופעל'} בהצלחה`
    });
  };

  const saveRule = (rule: ExtendedAutomationRule) => {
    setRules((prev) => {
      const exists = prev.find((r) => r.id === rule.id);
      if (exists) {
        toast({ title: "חוק עודכן", description: "החוק עודכן בהצלחה" });
        return prev.map((r) => (r.id === rule.id ? rule : r));
      }
      toast({ title: "חוק נוסף", description: "חוק חדש נוסף בהצלחה" });
      return [...prev, { ...rule, totalExecutions: 0, replyCount: 0, successRate: 0 }];
    });
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "חוק נמחק", description: "החוק הוסר בהצלחה" });
  };

  const activeCount = rules.filter((r) => r.active).length;
  const totalExecutions = rules.reduce((sum, r) => sum + (r.totalExecutions || 0), 0);
  const totalReplies = rules.reduce((sum, r) => sum + (r.replyCount || 0), 0);
  const avgSuccessRate = totalExecutions > 0 ? Math.round((totalReplies / totalExecutions) * 100) : 0;

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">אוטומציות</h1>
          <p className="text-sm text-muted-foreground mt-0.5">חוקי מעקב אוטומטיים בוואטסאפ ללידים שלך</p>
        </div>
        <AutomationRuleDialog onSave={saveRule} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              הודעות שנשלחו (חודש)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalExecutions}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" />
              <span>+23% מהחודש שעבר</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              תגובות התקבלו
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalReplies}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <MessageSquare className="h-3 w-3" />
              <span>שיעור תגובה {avgSuccessRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              לידים שחזרו
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">18</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <CheckCircle className="h-3 w-3" />
              <span>הכנסה: ₪27,000</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ממתינים למעקב
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{followupNeeded.length}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-warning">
              <Clock className="h-3 w-3" />
              <span>דורשים התייחסות</span>
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
              <p className="font-semibold text-foreground">לידים שדורשים מעקב</p>
              <div className="mt-2 space-y-2">
                {followupNeeded.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{item.leadName}</span>
                    <span className="text-muted-foreground">לא הגיב {item.days} ימים</span>
                    <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs">
                      שלח תזכורת
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
              <p className="font-semibold text-foreground">תגובות שהתקבלו</p>
              <div className="mt-2 space-y-2">
                {recentReplies.map((reply, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{reply.leadName} הגיב ל-"{reply.ruleName}"</span>
                    <span className="text-muted-foreground">{reply.time}</span>
                    <Badge variant="outline" className="bg-success/10 text-success">הפך לחם</Badge>
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
          <TabsTrigger value="active">פעילים ({activeCount})</TabsTrigger>
          <TabsTrigger value="scheduled">מתוזמנים</TabsTrigger>
          <TabsTrigger value="performance">ביצועים</TabsTrigger>
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
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary/70 shadow-sm">
                      <Zap className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-foreground">{rule.name}</h3>
                        <StatusBadge status={rule.targetStatus} />
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {rule.triggerDays.length} מועדים
                        </Badge>
                      </div>

                      {/* Trigger Days */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rule.triggerDays.map(day => (
                          <Badge key={day} variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 ml-1" />
                            {day === 0 ? 'מיידי' : `אחרי ${day} ימים`}
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
                            <span className="text-muted-foreground">שדות מותאמים:</span>
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
                          <p className="text-xs font-semibold mb-2">בדיקות A/B - גרסה ב' מובילה</p>
                          <div className="space-y-2">
                            {rule.abTesting.variants.map(v => (
                              <div key={v.id} className="flex items-center gap-2 text-xs">
                                <span className="w-6">גרסה {v.id}:</span>
                                <Progress value={v.sentCount ? (v.replyCount / v.sentCount) * 100 : 0} className="h-1.5 flex-1" />
                                <span className="text-muted-foreground">{v.sentCount ? Math.round((v.replyCount / v.sentCount) * 100) : 0}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notification Settings */}
                      {rule.notifyOnReply && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Bell className="h-3 w-3" />
                          <span>קבל התראה בתגובה ראשונה</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className="hover:scale-110 transition-transform"
                      title="כבה"
                    >
                      <ToggleRight className="h-8 w-8 text-primary" />
                    </button>
                    <div className="flex gap-1">
                      <AutomationRuleDialog rule={rule} onSave={saveRule} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="rounded-xl text-destructive hover:text-destructive h-8 w-8 p-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>מחיקת חוק</AlertDialogTitle>
                            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק את "{rule.name}"?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-row-reverse gap-2">
                            <AlertDialogCancel className="rounded-xl">ביטול</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRule(rule.id)} className="bg-destructive text-destructive-foreground rounded-xl">מחק</AlertDialogAction>
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
            <h3 className="font-bold mb-4">לוח זמנים - הפעלות קרובות</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">מעקב אחרי 7 ימים</p>
                      <p className="text-xs text-muted-foreground">5 לידים ממתינים</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">מחר, 10:00</p>
                    <p className="text-xs text-muted-foreground">בעוד 14 שעות</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold mb-4">ביצועי חוקים</h3>
            <div className="space-y-4">
              {rules.map(rule => (
                <div key={rule.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{rule.name}</span>
                    <span className="text-success">{rule.successRate}% הצלחה</span>
                  </div>
                  <Progress value={rule.successRate || 0} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>נשלח: {rule.totalExecutions}</span>
                    <span>תגובות: {rule.replyCount}</span>
                    <span>המרות: {Math.round((rule.replyCount || 0) * 0.7)}</span>
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
          <p className="mt-4 font-bold text-foreground">אין חוקים פעילים</p>
          <p className="mt-1 text-sm text-muted-foreground">צור חוק אוטומציה ראשון או הפעל חוק קיים</p>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info/5 p-4 text-sm">
        <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">טיפ</p>
          <p className="text-muted-foreground mt-0.5">
            אוטומציות פעילות ישלחו הודעות מעקב אוטומטיות בימים 3,7,14 לאחר ההודעה האחרונה.
            תגובות של לידים יהפכו אותם אוטומטית ל"חם" וישלחו התראה למנהל המערכת.
          </p>
        </div>
      </div>
    </div>
  );
}