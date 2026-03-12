import { useCallback, useEffect, useState } from "react";
import { Link2Off, Loader2, Phone, QrCode, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  getDefaultWhatsAppConfig,
  whatsappService,
  type WhatsAppIntegrationConfig,
  type WhatsAppSenderInfo,
  type WhatsAppSessionRecord,
} from "@/services/whatsappService";
import { settingsService } from "@/services/settingsService";

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
  const [senderInfo, setSenderInfo] = useState<WhatsAppSenderInfo | null>(null);
  const [session, setSession] = useState<WhatsAppSessionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");
  const [savingQuiet, setSavingQuiet] = useState(false);
  const locale = language === "he" ? "he-IL" : "en-US";

  const loadConfig = useCallback(async () => {
    const config = await whatsappService.getConfig();
    setWhatsAppConfig(config);
    if (config.quietHours?.start && config.quietHours?.end) {
      setQuietStart(config.quietHours.start);
      setQuietEnd(config.quietHours.end);
    }
    return config;
  }, []);

  const loadSenderInfo = useCallback(async () => {
    const info = await whatsappService.getSenderInfo();
    setSenderInfo(info);
    return info;
  }, []);

  const loadSession = useCallback(async () => {
    const response = await whatsappService.getSessionStatus();
    setSession(response.session);
    return response.session;
  }, []);

  const loadPage = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadConfig();
      await loadSenderInfo();
      await loadSession();
    } catch (error) {
      console.error("Error loading WhatsApp page:", error);
      toast({
        title: t("error"),
        description: t("settings_save_failed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadConfig, loadSenderInfo, loadSession, t]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadSession().catch((error) => {
        console.error("Error polling WhatsApp session:", error);
      });
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadSession]);

  const handleConnectSession = async () => {
    setIsConnecting(true);
    try {
      await settingsService.updateIntegration("whatsapp", "disconnected", { provider: "wa_web" });
      const response = await whatsappService.connectSession();
      setSession(response.session);
      await loadSenderInfo();
      toast({
        title: t("success"),
        description: "QR code requested. Scan it from the clinic's WhatsApp app.",
      });
    } catch (error) {
      console.error("Failed to connect WhatsApp Web session:", error);
      toast({
        title: t("error"),
        description: "Unable to start the WhatsApp Web session.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    try {
      await loadSession();
    } catch (error) {
      console.error("Failed to refresh WhatsApp Web session:", error);
      toast({
        title: t("error"),
        description: "Unable to refresh the WhatsApp session status.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDisconnectSession = async () => {
    setIsDisconnecting(true);
    try {
      await whatsappService.disconnectSession();
      await loadPage();
      toast({
        title: t("success"),
        description: "WhatsApp Web session disconnected.",
      });
    } catch (error) {
      console.error("Failed to disconnect WhatsApp Web session:", error);
      toast({
        title: t("error"),
        description: "Unable to disconnect the WhatsApp session.",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const sessionStatus = session?.status || senderInfo?.sessionStatus || whatsappConfig.status;
  const statusIndicatorClass = cn(
    "h-3 w-3 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.35)]",
    sessionStatus === "connected"
      ? "bg-emerald-500"
      : sessionStatus === "connecting"
        ? "bg-amber-400"
        : "bg-slate-400"
  );
  const qrImageUrl = session?.qr_code
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(session.qr_code)}`
    : null;
  const fallbackDate = t("not_available");
  const healthBadgeClass = cn(
    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
    sessionStatus === "connected"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700"
  );

  const handleSaveQuietHours = async () => {
    setSavingQuiet(true);
    try {
      await whatsappService.updateQuietHours({ start: quietStart, end: quietEnd });
      toast({
        title: t("success"),
        description: t("settings_saved"),
      });
    } catch (error) {
      console.error("Failed to save quiet hours", error);
      toast({
        title: t("error"),
        description: t("settings_save_failed"),
        variant: "destructive",
      });
    } finally {
      setSavingQuiet(false);
    }
  };

  return (
    <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
      <Card className="rounded-3xl border border-border bg-card text-foreground shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl">{t("whatsapp_connection_title")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            Persistent WhatsApp Web session managed by your bridge server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={statusIndicatorClass} />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">{t("whatsapp_connection_status")}</p>
                  <p className="text-3xl font-semibold capitalize">
                    {isLoading ? t("loading") : sessionStatus || t("disconnected")}
                  </p>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                This mode uses a persistent WhatsApp Web session. Keep the bridge service running on a server with
                durable storage and reliable internet.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-muted/60 px-5 py-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">{t("whatsapp_last_connected")}</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatDate(session?.last_connected_at || whatsappConfig.lastConnectedAt, locale, fallbackDate)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/60 px-5 py-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">{t("whatsapp_updated")}</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatDate(session?.updated_at || whatsappConfig.updatedAt, locale, fallbackDate)}
                </p>
                <span className={healthBadgeClass}>
                  {sessionStatus === "connected" ? t("connected") : t("disconnected")}
                </span>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/60 px-5 py-4 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">{t("quiet_hours")}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex flex-col text-xs text-muted-foreground">
                    <label className="text-[10px] uppercase tracking-[0.2em]">{t("start")}</label>
                    <input
                      type="time"
                      value={quietStart}
                      onChange={(e) => setQuietStart(e.target.value)}
                      className="rounded-xl border border-border bg-background px-2 py-1 text-foreground"
                    />
                  </div>
                  <div className="flex flex-col text-xs text-muted-foreground">
                    <label className="text-[10px] uppercase tracking-[0.2em]">{t("end")}</label>
                    <input
                      type="time"
                      value={quietEnd}
                      onChange={(e) => setQuietEnd(e.target.value)}
                      className="rounded-xl border border-border bg-background px-2 py-1 text-foreground"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="mt-3 rounded-full"
                  onClick={handleSaveQuietHours}
                  disabled={savingQuiet}
                >
                  {savingQuiet ? t("saving") : t("save")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-border bg-card text-foreground shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">WhatsApp Web session</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Connect a clinic phone by QR scan, keep the session alive on your bridge server, and let the backend poll this state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleConnectSession}
              disabled={isConnecting}
              className="rounded-full px-6 py-2 text-sm font-semibold"
            >
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
               {sessionStatus === "connected" ? "Reconnect WhatsApp" : t("connect")}
            </Button>
            <Button
              variant="outline"
              onClick={handleRefreshSession}
              disabled={isRefreshing}
              className="rounded-full px-6 py-2 text-sm font-semibold"
            >
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              {t("refresh")}
            </Button>
            <Button
              variant="outline"
              onClick={handleDisconnectSession}
              disabled={isDisconnecting}
              className="rounded-full px-6 py-2 text-sm font-semibold"
            >
              {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2Off className="mr-2 h-4 w-4" />}
              {t("disconnect")}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5">
              <div className="mb-4 flex items-center gap-3">
                <QrCode className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-semibold">QR code</p>
              </div>
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="WhatsApp QR code"
                  className="mx-auto h-[260px] w-[260px] rounded-3xl bg-background p-4"
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center rounded-3xl border border-border bg-muted px-6 text-center text-sm text-muted-foreground">
                  {sessionStatus === "connecting"
                    ? "Waiting for the bridge to generate a fresh QR code."
                    : "Press Connect WhatsApp to create a QR code."}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-muted/50 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Session status</p>
                <p className="mt-2 text-lg font-semibold capitalize">{sessionStatus || t("disconnected")}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Device JID</p>
                <p className="mt-2 break-all text-sm font-semibold text-muted-foreground">
                  {session?.device_jid || senderInfo?.deviceJid || fallbackDate}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/50 px-5 py-4 sm:col-span-2">
                <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Bridge note</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Run the bridge on a persistent server. Vercel Functions are not suitable for keeping this session alive.
                </p>
              </div>
              {session?.last_error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-800 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-rose-500">Last error</p>
                  <p className="mt-2 text-sm">{session.last_error}</p>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-border bg-card text-foreground shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{t("whatsapp_sender_info_title")}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">{t("whatsapp_sender_info_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Phone className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">
                {senderInfo?.displayNumber || t("whatsapp_sender_info_placeholder")}
              </p>
              <p className="text-sm text-muted-foreground">
                {senderInfo?.message || t("whatsapp_sender_info_note")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
