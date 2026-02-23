// src/pages/Leads.tsx
import { useState, useEffect } from "react";
import {
  Search, MessageSquare, Phone, ChevronLeft, Users, Trash2,
  Clock, AlertCircle, Filter, Download, Mail, CheckCircle,
  XCircle, Calendar, Tag, Star, TrendingUp, Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import LeadDetail from "@/components/LeadDetail";
import AddLeadDialog from "@/components/AddLeadDialog";
import { useLeads } from "@/hooks/useLeads";
import type { Lead, LeadStatus, Message } from "@/data/sampleData";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const statusFilters: { label: string; value: LeadStatus | "all" | "followup" }[] = [
  { label: "הכל", value: "all" },
  { label: "חדש", value: "new" },
  { label: "חם 🔥", value: "hot" },
  { label: "נסגר ✓", value: "closed" },
  { label: "אבוד", value: "lost" },
  { label: "צריך מעקב ⏰", value: "followup" },
];

// Helper function to check business keywords
const checkBusinessKeywords = (text: string): boolean => {
  if (!text) return false;

  const businessKeywords = [
    'טיפול', 'תור', 'מרפאה', 'שיניים', 'הלבנה', 'ייעוץ', 'מחיר', 'עלות',
    'המלצה', 'כתובת', 'שעות', 'קבלה', 'רופא', 'בדיקה', 'סתימה', 'עקירה',
    'חייג', 'חזור', 'קבע', 'הגעה', 'ביטול', 'אפשר להגיע', 'מתי פתוח'
  ];

  const lowerContent = text.toLowerCase();
  return businessKeywords.some(keyword => lowerContent.includes(keyword));
};

// פונקציה לזיהוי תוכן עסקי מול אישי
const isBusinessMessage = (content: any): boolean => {
  // Handle undefined or null content
  if (!content) return false;

  // If content is an object with text/content property
  if (typeof content === 'object') {
    const messageText = content.text || content.content || content.message || '';
    if (typeof messageText === 'string') {
      return checkBusinessKeywords(messageText);
    }
    return false;
  }

  // If content is a string
  if (typeof content === 'string') {
    return checkBusinessKeywords(content);
  }

  return false;
};

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

export default function Leads() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<LeadStatus | "all" | "followup">("all");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showBusinessOnly, setShowBusinessOnly] = useState(false);
  const { leads, addLead, updateLead, deleteLead, addMessage, bulkUpdate } = useLeads();

  // פונקציה לזיהוי לידים שצריכים מעקב
  const needsFollowup = (lead: Lead): boolean => {
    if (lead.status === 'closed' || lead.status === 'lost') return false;

    const messages = lead.messages || [];
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return false;

    // בדיקה אם ההודעה האחרונה נשלחה לפני יותר מ-3 ימים
    const messageDate = new Date((lastMessage as any).timestamp || Date.now());
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));

    // בדיקה אם ההודעה האחרונה היא מלקוח (received)
    const isFromClient = (lastMessage as any).type === 'received';

    return daysDiff >= 3 && isFromClient;
  };

  // פונקציה לזיהוי סטטוס ליד לפי תוכן הודעה
  const detectLeadStatus = (messages: any[]): LeadStatus => {
    if (!messages || messages.length === 0) return 'new';

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return 'new';

    const content = getMessageContent(lastMessage).toLowerCase();

    // מילות מפתח לסטטוס חם
    const hotKeywords = ['רוצה לקבוע', 'מתי אפשר', 'אני מעוניין', 'כן', 'בטח', 'מעולה', 'מושלם'];
    if (hotKeywords.some(keyword => content.includes(keyword))) {
      return 'hot';
    }

    // מילות מפתח לאבוד
    const lostKeywords = ['לא מעוניין', 'תודה לא', 'אחר כך', 'אולי', 'אחשוב', 'לא עכשיו'];
    if (lostKeywords.some(keyword => content.includes(keyword))) {
      return 'lost';
    }

    // מילות מפתח לנסגר
    const closedKeywords = ['קבעתי תור', 'הגעתי', 'תודה על הטיפול', 'היה מצוין'];
    if (closedKeywords.some(keyword => content.includes(keyword))) {
      return 'closed';
    }

    return 'new';
  };

  // סינון לידים לפי כל הקריטריונים
  const filteredLeads = leads.filter((lead) => {
    const messages = lead.messages || [];

    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.service.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone.includes(search) ||
      messages.some(m => {
        const content = getMessageContent(m);
        return content.toLowerCase().includes(search.toLowerCase());
      });

    let matchesFilter = true;
    if (activeFilter === "followup") {
      matchesFilter = needsFollowup(lead);
    } else if (activeFilter !== "all") {
      matchesFilter = lead.status === activeFilter;
    }

    const matchesDate = dateRange === "all" || true; // TODO: implement date filtering
    const matchesSource = sourceFilter === "all" || lead.source === sourceFilter;

    // סינון הודעות עסקיות בלבד
    const hasBusinessMessages = messages.some(m => {
      const content = getMessageContent(m);
      return isBusinessMessage(content);
    });
    const matchesBusiness = !showBusinessOnly || hasBusinessMessages;

    return matchesSearch && matchesFilter && matchesDate && matchesSource && matchesBusiness;
  });

  // סימון לידים שצריכים מעקב עם מידע נוסף
  const leadsWithFollowup = filteredLeads.map(lead => {
    const messages = lead.messages || [];
    const lastMessage = messages[messages.length - 1];
    const lastMessageDate = lastMessage ? new Date((lastMessage as any).timestamp || Date.now()) : new Date();
    const daysSinceLastMessage = lastMessage
      ? Math.floor((Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const businessMessagesCount = messages.filter(m => {
      const content = getMessageContent(m);
      return isBusinessMessage(content);
    }).length;

    const detectedStatus = detectLeadStatus(messages);

    return {
      ...lead,
      followupNeeded: needsFollowup(lead),
      daysSinceLastMessage,
      lastMessageContent: lastMessage ? getMessageContent(lastMessage) : '',
      lastMessageType: (lastMessage as any)?.type || '',
      businessMessagesCount,
      detectedStatus,
      shouldUpdateStatus: detectedStatus !== lead.status && lead.status !== 'closed'
    };
  });

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || null;

  // סטטיסטיקות
  const followupCount = leads.filter(needsFollowup).length;
  const hotCount = leads.filter(l => l.status === 'hot').length;
  const newCount = leads.filter(l => l.status === 'new').length;
  const returnedCount = leads.filter(l =>
    (l.messages || []).some(containsReturnKeywords)
  ).length;
  const totalRevenue = leads.reduce((sum, l) => sum + l.value, 0);

  // טיפול במבחר לידים
  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const handleBulkFollowup = () => {
    // שליחת הודעת מעקב לכל הלידים שנבחרו
    selectedLeads.forEach(id => {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        addMessage(id, {
          id: Date.now().toString(),
          content: `היי ${lead.name}, מזכירים לך שאנחנו פה לכל שאלה! 👋`,
          type: 'sent',
          timestamp: new Date().toISOString(),
          status: 'sent'
        });
      }
    });
    toast({
      title: "הודעות נשלחו",
      description: `נשלחו ${selectedLeads.length} הודעות מעקב`
    });
    setSelectedLeads([]);
  };

  const handleBulkStatusChange = (status: LeadStatus) => {
    bulkUpdate(selectedLeads, { status });
    toast({
      title: "סטטוס עודכן",
      description: `${selectedLeads.length} לידים עודכנו לסטטוס ${status}`
    });
    setSelectedLeads([]);
  };

  if (selectedLead) {
    return (
      <LeadDetail
        lead={selectedLead}
        onBack={() => setSelectedLeadId(null)}
        onUpdate={updateLead}
        onAddMessage={addMessage}
        onDelete={(id) => {
          deleteLead(id);
          setSelectedLeadId(null);
          toast({ title: "ליד נמחק", description: `${selectedLead.name} הוסר מהרשימה` });
        }}
      />
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">לידים</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ניהול ומעקב אחרי הלידים של המרפאה
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl">
            <Download className="h-4 w-4 ml-2" />
            ייצוא
          </Button>
          <AddLeadDialog onAdd={addLead} />
        </div>
      </div>

      {/* Stats Cards - עם כל המדדים הנדרשים */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              סה"כ לידים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{leads.length}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" />
              <span>+{newCount} חדשים</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              לידים חמים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{hotCount}</div>
            <Progress value={leads.length ? (hotCount / leads.length) * 100 : 0} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              לקוחות שחזרו
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{returnedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {leads.length ? Math.round((returnedCount / leads.length) * 100) : 0}% מהלידים
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              דורשים מעקב
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{followupCount}</div>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <Clock className="h-3 w-3 text-warning" />
              <span>לא הגיבו 3+ ימים</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="חפש לפי שם, טלפון, שירות או תוכן הודעה..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 rounded-xl"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue placeholder="מקור" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל המקורות</SelectItem>
              <SelectItem value="וואטסאפ">וואטסאפ</SelectItem>
              <SelectItem value="פייסבוק">פייסבוק</SelectItem>
              <SelectItem value="אינסטגרם">אינסטגרם</SelectItem>
              <SelectItem value="המלצה">המלצה</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue placeholder="טווח תאריכים" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="today">היום</SelectItem>
              <SelectItem value="week">שבוע אחרון</SelectItem>
              <SelectItem value="month">חודש אחרון</SelectItem>
              <SelectItem value="3months">3 חודשים</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="business"
              checked={showBusinessOnly}
              onCheckedChange={(checked) => setShowBusinessOnly(checked as boolean)}
            />
            <Label htmlFor="business">הצג רק הודעות עסקיות</Label>
          </div>
          <Badge variant="outline" className="bg-primary/5">
            <Filter className="h-3 w-3 ml-1" />
            סינון מתקדם
          </Badge>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition-all",
                activeFilter === f.value
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
              {f.value === 'followup' && followupCount > 0 && (
                <span className="mr-2 px-1.5 py-0.5 bg-destructive text-destructive-foreground rounded-full text-[10px]">
                  {followupCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span className="font-medium">נבחרו {selectedLeads.length} לידים</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-xl" onClick={handleBulkFollowup}>
              <MessageSquare className="h-4 w-4 ml-2" />
              שלח הודעת מעקב
            </Button>
            <Select onValueChange={(value) => handleBulkStatusChange(value as LeadStatus)}>
              <SelectTrigger className="w-[140px] h-8 rounded-xl">
                <SelectValue placeholder="שנה סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">חדש</SelectItem>
                <SelectItem value="hot">חם</SelectItem>
                <SelectItem value="closed">נסגר</SelectItem>
                <SelectItem value="lost">אבוד</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filteredLeads.length} לידים נמצאו</p>
        <div className="flex items-center gap-2">
          <Checkbox
            id="selectAll"
            checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="selectAll">בחר הכל</Label>
        </div>
      </div>

      {/* Mobile cards with follow-up indication */}
      <div className="space-y-3 lg:hidden">
        {leadsWithFollowup.map((lead, i) => (
          <button
            key={lead.id}
            onClick={() => setSelectedLeadId(lead.id)}
            className={cn(
              "w-full rounded-2xl border p-4 text-right shadow-card transition-all hover:shadow-card-hover active:scale-[0.99] animate-fade-in relative",
              lead.followupNeeded ? "border-warning/50 bg-warning/5" : "border-border bg-card"
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={selectedLeads.includes(lead.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedLeads([...selectedLeads, lead.id]);
                  } else {
                    setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                  }
                }}
              />
            </div>

            {lead.followupNeeded && (
              <div className="absolute top-2 left-2">
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">
                  <Clock className="h-3 w-3 ml-1" />
                  {lead.daysSinceLastMessage} ימים
                </Badge>
              </div>
            )}

            {lead.shouldUpdateStatus && (
              <div className="absolute bottom-2 left-2">
                <Badge variant="outline" className="bg-info/10 text-info border-info/20 text-[10px]">
                  <Tag className="h-3 w-3 ml-1" />
                  סטטוס מוצע: {lead.detectedStatus}
                </Badge>
              </div>
            )}

            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {lead.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-foreground">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.service}</p>
                </div>
              </div>
              <StatusBadge status={lead.status} />
            </div>

            {/* תצוגה מקדימה של ההודעה האחרונה */}
            {lead.lastMessageContent && (
              <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-xl line-clamp-1">
                "{lead.lastMessageContent}"
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {lead.messages?.length || 0} הודעות
                  {lead.businessMessagesCount > 0 && (
                    <Badge variant="outline" className="text-[8px] h-4 px-1">
                      {lead.businessMessagesCount} עסקיות
                    </Badge>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">₪{lead.value.toLocaleString()}</span>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop table with follow-up column and message analysis */}
      <div className="hidden lg:block rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground bg-muted/30">
                <th className="px-5 py-3.5 w-10">
                  <Checkbox
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-5 py-3.5 font-semibold">שם</th>
                <th className="px-5 py-3.5 font-semibold">טלפון</th>
                <th className="px-5 py-3.5 font-semibold">שירות</th>
                <th className="px-5 py-3.5 font-semibold">סטטוס</th>
                <th className="px-5 py-3.5 font-semibold">סטטוס מוצע</th>
                <th className="px-5 py-3.5 font-semibold">מקור</th>
                <th className="px-5 py-3.5 font-semibold">ערך</th>
                <th className="px-5 py-3.5 font-semibold">הודעה אחרונה</th>
                <th className="px-5 py-3.5 font-semibold">תאריך</th>
                <th className="px-5 py-3.5 font-semibold">מעקב</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {leadsWithFollowup.map((lead, i) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors animate-fade-in",
                    lead.followupNeeded && "bg-warning/5"
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLeads([...selectedLeads, lead.id]);
                        } else {
                          setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {lead.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-foreground">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs" dir="ltr">{lead.phone}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{lead.service}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={lead.status} /></td>
                  <td className="px-5 py-3.5">
                    {lead.detectedStatus !== lead.status && (
                      <Badge variant="outline" className="bg-info/10 text-info">
                        {lead.detectedStatus}
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{lead.source}</td>
                  <td className="px-5 py-3.5 font-bold text-foreground">₪{lead.value.toLocaleString()}</td>
                  <td className="px-5 py-3.5 max-w-[200px]">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {lead.lastMessageContent || 'אין הודעות'}
                      </span>
                      {lead.businessMessagesCount > 0 && (
                        <Badge variant="outline" className="text-[10px] h-5 bg-primary/5">
                          עסקי
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {lead.daysSinceLastMessage === 0 ? 'היום' :
                          lead.daysSinceLastMessage === 1 ? 'אתמול' :
                            `לפני ${lead.daysSinceLastMessage} ימים`}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {lead.followupNeeded ? (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        <Bell className="h-3 w-3 ml-1" />
                        דרוש מעקב
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        <CheckCircle className="h-3 w-3 ml-1" />
                        מעודכן
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredLeads.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 font-bold text-foreground">לא נמצאו לידים</p>
          <p className="mt-1 text-sm text-muted-foreground">נסה לשנות את החיפוש או הפילטרים</p>
        </div>
      )}
    </div>
  );
}