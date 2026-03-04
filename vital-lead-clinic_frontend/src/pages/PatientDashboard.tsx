import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';

export default function PatientDashboard() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background/40 px-4 py-10">
      <Card className="w-full max-w-3xl rounded-3xl border border-border bg-white shadow-xl">
        <CardHeader>
          <CardTitle>{t('patient_dashboard_title')}</CardTitle>
          <CardDescription>{t('patient_dashboard_welcome')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {t('patient_dashboard_description')}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border p-4 bg-muted/40">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {t('whatsapp')}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {t('patient_dashboard_features')}
              </p>
            </div>
            <div className="rounded-2xl border border-border p-4 bg-muted/40">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {t('notifications')}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {t('patient_dashboard_features')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
