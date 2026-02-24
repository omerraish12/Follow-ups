import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, Mail, Calendar, MessageSquare, Clock, Tag, User, Building, Edit, Trash2 } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import StatusBadge from './StatusBadge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
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

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  service?: string;
  assigned_to_name?: string;
  assigned_to?: string;
  source?: string;
  value?: number;
  created_at: string;
  last_contacted?: string;
  notes?: string;
  messages?: Message[];
  status: string;
}

interface Message {
  id: string;
  content: string;
  type: 'SENT' | 'RECEIVED';
  timestamp: string;
  is_business: boolean;
}

interface LeadDetailProps {
  lead: Lead | null;
  onBack?: () => void;
  onUpdate?: (leadId: string, updatedLead: Lead) => void;
  onAddMessage?: (leadId: string, message: Message) => void;
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
  const { user } = useAuth();
  const { t } = useLanguage();
  const { getLead, updateLead, addMessage: addMessageService, deleteLead: deleteLeadService } = useLeads();

  const [lead, setLead] = useState<Lead | null>(propLead || null);
  const [isLoading, setIsLoading] = useState<boolean>(!propLead);
  const [newMessage, setNewMessage] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);

  useEffect(() => {
    if (!propLead && id) {
      loadLead();
    }
  }, [id, propLead]);

  const loadLead = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await getLead(id);
      setLead(data);
    } catch (error) {
      console.error('Error loading lead:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת פרטי הליד",
        variant: "destructive",
      });
      navigate('/leads');
    } finally {
      setIsLoading(false);
    }
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

      toast({
        title: t("message_sent"),
        description: t("message_sent_successfully"),
      });

      if (onAddMessage) {
        onAddMessage(lead!.id, message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <Button>
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
                </div>
              </div>
              {lead.value && lead.value > 0 && (
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">{t("potential_value")}</p>
                  <p className="text-2xl font-bold text-success">₪{lead.value.toLocaleString()}</p>
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
                  <span>{lead.service}</span>
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
                placeholder={t("write_new_message")}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                rows={2}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="self-end"
              >
                <MessageSquare className="h-4 w-4 ml-2" />
                {t("send")}
              </Button>
            </div>
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
    </div>
  );
}
