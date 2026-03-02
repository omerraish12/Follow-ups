import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLeads } from "@/hooks/useLeads";
import type { LeadStatus } from "@/types/leads";

interface AddLeadDialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  trigger?: React.ReactNode;
}

const sources = [
  { value: "WhatsApp", labelKey: "source_whatsapp" },
  { value: "Website", labelKey: "source_website" },
  { value: "Instagram", labelKey: "source_instagram" },
  { value: "Referral", labelKey: "source_referral" },
  { value: "Google Ads", labelKey: "source_google_ads" },
];
const services = [
  { value: "Dental Cleaning", labelKey: "service_option_dental_cleaning" },
  { value: "Orthodontics", labelKey: "service_option_orthodontics" },
  { value: "Root Canal", labelKey: "service_option_root_canal" },
  { value: "Implants", labelKey: "service_option_implants" },
  { value: "Cosmetic Dentistry", labelKey: "service_option_cosmetic_dentistry" },
  { value: "Check-up", labelKey: "service_option_checkup" },
];

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

export default function AddLeadDialog({ onSuccess, open, onOpenChange, hideTrigger = false, trigger }: AddLeadDialogProps) {
  const { t } = useLanguage();
  const { addLead } = useLeads();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    source: "",
    status: "NEW" as LeadStatus,
    notes: "",
    value: "",
    nextFollowUp: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isControlled = typeof open === "boolean";
  const dialogOpen = isControlled ? open : internalOpen;

  const setDialogOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t("name_required");
    if (!form.phone.trim()) errs.phone = t("phone_required");
    else if (!/^\+?[0-9()\-\s]{7,20}$/.test(form.phone.trim()))
      errs.phone = t("invalid_phone");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = t("invalid_email");
    if (!form.service) errs.service = t("service_required");
    if (!form.source) errs.source = t("source_required");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await addLead({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        service: form.service,
        source: form.source,
        status: form.status,
        notes: form.notes.trim(),
        value: Number(form.value) || 0,
        nextFollowUp: form.nextFollowUp || undefined,
      });

      // Reset form
      setForm({ name: "", phone: "", email: "", service: "", source: "", status: "NEW", notes: "", value: "", nextFollowUp: "" });
      setErrors({});
      setDialogOpen(false);
      onSuccess?.();
    } catch (error: unknown) {
      const serverMessage =
        (error as { response?: { data?: { message?: string; errors?: Array<{ msg?: string }> } } })?.response?.data?.message ||
        (error as { response?: { data?: { errors?: Array<{ msg?: string }> } } })?.response?.data?.errors?.[0]?.msg ||
        t("error_loading_leads");

      toast({
        title: t("error"),
        description: serverMessage,
        variant: "destructive",
      });
      console.error('Error adding lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="gradient-primary border-0 text-primary-foreground gap-2 rounded-xl shadow-lg hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" />
              {t("add_lead")}
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">{t("add_new_lead")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label={t("full_name") + " *"} error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("full_name")} className="rounded-xl" maxLength={100} disabled={isSubmitting} />
          </Field>
          <Field label={t("phone_number") + " *"} error={errors.phone}>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t("phone_placeholder")} className="rounded-xl" dir="ltr" maxLength={20} disabled={isSubmitting} />
          </Field>
          <Field label={t("email")} error={errors.email}>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t("email_placeholder")} className="rounded-xl" dir="ltr" maxLength={255} disabled={isSubmitting} />
          </Field>
          <Field label={t("value") + " (ILS)"}>
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" className="rounded-xl" dir="ltr" min={0} disabled={isSubmitting} />
          </Field>
          <Field label={t("service") + " *"} error={errors.service}>
            <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })} disabled={isSubmitting}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("select_service")} /></SelectTrigger>
              <SelectContent>
                {services.map(({ value, labelKey }) => (
                  <SelectItem key={value} value={value}>
                    {t(labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("source") + " *"} error={errors.source}>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })} disabled={isSubmitting}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("select_source")} /></SelectTrigger>
              <SelectContent>
                {sources.map(({ value, labelKey }) => (
                  <SelectItem key={value} value={value}>
                    {t(labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("status")}>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LeadStatus })} disabled={isSubmitting}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">{t("status_new")}</SelectItem>
                <SelectItem value="HOT">{t("status_hot")}</SelectItem>
                <SelectItem value="CLOSED">{t("status_closed")}</SelectItem>
                <SelectItem value="LOST">{t("status_lost")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("next_followup")}>
            <Input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} className="rounded-xl" dir="ltr" disabled={isSubmitting} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("notes")}>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("additional_notes")} className="rounded-xl resize-none" rows={2} maxLength={500} disabled={isSubmitting} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl" disabled={isSubmitting}>{t("cancel")}</Button>
          <Button onClick={handleSubmit} className="gradient-primary border-0 text-primary-foreground rounded-xl gap-2" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t("add_lead")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
