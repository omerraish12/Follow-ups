import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, Mail, Calendar, MessageSquare, Clock, Tag, User, Building, Edit, Trash2, Send } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Lead, LeadMessage } from '@/types/leads';
import StatusBadge from './StatusBadge';
import EditLeadDialog from './EditLeadDialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { whatsappService, type WhatsAppTemplate } from '@/services/whatsappService';
import { getTranslatedServiceLabel } from '@/lib/serviceOptions';

interface LeadDetailProps {
  lead: Lead | null;
  onBack?: () => void;
  onUpdate?: (leadId: string, updatedLead: Lead) => void;
  onAddMessage?: (leadId: string, message: LeadMessage) => void;
  onDelete?: (leadId: string) => void;
}

export default function LeadDetail({
  lead: propLead,
  onBack,
  onUpdate,
  onAddMessage,
  onDelete,
}: LeadDetailProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { getLead, updateLead, addMessage: addMessageService, deleteLead: deleteLeadService } = useLeads();

  const [lead, setLead] = useState<Lead | null>(propLead || null);
  const [isLoading, setIsLoading] = useState<boolean>(!propLead);
  const [newMessage, setNewMessage] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isSendingTemplate, setIsSendingTemplate] = useState<boolean>(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [hasLoadedFullLead, setHasLoadedFullLead] = useState<boolean>(Boolean(propLead?.messages && propLead.messages.length > 0));

  useEffect(() => {
    if (!propLead && id) {
      loadLead();
    }
  }, [id, propLead]);

  useEffect(() => {
    if (!propLead) {
      setHasLoadedFullLead(false);
      return;
    }

    setLead(propLead);

    const propHasMessages = Boolean(propLead.messages && propLead.messages.length > 0);
    setHasLoadedFullLead(propHasMessages);

    if (propHasMessages) {
      return;
    }

    setTemplates([]);
    setSelectedTemplate(null);
    setTemplatesError(null);

    let cancelled = false;

    (async () => {
      try {
        const detailedLead = await getLead(propLead.id);
        if (!cancelled) {
          setLead(detailedLead);
          setHasLoadedFullLead(true);
        }
      } catch (error) {
        console.error("Failed to refresh lead messages:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [propLead, getLead]);

  useEffect(() => {
    if (!hasLoadedFullLead || !lead) {
      return;
    }

    if (lead.can_use_free_text) {
      setTemplates([]);
      setSelectedTemplate(null);
      setTemplatesError(null);
      return;
    }

    if (templatesLoading || templates.length > 0) {
      return;
    }

    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);
      try {
        const config = await whatsappService.getConfig();
        setTemplates(config.templates || []);
      } catch (error) {
        console.error('Failed to load WhatsApp templates:', error);
        setTemplatesError(t("template_fetch_error"));
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, [lead?.id, lead?.can_use_free_text, templates.length, templatesLoading, t, hasLoadedFullLead]);

  const loadLead = async (
    leadId?: string,
    options: { showLoading?: boolean } = {}
  ): Promise<Lead | null> => {
    const { showLoading = true } = options;
    if (showLoading) {
      setIsLoading(true);
    }
    setHasLoadedFullLead(false);
    setTemplates([]);
    setSelectedTemplate(null);
    setTemplatesError(null);
    try {
      const targetId = leadId || id;
      if (!targetId) {
        return null;
      }
      const data = await getLead(targetId);
      setLead(data);
      setHasLoadedFullLead(true);
      return data;
    } catch (error) {
      console.error('Error loading lead:', error);
      toast({
        title: "Error",
        description: "Unable to load lead details.",
        variant: "destructive",
      });
      navigate('/leads');
      return null;
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleLeadEditSuccess = async (updatedLead: Lead) => {
    const refreshedLead = await loadLead(updatedLead.id, { showLoading: false });
    const leadForCallback = refreshedLead || updatedLead;
    onUpdate?.(leadForCallback.id, leadForCallback);
  };

  const handleSendMessage = async (): Promise<void> => {
    if (!newMessage.trim()) return;

    try {
      const message = await addMessageService(lead!.id, {
        content: newMessage,
        type: 'SENT',
        isBusiness: true
      });

      setLead((prev) => ({
        ...prev!,
        messages: [...(prev!.messages || []), message],
        last_contacted: new Date().toISOString()
      }));

      setNewMessage('');

      console.log("send message", message, lead.id);

      toast({
        title: t("message_sent"),
        description: t("message_sent_successfully"),
      });

      if (onAddMessage) {
        onAddMessage(lead!.id, message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: t("error"),
        description: error?.response?.data?.message || t("free_text_window_closed_hint"),
        variant: "destructive"
      });
    }
  };

  const handleSendTemplate = async (): Promise<void> => {
    if (!lead || !selectedTemplate) return;

    if (!lead.phone) {
      toast({
        title: t("error"),
        description: t("lead_phone_required"),
        variant: "destructive",
      });
      return;
    }

    setIsSendingTemplate(true);
    try {
      await whatsappService.sendTemplate({
        to: lead.phone,
        templateName: selectedTemplate.name,
        language: selectedTemplate.language || "en",
      });
      toast({
        title: t("message_sent"),
        description: t("template_send_success"),
      });
      setSelectedTemplate(null);
      await loadLead(lead.id);
    } catch (error) {
      console.error('Error sending template:', error);
      toast({
        title: t("error"),
        description: t("template_send_failure"),
        variant: "destructive",
      });
    } finally {
      setIsSendingTemplate(false);
    }
  };

  const handleConsentToggle = async (value: boolean): Promise<void> => {
    if (!lead) return;
    setIsUpdatingConsent(true);
    try {
      const updatedLead = await updateLead(lead.id, {
        consentGiven: value,
        consentTimestamp: value ? new Date().toISOString() : null
      });
      setLead(updatedLead);
      toast({
        title: t("success"),
        description: t("consent_status_saved")
      });
      onUpdate?.(lead.id, updatedLead);
    } catch (error) {
      console.error("Error updating consent:", error);
      toast({
        title: t("error"),
        description: t("consent_update_failed"),
        variant: "destructive"
      });
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      await deleteLeadService(lead!.id);
      toast({
        title: t("lead_deleted"),
        description: `${lead!.name} ${t("removed_from_list")}`,
      });

      if (onDelete) {
        onDelete(lead!.id);
      } else {
        navigate('/leads');
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const FREE_TEXT_WINDOW_DURATION = 24 * 60 * 60 * 1000;
  const freeTextStatusKnown = hasLoadedFullLead && Boolean(lead);
  const freeTextOpen = freeTextStatusKnown ? Boolean(lead?.can_use_free_text) : false;
  const consentLabel = lead?.consent_given ? t("consent_banner_granted") : t("consent_banner_missing");
  const consentBadgeClasses = lead?.consent_given
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-destructive/10 text-destructive border-destructive/20';
  const lastInboundDate = freeTextStatusKnown && lead?.last_inbound_message_at
    ? new Date(lead.last_inbound_message_at)
    : null;
  const windowExpiresAt = freeTextOpen && lastInboundDate
    ? new Date(lastInboundDate.getTime() + FREE_TEXT_WINDOW_DURATION)
    : null;
  const formattedWindowExpires = windowExpiresAt
    ? windowExpiresAt.toLocaleString(language === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    : null;
  const freeTextBadgeClasses = freeTextStatusKnown
    ? (freeTextOpen
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : 'bg-warning/10 text-warning border-warning/20')
    : 'bg-muted/10 text-muted-foreground border-border';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("lead_not_found")}</p>
        <Button onClick={() => navigate('/leads')} className="mt-4">
          {t("back_to_leads")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => onBack ? onBack() : navigate('/leads')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          {t("back_to_leads")}
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 ml-2" />
            {t("delete")}
          </Button>
          <Button onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4 ml-2" />
            {t("edit")}
          </Button>
        </div>
      </div>

      {/* Lead Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {lead.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold">{lead.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={lead.status} />
                    {lead.source && (
                      <Badge variant="outline">{lead.source}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={`px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${consentBadgeClasses}`}>
                      {consentLabel}
                    </Badge>
                    <Switch
                      checked={Boolean(lead?.consent_given)}
                      onCheckedChange={(value) => handleConsentToggle(value)}
                      disabled={isUpdatingConsent}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("consent_description")}</p>
                </div>
              </div>
              {lead.value && lead.value > 0 && (
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">{t("potential_value")}</p>
                  <p className="text-2xl font-bold text-success">ILS {lead.value.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span dir="ltr">{lead.phone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span dir="ltr">{lead.email}</span>
                </div>
              )}
              {lead.service && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span>{getTranslatedServiceLabel(lead.service, t)}</span>
                </div>
              )}
              {lead.assigned_to_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{t("assigned_to")}: {lead.assigned_to_name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{t("created")}: {formatDate(lead.created_at)}</span>
              </div>
              {lead.last_contacted && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{t("last_message")}: {formatDate(lead.last_contacted)}</span>
                </div>
              )}
            </div>

            {lead.notes && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">{t("notes")}</h3>
                <p className="text-muted-foreground bg-muted/30 p-3 rounded-xl">
                  {lead.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("statistics")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("total_messages")}</p>
              <p className="text-2xl font-bold">{lead.messages?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("days_since_last_message")}</p>
              <p className="text-2xl font-bold">
                {lead.last_contacted
                  ? Math.floor((new Date() - new Date(lead.last_contacted)) / (1000 * 60 * 60 * 24))
                  : t("no_messages")}
              </p>
            </div>
            {lead.assigned_to && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">{t("handler")}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10">
                      {lead.assigned_to.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{lead.assigned_to}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Messages Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("message_history")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${freeTextBadgeClasses}`}
                >
                  {freeTextStatusKnown
                    ? (freeTextOpen ? t("free_text_window_open") : t("free_text_window_closed"))
                    : t("loading")}
                </Badge>
                {freeTextStatusKnown && freeTextOpen && formattedWindowExpires && (
                  <span className="text-xs text-muted-foreground">
                    {t("free_text_window_expires_at").replace("{time}", formattedWindowExpires)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {freeTextStatusKnown
                  ? (freeTextOpen ? t("free_text_window_open_hint") : t("free_text_window_closed_hint"))
                  : t("loading")}
              </p>
            </div>

            {/* Message List */}
            <div className="space-y-3 max-h-96 overflow-y-auto p-2">
              {lead.messages && lead.messages.length > 0 ? (
                lead.messages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex ${message.type === 'SENT' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl p-3 ${message.type === 'SENT'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                        }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className="flex justify-end items-center gap-1 mt-1">
                        <span className="text-[10px] opacity-70">
                          {formatDate(message.timestamp)}
                        </span>
                        {message.is_business && (
                          <Badge variant="outline" className="text-[8px] h-4 bg-white/20">
                            {t("business")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t("no_messages_to_display")}
                </p>
              )}
            </div>

            {/* New Message Input */}
            <div className="flex gap-2 pt-4 border-t">
              <Textarea
                placeholder={freeTextOpen ? t("write_new_message") : t("free_text_window_closed_hint")}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                rows={2}
                disabled={!freeTextOpen}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !freeTextOpen}
                className="self-end"
              >
                <MessageSquare className="h-4 w-4 ml-2" />
                {t("send")}
              </Button>
            </div>

            {!freeTextOpen && hasLoadedFullLead && (
              <div className="space-y-3 border-t pt-4">
                <Label
                  htmlFor="template-select"
                  className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground"
                >
                  {t("free_text_window_template_label")}
                </Label>
                {templatesLoading ? (
                  <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground text-center">
                    {t("loading")}
                  </div>
                ) : templates.length > 0 ? (
                  <Select
                    value={selectedTemplate?.id || ''}
                    onValueChange={(value) => {
                      const template = templates.find((item) => item.id === value);
                      setSelectedTemplate(template || null);
                    }}
                    id="template-select"
                  >
                    <SelectTrigger className="rounded-2xl border border-border bg-white px-4 py-3 text-slate-900 shadow-sm">
                      <SelectValue placeholder={t("template_select_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                          {template.language ? ` (${template.language.toUpperCase()})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-3 text-xs text-muted-foreground text-center">
                    {templatesError || t("template_select_empty")}
                  </div>
                )}
                <Button
                  onClick={handleSendTemplate}
                  disabled={!selectedTemplate || isSendingTemplate || templatesLoading}
                  className="self-end"
                >
                  <Send className="h-4 w-4 ml-2" />
                  {t("send_template_message")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_lead")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_lead_confirmation").replace('{name}', lead.name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {lead && (
        <EditLeadDialog
          lead={lead}
          open={isEditDialogOpen}
          onOpenChange={(open) => setIsEditDialogOpen(open)}
          onSuccess={handleLeadEditSuccess}
        />
      )}
    </div>
  );
}
