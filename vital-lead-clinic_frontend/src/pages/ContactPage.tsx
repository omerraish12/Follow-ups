import { useMemo, useState } from "react";
import { Phone, Mail, MessageCircle } from "lucide-react";
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
      className="min-h-screen bg-gradient-to-b from-[#101b6c] via-[#1f4ef7] to-[#7bc4ff] text-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
        <div className="text-center pb-12">
          <p className="text-sm uppercase tracking-[0.4em] text-white/70">{t("contact_banner_tag")}</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mt-6">{t("contact_title")}</h1>
          <p className="max-w-3xl mx-auto text-base text-white/80 mt-4">{t("contact_subtitle")}</p>
        </div>

        <div className="bg-white text-foreground rounded-[32px] shadow-[0_25px_60px_-30px_rgba(15,23,42,0.8)] p-6 md:p-10 grid gap-10 md:grid-cols-[1.3fr,0.7fr]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                placeholder={t("contact_form_phone_placeholder")}
                value={form.phone}
                onChange={handleChange("phone")}
                className="bg-muted/70"
              />
              <Input
                placeholder={t("contact_form_email_placeholder")}
                value={form.email}
                onChange={handleChange("email")}
                className="bg-muted/70"
              />
              <Input
                placeholder={t("contact_form_name_placeholder")}
                value={form.name}
                onChange={handleChange("name")}
                className="bg-muted/70"
              />
            </div>
            <Textarea
              placeholder={t("contact_form_message_placeholder")}
              value={form.message}
              onChange={handleChange("message")}
              className="bg-muted/70 h-40"
            />

            <div className={cn("flex items-start gap-3 text-xs text-muted-foreground", isRtl && "text-right") }>
              <input
                id="contact-agreement"
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
              <label htmlFor="contact-agreement" className="leading-relaxed">
                {t("contact_form_agreement")} <a href="#" className="font-semibold text-primary">{t("privacy_policy")}</a>
                <span className="px-1">{t("contact_form_and")}</span>
                <a href="#" className="font-semibold text-primary">{t("terms_of_use")}</a>
                .
              </label>
            </div>

            <Button type="submit" size="lg" className="w-full rounded-[32px]" disabled={!canSubmit || submitting}>
              {submitting ? t("contact_form_sending") : t("contact_form_button")}
            </Button>
          </form>

          <div className="space-y-6">
            <div className="flex items-center gap-3 justify-between">
              <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">{t("contact_info_tag")}</p>
              <span className="text-xs text-muted-foreground">{t("contact_response_time")}</span>
            </div>
            {contactDetails.map(({ key, Icon, title, value, subtitle }) => (
              <div
                key={key}
                className="flex gap-4 rounded-2xl border border-border/60 bg-white/90 p-4 shadow-sm text-sm text-foreground"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
                  <p className="font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-dashed border-primary/50 bg-primary/5 p-4 text-center text-sm font-semibold text-primary">
              {t("contact_brand_hint")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
