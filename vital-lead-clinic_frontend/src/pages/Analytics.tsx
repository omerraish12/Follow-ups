// src/pages/Analytics.tsx
import { useState } from "react";
import {
  TrendingUp, Users, DollarSign, Clock, Calendar,
  Download, Filter, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart, Target, Award, MessageSquare,
  Smartphone, Mail, ChevronLeft, ChevronRight, Bell,
  AlertCircle, CheckCircle, XCircle, Activity
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart,
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Area, AreaChart
} from "recharts";
import { cn } from "@/lib/utils";
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
import { sampleLeads, sampleAutomationRules } from "@/data/sampleData";

// Helper function to safely get message content
const getMessageContent = (message: any): string => {
  if (!message) return '';
  if (typeof message === 'string') return message;
  if (typeof message === 'object') {
    return message.content || message.text || message.message || '';
  }
  return '';
};

// Helper function to check if message contains return keywords
const containsReturnKeywords = (message: any): boolean => {
  const content = getMessageContent(message);
  return content.includes('חוזר') || content.includes('שוב') || content.includes('חזרתי');
};

// Mock data for analytics
const conversionData = [
  { month: 'ינו', leads: 45, converted: 12, revenue: 18000 },
  { month: 'פבר', leads: 52, converted: 18, revenue: 27000 },
  { month: 'מרץ', leads: 48, converted: 15, revenue: 22500 },
  { month: 'אפר', leads: 60, converted: 22, revenue: 33000 },
  { month: 'מאי', leads: 55, converted: 20, revenue: 30000 },
  { month: 'יונ', leads: 68, converted: 28, revenue: 42000 },
];

const sourceData = [
  { name: 'וואטסאפ', value: 45, color: '#25D366' },
  { name: 'אינסטגרם', value: 25, color: '#E4405F' },
  { name: 'פייסבוק', value: 20, color: '#1877F2' },
  { name: 'המלצות', value: 10, color: '#8B5CF6' },
];

const recoveryData = [
  { day: 'יום 1', recovered: 5, lost: 20 },
  { day: 'יום 3', recovered: 12, lost: 15 },
  { day: 'יום 7', recovered: 18, lost: 10 },
  { day: 'יום 14', recovered: 22, lost: 6 },
  { day: 'יום 21', recovered: 24, lost: 4 },
  { day: 'יום 30', recovered: 25, lost: 3 },
];

const statusColors = {
  new: '#3B82F6',
  hot: '#EF4444',
  closed: '#10B981',
  lost: '#6B7280'
};

export default function Analytics() {
  const [dateRange, setDateRange] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Calculate KPIs with safe message checking
  const totalLeads = sampleLeads.length;
  const convertedLeads = sampleLeads.filter(l => l.status === 'closed').length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';
  const totalRevenue = sampleLeads.reduce((sum, l) => sum + l.value, 0);
  const avgLeadValue = totalLeads > 0 ? (totalRevenue / totalLeads).toFixed(0) : '0';
  const hotLeads = sampleLeads.filter(l => l.status === 'hot').length;

  // Safe check for returned clients
  const returnedClients = sampleLeads.filter(l =>
    (l.messages || []).some(containsReturnKeywords)
  ).length;

  const returnRate = totalLeads > 0 ? ((returnedClients / totalLeads) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">אנליטיקס ודוחות</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ניתוח ביצועים, המרות והחזרי השקעה
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue placeholder="טווח תאריכים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">שבוע אחרון</SelectItem>
              <SelectItem value="month">חודש אחרון</SelectItem>
              <SelectItem value="quarter">רבעון אחרון</SelectItem>
              <SelectItem value="year">שנה אחרונה</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="rounded-xl">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border shadow-card hover:shadow-card-hover transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              שיעור החזרה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{returnRate}%</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <ArrowUpRight className="h-3 w-3" />
              <span>+12.5% מהחודש שעבר</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-card hover:shadow-card-hover transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              הכנסות מחוזרות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₪45,280</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <ArrowUpRight className="h-3 w-3" />
              <span>+23% מהחודש שעבר</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-card hover:shadow-card-hover transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              לידים חמים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{hotLeads}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
              <ArrowDownRight className="h-3 w-3" />
              <span>5 פחות מהשבוע שעבר</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-card hover:shadow-card-hover transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              שווי ממוצע לליד
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₪{avgLeadValue}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>יעד: ₪2,500</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 rounded-xl">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="recovery">החזרת לקוחות</TabsTrigger>
          <TabsTrigger value="sources">מקורות לידים</TabsTrigger>
          <TabsTrigger value="automation">ביצועי אוטומציה</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">מגמות המרה לאורך זמן</CardTitle>
              <CardDescription>השוואה בין לידים להמרות לפי חודש</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={conversionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 12%, 90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(0, 0%, 100%)",
                        border: "1px solid hsl(240, 12%, 90%)",
                        borderRadius: "10px",
                        direction: "rtl"
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="leads"
                      name="לידים"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="converted"
                      name="המרות"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      name="הכנסות (₪)"
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
                <CardTitle className="text-lg">התפלגות סטטוסים</CardTitle>
                <CardDescription>פילוח לידים לפי מצב נוכחי</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={Object.entries(
                          sampleLeads.reduce((acc, lead) => {
                            acc[lead.status] = (acc[lead.status] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([name, value]) => ({
                          name: name === 'new' ? 'חדש' :
                            name === 'hot' ? 'חם' :
                              name === 'closed' ? 'נסגר' : 'אבוד',
                          value,
                          color: statusColors[name as keyof typeof statusColors] || '#6B7280'
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {Object.entries(statusColors).map(([key, color]) => (
                          <Cell key={key} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {Object.entries(statusColors).map(([key, color]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm text-muted-foreground">
                        {key === 'new' ? 'חדש' :
                          key === 'hot' ? 'חם' :
                            key === 'closed' ? 'נסגר' : 'אבוד'}
                      </span>
                      <span className="text-sm font-bold text-foreground mr-auto">
                        {sampleLeads.filter(l => l.status === key).length}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">ביצועים לפי מקור</CardTitle>
                <CardDescription>איכות לידים לפי מקור הגעה</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sourceData.map((source) => (
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
                        <span>המרה: {Math.round(source.value * 0.4)}%</span>
                        <span>ערך ממוצע: ₪{(source.value * 100).toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recovery Tab */}
        <TabsContent value="recovery" className="space-y-4">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">החזרת לקוחות אבודים</CardTitle>
              <CardDescription>מעקב אחר לקוחות שחזרו לאחר מעקב אוטומטי</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recoveryData}>
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
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="recovered"
                      name="לקוחות שחזרו"
                      stackId="1"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="lost"
                      name="לקוחות אבודים"
                      stackId="1"
                      stroke="#6B7280"
                      fill="#6B7280"
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
                <CardTitle className="text-sm font-medium">שיעור הצלחה כולל</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">78%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  מלקוחות שקיבלו מעקב אוטומטי חזרו
                </p>
                <div className="mt-4 h-2 bg-muted rounded-full">
                  <div className="w-[78%] h-2 bg-success rounded-full" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">זמן ממוצע לחזרה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">5.2 ימים</div>
                <p className="text-xs text-muted-foreground mt-1">
                  מרגע שליחת ההודעה הראשונה
                </p>
                <div className="flex items-center gap-2 mt-4 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>מהיר ב-30% ממעקב ידני</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">הכנסות מלידים חוזרים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">₪32,450</div>
                <p className="text-xs text-muted-foreground mt-1">
                  החודש הנוכחי
                </p>
                <div className="flex items-center gap-2 mt-4 text-xs text-success">
                  <TrendingUp className="h-3 w-3" />
                  <span>צמיחה של 45% מהחודש שעבר</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recovery Table */}
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">לקוחות שחזרו - פירוט</CardTitle>
              <CardDescription>רשימת הלקוחות האחרונים שחזרו בעקבות אוטומציה</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-right py-3 font-semibold">שם</th>
                      <th className="text-right py-3 font-semibold">תאריך עזיבה</th>
                      <th className="text-right py-3 font-semibold">תאריך חזרה</th>
                      <th className="text-right py-3 font-semibold">ימים</th>
                      <th className="text-right py-3 font-semibold">הודעות שנשלחו</th>
                      <th className="text-right py-3 font-semibold">ערך עסקה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleLeads.slice(0, 5).map((lead, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-3 font-medium">{lead.name}</td>
                        <td className="py-3 text-muted-foreground">15/02/2025</td>
                        <td className="py-3 text-muted-foreground">22/02/2025</td>
                        <td className="py-3 text-muted-foreground">7</td>
                        <td className="py-3 text-muted-foreground">4</td>
                        <td className="py-3 font-bold">₪{lead.value.toLocaleString()}</td>
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
                <CardTitle className="text-lg">איכות לידים לפי מקור</CardTitle>
                <CardDescription>השוואת שיעורי המרה בין מקורות שונים</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name="כמות לידים" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardHeader>
                <CardTitle className="text-lg">עלות מול תועלת</CardTitle>
                <CardDescription>החזר השקעה (ROI) לפי מקור</CardDescription>
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
                          <p className="text-xs text-muted-foreground">עלות: ₪{(source.value * 50).toFixed(0)}</p>
                        </div>
                      </div>
                      <div className="text-left">
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
                <CardTitle className="text-lg">ביצועי אוטומציה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">הודעות שנשלחו</p>
                  <p className="text-2xl font-bold">1,284</p>
                  <p className="text-xs text-success mt-1">+23% מהחודש שעבר</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">שיעור תגובה</p>
                  <p className="text-2xl font-bold">42%</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div className="w-[42%] h-2 bg-primary rounded-full" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">חוקים פעילים</p>
                  <p className="text-2xl font-bold">{sampleAutomationRules.filter(r => r.active).length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg">ביצועי חוקים לפי זמן</CardTitle>
                <CardDescription>אפקטיביות האוטומציות לאורך זמן</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recoveryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="recovered" name="חזרו" stroke="#10B981" />
                      <Line type="monotone" dataKey="lost" name="אבודים" stroke="#EF4444" />
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