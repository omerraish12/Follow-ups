import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AutomationRule, LeadStatus } from "@/data/sampleData";
import { toast } from "@/hooks/use-toast";

interface AutomationRuleDialogProps {
  rule?: AutomationRule;
  onSave: (rule: AutomationRule) => void;
  trigger?: React.ReactNode;
}

const triggers = ["Lead created", "No response", "Status changed to Hot", "No contact for 14 days", "Appointment booked"];

export default function AutomationRuleDialog({ rule, onSave, trigger }: AutomationRuleDialogProps) {
  const isEdit = !!rule;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: rule?.name || "",
    trigger: rule?.trigger || "",
    delayDays: String(rule?.delayDays ?? 0),
    message: rule?.message || "",
    targetStatus: (rule?.targetStatus || "new") as LeadStatus,
    active: rule?.active ?? true,
  });

  const handleSubmit = () => {
    if (!form.name.trim() || !form.trigger || !form.message.trim()) {
      toast({ title: "שגיאה", description: "מלא את כל השדות הנדרשים", variant: "destructive" });
      return;
    }
    onSave({
      id: rule?.id || crypto.randomUUID(),
      name: form.name.trim(),
      trigger: form.trigger,
      delayDays: Number(form.delayDays) || 0,
      message: form.message.trim(),
      targetStatus: form.targetStatus,
      active: form.active,
    });
    toast({ title: isEdit ? "חוק עודכן" : "חוק נוצר", description: form.name });
    setOpen(false);
  };

  const resetForm = () => {
    setForm({
      name: rule?.name || "",
      trigger: rule?.trigger || "",
      delayDays: String(rule?.delayDays ?? 0),
      message: rule?.message || "",
      targetStatus: (rule?.targetStatus || "new") as LeadStatus,
      active: rule?.active ?? true,
    });
  };

  const defaultTrigger = isEdit ? (
    <Button variant="ghost" size="sm" className="rounded-xl gap-1.5 text-xs">
      <Pencil className="h-3.5 w-3.5" />
      ערוך
    </Button>
  ) : (
    <Button className="gradient-primary border-0 text-primary-foreground gap-2 rounded-xl shadow-lg hover:opacity-90">
      <Plus className="h-4 w-4" />
      הוסף חוק
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) resetForm(); setOpen(v); }}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">{isEdit ? "ערוך חוק" : "חוק חדש"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">שם החוק *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="שם החוק" className="rounded-xl" maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">טריגר *</Label>
            <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="בחר טריגר" /></SelectTrigger>
              <SelectContent>
                {triggers.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">השהייה (ימים)</Label>
            <Input type="number" value={form.delayDays} onChange={(e) => setForm({ ...form, delayDays: e.target.value })} className="rounded-xl" dir="ltr" min={0} max={30} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">סטטוס יעד</Label>
            <Select value={form.targetStatus} onValueChange={(v) => setForm({ ...form, targetStatus: v as LeadStatus })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">חדש</SelectItem>
                <SelectItem value="hot">חם 🔥</SelectItem>
                <SelectItem value="closed">סגור ✓</SelectItem>
                <SelectItem value="lost">אבוד</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">הודעה *</Label>
            <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="היי {name}, ..." className="rounded-xl resize-none" rows={3} maxLength={500} />
            <p className="text-[10px] text-muted-foreground">משתנים זמינים: {"{name}"}, {"{service}"}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">ביטול</Button>
          <Button onClick={handleSubmit} className="gradient-primary border-0 text-primary-foreground rounded-xl">
            {isEdit ? "שמור" : "צור חוק"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
