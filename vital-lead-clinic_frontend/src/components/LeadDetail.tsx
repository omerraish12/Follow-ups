import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, Mail, Calendar, MessageSquare, Clock, Tag, User, Building, Info, Edit, Trash2, Send, RefreshCw, ChevronUp, Check, CheckCheck, AlertTriangle, Paperclip, Image as ImageIcon, FileText, ExternalLink } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Lead, LeadMessage, LeadMessageFilters, LeadMessagePagination } from '@/types/leads';
import StatusBadge from './StatusBadge';
import EditLeadDialog from './EditLeadDialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
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
import { whatsappService } from '@/services/whatsappService';
import { automationService } from '@/services/automationService';
import type { AutomationTemplateOption } from '@/types/automation';
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
  const { getLead, getLeadMessages, updateLead, addMessage: addMessageService, retryMessage: retryMessageService, deleteLead: deleteLeadService } = useLeads();

  const [lead, setLead] = useState<Lead | null>(propLead || null);
  const [isLoading, setIsLoading] = useState<boolean>(!propLead);
  const [threadMessages, setThreadMessages] = useState<LeadMessage[]>(propLead?.messages || []);
  const [messagePagination, setMessagePagination] = useState<LeadMessagePagination>(
    propLead?.messagePagination || { hasMore: false, nextCursor: null, limit: 50 }
  );
  const [newMessage, setNewMessage] = useState<string>('');
  const [isRefreshingMessages, setIsRefreshingMessages] = useState<boolean>(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState<boolean>(false);
  const [messageSearch, setMessageSearch] = useState<string>('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed'>('all');
  const [originFilter, setOriginFilter] = useState<'all' | 'manual' | 'template' | 'automation' | 'ai_receptionist' | 'patient'>('all');
  const [messageDateFrom, setMessageDateFrom] = useState<string>('');
  const [messageDateTo, setMessageDateTo] = useState<string>('');
  const [filteredMessageCount, setFilteredMessageCount] = useState<number | null>(null);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [approvedTemplates, setApprovedTemplates] = useState<AutomationTemplateOption[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplateOption | null>(null);
  const [isSendingTemplate, setIsSendingTemplate] = useState<boolean>(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [hasLoadedFullLead, setHasLoadedFullLead] = useState<boolean>(Boolean(propLead?.messages && propLead.messages.length > 0));

  const formatTemplateLabel = (name?: string | null, fallbackLabel?: string | null) => {
    if (!name) return fallbackLabel || "";
    const translated = t(name as any);
    if (translated && translated !== name) return translated;
    const pretty = name.replace(/_/g, " ");
    return pretty.charAt(0).toUpperCase() + pretty.slice(1);
  };

  const mergeMessages = useCallback((current: LeadMessage[], incoming: LeadMessage[]) => {
    const messageMap = new Map<string, LeadMessage>();

    [...current, ...incoming].forEach((message, index) => {
      const key = String(message.id || `${message.timestamp}-${index}`);
      const previous = messageMap.get(key) || {};
      messageMap.set(key, { ...previous, ...message });
    });

    return Array.from(messageMap.values()).sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return String(a.id).localeCompare(String(b.id));
    });
  }, []);

  const getLatestChangeCursor = useCallback((messages: LeadMessage[]) => {
    if (!messages.length) {
      return null;
    }

    return messages.reduce<string | null>((latest, message) => {
      const candidate = message.status_updated_at || message.timestamp;
      if (!candidate) return latest;
      if (!latest) return candidate;
      return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
    }, null);
  }, []);

  const syncThreadState = useCallback((nextLead: Lead) => {
    setThreadMessages(nextLead.messages || []);
    setMessagePagination(nextLead.messagePagination || { hasMore: false, nextCursor: null, limit: 50 });
    setFilteredMessageCount(nextLead.message_count ?? nextLead.messages?.length ?? 0);
  }, []);

  const draftStorageKey = lead?.id ? `lead-draft:${lead.id}` : null;
  const trimmedMessageSearch = messageSearch.trim();
  const hasMessageFilters = Boolean(
    trimmedMessageSearch ||
    directionFilter !== 'all' ||
    statusFilter !== 'all' ||
    originFilter !== 'all' ||
    messageDateFrom ||
    messageDateTo
  );

  const buildMessageFilters = useCallback((overrides: LeadMessageFilters = {}): LeadMessageFilters => ({
    limit: messagePagination.limit || 50,
    search: trimmedMessageSearch || undefined,
    direction: directionFilter !== 'all' ? directionFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    origin: originFilter !== 'all' ? originFilter : undefined,
    dateFrom: messageDateFrom || undefined,
    dateTo: messageDateTo || undefined,
    ...overrides
  }), [directionFilter, messageDateFrom, messageDateTo, messagePagination.limit, originFilter, statusFilter, trimmedMessageSearch]);

  const applyMessagePayload = useCallback((payload: { messages: LeadMessage[]; pagination: LeadMessagePagination; lead: { last_inbound_message_at: string | null; can_use_free_text: boolean; message_count: number; filtered_message_count?: number; }; }) => {
    setThreadMessages(payload.messages);
    setMessagePagination(payload.pagination);
    setFilteredMessageCount(payload.lead.filtered_message_count ?? payload.messages.length);
    setLead((prev) => prev ? ({
      ...prev,
      last_inbound_message_at: payload.lead.last_inbound_message_at,
      can_use_free_text: payload.lead.can_use_free_text,
      message_count: payload.lead.message_count,
      messages: payload.messages,
      messagePagination: payload.pagination
    }) : prev);
  }, []);

  const inferMediaType = (message: LeadMessage): string | null => {
    const metadata = message.metadata || {};
    const explicitType = typeof metadata.mediaType === 'string' ? metadata.mediaType.toLowerCase() : '';
    if (explicitType) {
      return explicitType;
    }

    const mediaUrl = typeof metadata.mediaUrl === 'string' ? metadata.mediaUrl.toLowerCase() : '';
    if (!mediaUrl) {
      return null;
    }
    if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/.test(mediaUrl)) return 'image';
    if (/\.(mp4|mov|avi|mkv)(\?|$)/.test(mediaUrl)) return 'video';
    if (/\.(mp3|ogg|wav|m4a)(\?|$)/.test(mediaUrl)) return 'audio';
    return 'document';
  };

  const getMessageMediaUrl = (message: LeadMessage): string | null => {
    const mediaUrl = message.metadata?.mediaUrl;
    return typeof mediaUrl === 'string' && mediaUrl.trim() ? mediaUrl : null;
  };

  const getMessageFileName = (message: LeadMessage): string | null => {
    const fileName = message.metadata?.fileName;
    if (typeof fileName === 'string' && fileName.trim()) {
      return fileName;
    }
    const templateName = message.metadata?.templateName;
    return typeof templateName === 'string' && templateName.trim()
      ? formatTemplateLabel(templateName)
      : null;
  };

  const loadLead = useCallback(async (
    leadId?: string,
    options: { showLoading?: boolean } = {}
  ): Promise<Lead | null> => {
    const { showLoading = true } = options;
    if (showLoading) {
      setIsLoading(true);
    }
    setHasLoadedFullLead(false);
    setApprovedTemplates([]);
    setSelectedTemplate(null);
    setTemplatesError(null);
    setTemplatesLoading(false);
    try {
      const targetId = leadId || id;
      if (!targetId) {
        return null;
      }
      const data = await getLead(targetId);
      setLead(data);
      syncThreadState(data);
      setHasLoadedFullLead(true);
      return data;
    } catch (error) {
      console.error('Error loading lead:', error);
      toast({
        title: t("error"),
        description: t("lead_load_error"),
        variant: "destructive",
      });
      navigate('/leads');
      return null;
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [getLead, id, navigate, syncThreadState]);

  useEffect(() => {
    if (!propLead && id) {
      loadLead();
    }
  }, [id, loadLead, propLead]);

  useEffect(() => {
    if (!propLead) {
      setHasLoadedFullLead(false);
      return;
    }

    setLead(propLead);
    syncThreadState(propLead);

    const propHasMessages = Boolean(propLead.messages && propLead.messages.length > 0);
    setHasLoadedFullLead(propHasMessages);

    if (propHasMessages) {
      return;
    }

    setApprovedTemplates([]);
    setSelectedTemplate(null);
    setTemplatesError(null);

    let cancelled = false;

    (async () => {
      try {
        const detailedLead = await getLead(propLead.id);
        if (!cancelled) {
          setLead(detailedLead);
          syncThreadState(detailedLead);
          setHasLoadedFullLead(true);
        }
      } catch (error) {
        console.error("Failed to refresh lead messages:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [propLead, getLead, syncThreadState]);

  useEffect(() => {
    if (!hasLoadedFullLead || !lead) {
      return;
    }

    if (lead.can_use_free_text) {
      setApprovedTemplates([]);
      setSelectedTemplate(null);
      setTemplatesError(null);
      setTemplatesLoading(false);
      return;
    }

    const fetchApprovedTemplates = async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);
      try {
        const templates = await automationService.getTemplates();
        setApprovedTemplates(templates);
      } catch (error) {
        console.error('Failed to load templates:', error);
        setTemplatesError(t("template_fetch_error"));
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchApprovedTemplates();
  }, [lead?.id, lead?.can_use_free_text, hasLoadedFullLead, t]);

  const refreshThread = useCallback(async (manual = false, replace = manual || hasMessageFilters) => {
    if (!lead?.id || !hasLoadedFullLead) {
      return;
    }

    if (manual) {
      setIsRefreshingMessages(true);
    }

    try {
      const query = buildMessageFilters();
      if (replace) {
        const payload = await getLeadMessages(lead.id, query);
        applyMessagePayload(payload);
      } else {
        const after = getLatestChangeCursor(threadMessages);
        const payload = await getLeadMessages(lead.id, {
          ...query,
          after: after || undefined
        });
        if (payload.messages.length) {
          setThreadMessages((prev) => mergeMessages(prev, payload.messages));
        }
        setLead((prev) => prev ? ({
          ...prev,
          last_inbound_message_at: payload.lead.last_inbound_message_at,
          can_use_free_text: payload.lead.can_use_free_text,
          message_count: payload.lead.message_count,
          messages: mergeMessages(prev.messages || [], payload.messages)
        }) : prev);
        setFilteredMessageCount(payload.lead.filtered_message_count ?? payload.messages.length);
      }
    } catch (error) {
      console.error('Failed to refresh thread:', error);
    } finally {
      if (manual) {
        setIsRefreshingMessages(false);
      }
    }
  }, [applyMessagePayload, buildMessageFilters, getLatestChangeCursor, getLeadMessages, hasLoadedFullLead, hasMessageFilters, lead?.id, mergeMessages, threadMessages]);

  const loadOlderMessages = useCallback(async () => {
    if (!lead?.id || !messagePagination.hasMore || !messagePagination.nextCursor) {
      return;
    }

    setIsLoadingOlderMessages(true);
    try {
      const payload = await getLeadMessages(lead.id, {
        ...buildMessageFilters({
          before: messagePagination.nextCursor,
          limit: messagePagination.limit
        })
      });
      setThreadMessages((prev) => mergeMessages(prev, payload.messages));
      setMessagePagination(payload.pagination);
      setFilteredMessageCount(payload.lead.filtered_message_count ?? payload.messages.length);
      setLead((prev) => prev ? ({
        ...prev,
        message_count: payload.lead.message_count,
        messages: mergeMessages(prev.messages || [], payload.messages)
      }) : prev);
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [buildMessageFilters, getLeadMessages, lead?.id, mergeMessages, messagePagination]);

  useEffect(() => {
    if (!lead?.id || !hasLoadedFullLead) {
      return;
    }

    const interval = window.setInterval(() => {
      refreshThread(false);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [hasLoadedFullLead, lead?.id, refreshThread]);

  useEffect(() => {
    if (!lead?.id || !hasLoadedFullLead) {
      return;
    }

    const timeout = window.setTimeout(() => {
      getLeadMessages(lead.id, buildMessageFilters())
        .then((payload) => {
          applyMessagePayload(payload);
        })
        .catch((error) => {
          console.error('Failed to apply message filters:', error);
        });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [applyMessagePayload, buildMessageFilters, directionFilter, getLeadMessages, hasLoadedFullLead, lead?.id, messageDateFrom, messageDateTo, messageSearch, originFilter, statusFilter]);

  useEffect(() => {
    if (!draftStorageKey) {
      return;
    }

    const savedDraft = window.localStorage.getItem(draftStorageKey);
    if (savedDraft !== null) {
      setNewMessage(savedDraft);
    } else {
      setNewMessage('');
    }
  }, [draftStorageKey]);

  useEffect(() => {
    setMessageSearch('');
    setDirectionFilter('all');
    setStatusFilter('all');
    setOriginFilter('all');
    setMessageDateFrom('');
    setMessageDateTo('');
  }, [lead?.id]);

  useEffect(() => {
    if (!draftStorageKey) {
      return;
    }

    if (newMessage.trim()) {
      window.localStorage.setItem(draftStorageKey, newMessage);
    } else {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [draftStorageKey, newMessage]);

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

      if (hasMessageFilters) {
        await refreshThread(false, true);
      } else {
        setThreadMessages((prev) => mergeMessages(prev, [message]));
        setLead((prev) => ({
          ...prev!,
          messages: mergeMessages(prev!.messages || [], [message]),
          last_contacted: new Date().toISOString(),
          message_count: (prev!.message_count || prev!.messages?.length || 0) + 1
        }));
      }

      setNewMessage('');
      if (draftStorageKey) {
        window.localStorage.removeItem(draftStorageKey);
      }

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
      const failedMessage = error?.response?.data?.messageRecord as LeadMessage | undefined;
      if (failedMessage) {
        if (hasMessageFilters) {
          await refreshThread(false, true);
        } else {
          setThreadMessages((prev) => mergeMessages(prev, [failedMessage]));
          setLead((prev) => prev ? ({
            ...prev,
            messages: mergeMessages(prev.messages || [], [failedMessage]),
            message_count: (prev.message_count || prev.messages?.length || 0) + 1
          }) : prev);
        }
      }
      toast({
        title: t("error"),
        description: error?.response?.data?.message || t("send_message_error"),
        variant: "destructive"
      });
    }
  };

  const handleRetryMessage = async (message: LeadMessage): Promise<void> => {
    if (!lead?.id || !message.id) {
      return;
    }

    setRetryingMessageId(String(message.id));
    try {
      const updated = await retryMessageService(lead.id, String(message.id));
      if (hasMessageFilters) {
        await refreshThread(false, true);
      } else {
        setThreadMessages((prev) => mergeMessages(prev, [updated]));
        setLead((prev) => prev ? ({
          ...prev,
          messages: mergeMessages(prev.messages || [], [updated])
        }) : prev);
      }
      toast({
        title: t("success"),
        description: t("message_sent_successfully"),
      });
    } catch (error) {
      const failedMessage = error?.response?.data?.messageRecord as LeadMessage | undefined;
      if (failedMessage) {
        if (hasMessageFilters) {
          await refreshThread(false, true);
        } else {
          setThreadMessages((prev) => mergeMessages(prev, [failedMessage]));
          setLead((prev) => prev ? ({
            ...prev,
            messages: mergeMessages(prev.messages || [], [failedMessage])
          }) : prev);
        }
      }
    } finally {
      setRetryingMessageId(null);
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
      const result = await whatsappService.sendTemplate({
        to: lead.phone,
        templateName: selectedTemplate.templateName,
        language: selectedTemplate.templateLanguage || "en",
        components: selectedTemplate.components || []
      });
      if (result.messageRecord) {
        if (hasMessageFilters) {
          await refreshThread(false, true);
        } else {
          setThreadMessages((prev) => mergeMessages(prev, [result.messageRecord as LeadMessage]));
          setLead((prev) => prev ? ({
            ...prev,
            messages: mergeMessages(prev.messages || [], [result.messageRecord as LeadMessage]),
            message_count: (prev.message_count || prev.messages?.length || 0) + 1
          }) : prev);
        }
      } else {
        await refreshThread(false, true);
      }
      toast({
        title: t("message_sent"),
        description: t("template_send_success"),
      });
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error sending template:', error);
      const failedMessage = error?.response?.data?.messageRecord as LeadMessage | undefined;
      if (failedMessage) {
        if (hasMessageFilters) {
          await refreshThread(false, true);
        } else {
          setThreadMessages((prev) => mergeMessages(prev, [failedMessage]));
          setLead((prev) => prev ? ({
            ...prev,
            messages: mergeMessages(prev.messages || [], [failedMessage]),
            message_count: (prev.message_count || prev.messages?.length || 0) + 1
          }) : prev);
        }
      }
      toast({
        title: t("error"),
        description: error?.response?.data?.message || t("template_send_failure"),
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
      setLead((prev) => prev ? ({ ...prev, ...updatedLead }) : updatedLead);
      toast({
        title: t("success"),
        description: t("consent_status_saved")
      });
      onUpdate?.(lead.id, { ...(lead as Lead), ...updatedLead });
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

  const getMessageStatusLabel = (message: LeadMessage) => {
    const status = (message.delivery_status || '').toLowerCase();
    if (message.type === 'RECEIVED') {
      return null;
    }

    if (status === 'failed') return t("message_status_failed");
    if (status === 'read') return t("message_status_read");
    if (status === 'delivered') return t("message_status_delivered");
    if (status === 'sent') return t("message_status_sent");
    if (status === 'pending') return t("message_status_pending");
    return null;
  };

  const renderMessageStatusIcon = (message: LeadMessage) => {
    const status = (message.delivery_status || '').toLowerCase();
    if (status === 'failed') return <AlertTriangle className="h-3 w-3" />;
    if (status === 'read') return <CheckCheck className="h-3 w-3" />;
    if (status === 'delivered') return <CheckCheck className="h-3 w-3" />;
    if (status === 'sent') return <Check className="h-3 w-3" />;
    if (status === 'pending') return <Clock className="h-3 w-3" />;
    return null;
  };

  const getMessageOriginLabel = (message: LeadMessage) => {
    const origin = (message.message_origin || '').toLowerCase();
    if (origin === 'manual') return t("message_origin_manual");
    if (origin === 'template') return t("message_origin_template");
    if (origin === 'automation') return t("message_origin_automation");
    if (origin === 'ai_receptionist') return t("message_origin_ai");
    if (origin === 'patient') return t("message_origin_patient");
    return null;
  };

  const renderMessageContent = (message: LeadMessage) => {
    const mediaUrl = getMessageMediaUrl(message);
    const mediaType = inferMediaType(message);
    const fileName = getMessageFileName(message);
    const caption = typeof message.metadata?.mediaCaption === 'string' ? message.metadata.mediaCaption : '';

    return (
      <div className="space-y-2">
        {message.content && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}
        {mediaUrl && mediaType === 'image' && (
          <a href={mediaUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-white/20">
            <img src={mediaUrl} alt={fileName || 'message media'} className="max-h-64 w-full object-cover" />
          </a>
        )}
        {mediaUrl && mediaType === 'video' && (
          <video controls className="max-h-64 w-full rounded-xl border border-white/20">
            <source src={mediaUrl} />
          </video>
        )}
        {mediaUrl && mediaType === 'audio' && (
          <audio controls className="w-full">
            <source src={mediaUrl} />
          </audio>
        )}
        {mediaUrl && mediaType === 'document' && (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl border border-white/20 px-3 py-2 text-xs"
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {fileName || t("message_attachment")}
            </span>
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        {!mediaUrl && mediaType && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 px-3 py-2 text-xs">
            {mediaType === 'image' ? <ImageIcon className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
            <span>{fileName || t("message_attachment")}</span>
          </div>
        )}
        {caption && !message.content.includes(caption) && (
          <p className="text-xs opacity-80">{caption}</p>
        )}
      </div>
    );
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
              {lead.entry_code && (
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {t("lead_entry_code_label")}: <span dir="ltr" className="font-semibold">{lead.entry_code}</span>
                  </span>
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
              <p className="text-2xl font-bold">{lead.message_count ?? threadMessages.length}</p>
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
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">{t("message_history")}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refreshThread(true)} disabled={isRefreshingMessages}>
              <RefreshCw className={`h-4 w-4 ${isRefreshingMessages ? 'animate-spin' : ''}`} />
            </Button>
          </div>
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
              <div className="grid gap-3 md:grid-cols-6">
                <Input
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  placeholder={t("message_filters_search_placeholder")}
                />
                <Select value={directionFilter} onValueChange={(value) => setDirectionFilter(value as typeof directionFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("conversation_history_message_type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("conversation_history_type_all")}</SelectItem>
                    <SelectItem value="sent">{t("conversation_history_type_sent")}</SelectItem>
                    <SelectItem value="received">{t("conversation_history_type_received")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("message_filters_status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("message_filters_status_all")}</SelectItem>
                    <SelectItem value="pending">{t("message_status_pending")}</SelectItem>
                    <SelectItem value="sent">{t("message_status_sent")}</SelectItem>
                    <SelectItem value="delivered">{t("message_status_delivered")}</SelectItem>
                    <SelectItem value="read">{t("message_status_read")}</SelectItem>
                    <SelectItem value="failed">{t("message_status_failed")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={originFilter} onValueChange={(value) => setOriginFilter(value as typeof originFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("message_filters_origin")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("message_filters_origin_all")}</SelectItem>
                    <SelectItem value="manual">{t("message_origin_manual")}</SelectItem>
                    <SelectItem value="template">{t("message_origin_template")}</SelectItem>
                    <SelectItem value="automation">{t("message_origin_automation")}</SelectItem>
                    <SelectItem value="ai_receptionist">{t("message_origin_ai")}</SelectItem>
                    <SelectItem value="patient">{t("message_origin_patient")}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={messageDateFrom}
                  onChange={(e) => setMessageDateFrom(e.target.value)}
                />
                <Input
                  type="date"
                  value={messageDateTo}
                  onChange={(e) => setMessageDateTo(e.target.value)}
                />
              </div>
              {hasMessageFilters && filteredMessageCount !== null && (
                <p className="text-xs text-muted-foreground">
                  {t("message_filters_results")
                    .replace("{shown}", String(threadMessages.length))
                    .replace("{filtered}", String(filteredMessageCount))
                    .replace("{total}", String(lead.message_count ?? filteredMessageCount))}
                </p>
              )}
              {messagePagination.hasMore && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadOlderMessages}
                    disabled={isLoadingOlderMessages}
                  >
                    <ChevronUp className="h-4 w-4 mr-2" />
                    {isLoadingOlderMessages ? t("loading") : t("load_more")}
                  </Button>
                </div>
              )}
              {threadMessages.length > 0 ? (
                threadMessages.map((message, index) => (
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
                      {renderMessageContent(message)}
                      {getMessageOriginLabel(message) && (
                        <div className="mt-2 flex justify-end">
                          <Badge variant="outline" className="text-[8px] h-4">
                            {getMessageOriginLabel(message)}
                          </Badge>
                        </div>
                      )}
                      <div className="flex justify-end items-center gap-1 mt-1">
                        {renderMessageStatusIcon(message)}
                        {getMessageStatusLabel(message) && (
                          <span className="text-[10px] opacity-70">
                            {getMessageStatusLabel(message)}
                          </span>
                        )}
                        <span className="text-[10px] opacity-70">
                          {formatDate(message.timestamp)}
                        </span>
                        {message.is_business && (
                          <Badge variant="outline" className="text-[8px] h-4 bg-white/20">
                            {t("business")}
                          </Badge>
                        )}
                      </div>
                      {message.delivery_error && (
                        <p className="mt-1 text-[10px] opacity-80">{message.delivery_error}</p>
                      )}
                      {(message.delivery_status || '').toLowerCase() === 'failed' && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={retryingMessageId === String(message.id)}
                            onClick={() => handleRetryMessage(message)}
                          >
                            {retryingMessageId === String(message.id) ? t("loading") : t("message_retry")}
                          </Button>
                        </div>
                      )}
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
                ) : approvedTemplates.length > 0 ? (
                  <Select
                    value={selectedTemplate?.automationId || ''}
                    onValueChange={(value) => {
                      const template = approvedTemplates.find((item) => item.automationId === value);
                      setSelectedTemplate(template || null);
                    }}
                    id="template-select"
                  >
                    <SelectTrigger className="rounded-2xl border border-border bg-white px-4 py-3 text-slate-900 shadow-sm">
                      <SelectValue placeholder={t("template_select_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedTemplates.map((template) => (
                        <SelectItem key={template.automationId} value={template.automationId}>
                          {formatTemplateLabel(template.templateName, template.automationName)}
                          {template.templateLanguage ? ` (${template.templateLanguage.toUpperCase()})` : ''}
                          {template.automationName ? ` — ${formatTemplateLabel(template.automationName)}` : ''}
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
