import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLeads } from "@/hooks/useLeads";
import type { Lead } from "@/types/leads";

interface EditLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const sources = ["WhatsApp", "Website", "Instagram", "Referral", "Google Ads"];
const services = ["Dental Cleaning", "Orthodontics", "Root Canal", "Implants", "Cosmetic Dentistry", "Check-up"];

const getInitialForm = (lead: Lead) => ({
  name: lead.name || "",
  phone: lead.phone || "",
  email: lead.email || "",
  service: lead.service || "",
  source: lead.source || "",
  status: lead.status ? lead.status.toLowerCase() : "new",
  notes: lead.notes || "",
  value: String(lead.value || 0),
  nextFollowUp: lead.next_follow_up ?? lead.nextFollowUp ?? "",
});

export default function EditLeadDialog({ lead, open, onOpenChange, onSuccess }: EditLeadDialogProps) {
  const { t } = useLanguage();
  const { updateLead } = useLeads();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(() => (lead ? getInitialForm(lead) : getInitialForm({} as Lead)));

  useEffect(() => {
    if (lead) {
      setForm(getInitialForm(lead));
    }
  }, [lead]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!lead) return;

    if (!form.name.trim() || !form.phone.trim()) {
      toast({
        title: t("error"),
        description: t("name_and_phone_required"),
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
        status: form.status.toUpperCase() as Lead["status"],
        notes: form.notes.trim(),
        value: Number(form.value) || 0,
        next_follow_up: form.nextFollowUp || null,
      });
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Error updating lead:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">{t("edit_lead")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("full_name")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-xl"
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("phone_number")}</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-xl"
              dir="ltr"
              maxLength={20}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("email")}</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-xl"
              dir="ltr"
              maxLength={255}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("service")}</Label>
            <Select
              value={form.service}
              onValueChange={(value) => setForm({ ...form, service: value })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t("select_service")} />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("source")}</Label>
            <Select
              value={form.source}
              onValueChange={(value) => setForm({ ...form, source: value })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t("select_source")} />
              </SelectTrigger>
              <SelectContent>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("status")}</Label>
            <Select
              value={form.status}
              onValueChange={(value) => setForm({ ...form, status: value })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">{t("status_new")}</SelectItem>
                <SelectItem value="hot">{t("status_hot")}</SelectItem>
                <SelectItem value="closed">{t("status_closed")}</SelectItem>
                <SelectItem value="lost">{t("status_lost")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("value")} (ILS)</Label>
            <Input
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="rounded-xl"
              dir="ltr"
              min={0}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("next_followup")}</Label>
            <Input
              type="date"
              value={form.nextFollowUp}
              onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })}
              className="rounded-xl"
              dir="ltr"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-xl resize-none"
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <Button variant="outline" onClick={handleClose} className="rounded-xl" disabled={isSubmitting}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            className="gradient-primary border-0 text-primary-foreground rounded-xl"
            disabled={isSubmitting}
          >
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
