// src/pages/WhatsAppIntegration.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Phone, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  getDefaultWhatsAppConfig,
  whatsappService,
  type WhatsAppIntegrationConfig,
  type WhatsAppSenderInfo,
} from "@/services/whatsappService";
import { settingsService } from "@/services/settingsService";
import { automationService } from "@/services/automationService";
import type { AutomationTemplateOption } from "@/types/automation";

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

interface WhatsAppFAQItem {
  questionKey: string;
  answerKey: string;
}

export default function WhatsAppIntegration() {
  const { t, language } = useLanguage();
  const [whatsappConfig, setWhatsAppConfig] = useState<WhatsAppIntegrationConfig>(getDefaultWhatsAppConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testTemplate, setTestTemplate] = useState("");
  const [testLanguage, setTestLanguage] = useState(language === "he" ? "he" : "en");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [senderInfo, setSenderInfo] = useState<WhatsAppSenderInfo | null>(null);
  const [faqItems, setFaqItems] = useState<WhatsAppFAQItem[]>([]);
  const [twilioCredentials, setTwilioCredentials] = useState({
    accountSid: "",
    authToken: "",
    messagingServiceSid: "",
    whatsappFrom: ""
  });
  const [isSavingTwilio, setIsSavingTwilio] = useState(false);
  const [authTokenStored, setAuthTokenStored] = useState(false);
  const [templateApprovals, setTemplateApprovals] = useState<AutomationTemplateOption[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [approvingTemplateId, setApprovingTemplateId] = useState<string | null>(null);
  const [refreshingTemplateId, setRefreshingTemplateId] = useState<string | null>(null);

  const syncFromConfig = useCallback((config: WhatsAppIntegrationConfig) => {
    setWhatsAppConfig(config);
    setTwilioCredentials({
      accountSid: config.accountSid || "",
      authToken: "",
      messagingServiceSid: config.messagingServiceSid || "",
      whatsappFrom: config.whatsappFrom || ""
    });
    setAuthTokenStored(Boolean(config.authTokenSet));
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

  const loadSenderInfo = useCallback(async () => {
    try {
      const info = await whatsappService.getSenderInfo();
      setSenderInfo(info);
    } catch (error) {
      console.error("Error loading WhatsApp sender info:", error);
    }
  }, []);

  const loadFAQ = useCallback(async () => {
    try {
      const data = await whatsappService.getFAQ();
      setFaqItems(data.faq || []);
    } catch (error) {
      console.error("Error loading WhatsApp FAQ:", error);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadSenderInfo();
    loadFAQ();
  }, [loadConfig, loadSenderInfo, loadFAQ]);

  useEffect(() => {
    setTestLanguage(language === "he" ? "he" : "en");
  }, [language]);

  const loadTemplateApprovals = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const templates = await automationService.getTemplates();
      setTemplateApprovals(templates);
    } catch (error) {
      const message = (error as any)?.response?.data?.message || t("whatsapp_templates_load_failed");
      toast({
        title: t("error"),
        description: message,
        variant: "destructive"
      });
    } finally {
      setTemplatesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTemplateApprovals();
  }, [loadTemplateApprovals]);

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

  const handleCredentialChange = (field: keyof typeof twilioCredentials, value: string) => {
    setTwilioCredentials((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveTwilioCredentials = async () => {
    const accountSid = twilioCredentials.accountSid.trim();
    const messagingServiceSid = twilioCredentials.messagingServiceSid.trim();
    const whatsappFrom = twilioCredentials.whatsappFrom.trim();
    const authToken = twilioCredentials.authToken.trim();

    if (!accountSid || !authToken || (!messagingServiceSid && !whatsappFrom)) {
      toast({
        title: t("error"),
        description: t("twilio_credentials_incomplete"),
        variant: "destructive"
      });
      return;
    }

    setIsSavingTwilio(true);
    try {
      await settingsService.updateIntegration("whatsapp", "connected", {
        accountSid,
        authToken,
        messagingServiceSid: messagingServiceSid || null,
        whatsappFrom: whatsappFrom || null
      });
      setAuthTokenStored(true);
      setTwilioCredentials((prev) => ({ ...prev, authToken: "" }));
      await loadConfig();
      toast({
        title: t("success"),
        description: t("twilio_provision_saved")
      });
    } catch (error) {
      console.error("Twilio credentials save failed:", error);
      toast({
        title: t("error"),
        description: t("settings_save_failed"),
        variant: "destructive"
      });
    } finally {
      setIsSavingTwilio(false);
    }
  };

  const handleDisconnectTwilio = async () => {
    setIsSavingTwilio(true);
    try {
      await settingsService.updateIntegration("whatsapp", "disconnected", {
        accountSid: null,
        authToken: null,
        messagingServiceSid: null,
        whatsappFrom: null
      });
      setAuthTokenStored(false);
      setTwilioCredentials({
        accountSid: "",
        authToken: "",
        messagingServiceSid: "",
        whatsappFrom: ""
      });
      await loadConfig();
      toast({
        title: t("settings_saved"),
        description: t("twilio_disconnected")
      });
    } catch (error) {
      console.error("Twilio disconnect failed:", error);
      toast({
        title: t("error"),
        description: t("settings_save_failed"),
        variant: "destructive"
      });
    } finally {
      setIsSavingTwilio(false);
    }
  };

  const handleApproveAutomationTemplate = async (template: AutomationTemplateOption) => {
    setApprovingTemplateId(template.automationId);
    try {
      await automationService.approveTemplate(template.automationId);
      toast({
        title: t("whatsapp_template_approved_title"),
        description: t("whatsapp_template_approved_description"),
      });
      await loadTemplateApprovals();
    } catch (error) {
      const message = (error as any)?.response?.data?.message || t("whatsapp_template_approval_failed");
      toast({
        title: t("error"),
        description: message,
        variant: "destructive"
      });
    } finally {
      setApprovingTemplateId(null);
    }
  };

  const handleRefreshAutomationTemplate = async (template: AutomationTemplateOption) => {
    setRefreshingTemplateId(template.automationId);
    try {
      await automationService.refreshTemplateStatus(template.automationId);
      toast({
        title: t("refresh_template_status"),
        description: t("template_status_refreshed_message"),
      });
      await loadTemplateApprovals();
    } catch (error) {
      const message = (error as any)?.response?.data?.message || t("whatsapp_template_refresh_failed");
      toast({
        title: t("error"),
        description: message,
        variant: "destructive"
      });
    } finally {
      setRefreshingTemplateId(null);
    }
  };

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

  const darkFieldClass =
    "rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 shadow-[0_20px_45px_rgba(2,6,23,0.45)] transition focus:border-white/30 focus-visible:ring focus-visible:ring-white/30";
  const locale = language === "he" ? "he-IL" : "en-US";
  const fallbackDate = t("not_available");
  const actionableTemplates = templateApprovals.filter(
    (template) => (template.templateStatus || "pending").toLowerCase() !== "approved"
  );

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
      </CardContent>
    </Card>

    <Card className="space-y-2 rounded-[32px] border border-white/15 bg-slate-900/80 text-white shadow-[0_25px_60px_rgba(3,7,18,0.6)]">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-white">{t("whatsapp_twilio_provisioning_title")}</CardTitle>
        <CardDescription className="text-sm text-white/70">{t("whatsapp_twilio_provisioning_description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-white/70">{t("twilio_account_sid_label")}</Label>
            <Input
              placeholder={t("twilio_account_sid_placeholder")}
              value={twilioCredentials.accountSid}
              onChange={(e) => handleCredentialChange("accountSid", e.target.value)}
              className={darkFieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-white/70">{t("twilio_auth_token_label")}</Label>
            <Input
              placeholder={t("twilio_auth_token_placeholder")}
              value={twilioCredentials.authToken}
              onChange={(e) => handleCredentialChange("authToken", e.target.value)}
              className={darkFieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-white/70">{t("twilio_messaging_service_label")}</Label>
            <Input
              placeholder={t("twilio_messaging_service_placeholder")}
              value={twilioCredentials.messagingServiceSid}
              onChange={(e) => handleCredentialChange("messagingServiceSid", e.target.value)}
              className={darkFieldClass}
            />
            <p className="text-xs text-white/60">{t("whatsapp_sender_info_description")}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-white/70">{t("twilio_whatsapp_from_label")}</Label>
            <Input
              placeholder={t("twilio_whatsapp_from_placeholder")}
              value={twilioCredentials.whatsappFrom}
              onChange={(e) => handleCredentialChange("whatsappFrom", e.target.value)}
              className={darkFieldClass}
            />
          </div>
        </div>
        <p className="text-xs text-white/60">
          {authTokenStored ? t("twilio_auth_token_configured") : t("twilio_auth_token_help")}
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-3 text-white">
        <Button
          onClick={handleSaveTwilioCredentials}
          disabled={isSavingTwilio}
          className="rounded-full px-6 py-2 text-sm font-semibold bg-white/10 text-white shadow-[0_10px_35px_rgba(0,0,0,0.35)] hover:bg-white/20"
        >
          {isSavingTwilio ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>{t("twilio_save_button")}</span>
            </div>
          ) : (
            <span>{t("twilio_save_button")}</span>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleDisconnectTwilio}
          disabled={isSavingTwilio}
          className="rounded-full px-6 py-2 text-sm font-semibold text-white/80 border-white/25 hover:text-white hover:border-white/40"
        >
          {t("twilio_disconnect_button")}
        </Button>
      </CardFooter>
    </Card>

    <Card className="rounded-[32px] border border-white/15 bg-gradient-to-br from-[#050b1a] via-[#0b1022] to-[#030617] text-white shadow-[0_25px_60px_rgba(2,6,23,0.75)]">
      <CardHeader className="space-y-2">
        <div>
          <CardTitle className="text-2xl text-white">{t("whatsapp_sender_info_title")}</CardTitle>
          <CardDescription className="text-sm text-white/60">{t("whatsapp_sender_info_description")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Phone className="h-6 w-6 text-white/60" />
          <div>
            <p className="text-lg font-semibold text-white">
              {senderInfo?.displayNumber || t("whatsapp_sender_info_placeholder")}
            </p>
            <p className="text-sm text-white/60">
              {senderInfo?.displayNumber ? t("whatsapp_sender_info_description") : t("whatsapp_sender_info_missing")}
            </p>
          </div>
        </div>
        <p className="text-xs text-white/50">{t("whatsapp_sender_info_note")}</p>
      </CardContent>
    </Card>

    <Card className="rounded-[36px] border border-white/15 bg-slate-900/75 text-white shadow-[0_25px_60px_rgba(2,6,23,0.75)]">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-white">{t("whatsapp_template_panel_title")}</CardTitle>
        <CardDescription className="text-sm text-white/60">{t("whatsapp_template_panel_description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {templatesLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 text-white/70 animate-spin" />
          </div>
        ) : !actionableTemplates.length ? (
          <p className="text-sm text-white/60">{t("whatsapp_template_list_empty")}</p>
        ) : (
          <div className="space-y-3">
            {actionableTemplates.map((template) => {
              const templateStatus = (template.templateStatus || "pending").toLowerCase();
              const statusLabelKey =
                templateStatus === "approved"
                  ? "template_status_approved_tag"
                  : templateStatus === "rejected"
                    ? "template_status_rejected_tag"
                    : "template_status_pending_tag";
              const statusHelpKey =
                templateStatus === "rejected"
                  ? "template_status_rejected_help"
                  : "template_status_pending_help";
              return (
                <div key={template.automationId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{template.automationName}</p>
                      <p className="text-xs text-white/60">{template.templateName}</p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-2 text-[10px] uppercase">
                      {t(statusLabelKey)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-white/60">{t(statusHelpKey)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleApproveAutomationTemplate(template)}
                      disabled={approvingTemplateId === template.automationId}
                      className="uppercase tracking-[0.3em]"
                    >
                      {approvingTemplateId === template.automationId
                        ? t("whatsapp_template_approving")
                        : t("whatsapp_template_approval_button")}
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleRefreshAutomationTemplate(template)}
                      disabled={refreshingTemplateId === template.automationId}
                      className="uppercase tracking-[0.3em]"
                    >
                      {refreshingTemplateId === template.automationId
                        ? t("whatsapp_template_refreshing")
                        : t("whatsapp_template_refresh_button")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>

    <Card className="rounded-[36px] border border-white/15 bg-slate-900/70 text-white shadow-[0_25px_60px_rgba(2,6,23,0.65)]">
    <CardHeader className="space-y-2">
      <CardTitle className="text-2xl text-white">{t("whatsapp_faq_title")}</CardTitle>
      <CardDescription className="text-sm text-white/60">{t("whatsapp_faq_description")}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {faqItems.length ? (
        faqItems.map((item) => (
          <div key={item.questionKey} className="space-y-1 border-b border-white/10 pb-3 last:border-0 last:pb-0">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">{t(item.questionKey)}</p>
            <p className="text-sm text-white/80">{t(item.answerKey)}</p>
          </div>
        ))
      ) : (
        <p className="text-sm text-white/60">{t("whatsapp_faq_loading")}</p>
      )}
    </CardContent>
  </Card>

    <Card className="rounded-[36px] border border-white/15 bg-gradient-to-br from-[#020616] via-[#030c25] to-[#010512] text-white shadow-[0_25px_60px_rgba(2,6,23,0.8)]">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl text-white">{t("send_test_message")}</CardTitle>
            <CardDescription className="text-sm text-white/60">{t("send_test_message_desc")}</CardDescription>
          </div>
          <Send className="h-6 w-6 text-white/70" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60" htmlFor="test-phone">
            {t("phone_number")}
          </Label>
          <Input
            id="test-phone"
            placeholder="+972501234567"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className={darkFieldClass}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60" htmlFor="test-template">
            {t("template_name")}
          </Label>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
            <Input
              id="test-template"
              placeholder={t("template_name_placeholder")}
              value={testTemplate}
              onChange={(e) => handleTemplateInputChange(e.target.value)}
              className={darkFieldClass}
            />
            {templateOptions.length > 0 ? (
              <Select value={selectedTemplateId} onValueChange={(value) => handleTemplateSelect(value)}>
                <SelectTrigger
                  className={darkFieldClass}
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
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-xs text-white/60">
                {t("template_select_empty")}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60" htmlFor="test-language">
            {t("language")}
          </Label>
          <Select value={testLanguage} onValueChange={(value) => setTestLanguage(value)}>
            <SelectTrigger id="test-language" className={darkFieldClass}>
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
          <p className="text-[11px] text-white/60">
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
