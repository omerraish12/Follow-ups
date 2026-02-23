import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Lead, LeadStatus } from "@/data/sampleData";
import { toast } from "@/hooks/use-toast";

interface AddLeadDialogProps {
  onAdd: (lead: Omit<Lead, "id" | "messages" | "createdAt" | "lastContact">) => void;
}

const sources = ["WhatsApp", "Website", "Instagram", "Referral", "Google Ads"];
const services = ["Dental Cleaning", "Orthodontics", "Root Canal", "Implants", "Cosmetic Dentistry", "Check-up"];

export default function AddLeadDialog({ onAdd }: AddLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    source: "",
    status: "new" as LeadStatus,
    notes: "",
    value: "",
    nextFollowUp: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "שם חובה";
    if (!form.phone.trim()) errs.phone = "טלפון חובה";
    else if (!/^(\+972|0)[\d\-]{8,12}$/.test(form.phone.replace(/\s/g, "")))
      errs.phone = "מספר טלפון לא תקין";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "אימייל לא תקין";
    if (!form.service) errs.service = "שירות חובה";
    if (!form.source) errs.source = "מקור חובה";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onAdd({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      service: form.service,
      source: form.source,
      status: form.status,
      notes: form.notes.trim(),
      value: Number(form.value) || 0,
      nextFollowUp: form.nextFollowUp || null,
    });
    toast({ title: "ליד נוסף בהצלחה", description: `${form.name} נוסף לרשימה` });
    setForm({ name: "", phone: "", email: "", service: "", source: "", status: "new", notes: "", value: "", nextFollowUp: "" });
    setErrors({});
    setOpen(false);
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
          הוסף ליד
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">הוסף ליד חדש</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="שם *" error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="שם מלא" className="rounded-xl" maxLength={100} />
          </Field>
          <Field label="טלפון *" error={errors.phone}>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+972-50-000-0000" className="rounded-xl" dir="ltr" maxLength={20} />
          </Field>
          <Field label="אימייל" error={errors.email}>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="rounded-xl" dir="ltr" maxLength={255} />
          </Field>
          <Field label="ערך (₪)">
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" className="rounded-xl" dir="ltr" min={0} />
          </Field>
          <Field label="שירות *" error={errors.service}>
            <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="בחר שירות" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="מקור *" error={errors.source}>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="בחר מקור" /></SelectTrigger>
              <SelectContent>
                {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="סטטוס">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LeadStatus })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">חדש</SelectItem>
                <SelectItem value="hot">חם 🔥</SelectItem>
                <SelectItem value="closed">סגור ✓</SelectItem>
                <SelectItem value="lost">אבוד</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="מעקב הבא">
            <Input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} className="rounded-xl" dir="ltr" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="הערות">
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="הערות נוספות..." className="rounded-xl resize-none" rows={2} maxLength={500} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">ביטול</Button>
          <Button onClick={handleSubmit} className="gradient-primary border-0 text-primary-foreground rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            הוסף ליד
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
