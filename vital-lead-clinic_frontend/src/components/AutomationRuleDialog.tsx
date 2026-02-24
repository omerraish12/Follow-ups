import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AutomationRule, LeadStatus } from "@/data/sampleData";
import { useAutomations } from "@/hooks/useAutomations";
import { useLanguage } from "@/contexts/LanguageContext";

interface AutomationRuleDialogProps {
  rule?: AutomationRule;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export default function AutomationRuleDialog({ rule, onSuccess, trigger }: AutomationRuleDialogProps) {
  const { t } = useLanguage();
  const { addAutomation, updateAutomation } = useAutomations();
  const isEdit = !!rule;
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: rule?.name || "",
    trigger: rule?.trigger || "",
    delayDays: String(rule?.delayDays ?? 0),
    message: rule?.message || "",
    targetStatus: (rule?.targetStatus || "new") as LeadStatus,
    active: rule?.active ?? true,
  });

  const triggerOptions = [
    { value: "lead_created", label: t("lead_created") },
    { value: "no_response", label: t("no_response") },
    { value: "status_changed_hot", label: t("status_changed_to_hot") },
    { value: "no_contact_days", label: t("no_contact_days") },
    { value: "appointment_booked", label: t("appointment_booked") },
  ];

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.trigger || !form.message.trim()) {
      // Toast error already shown by the hook
      return;
    }

    setIsSubmitting(true);
    try {
      const ruleData = {
        name: form.name.trim(),
        trigger: form.trigger,
        delayDays: Number(form.delayDays) || 0,
        message: form.message.trim(),
        targetStatus: form.targetStatus,
        active: form.active,
      };

      if (isEdit && rule?.id) {
        await updateAutomation(rule.id, ruleData as any);
      } else {
        await addAutomation(ruleData as any);
      }

      onSuccess?.(); // Notify parent to refresh
      setOpen(false);
    } catch (error) {
      // Error already handled by the hook with toast notification
    } finally {
      setIsSubmitting(false);
    }
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
      {t("edit")}
    </Button>
  ) : (
    <Button className="gradient-primary border-0 text-primary-foreground gap-2 rounded-xl shadow-lg hover:opacity-90">
      <Plus className="h-4 w-4" />
      {t("add")} {t("automation_rule_name").toLowerCase()}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) resetForm(); setOpen(v); }}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">
            {isEdit ? t("edit_rule") : t("new_rule")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("automation_rule_name")} *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("automation_rule_name")}
              className="rounded-xl"
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("trigger")} *</Label>
            <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v })} disabled={isSubmitting}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder={t("select_trigger")} />
              </SelectTrigger>
              <SelectContent>
                {triggerOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("delay_days")}</Label>
            <Input
              type="number"
              value={form.delayDays}
              onChange={(e) => setForm({ ...form, delayDays: e.target.value })}
              className="rounded-xl"
              dir="ltr"
              min={0}
              max={30}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("target_status")}</Label>
            <Select
              value={form.targetStatus}
              onValueChange={(v) => setForm({ ...form, targetStatus: v as LeadStatus })}
              disabled={isSubmitting}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">{t("status_new")}</SelectItem>
                <SelectItem value="hot">{t("status_hot")} 🔥</SelectItem>
                <SelectItem value="closed">{t("status_closed")} ✓</SelectItem>
                <SelectItem value="lost">{t("status_lost")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("automation_message")} *</Label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder={t("automation_message")}
              className="rounded-xl resize-none"
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
            />
            <p className="text-[10px] text-muted-foreground">{t("message_variables")}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-xl"
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            className="gradient-primary border-0 text-primary-foreground rounded-xl"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("loading") : isEdit ? t("save_rule") : t("create_rule")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
