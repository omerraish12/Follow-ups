import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Lead, LeadStatus } from "@/data/sampleData";
import { toast } from "@/hooks/use-toast";

interface EditLeadDialogProps {
  lead: Lead;
  onSave: (id: string, updates: Partial<Lead>) => void;
}

export default function EditLeadDialog({ lead, onSave }: EditLeadDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    notes: lead.notes,
    value: String(lead.value),
    status: lead.status as LeadStatus,
    nextFollowUp: lead.nextFollowUp || "",
  });

  const handleSubmit = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: "שגיאה", description: "שם וטלפון הם שדות חובה", variant: "destructive" });
      return;
    }
    onSave(lead.id, {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      notes: form.notes.trim(),
      value: Number(form.value) || 0,
      status: form.status,
      nextFollowUp: form.nextFollowUp || null,
    });
    toast({ title: "ליד עודכן", description: `${form.name} עודכן בהצלחה` });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v) setForm({ name: lead.name, phone: lead.phone, email: lead.email, notes: lead.notes, value: String(lead.value), status: lead.status, nextFollowUp: lead.nextFollowUp || "" });
      setOpen(v);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-2">
          <Pencil className="h-3.5 w-3.5" />
          ערוך
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">ערוך ליד</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">שם</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">טלפון</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" dir="ltr" maxLength={20} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">אימייל</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl" dir="ltr" maxLength={255} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">סטטוס</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LeadStatus })}>
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
            <Label className="text-xs font-semibold">ערך (₪)</Label>
            <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="rounded-xl" dir="ltr" min={0} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">מעקב הבא</Label>
            <Input type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} className="rounded-xl" dir="ltr" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">הערות</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl resize-none" rows={3} maxLength={500} />
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">ביטול</Button>
          <Button onClick={handleSubmit} className="gradient-primary border-0 text-primary-foreground rounded-xl">שמור</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
