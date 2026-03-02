// src/pages/WhatsAppIntegration.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Phone, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { getDefaultWhatsAppConfig, whatsappService, type WhatsAppIntegrationConfig } from "@/services/whatsappService";

const formatDate = (value: string | null | undefined, locale: string, fallback: string) => {
  if (!value) {
    return fallback;
  }

  try {
    return new Date(value).toLocaleString(locale, { hour12: false });
  } catch (error) {
    console.error("Unable to format date", error);
    return fallback;
  }
};

export default function WhatsAppIntegration() {
  const { t, language } = useLanguage();
  const [whatsappConfig, setWhatsAppConfig] = useState<WhatsAppIntegrationConfig>(getDefaultWhatsAppConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isConfirmingJoin, setIsConfirmingJoin] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testTemplate, setTestTemplate] = useState("");
  const [testLanguage, setTestLanguage] = useState(language === "he" ? "he" : "en");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const syncFromConfig = useCallback((config: WhatsAppIntegrationConfig) => {
    setWhatsAppConfig(config);
  }, []);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const config = await whatsappService.getConfig();
      syncFromConfig(config);
    } catch (error) {
      console.error("Error loading WhatsApp config:", error);
      toast({
        title: t("error"),
        description: t("settings_save_failed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [syncFromConfig, t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    setTestLanguage(language === "he" ? "he" : "en");
  }, [language]);

  const buildConfig = useCallback(
    (overrides: Partial<WhatsAppIntegrationConfig> = {}) => ({
      ...whatsappConfig,
      ...overrides,
    }),
    [whatsappConfig]
  );

  const saveToBackend = useCallback(
    async (overrides: Partial<WhatsAppIntegrationConfig> = {}, successMessage?: string) => {
      setIsSavingStatus(true);
      try {
        const saved = await whatsappService.saveConfig(buildConfig(overrides));
        syncFromConfig(saved);
        if (successMessage) {
          toast({
            title: t("success"),
            description: successMessage,
          });
        }
      } catch (error) {
        console.error("Error saving WhatsApp config:", error);
        toast({
          title: t("error"),
          description: t("settings_save_failed"),
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsSavingStatus(false);
      }
    },
    [buildConfig, syncFromConfig, t]
  );

  const handleStatusChange = (status: WhatsAppIntegrationConfig["status"]) => {
    if (status === whatsappConfig.status) {
      return;
    }
    saveToBackend({ status }, t("whatsapp_status_saved"));
  };

  const handleSendTest = async () => {
    const cleanedPhone = testPhone.trim();
    const cleanedTemplate = testTemplate.trim();

    if (!cleanedPhone || !cleanedTemplate) {
      toast({ title: t("error"), description: t("missing_required_fields"), variant: "destructive" });
      return;
    }

    const payload = {
      to: cleanedPhone,
      templateName: cleanedTemplate,
      language: testLanguage,
    };

    setIsSendingTest(true);
    try {
      await whatsappService.sendTemplate(payload);
      toast({ title: t("success"), description: t("message_sent") });
    } catch (error) {
      console.error("WhatsApp sendTemplate error:", error);
      toast({
        title: t("error"),
        description: t("send_test_message_failed"),
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const isConnected = whatsappConfig.status === "connected";
  const readyToSendTest = Boolean(testPhone.trim() && testTemplate.trim());

  const templateOptions = useMemo(
    () =>
      whatsappConfig.templates.map((template) => ({
        id: template.id,
        name: template.name,
        language: template.language?.toUpperCase() ?? "EN",
      })),
    [whatsappConfig.templates]
  );

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      const selected = whatsappConfig.templates.find((template) => template.id === templateId);
      if (selected) {
        setTestTemplate(selected.name);
      }
    },
    [whatsappConfig.templates]
  );

  const handleTemplateInputChange = useCallback(
    (value: string) => {
      setTestTemplate(value);
      const match = templateOptions.find(
        (option) => option.name.toLowerCase() === value.trim().toLowerCase()
      );
      setSelectedTemplateId(match?.id || "");
    },
    [templateOptions]
  );

  useEffect(() => {
    if (selectedTemplateId && !templateOptions.some((option) => option.id === selectedTemplateId)) {
      setSelectedTemplateId("");
    }
  }, [selectedTemplateId, templateOptions]);

  const handleCopyValue = useCallback(
    async (value: string, label: string) => {
      try {
        if (typeof navigator === "undefined" || !navigator.clipboard) {
          throw new Error("Clipboard not available");
        }
        await navigator.clipboard.writeText(value);
        toast({
          title: t("copy"),
          description: t("copied_to_clipboard").replace("%s", label),
        });
      } catch (error) {
        console.error("Clipboard copy failed:", error);
        toast({
          title: t("error"),
          description: t("clipboard_copy_failed"),
          variant: "destructive",
        });
      }
    },
    [t, toast]
  );

  const handleOpenSandboxPortal = useCallback(() => {
    if (!whatsappConfig.sandbox.link) {
      return;
    }
    window.open(whatsappConfig.sandbox.link, "_blank", "noopener,noreferrer");
  }, [whatsappConfig.sandbox.link]);

  const handleConfirmSandboxJoin = useCallback(async () => {
    setIsConfirmingJoin(true);
    try {
      const updatedConfig = await whatsappService.confirmSandboxJoin();
      syncFromConfig(updatedConfig);
      toast({
        title: t("success"),
        description: t("whatsapp_sandbox_join_confirmed"),
      });
    } catch (error) {
      console.error("WhatsApp sandbox join failed:", error);
      toast({
        title: t("error"),
        description: t("whatsapp_sandbox_join_failed"),
        variant: "destructive",
      });
    } finally {
      setIsConfirmingJoin(false);
    }
  }, [syncFromConfig, t, toast]);

  const languageOptions = useMemo(
    () => [
      { value: "en", label: t("english") },
      { value: "he", label: t("hebrew") },
    ],
    [t]
  );

  const statusIndicatorClass = cn(
    "h-3 w-3 rounded-full shadow-[0_0_10px_rgba(22,93,255,0.6)]",
    whatsappConfig.status === "connected"
      ? "bg-emerald-400"
      : whatsappConfig.status === "connecting"
        ? "bg-amber-400"
        : "bg-slate-500"
  );

  const locale = language === "he" ? "he-IL" : "en-US";
  const fallbackDate = t("not_available");

  return (
    <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
      <Card className="rounded-[40px] border-0 bg-gradient-to-br from-[#030b2b] via-[#041738] to-[#020b24] text-white shadow-[0_35px_90px_rgba(2,9,35,0.65)]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl">{t("whatsapp_connection_title")}</CardTitle>
          <CardDescription className="text-white/70">{t("whatsapp_connection_tagline")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={statusIndicatorClass} />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-white/60">{t("whatsapp_connection_status")}</p>
                  <p className="text-3xl font-semibold capitalize">
                    {isLoading ? t("loading") : t(whatsappConfig.status)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-white/80 max-w-2xl">{t("whatsapp_connection_description")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/15 bg-white/5 px-5 py-4 shadow-[0_20px_45px_rgba(3,9,43,0.4)]">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">{t("whatsapp_last_connected")}</p>
                <p className="mt-1 text-sm font-semibold">{formatDate(whatsappConfig.lastConnectedAt, locale, fallbackDate)}</p>
              </div>
              <div className="rounded-[28px] border border-white/15 bg-white/5 px-5 py-4 shadow-[0_20px_45px_rgba(3,9,43,0.4)]">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">{t("whatsapp_updated")}</p>
                <p className="mt-1 text-sm font-semibold">{formatDate(whatsappConfig.updatedAt, locale, fallbackDate)}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              disabled={isLoading || whatsappConfig.status === "connected" || isSavingStatus}
              onClick={() => handleStatusChange("connected")}
              className="rounded-full bg-white px-6 py-1.5 text-sm font-semibold text-slate-900 shadow-[0_20px_45px_rgba(15,23,42,0.35)] transition hover:opacity-90"
            >
              {t("whatsapp_mark_connected")}
            </Button>
            <Button
              variant="outline"
              disabled={isLoading || whatsappConfig.status === "disconnected" || isSavingStatus}
              onClick={() => handleStatusChange("disconnected")}
              className="rounded-full border border-white/50 px-6 py-1.5 text-sm font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-white hover:text-white"
            >
              {t("whatsapp_mark_disconnected")}
            </Button>
          </div>
      </CardContent>
    </Card>

    <Card className="rounded-[36px] border border-slate-200 bg-white shadow-[0_25px_60px_rgba(15,20,40,0.12)]">
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="text-2xl text-slate-900">{t("whatsapp_sandbox_title")}</CardTitle>
          <CardDescription className="text-sm text-slate-500">{t("whatsapp_sandbox_description")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">{t("whatsapp_sandbox_join_code_label")}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-base text-slate-900">{whatsappConfig.sandbox.joinCode}</span>
              <Button size="sm" variant="outline" onClick={() => handleCopyValue(whatsappConfig.sandbox.joinCode, t("whatsapp_sandbox_join_code_label"))}>
                {t("copy")}
              </Button>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t("whatsapp_sandbox_join_code_help")}</p>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">{t("whatsapp_sandbox_number_label")}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-base text-slate-900">{whatsappConfig.sandbox.number}</span>
              <Button size="sm" variant="outline" onClick={() => handleCopyValue(whatsappConfig.sandbox.number, t("whatsapp_sandbox_number_label"))}>
                {t("copy")}
              </Button>
            </div>
            <p className="mt-1 text-xs text-slate-500">{t("whatsapp_sandbox_number_help")}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{t("whatsapp_sandbox_steps_title")}</p>
          <ol className="mt-3 space-y-2 list-decimal list-inside text-slate-600">
            <li>{t("whatsapp_sandbox_step_scan")}</li>
            <li>{t("whatsapp_sandbox_step_join_number")}</li>
            <li>{t("whatsapp_sandbox_step_confirm")}</li>
          </ol>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{t("whatsapp_sandbox_last_joined")}</span>
            <span className="font-mono text-xs text-slate-500">
              {whatsappConfig.sandbox.lastJoinedAt
                ? formatDate(whatsappConfig.sandbox.lastJoinedAt, locale, fallbackDate)
                : t("whatsapp_sandbox_not_joined")}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleConfirmSandboxJoin}
              disabled={isConfirmingJoin}
              className="rounded-full bg-gradient-to-r from-[#5a5bd9] to-[#8458ff] px-6 py-2 text-sm font-semibold text-white shadow-[0_15px_40px_rgba(90,91,217,0.4)] transition hover:opacity-90 disabled:opacity-60"
            >
              {isConfirmingJoin ? t("whatsapp_sandbox_marking") : t("whatsapp_sandbox_button")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenSandboxPortal} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              {t("whatsapp_open_sandbox")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="rounded-[36px] border border-slate-200 bg-gradient-to-br from-[#fdfbf7] to-[#f4efe6] text-slate-900 shadow-[0_25px_60px_rgba(15,20,40,0.12)]">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl text-slate-900">{t("send_test_message")}</CardTitle>
              <CardDescription className="text-sm text-slate-500">{t("send_test_message_desc")}</CardDescription>
            </div>
            <Send className="h-6 w-6 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500" htmlFor="test-phone">
              {t("phone_number")}
            </Label>
            <Input
              id="test-phone"
              placeholder="+972501234567"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500" htmlFor="test-template">
              {t("template_name")}
            </Label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
              <Input
                id="test-template"
                placeholder={t("template_name_placeholder")}
                value={testTemplate}
                onChange={(e) => handleTemplateInputChange(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm"
              />
              {templateOptions.length > 0 ? (
                <Select value={selectedTemplateId} onValueChange={(value) => handleTemplateSelect(value)}>
                  <SelectTrigger
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
                    aria-label={t("template_select_label")}
                  >
                    <SelectValue placeholder={t("template_select_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {templateOptions.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 px-4 py-3 text-xs text-slate-500">
                  {t("template_select_empty")}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500" htmlFor="test-language">
              {t("language")}
            </Label>
            <Select value={testLanguage} onValueChange={(value) => setTestLanguage(value)}>
              <SelectTrigger id="test-language" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm">
                <SelectValue placeholder={t("language")} />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <p className="text-[11px] text-slate-500">
              {!isConnected ? t("whatsapp_not_connected_notice") : readyToSendTest ? t("whatsapp_ready_to_send") : t("fill_required_fields")}
            </p>
            <Button
              onClick={handleSendTest}
              disabled={!isConnected || !readyToSendTest || isSendingTest}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#5a5bd9] to-[#8458ff] px-6 py-2 text-sm font-semibold text-white shadow-[0_15px_40px_rgba(90,91,217,0.4)] transition hover:opacity-90 disabled:opacity-60"
            >
              <span>{isSendingTest ? t("sending") : t("send_test_message")}</span>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
