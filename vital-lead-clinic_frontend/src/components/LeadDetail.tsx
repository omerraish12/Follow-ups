import { ArrowRight, Phone, Mail, MessageSquare, Send, Calendar, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import EditLeadDialog from "@/components/EditLeadDialog";
import type { Lead, Message } from "@/data/sampleData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface LeadDetailProps {
  lead: Lead;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  onAddMessage: (leadId: string, text: string, channel: Message["channel"]) => void;
  onDelete: (id: string) => void;
}

export default function LeadDetail({ lead, onBack, onUpdate, onAddMessage, onDelete }: LeadDetailProps) {
  const [newMessage, setNewMessage] = useState("");
  const [channel, setChannel] = useState<Message["channel"]>("whatsapp");

  const handleSend = () => {
    const text = newMessage.trim();
    if (!text) return;
    onAddMessage(lead.id, text, channel);
    setNewMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup any event listeners or timeouts
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="space-y-5 lg:space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-extrabold text-foreground">{lead.name}</h1>
            <StatusBadge status={lead.status} />
          </div>
          <p className="text-sm text-muted-foreground">{lead.service}</p>
        </div>
        <div className="flex items-center gap-2">
          <EditLeadDialog lead={lead} onSave={onUpdate} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">מחק</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>מחיקת ליד</AlertDialogTitle>
                <AlertDialogDescription>האם אתה בטוח שברצונך למחוק את {lead.name}? פעולה זו לא ניתנת לביטול.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel className="rounded-xl">ביטול</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(lead.id)} className="bg-destructive text-destructive-foreground rounded-xl">מחק</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button className="gradient-primary border-0 text-primary-foreground gap-2 rounded-xl hidden sm:flex">
            <Phone className="h-4 w-4" />
            התקשר
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Lead info */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-bold text-foreground">פרטי קשר</h3>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground font-mono text-xs" dir="ltr">{lead.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                  <Mail className="h-4 w-4 text-info" />
                </div>
                <span className="text-foreground text-xs">{lead.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-whatsapp/10">
                  <MessageSquare className="h-4 w-4 text-whatsapp" />
                </div>
                <span className="text-foreground text-xs">{lead.source}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-4 text-sm font-bold text-foreground">פרטים</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ערך</span>
                <span className="font-bold text-foreground text-base">₪{lead.value.toLocaleString()}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">תאריך יצירה</span>
                <span className="text-foreground">{lead.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">קשר אחרון</span>
                <span className="text-foreground">{lead.lastContact}</span>
              </div>
              {lead.nextFollowUp && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">מעקב הבא</span>
                  <span className="flex items-center gap-1.5 font-semibold text-primary">
                    <Calendar className="h-3.5 w-3.5" />
                    {lead.nextFollowUp}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h3 className="mb-3 text-sm font-bold text-foreground">הערות</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{lead.notes || "אין הערות"}</p>
          </div>

          <Button className="gradient-primary border-0 text-primary-foreground gap-2 rounded-xl w-full sm:hidden">
            <Phone className="h-4 w-4" />
            התקשר
          </Button>
        </div>

        {/* Message history */}
        <div className="lg:col-span-2 flex flex-col rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="border-b border-border px-5 py-4 flex items-center gap-2 bg-whatsapp/5">
            <MessageSquare className="h-4 w-4 text-whatsapp" />
            <h3 className="text-sm font-bold text-foreground">היסטוריית הודעות</h3>
            <span className="mr-auto text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {lead.messages.length} הודעות
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 lg:p-5 max-h-[450px] lg:max-h-[500px] bg-muted/20">
            {lead.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">אין הודעות עדיין</p>
                <p className="text-xs text-muted-foreground mt-1">שלח הודעה ראשונה למטה</p>
              </div>
            )}
            {lead.messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.sender === "clinic" ? "justify-start" : "justify-end")}>
                <div className={cn(
                  "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  msg.sender === "clinic"
                    ? "bg-whatsapp text-whatsapp-foreground rounded-br-sm"
                    : "bg-card border border-border text-foreground rounded-bl-sm"
                )}>
                  <p className="leading-relaxed">{msg.text}</p>
                  <p className={cn("mt-1.5 text-[10px]", msg.sender === "clinic" ? "text-whatsapp-foreground/60" : "text-muted-foreground")}>
                    {msg.timestamp} · {msg.channel === "whatsapp" ? "וואטסאפ" : msg.channel === "email" ? "אימייל" : msg.channel}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-3 lg:p-4 flex gap-2 bg-card">
            <Select value={channel} onValueChange={(v) => setChannel(v as Message["channel"])}>
              <SelectTrigger className="w-[110px] rounded-xl text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">וואטסאפ</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">אימייל</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="כתוב הודעה..."
              className="flex-1 rounded-xl"
              maxLength={1000}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="gradient-primary border-0 text-primary-foreground shrink-0 rounded-xl h-10 w-10 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
