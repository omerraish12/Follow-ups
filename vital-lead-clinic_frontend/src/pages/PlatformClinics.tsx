import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { platformService, type PlatformClinic } from "@/services/platformService";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const formatDateTime = (value: string | null, locale: string, fallback: string) => {
  if (!value) {
    return fallback;
  }
  try {
    return new Date(value).toLocaleString(locale, { hour12: false });
  } catch (error) {
    console.error("Unable to format date time", error);
    return fallback;
  }
};

export default function PlatformClinics() {
  const { t, language } = useLanguage();
  const locale = language === "he" ? "he-IL" : "en-US";
  const fallback = t("not_available");
  const [clinics, setClinics] = useState<PlatformClinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadClinics = async () => {
    setIsLoading(true);
    try {
      const data = await platformService.getClinics();
      setClinics(data);
    } catch (error) {
      console.error("Error loading clinics:", error);
      toast({
        title: t("error"),
        description: t("settings_save_failed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  return (
    <div className="space-y-6" dir={language === "he" ? "rtl" : "ltr"}>
      <Card className="rounded-2xl border border-border bg-card shadow-card">
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-2xl">{t("platform_clinics_title")}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t("platform_clinics_description")}
            </CardDescription>
          </div>
          <Button variant="ghost" onClick={loadClinics} disabled={isLoading}>
            {isLoading ? t("loading") : t("refresh")}
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-6">#</th>
                <th className="py-2 pr-6">{t("clinic_name")}</th>
                <th className="py-2 pr-6">{t("email")}</th>
                <th className="py-2 pr-6">{t("phone_number")}</th>
                <th className="py-2 pr-6">{t("platform_clinic_twilio_status_label")}</th>
                <th className="py-2 pr-6">{t("platform_clinic_twilio_sender_label")}</th>
                <th className="py-2 pr-6">{t("platform_clinic_leads_label")}</th>
                <th className="py-2 pr-6">{t("platform_clinic_last_connected_label")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {t("loading")}
                  </td>
                </tr>
              )}
              {!isLoading && clinics.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {t("no_data")}
                  </td>
                </tr>
              )}
              {!isLoading &&
                clinics.map((clinic, index) => (
                  <tr key={clinic.id} className="text-sm text-foreground">
                    <td className="py-3 pr-6 font-medium">{index + 1}</td>
                    <td className="py-3 pr-6">{clinic.name}</td>
                    <td className="py-3 pr-6">{clinic.email || t("not_available")}</td>
                    <td className="py-3 pr-6">{clinic.phone || t("not_available")}</td>
                    <td className="py-3 pr-6">
                      <Badge
                        variant={clinic.twilioProvisioned ? "subtle" : "outline"}
                        className={clinic.twilioProvisioned ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}
                      >
                        {clinic.twilioProvisioned ? t("platform_clinic_twilio_provisioned") : t("platform_clinic_twilio_unconfigured")}
                      </Badge>
                    </td>
                    <td className="py-3 pr-6">{clinic.whatsappFrom || clinic.messagingServiceSid || t("not_available")}</td>
                    <td className="py-3 pr-6">{clinic.leads}</td>
                    <td className="py-3 pr-6">{formatDateTime(clinic.lastConnectedAt, locale, fallback)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
