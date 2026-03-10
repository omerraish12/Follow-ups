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
  const locale = language === "he" ? "he-IL" : "en-US";

  const loadConfig = useCallback(async () => {
    const config = await whatsappService.getConfig();
    setWhatsAppConfig(config);
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
      console.log("response: ", response);
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
    "h-3 w-3 rounded-full shadow-[0_0_10px_rgba(22,93,255,0.6)]",
    sessionStatus === "connected"
      ? "bg-emerald-400"
      : sessionStatus === "connecting"
        ? "bg-amber-400"
        : "bg-slate-500"
  );
  const qrImageUrl = session?.qr_code
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(session.qr_code)}`
    : null;
  const fallbackDate = t("not_available");

  return (
    <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
      <Card className="rounded-[40px] border-0 bg-gradient-to-br from-[#030b2b] via-[#041738] to-[#020b24] text-white shadow-[0_35px_90px_rgba(2,9,35,0.65)]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl">{t("whatsapp_connection_title")}</CardTitle>
          <CardDescription className="text-white/70">
            Persistent WhatsApp Web session managed by your bridge server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className={statusIndicatorClass} />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-white/60">{t("whatsapp_connection_status")}</p>
                  <p className="text-3xl font-semibold capitalize">
                    {isLoading ? t("loading") : sessionStatus || t("disconnected")}
                  </p>
                </div>
              </div>
              <p className="max-w-2xl text-sm text-white/80">
                This mode uses a persistent WhatsApp Web session. Keep the bridge service running on a server with
                durable storage and reliable internet.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/15 bg-white/5 px-5 py-4 shadow-[0_20px_45px_rgba(3,9,43,0.4)]">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">{t("whatsapp_last_connected")}</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatDate(session?.last_connected_at || whatsappConfig.lastConnectedAt, locale, fallbackDate)}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/15 bg-white/5 px-5 py-4 shadow-[0_20px_45px_rgba(3,9,43,0.4)]">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">{t("whatsapp_updated")}</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatDate(session?.updated_at || whatsappConfig.updatedAt, locale, fallbackDate)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-white/15 bg-gradient-to-br from-[#050b1a] via-[#0b1022] to-[#030617] text-white shadow-[0_25px_60px_rgba(2,6,23,0.75)]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">WhatsApp Web session</CardTitle>
          <CardDescription className="text-sm text-white/60">
            Connect a clinic phone by QR scan, keep the session alive on your bridge server, and let the backend poll this state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleConnectSession}
              disabled={isConnecting}
              className="rounded-full bg-white/10 px-6 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {sessionStatus === "connected" ? "Reconnect WhatsApp" : t("connect")}
            </Button>
            <Button
              variant="outline"
              onClick={handleRefreshSession}
              disabled={isRefreshing}
              className="rounded-full border-white/25 px-6 py-2 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white"
            >
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              {t("refresh")}
            </Button>
            <Button
              variant="outline"
              onClick={handleDisconnectSession}
              disabled={isDisconnecting}
              className="rounded-full border-white/25 px-6 py-2 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white"
            >
              {isDisconnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2Off className="mr-2 h-4 w-4" />}
              {t("disconnect")}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-3">
                <QrCode className="h-5 w-5 text-white/70" />
                <p className="text-sm font-semibold text-white">QR code</p>
              </div>
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="WhatsApp QR code"
                  className="mx-auto h-[260px] w-[260px] rounded-3xl bg-white p-4"
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 text-center text-sm text-white/60">
                  {sessionStatus === "connecting"
                    ? "Waiting for the bridge to generate a fresh QR code."
                    : "Press Connect WhatsApp to create a QR code."}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/15 bg-white/5 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">Session status</p>
                <p className="mt-2 text-lg font-semibold capitalize">{sessionStatus || t("disconnected")}</p>
              </div>
              <div className="rounded-[28px] border border-white/15 bg-white/5 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">Device JID</p>
                <p className="mt-2 break-all text-sm font-semibold text-white/80">
                  {session?.device_jid || senderInfo?.deviceJid || fallbackDate}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/15 bg-white/5 px-5 py-4 sm:col-span-2">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/50">Bridge note</p>
                <p className="mt-2 text-sm text-white/75">
                  Run the bridge on a persistent server. Vercel Functions are not suitable for keeping this session alive.
                </p>
              </div>
              {session?.last_error ? (
                <div className="rounded-[28px] border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-100 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-rose-200/70">Last error</p>
                  <p className="mt-2 text-sm">{session.last_error}</p>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border border-white/15 bg-slate-950/80 text-white shadow-[0_25px_60px_rgba(3,7,18,0.6)]">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-white">{t("whatsapp_sender_info_title")}</CardTitle>
          <CardDescription className="text-sm text-white/60">{t("whatsapp_sender_info_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Phone className="h-6 w-6 text-white/60" />
            <div>
              <p className="text-lg font-semibold text-white">
                {senderInfo?.displayNumber || t("whatsapp_sender_info_placeholder")}
              </p>
              <p className="text-sm text-white/60">
                {senderInfo?.message || t("whatsapp_sender_info_note")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
