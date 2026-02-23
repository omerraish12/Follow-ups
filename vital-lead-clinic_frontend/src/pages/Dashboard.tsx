// src/pages/Dashboard.tsx
import {
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Flame,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  CalendarDays,
  MessageSquare,
  Zap,
  Target,
  Award,
  ArrowDownRight,
  RefreshCw,
  Bell,
  AlertCircle,
  Phone,
  Mail,
  Download,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import KPICard from "@/components/KPICard";
import StatusBadge from "@/components/StatusBadge";
import { sampleKPIs, sampleLeads, sampleAutomationRules } from "@/data/sampleData";
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
import { cn } from "@/lib/utils";

// נתוני דוגמה מורחבים
const statusData = [
  { name: "חדש", value: 12, color: "hsl(210, 80%, 55%)" },
  { name: "חם", value: 18, color: "hsl(0, 72%, 55%)" },
  { name: "נסגר", value: 28, color: "hsl(152, 60%, 42%)" },
  { name: "אבוד", value: 8, color: "hsl(240, 15%, 75%)" },
];

const weeklyData = [
  { day: "ראשון", leads: 6, returned: 2, revenue: 2400 },
  { day: "שני", leads: 8, returned: 3, revenue: 3600 },
  { day: "שלישי", leads: 3, returned: 1, revenue: 1200 },
  { day: "רביעי", leads: 12, returned: 5, revenue: 6000 },
  { day: "חמישי", leads: 7, returned: 3, revenue: 3600 },
  { day: "שישי", leads: 2, returned: 0, revenue: 0 },
  { day: "שבת", leads: 5, returned: 2, revenue: 2400 },
];

const monthlyData = [
  { month: 'ינו', leads: 45, returned: 12, revenue: 18000, recovered: 12000 },
  { month: 'פבר', leads: 52, returned: 18, revenue: 27000, recovered: 18000 },
  { month: 'מרץ', leads: 48, returned: 15, revenue: 22500, recovered: 15000 },
  { month: 'אפר', leads: 60, returned: 22, revenue: 33000, recovered: 22000 },
  { month: 'מאי', leads: 55, returned: 20, revenue: 30000, recovered: 20000 },
  { month: 'יונ', leads: 68, returned: 28, revenue: 42000, recovered: 28000 },
];

const sourceData = [
  { name: 'וואטסאפ', value: 45, conversion: 68, color: '#25D366' },
  { name: 'פייסבוק', value: 25, conversion: 42, color: '#1877F2' },
  { name: 'אינסטגרם', value: 20, conversion: 38, color: '#E4405F' },
  { name: 'המלצות', value: 10, conversion: 85, color: '#8B5CF6' },
];

const recentActivity = [
  { id: 1, type: 'return', name: 'דנה כהן', desc: 'חזרה לאחר הודעת מעקב', time: 'לפני 5 דקות', value: 450 },
  { id: 2, type: 'hot', name: 'יוסי לוי', desc: 'הפך לחם - מעוניין בקביעת תור', time: 'לפני 12 דקות', value: 800 },
  { id: 3, type: 'followup', name: 'מיכל גולן', desc: 'לא הגיבה 5 ימים - דורשת מעקב', time: 'לפני 25 דקות', value: 350 },
  { id: 4, type: 'closed', name: 'אבי אברהם', desc: 'טיפול נקבע - הכנסה חדשה', time: 'לפני שעה', value: 1200 },
];

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('week');
  const [returnedClients, setReturnedClients] = useState(0);
  const [returnRate, setReturnRate] = useState(0);
  const [recoveredRevenue, setRecoveredRevenue] = useState(0);
  const [hotLeadsCount, setHotLeadsCount] = useState(0);
  const [followupNeeded, setFollowupNeeded] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState('2.5 שעות');
  const [totalRevenue, setTotalRevenue] = useState(0);

  // In Dashboard.tsx - fix the messages filtering section (around line 115)

  useEffect(() => {
    // חישוב נתונים אמיתיים
    const totalLeads = sampleLeads.length;

    // Fixed: Check if message is string or object
    const returned = sampleLeads.filter(l =>
      l.messages.some(m => {
        // If m is a string, check directly
        if (typeof m === 'string') {
          return m.includes('חוזר') || m.includes('שוב') || m.includes('חזרתי');
        }
        // If m is an object with content/text property
        if (m && typeof m === 'object') {
          const messageContent = m.content || m.text || '';
          return messageContent.includes('חוזר') || messageContent.includes('שוב') || messageContent.includes('חזרתי');
        }
        return false;
      })
    ).length;

    setReturnedClients(returned);
    setReturnRate(Math.round((returned / totalLeads) * 100) || 0);

    // חישוב הכנסות מחוזרות
    const recovered = returned * 1500;
    setRecoveredRevenue(recovered);

    // לידים חמים
    setHotLeadsCount(sampleLeads.filter(l => l.status === 'hot').length);

    // לידים שצריכים מעקב
    setFollowupNeeded(5);

    // סה"כ הכנסות
    setTotalRevenue(sampleLeads.reduce((sum, l) => sum + l.value, 0));
  }, []);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">לוח בקרה</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            סקירה כללית של ביצועי הלידים במרפאה
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue placeholder="טווח זמן" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">שבוע אחרון</SelectItem>
              <SelectItem value="month">חודש אחרון</SelectItem>
              <SelectItem value="quarter">רבעון אחרון</SelectItem>
              <SelectItem value="year">שנה אחרונה</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Grid - כל המדדים הנדרשים */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KPICard
          title="סה״כ לידים"
          value={sampleLeads.length}
          icon={Users}
          variant="primary"
          trend={{ value: 12, positive: true }}
          subtitle="החודש"
        />
        <KPICard
          title="לידים חמים"
          value={hotLeadsCount}
          icon={Flame}
          variant="warning"
          trend={{ value: 8, positive: true }}
          subtitle="מוכנים לסגירה"
        />
        <KPICard
          title="אחוז החזרה"
          value={`${returnRate}%`}
          icon={Target}
          variant="success"
          trend={{ value: 5, positive: true }}
          subtitle={`${returnedClients} לקוחות חזרו`}
        />
        <KPICard
          title="הכנסות מחוזרות"
          value={`₪${recoveredRevenue.toLocaleString()}`}
          icon={DollarSign}
          variant="info"
          subtitle="החודש"
          trend={{ value: 23, positive: true }}
        />
      </div>

      {/* Second row - מדדי ביצוע נוספים */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KPICard
          title="זמן תגובה ממוצע"
          value={avgResponseTime}
          icon={Clock}
          subtitle="תגובה ראשונה"
          trend={{ value: 15, positive: true }}
        />
        <KPICard
          title="עסקאות שנסגרו"
          value={sampleKPIs.closedDeals}
          icon={CheckCircle}
          subtitle="החודש"
          trend={{ value: 8, positive: true }}
        />
        <KPICard
          title="לידים אבודים"
          value={sampleKPIs.lostLeads}
          icon={XCircle}
          subtitle="החודש"
          trend={{ value: 3, positive: false }}
        />
        <KPICard
          title="צריך מעקב"
          value={followupNeeded}
          icon={Bell}
          subtitle="לא הגיבו 3+ ימים"
          trend={{ value: 2, positive: false }}
        />
      </div>

      {/* Follow-up Alert */}
      {followupNeeded > 0 && (
        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-warning" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                יש {followupNeeded} לידים שדורשים מעקב
              </p>
              <p className="text-sm text-muted-foreground">
                לידים שלא הגיבו להודעות מעל 3 ימים - לחץ לשליחת תזכורת אוטומטית
              </p>
            </div>
            <Link to="/leads?filter=followup">
              <Button variant="outline" size="sm" className="rounded-xl">
                צפה בלידים
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Charts Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="recovery">החזרות והכנסות</TabsTrigger>
          <TabsTrigger value="sources">מקורות לידים</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Weekly chart */}
            <Card className="lg:col-span-2 rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">לידים והחזרות - שבועי</CardTitle>
                <CardDescription>השוואה בין לידים חדשים ללקוחות שחזרו</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
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
                    />
                    <Bar dataKey="leads" name="לידים חדשים" fill="hsl(210, 80%, 55%)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="returned" name="לקוחות שחזרו" fill="hsl(152, 60%, 42%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status distribution */}
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">התפלגות סטטוסים</CardTitle>
                <CardDescription>פילוח לידים לפי מצב נוכחי</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {statusData.map((item) => (
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

        <TabsContent value="recovery" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Recovery trend */}
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">מגמת החזרות לאורך זמן</CardTitle>
                <CardDescription>כמות הלקוחות שחזרו לפי חודש</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="returned" name="חזרו" stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey="leads" name="לידים חדשים" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue recovery */}
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">הכנסות מחוזרות</CardTitle>
                <CardDescription>הכנסות מלקוחות שחזרו למרפאה</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="recovered" name="הכנסות מחוזרות" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recovery metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium">שיעור החזרה מצטבר</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">78%</div>
                <Progress value={78} className="h-2 mt-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  עלייה של 23% מהרבעון הקודם
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium">סה"כ הכנסות מחוזרות</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">₪115,000</div>
                <div className="flex items-center gap-2 mt-2 text-sm text-success">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>+32% מהרבעון הקודם</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium">זמן ממוצע לחזרה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">5.2 ימים</div>
                <p className="text-xs text-muted-foreground mt-2">
                  מהיר ב-40% ממעקב ידני
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">לידים לפי מקור</CardTitle>
                <CardDescription>התפלגות מקורות הגעת הלידים</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sourceData.map((source) => (
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
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">איכות לידים לפי מקור</CardTitle>
                <CardDescription>אחוזי המרה ממקורות שונים</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sourceData.map((source) => (
                    <div key={source.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${source.color}20` }}>
                          <MessageSquare className="h-4 w-4" style={{ color: source.color }} />
                        </div>
                        <div>
                          <p className="font-medium">{source.name}</p>
                          <p className="text-xs text-muted-foreground">אחוז המרה</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-xl font-bold text-success">{source.conversion}%</p>
                      </div>
                    </div>
                  ))}
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
            <CardTitle className="text-lg">פעילות אחרונה</CardTitle>
            <CardDescription>עדכונים בזמן אמת על הלידים</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
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
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Rules */}
        <Card className="rounded-2xl border-border">
          <CardHeader>
            <CardTitle className="text-lg">חוקי אוטומציה מובילים</CardTitle>
            <CardDescription>ביצועי החוקים לפי אחוזי הצלחה</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sampleAutomationRules.map((rule, i) => {
                const successRate = 60 + (i * 8);
                return (
                  <div key={rule.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{rule.name}</span>
                      <span className="text-success">{successRate}%</span>
                    </div>
                    <Progress value={successRate} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>יעד: {rule.targetStatus}</span>
                      <span>הפעלות: {24 + i * 12}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads Table */}
      <Card className="rounded-2xl border-border overflow-hidden">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">לידים אחרונים</CardTitle>
              <CardDescription>5 הלידים האחרונים במערכת</CardDescription>
            </div>
            <Link to="/leads">
              <Button variant="ghost" size="sm" className="rounded-xl">
                צפה בהכל
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="border-b border-border">
                <th className="text-right px-6 py-3 font-medium">שם</th>
                <th className="text-right px-6 py-3 font-medium">שירות</th>
                <th className="text-right px-6 py-3 font-medium">סטטוס</th>
                <th className="text-right px-6 py-3 font-medium">מקור</th>
                <th className="text-right px-6 py-3 font-medium">ערך</th>
                <th className="text-right px-6 py-3 font-medium">הודעה אחרונה</th>
                <th className="text-right px-6 py-3 font-medium">מעקב</th>
              </tr>
            </thead>
            <tbody>
              {sampleLeads.slice(0, 5).map((lead, i) => (
                <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {lead.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{lead.service}</td>
                  <td className="px-6 py-4"><StatusBadge status={lead.status} /></td>
                  <td className="px-6 py-4 text-muted-foreground">{lead.source}</td>
                  <td className="px-6 py-4 font-bold">₪{lead.value.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {i === 0 ? 'לפני שעתיים' : i === 1 ? 'אתמול' : 'לפני 3 ימים'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {i % 2 === 0 ? (
                      <Badge variant="outline" className="bg-warning/10 text-warning">
                        דרוש מעקב
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-success/10 text-success">
                        מעודכן
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}