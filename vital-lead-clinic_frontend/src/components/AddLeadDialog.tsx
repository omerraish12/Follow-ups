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

interface AddLeadDialogProps {
  onSuccess?: () => void;
}

const sources = ["WhatsApp", "Website", "Instagram", "Referral", "Google Ads"];
const services = ["Dental Cleaning", "Orthodontics", "Root Canal", "Implants", "Cosmetic Dentistry", "Check-up"];

export default function AddLeadDialog({ onSuccess }: AddLeadDialogProps) {
  const { t } = useLanguage();
  const { addLead } = useLeads();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    source: "",
    status: "new",
    notes: "",
    value: "",
    nextFollowUp: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t("name_required") || "שם חובה";
    if (!form.phone.trim()) errs.phone = t("phone_required") || "טלפון חובה";
    else if (!/^(\+972|0)[\d\-]{8,12}$/.test(form.phone.replace(/\s/g, "")))
      errs.phone = t("invalid_phone") || "מספר טלפון לא תקין";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = t("invalid_email") || "אימייל לא תקין";
    if (!form.service) errs.service = t("service_required") || "שירות חובה";
    if (!form.source) errs.source = t("source_required") || "מקור חובה";
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
      });

      // Reset form
      setForm({ name: "", phone: "", email: "", service: "", source: "", status: "new", notes: "", value: "", nextFollowUp: "" });
      setErrors({});
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding lead:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary border-0 text-primary-foreground gap-2 rounded-xl shadow-lg hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" />
          {t("add_lead")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">{t("add_new_lead")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label={t("full_name") + " *"} error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("full_name") || "שם מלא"} className="rounded-xl" maxLength={100} disabled={isSubmitting} />
          </Field>
          <Field label={t("phone_number") + " *"} error={errors.phone}>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+972-50-000-0000" className="rounded-xl" dir="ltr" maxLength={20} disabled={isSubmitting} />
          </Field>
          <Field label={t("email")} error={errors.email}>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="rounded-xl" dir="ltr" maxLength={255} disabled={isSubmitting} />
          </Field>
          <Field label={t("value") + " (₪)"}>
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" className="rounded-xl" dir="ltr" min={0} disabled={isSubmitting} />
          </Field>
          <Field label={t("service") + " *"} error={errors.service}>
            <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })} disabled={isSubmitting}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("select_service") || "בחר שירות"} /></SelectTrigger>
              <SelectContent>
                {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("source") + " *"} error={errors.source}>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })} disabled={isSubmitting}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("select_source") || "בחר מקור"} /></SelectTrigger>
              <SelectContent>
                {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("status")}>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} disabled={isSubmitting}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">{t("status_new")}</SelectItem>
                <SelectItem value="hot">{t("status_hot")}</SelectItem>
                <SelectItem value="closed">{t("status_closed")}</SelectItem>
                <SelectItem value="lost">{t("status_lost")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("next_followup")}>
            <Input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} className="rounded-xl" dir="ltr" disabled={isSubmitting} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("notes")}>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("additional_notes") || "הערות נוספות..."} className="rounded-xl resize-none" rows={2} maxLength={500} disabled={isSubmitting} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl" disabled={isSubmitting}>{t("cancel")}</Button>
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
