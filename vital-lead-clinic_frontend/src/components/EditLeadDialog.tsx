import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLeads } from "@/hooks/useLeads";

interface EditLeadDialogProps {
  lead: any; // Lead from backend
  onSuccess?: () => void;
}

const sources = ["WhatsApp", "Website", "Instagram", "Referral", "Google Ads"];
const services = ["Dental Cleaning", "Orthodontics", "Root Canal", "Implants", "Cosmetic Dentistry", "Check-up"];

export default function EditLeadDialog({ lead, onSuccess }: EditLeadDialogProps) {
  const { t } = useLanguage();
  const { updateLead } = useLeads();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: lead.name,
    phone: lead.phone,
    email: lead.email || "",
    service: lead.service || "",
    source: lead.source || "",
    status: lead.status || "new",
    notes: lead.notes || "",
    value: String(lead.value || 0),
    nextFollowUp: lead.nextFollowUp || "",
  });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ 
        title: t("error") || "שגיאה", 
        description: t("name_and_phone_required") || "שם וטלפון הם שדות חובה", 
        variant: "destructive" 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateLead(lead.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        service: form.service,
        source: form.source,
        status: form.status,
        notes: form.notes.trim(),
        value: Number(form.value) || 0,
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error updating lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v) setForm({ name: lead.name, phone: lead.phone, email: lead.email || "", service: lead.service || "", source: lead.source || "", status: lead.status || "new", notes: lead.notes || "", value: String(lead.value || 0), nextFollowUp: lead.nextFollowUp || "" });
      setOpen(v);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-2">
          <Pencil className="h-3.5 w-3.5" />
          {t("edit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">{t("edit_lead")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("full_name")}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" maxLength={100} disabled={isSubmitting} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("phone_number")}</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" dir="ltr" maxLength={20} disabled={isSubmitting} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("email")}</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl" dir="ltr" maxLength={255} disabled={isSubmitting} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("service")}</Label>
            <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })} disabled={isSubmitting}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("select_service")} /></SelectTrigger>
              <SelectContent>
                {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("source")}</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })} disabled={isSubmitting}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("select_source")} /></SelectTrigger>
              <SelectContent>
                {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("status")}</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} disabled={isSubmitting}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">{t("status_new")}</SelectItem>
                <SelectItem value="hot">{t("status_hot")}</SelectItem>
                <SelectItem value="closed">{t("status_closed")}</SelectItem>
                <SelectItem value="lost">{t("status_lost")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("value")} (₪)</Label>
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="rounded-xl" dir="ltr" min={0} disabled={isSubmitting} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("next_followup")}</Label>
            <Input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} className="rounded-xl" dir="ltr" disabled={isSubmitting} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("notes")}</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl resize-none" rows={3} maxLength={500} disabled={isSubmitting} />
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl" disabled={isSubmitting}>{t("cancel")}</Button>
          <Button onClick={handleSubmit} className="gradient-primary border-0 text-primary-foreground rounded-xl" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            {t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
}
