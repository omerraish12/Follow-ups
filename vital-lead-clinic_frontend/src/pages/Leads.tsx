// src/pages/Leads.tsx
import { useState, useEffect } from "react";
import {
  Search, MessageSquare, Phone, ChevronLeft, Users, Trash2,
  Clock, AlertCircle, Filter, Download, Mail, CheckCircle,
  XCircle, Calendar, Tag, Star, TrendingUp, Bell,
  Loader2, Plus, Edit, Eye
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import LeadDetail from "@/components/LeadDetail";
import AddLeadDialog from "@/components/AddLeadDialog";
import { useLeads } from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadStatus } from "@/data/sampleData";
import { Progress } from "@/components/ui/progress";

export default function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Create status filters with translations
  const statusFilters = [
    { label: t("all_leads"), value: "all" as const },
    { label: t("filters_status_new"), value: "NEW" as const },
    { label: t("filters_status_hot"), value: "HOT" as const },
    { label: t("filters_status_closed"), value: "CLOSED" as const },
    { label: t("filters_status_lost"), value: "LOST" as const },
    { label: t("filters_status_followup"), value: "followup" as const },
  ];

  // State
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<LeadStatus | "all" | "followup">(
    (searchParams.get('filter') as LeadStatus | "all" | "followup") || "all"
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  // Hooks
  const {
    leads,
    isLoading,
    error,
    filters,
    setFilters,
    fetchLeads,
    deleteLead,
    bulkUpdate,
    getFollowupNeeded,
    stats
  } = useLeads();

  // Load follow-up count
  const [followupCount, setFollowupCount] = useState(0);

  useEffect(() => {
    const loadFollowupCount = async () => {
      try {
        const data = await getFollowupNeeded();
        setFollowupCount(data.length);
      } catch (error) {
        console.error('Error loading followup count:', error);
      }
    };
    loadFollowupCount();
  }, []);

  // Update filters when search/filter changes
  useEffect(() => {
    const newFilters: any = {};

    if (search) newFilters.search = search;
    if (activeFilter !== 'all' && activeFilter !== 'followup') {
      newFilters.status = activeFilter;
    }
    if (sourceFilter !== 'all') newFilters.source = sourceFilter;

    setFilters(newFilters);

    // Update URL params
    const params = new URLSearchParams();
    if (activeFilter !== 'all') params.set('filter', activeFilter);
    if (search) params.set('q', search);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    setSearchParams(params);

  }, [search, activeFilter, sourceFilter]);

  // Filter leads for display
  const filteredLeads = activeFilter === 'followup'
    ? leads.filter(lead => {
      const daysSinceLastContact = lead.last_contacted
        ? Math.floor((new Date() - new Date(lead.last_contacted)) / (1000 * 60 * 60 * 24))
        : 0;
      return daysSinceLastContact >= 3 && lead.status !== 'CLOSED' && lead.status !== 'LOST';
    })
    : leads;

  // Stats
  const newCount = leads.filter(l => l.status === 'NEW').length;
  const hotCount = leads.filter(l => l.status === 'HOT').length;
  const returnedCount = leads.filter(l =>
    l.messages?.some(m =>
      m.content?.includes('חוזר') || m.content?.includes('שוב') || m.content?.includes('חזרתי')
    )
  ).length;

  // Handlers
  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const handleBulkFollowup = async () => {
    try {
      await bulkUpdate(selectedLeads, {
        notes: `${t("send_reminder")} ${new Date().toLocaleDateString('he-IL')}`
      });

      toast({
        title: t("send_reminder"),
        description: `${t("sent_messages_month")} ${selectedLeads.length}`,
      });

      setSelectedLeads([]);
    } catch (error) {
      console.error('Error in bulk followup:', error);
    }
  };

  const handleBulkStatusChange = async (status: LeadStatus) => {
    try {
      await bulkUpdate(selectedLeads, { status });

      toast({
        title: t("status"),
        description: `${selectedLeads.length} ${t("leads")} ${t("success")}`,
      });

      setSelectedLeads([]);
    } catch (error) {
      console.error('Error in bulk status change:', error);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLeadToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;

    try {
      await deleteLead(leadToDelete);
      toast({
        title: t("delete"),
        description: t("error_loading_leads"),
      });
    } catch (error) {
      console.error('Error deleting lead:', error);
    } finally {
      setShowDeleteDialog(false);
      setLeadToDelete(null);
    }
  };

  // Loading state
  if (isLoading && !leads.length) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* Table skeleton */}
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">{t("error_loading_leads")}</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchLeads}>{t("try_again")}</Button>
      </div>
    );
  }

  // If viewing single lead
  if (selectedLeadId) {
    return (
      <LeadDetail
        leadId={selectedLeadId}
        onBack={() => setSelectedLeadId(null)}
      />
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{t("leads")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("manage_leads")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl">
            <Download className="h-4 w-4 ml-2" />
            {t("export")}
          </Button>
          <AddLeadDialog onSuccess={() => fetchLeads()} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("total_leads")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{leads.length}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" />
              <span>+{newCount} {t("new")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("hot_leads")}
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
              {t("returned_leads")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{returnedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {leads.length ? Math.round((returnedCount / leads.length) * 100) : 0}% {t("conversion")}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("leads_requiring_followup")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{followupCount}</div>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <Clock className="h-3 w-3 text-warning" />
              <span>{t("leads_not_responded")}</span>
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
              placeholder={t("quick_search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 rounded-xl"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue placeholder={t("source")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_leads")}</SelectItem>
              <SelectItem value="וואטסאפ">WhatsApp</SelectItem>
              <SelectItem value="פייסבוק">Facebook</SelectItem>
              <SelectItem value="אינסטגרם">Instagram</SelectItem>
              <SelectItem value="המלצה">{t("smile_recommendation")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue placeholder={t("date_range")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_leads")}</SelectItem>
              <SelectItem value="today">{t("today")}</SelectItem>
              <SelectItem value="week">{t("last_week_option")}</SelectItem>
              <SelectItem value="month">{t("last_month_option")}</SelectItem>
              <SelectItem value="3months">3 {t("months")}</SelectItem>
            </SelectContent>
          </Select>
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
            <span className="font-medium">{t("selected_leads").replace("{count}", String(selectedLeads.length))}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-xl" onClick={handleBulkFollowup}>
              <MessageSquare className="h-4 w-4 ml-2" />
              {t("send_followup_message")}
            </Button>
            <Select onValueChange={(value) => handleBulkStatusChange(value as LeadStatus)}>
              <SelectTrigger className="w-[140px] h-8 rounded-xl">
                <SelectValue placeholder={t("change_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">{t("new_status")}</SelectItem>
                <SelectItem value="HOT">{t("hot_status")}</SelectItem>
                <SelectItem value="CLOSED">{t("closed_status")}</SelectItem>
                <SelectItem value="LOST">{t("lost_status")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Count and Select All */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t("leads_found").replace("{count}", String(filteredLeads.length))}</p>
        <div className="flex items-center gap-2">
          <Checkbox
            id="selectAll"
            checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="selectAll">{t("select_all")}</Label>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 lg:hidden">
        {filteredLeads.map((lead) => {
          const daysSinceLastContact = lead.last_contacted
            ? Math.floor((new Date() - new Date(lead.last_contacted)) / (1000 * 60 * 60 * 24))
            : 0;
          const needsFollowup = daysSinceLastContact >= 3 && lead.status !== 'CLOSED' && lead.status !== 'LOST';

          return (
            <div
              key={lead.id}
              onClick={() => setSelectedLeadId(lead.id)}
              className={cn(
                "w-full rounded-2xl border p-4 text-right shadow-card transition-all hover:shadow-card-hover active:scale-[0.99] relative cursor-pointer",
                needsFollowup ? "border-warning/50 bg-warning/5" : "border-border bg-card"
              )}
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

              {needsFollowup && (
                <div className="absolute top-2 left-2">
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">
                    <Clock className="h-3 w-3 ml-1" />
                    {daysSinceLastContact} ימים
                  </Badge>
                </div>
              )}

              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {lead.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.service || t("no_service")}</p>
                  </div>
                </div>
                <StatusBadge status={lead.status} />
              </div>

              {/* Last message preview */}
              {lead.messages && lead.messages.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-xl line-clamp-1">
                  "{lead.messages[lead.messages.length - 1].content}"
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {lead.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {t("messages_count").replace("{count}", String(lead.message_count || 0))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    ₪{(lead.value || 0).toLocaleString()}
                  </span>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
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
                <th className="px-5 py-3.5 font-semibold">{t("table_name")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("table_phone")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("table_service")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("table_status")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("table_source")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("table_value")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("table_last_message")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("table_followup")}</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const daysSinceLastContact = lead.last_contacted
                  ? Math.floor((new Date() - new Date(lead.last_contacted)) / (1000 * 60 * 60 * 24))
                  : 0;
                const needsFollowup = daysSinceLastContact >= 3 && lead.status !== 'CLOSED' && lead.status !== 'LOST';

                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors",
                      needsFollowup && "bg-warning/5"
                    )}
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
                          {lead.name?.charAt(0) || '?'}
                        </div>
                        <span className="font-semibold text-foreground">{lead.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs" dir="ltr">
                      {lead.phone}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{lead.service || '-'}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={lead.status} /></td>
                    <td className="px-5 py-3.5 text-muted-foreground">{lead.source || '-'}</td>
                    <td className="px-5 py-3.5 font-bold text-foreground">
                      ₪{(lead.value || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                          {lead.last_contacted
                            ? daysSinceLastContact === 0 ? 'היום' :
                              daysSinceLastContact === 1 ? 'אתמול' :
                                `לפני ${daysSinceLastContact} ימים`
                            : 'אין הודעות'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {needsFollowup ? (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => setSelectedLeadId(lead.id)}>
                            <Eye className="h-4 w-4 ml-2" />
                            צפה
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 ml-2" />
                            ערוך
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => handleDeleteClick(lead.id, e)}
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredLeads.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-card">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 font-bold text-foreground">{t("no_leads_found")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || activeFilter !== 'all'
              ? t("try_change_filters")
              : t("create_lead_to_start")}
          </p>
          {!search && activeFilter === 'all' && (
            <Button className="mt-4" onClick={() => { }}>
              <Plus className="h-4 w-4 ml-2" />
              {t("add_new_lead")}
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_lead_confirmation_dialog")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_lead_confirmation_text")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}