import { useMemo, useState } from "react";
import { Phone, Mail, MessageCircle, User, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { contactService } from "@/services/contactService";

const initialFormState = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

export default function ContactPage() {
  const { t, language } = useLanguage();
  const isRtl = language === "he";
  const [form, setForm] = useState(initialFormState);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const contactDetails = useMemo(
    () => [
      {
        key: "phone",
        title: t("contact_phone_label"),
        value: "03-3106-110",
        subtitle: t("contact_phone_help"),
        Icon: Phone,
      },
      {
        key: "email",
        title: t("contact_email_label"),
        value: "support@reactionz.io",
        subtitle: t("contact_email_help"),
        Icon: Mail,
      },
      {
        key: "chat",
        title: t("contact_chat_label"),
        value: t("contact_chat_value"),
        subtitle: t("contact_chat_help"),
        Icon: MessageCircle,
      },
    ],
    [t]
  );

  const canSubmit = agreed && Boolean(form.message.trim());

  const handleChange = (field: keyof typeof initialFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!agreed) {
      toast({
        title: t("contact_agree_required"),
        description: t("contact_agree_description"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await contactService.sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        agreement: agreed,
      });
      toast({
        title: t("contact_success_title"),
        description: t("contact_success_description"),
      });
      setForm(initialFormState);
      setAgreed(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : t("contact_form_error");
      toast({
        title: t("error"),
        description,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-gradient-to-b from-[#0a174e] via-[#0f2f9c] to-[#0f5bd5] text-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
        <div className="text-center pb-12 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
            <span>{t("contact_banner_tag")}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_6px_rgba(16,185,129,0.25)]" />
            <span>{t("contact_response_time")}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">{t("contact_title")}</h1>
          <p className="max-w-3xl mx-auto text-base text-white/80">{t("contact_subtitle")}</p>
        </div>

        <div className="bg-gradient-to-b from-[#fbfdff] to-[#f3f6ff] text-foreground rounded-[32px] shadow-[0_25px_70px_-30px_rgba(6,20,61,0.45)] p-6 md:p-10 grid gap-10 md:grid-cols-[1.5fr,0.9fr] relative overflow-hidden">
          <div className="hidden md:block absolute inset-y-10 left-[62%] w-px bg-[#dfe7ff]" aria-hidden />

          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: t("contact_form_phone_placeholder"), Icon: Phone, value: form.phone, field: "phone" },
                { label: t("contact_form_email_placeholder"), Icon: Mail, value: form.email, field: "email" },
                { label: t("contact_form_name_placeholder"), Icon: User, value: form.name, field: "name" },
              ].map(({ label, Icon, value, field }) => (
                <label
                  key={field}
                  className="group flex items-center gap-3 rounded-2xl border border-[#d4ddff] bg-[#eef3ff] px-4 py-3 shadow-[0_12px_30px_-18px_rgba(37,99,235,0.25)] focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/15 transition"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <Input
                    placeholder={label}
                    value={value}
                    onChange={handleChange(field as keyof typeof initialFormState)}
                    className="border border-transparent bg-transparent px-3 py-2 rounded-xl text-sm text-slate-900 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:border-transparent"
                  />
                </label>
              ))}
            </div>

            <label className="block rounded-2xl border border-[#d4ddff] bg-[#eef3ff] shadow-[0_18px_44px_-26px_rgba(37,99,235,0.28)] focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/15 transition">
              <div className="flex items-center gap-2 px-4 pt-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                <FileText className="h-4 w-4" />
                <span>{t("contact_form_message_placeholder")}</span>
              </div>
              <Textarea
                placeholder={t("contact_form_message_placeholder")}
                value={form.message}
                onChange={handleChange("message")}
                className="border border-transparent bg-transparent px-4 pb-4 pt-2 h-40 focus-visible:ring-0 focus-visible:border-transparent text-sm text-slate-900 placeholder:text-slate-500 rounded-2xl"
              />
              <p className="px-4 pb-3 text-xs text-slate-600">Typical reply in 2–4 hours on weekdays.</p>
            </label>

            <div className={cn("flex flex-col gap-3", isRtl && "text-right")}>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    id="contact-agreement"
                    type="checkbox"
                    checked={agreed}
                    onChange={(event) => setAgreed(event.target.checked)}
                    className="h-5 w-5 rounded-md border border-slate-300 text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                  <span>
                    {t("contact_form_agreement")} <a href="#" className="font-semibold text-primary">{t("privacy_policy")}</a>
                    <span className="px-1">{t("contact_form_and")}</span>
                    <a href="#" className="font-semibold text-primary">{t("terms_of_use")}</a>
                    .
                  </span>
                </label>
              </div>

              <Button type="submit" size="lg" className="w-full rounded-[30px] bg-gradient-to-r from-[#5c7cfa] to-[#7c9dff] shadow-[0_15px_40px_-20px_rgba(92,124,250,0.9)]" disabled={!canSubmit || submitting}>
                {submitting ? t("contact_form_sending") : t("contact_form_button")}
              </Button>
              <button
                type="button"
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline inline-flex items-center gap-2 justify-center"
              >
                <Calendar className="h-4 w-4" />
                Schedule a call instead
              </button>
            </div>
          </form>

          <div className="space-y-5 relative z-10 md:pl-10">
            <div className="flex items-center gap-3 justify-between">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-600">{t("contact_info_tag")}</p>
              <span className="text-xs text-slate-500">{t("contact_response_time")}</span>
            </div>
            {contactDetails.map(({ key, Icon, title, value, subtitle }) => (
              <div
                key={key}
                className="flex gap-4 rounded-2xl border border-[#d4ddff] bg-gradient-to-br from-[#f7fbff] to-[#eef3ff] p-4 shadow-[0_22px_46px_-28px_rgba(37,99,235,0.32)] text-sm"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e6edff] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">{title}</p>
                  <p className="font-bold text-slate-900">{value}</p>
                  <p className="text-[12px] text-slate-600">{subtitle}</p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/70 p-4 text-center text-sm font-semibold text-emerald-700 hover:shadow-[0_12px_28px_-20px_rgba(16,185,129,0.6)] transition">
              {t("contact_brand_hint")}
            </div>
            <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center text-sm font-semibold text-primary">
              {t("contact_alt_channels")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






