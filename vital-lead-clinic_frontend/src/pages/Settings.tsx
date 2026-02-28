// src/pages/Settings.tsx
import { useState, useEffect } from "react";
import {
  User, Bell, Shield, Database, Globe, Palette,
  Mail, Phone, Building, MapPin, Clock, Save,
  RefreshCw, CheckCircle, XCircle, AlertCircle,
  Key, Smartphone, CreditCard, Users, Download,
  Upload, Trash2, Edit, Eye, EyeOff, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { settingsService } from "@/services/settingsService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClinicSettings {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  timezone: string;
  language: string;
  currency: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatar?: string;
  createdAt: string;
}

interface Integration {
  id: string;
  name: string;
  type: 'whatsapp' | 'email' | 'calendar' | 'payment';
  status: 'connected' | 'disconnected' | 'error';
  icon: any;
  description: string;
}

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Clinic settings
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>({
    id: '1',
    name: t('clinic_herzliya'),
    email: 'clinic@herzliya.co.il',
    phone: '09-1234567',
    address: t('herzliya_address'),
    timezone: 'Asia/Jerusalem',
    language,
    currency: 'ILS'
  });

  const actionAlignment = isRTL ? "mr-auto" : "ml-auto";

  const languageOptions: Array<{ value: Language; label: string }> = [
    { value: "he", label: t("hebrew") },
    { value: "en", label: t("english") },
  ];

  // User profile
  const [profile, setProfile] = useState<UserProfile>({
    id: '1',
    name: user?.name || t('admin_role'),
    email: user?.email || 'admin@clinic.co.il',
    phone: '050-1234567',
    role: 'admin',
    avatar: user?.avatar || '',
    createdAt: '2024-01-15'
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // Integrations
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: '1',
      name: t('whatsapp'),
      type: 'whatsapp',
      status: 'disconnected',
      icon: Globe,
      description: t('whatsapp_description')
    },
    {
      id: '2',
      name: t('email'),
      type: 'email',
      status: 'connected',
      icon: Mail,
      description: t('email_description')
    },
    {
      id: '3',
      name: t('google_calendar'),
      type: 'calendar',
      status: 'connected',
      icon: Clock,
      description: t('calendar_description')
    },
    {
      id: '4',
      name: t('payment_system'),
      type: 'payment',
      status: 'disconnected',
      icon: CreditCard,
      description: t('payment_description')
    }
  ]);

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    leadAlerts: true,
    automationAlerts: true,
    dailyDigest: false,
    weeklyReport: true,
    marketingEmails: false
  });

  // Backup settings
  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    lastBackup: '2025-02-23 03:00',
    lastBackupFile: ''
  });

  // Load data
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await settingsService.getSettings();

      if (data?.clinic) {
        const safeLanguage: Language = data.clinic.language === "he" ? "he" : "en";
        setClinicSettings({
          id: data.clinic.id,
          name: data.clinic.name,
          email: data.clinic.email,
          phone: data.clinic.phone,
          address: data.clinic.address,
          logo: data.clinic.logo || undefined,
          timezone: data.clinic.timezone,
          language: safeLanguage,
          currency: data.clinic.currency,
        });
        setLanguage(safeLanguage);
      }

      if (data?.profile) {
        setProfile({
          id: data.profile.id,
          name: data.profile.name,
          email: data.profile.email,
          phone: data.profile.phone || '',
          role: data.profile.role,
          avatar: data.profile.avatar || '',
          createdAt: data.profile.createdAt,
        });
      }

      if (data?.notificationSettings) {
        setNotificationSettings(data.notificationSettings);
      }

      if (data?.backupSettings) {
        setBackupSettings({
          autoBackup: data.backupSettings.autoBackup,
          backupFrequency: data.backupSettings.backupFrequency,
          retentionDays: data.backupSettings.retentionDays,
          lastBackup: data.backupSettings.lastBackup || '',
          lastBackupFile: data.backupSettings.lastBackupFile || ''
        });
      }

      if (data?.integrations) {
        setIntegrations((prev) =>
          prev.map((integration) => ({
            ...integration,
            status: (data.integrations[integration.type]?.status as Integration["status"]) || integration.status,
          }))
        );
      }

      setHasLoadedSettings(true);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: t("error"),
        description: t("error_loading_settings"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasLoadedSettings) return;
    const timeout = setTimeout(() => {
      settingsService.updateBackupSettings(backupSettings).catch(() => {
        toast({
          title: t("error"),
          description: t("settings_save_failed"),
          variant: "destructive"
        });
      });
    }, 800);
    return () => clearTimeout(timeout);
  }, [backupSettings, hasLoadedSettings, t]);

  const handleLanguageSelect = (value: string) => {
    const nextLanguage: Language = value === "he" ? "he" : "en";
    setClinicSettings((prev) => ({ ...prev, language: nextLanguage }));
    setLanguage(nextLanguage);
  };

  const handleRemoveLogo = async () => {
    if (!clinicSettings.logo) return;
    setIsSaving(true);
    try {
      const updated = await settingsService.updateClinic({ logo: null });
      setClinicSettings((prev) => ({
        ...prev,
        logo: updated.logo || undefined,
      }));
      toast({
        title: t("settings_saved"),
        description: t("logo_removed"),
      });
    } catch (error) {
      toast({
        title: t("error"),
        description: t("logo_remove_failed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClinic = async () => {
    setIsSaving(true);
    try {
      const updated = await settingsService.updateClinic({
        name: clinicSettings.name,
        email: clinicSettings.email,
        phone: clinicSettings.phone,
        address: clinicSettings.address,
        timezone: clinicSettings.timezone,
        language: clinicSettings.language,
        currency: clinicSettings.currency,
        logo: clinicSettings.logo,
      });

      if (updated) {
        setClinicSettings((prev) => ({ ...prev, ...updated }));
      }

      toast({
        title: t("settings_saved"),
        description: t("clinic_settings_updated"),
      });
    } catch (error) {
      toast({
        title: t("error"),
        description: t("settings_save_failed"),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updated = await settingsService.updateProfile({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
      });

      if (updated) {
        setProfile((prev) => ({
          ...prev,
          name: updated.name ?? prev.name,
          email: updated.email ?? prev.email,
          phone: updated.phone ?? prev.phone,
        }));
        await refreshUser?.();
      }

      toast({
        title: t("profile_updated"),
        description: t("profile_updated_success"),
      });
    } catch (error) {
      toast({
        title: t("error"),
        description: t("profile_update_failed"),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: t("error"),
        description: t("passwords_dont_match"),
        variant: "destructive"
      });
      return;
    }

    if (passwordData.new.length < 6) {
      toast({
        title: t("error"),
        description: t("password_too_short"),
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await settingsService.changePassword(passwordData.current, passwordData.new);

      setPasswordData({ current: '', new: '', confirm: '' });

      toast({
        title: t("password_changed"),
        description: t("password_changed_success"),
      });
    } catch (error) {
      toast({
        title: t("error"),
        description: t("password_change_failed"),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      await settingsService.updateNotifications(notificationSettings);

      toast({
        title: t("settings_saved"),
        description: t("notification_preferences_updated"),
      });
    } catch (error) {
      toast({
        title: t("error"),
        description: t("settings_save_failed"),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      const updated = await settingsService.runBackup();
      if (updated) {
        setBackupSettings((prev) => ({
          ...prev,
          lastBackup: updated.lastBackup || prev.lastBackup,
          lastBackupFile: updated.lastBackupFile ?? prev.lastBackupFile,
        }));
      }

      toast({
        title: t("backup_completed"),
        description: t("backup_success"),
      });
    } catch (error) {
      toast({
        title: t("error"),
        description: t("backup_failed"),
        variant: "destructive"
      });
    }
  };

  const handleExportData = async (format: "csv" | "json" | "pdf") => {
    setIsExporting(true);
    try {
      const response = await settingsService.exportData(format);
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const disposition = response.headers['content-disposition'] as string | undefined;
      const suggested = disposition?.match(/filename=\"?([^\";]+)\"?/i)?.[1];
      const extension = format === 'csv' ? 'csv' : format === 'pdf' ? 'pdf' : 'json';
      const filename = suggested || `clinic-export-${Date.now()}.${extension}`;

      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: t("export_completed"),
        description: t("export_success"),
      });
    } catch (error) {
      toast({
        title: t("error"),
        description: t("export_failed"),
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await settingsService.deleteAccount();

      toast({
        title: t("account_deleted"),
        description: t("account_deleted_success"),
      });

      // Redirect to login
      logout?.();
      window.location.href = '/login';
    } catch (error) {
      toast({
        title: t("error"),
        description: t("account_delete_failed"),
        variant: "destructive"
      });
    }
  };

  const toggleIntegration = async (id: string) => {
    try {
      const integration = integrations.find((item) => item.id === id);
      if (!integration) return;

      const nextStatus = integration.status === 'connected' ? 'disconnected' : 'connected';
      await settingsService.updateIntegration(integration.type, nextStatus);

      setIntegrations(prev =>
        prev.map(int =>
          int.id === id
            ? { ...int, status: nextStatus }
            : int
        ));

      toast({
        title: t("status_updated"),
        description: t("integration_updated"),
      });
    } catch (error) {
      console.error('Error toggling integration:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-2xl font-semibold text-foreground font-display">{t("settings_title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("settings_description")}</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 rounded-xl">
          <TabsTrigger value="general">{t("general")}</TabsTrigger>
          <TabsTrigger value="profile">{t("profile")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("notifications")}</TabsTrigger>
          <TabsTrigger value="integrations">{t("integrations")}</TabsTrigger>
          <TabsTrigger value="data">{t("data")}</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("clinic_details")}</CardTitle>
              <CardDescription>
                {t("update_clinic_details")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-20 w-20">
                  {clinicSettings.logo ? (
                    <AvatarImage src={clinicSettings.logo} alt={clinicSettings.name} />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {clinicSettings.name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/png, image/jpeg"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          toast({
                            title: t("error"),
                            description: t("logo_format"),
                            variant: "destructive"
                          });
                          return;
                        }
                        const formData = new FormData();
                        formData.append('logo', file);
                        try {
                          setIsSaving(true);
                          const { logo } = await settingsService.uploadLogo(formData);
                          setClinicSettings((prev) => ({ ...prev, logo }));
                          toast({ title: t("settings_saved"), description: t("clinic_settings_updated") });
                        } catch (error) {
                          toast({
                            title: t("error"),
                            description: t("settings_save_failed"),
                            variant: "destructive"
                          });
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      disabled={isSaving}
                    >
                      <Upload className="h-4 w-4 ml-2" />
                      {t("upload_logo")}
                    </Button>
                    {clinicSettings.logo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-destructive"
                        onClick={handleRemoveLogo}
                        disabled={isSaving}
                      >
                        {t("delete")}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("logo_format")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinic-name">{t("clinic_name_label")}</Label>
                  <Input
                    id="clinic-name"
                    value={clinicSettings.name}
                    onChange={(e) => setClinicSettings({ ...clinicSettings, name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-email">{t("email")}</Label>
                  <Input
                    id="clinic-email"
                    type="email"
                    value={clinicSettings.email}
                    onChange={(e) => setClinicSettings({ ...clinicSettings, email: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-phone">{t("phone")}</Label>
                  <Input
                    id="clinic-phone"
                    value={clinicSettings.phone}
                    onChange={(e) => setClinicSettings({ ...clinicSettings, phone: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-address">{t("address")}</Label>
                  <Input
                    id="clinic-address"
                    value={clinicSettings.address}
                    onChange={(e) => setClinicSettings({ ...clinicSettings, address: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">{t("timezone")}</Label>
                  <Select value={clinicSettings.timezone} onValueChange={(v) => setClinicSettings({ ...clinicSettings, timezone: v })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Jerusalem">{t("israel_timezone")}</SelectItem>
                      <SelectItem value="Europe/London">{t("london_timezone")}</SelectItem>
                      <SelectItem value="America/New_York">{t("ny_timezone")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">{t("language")}</Label>
                  <Select value={clinicSettings.language} onValueChange={handleLanguageSelect}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
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
                <div className="space-y-2">
                  <Label htmlFor="currency">{t("currency")}</Label>
                  <Select value={clinicSettings.currency} onValueChange={(v) => setClinicSettings({ ...clinicSettings, currency: v })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ILS">{t("ils")}</SelectItem>
                      <SelectItem value="USD">{t("usd")}</SelectItem>
                      <SelectItem value="EUR">{t("eur")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button onClick={handleSaveClinic} disabled={isSaving} className={actionAlignment}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    {t("save_changes")}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("business_hours")}</CardTitle>
              <CardDescription>
                {t("set_business_hours")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[t("sunday"), t("monday"), t("tuesday"), t("wednesday"), t("thursday"), t("friday"), t("saturday")].map((day, i) => (
                  <div key={day} className="flex items-center gap-4">
                    <span className="w-16 text-sm">{day}</span>
                    <Select defaultValue={i < 5 ? 'open' : i === 5 ? 'half' : 'closed'}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t("open")}</SelectItem>
                        <SelectItem value="half">{t("half_day")}</SelectItem>
                        <SelectItem value="closed">{t("closed")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {i < 5 && (
                      <>
                        <Input type="time" defaultValue="09:00" className="w-24" />
                        <span>-</span>
                        <Input type="time" defaultValue="17:00" className="w-24" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("user_details")}</CardTitle>
              <CardDescription>
                {t("update_profile_details")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-20 w-20">
                  {profile.avatar ? (
                    <AvatarImage src={profile.avatar} alt={profile.name} />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {profile.name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast({
                          title: t("error"),
                          description: t("photo_format"),
                          variant: "destructive",
                        });
                        return;
                      }
                      const formData = new FormData();
                      formData.append("photo", file);
                      try {
                        setIsSaving(true);
                        const { avatar } = await settingsService.uploadProfilePhoto(formData);
                        setProfile((prev) => ({ ...prev, avatar }));
                        await refreshUser?.();
                        toast({ title: t("profile_updated"), description: t("profile_updated_success") });
                      } catch (error) {
                        toast({
                          title: t("error"),
                          description: t("settings_save_failed"),
                          variant: "destructive"
                        });
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => document.getElementById("avatar-upload")?.click()}
                      disabled={isSaving}
                    >
                      <Upload className="h-4 w-4 ml-2" />
                      {t("upload_photo")}
                    </Button>
                    {profile.avatar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-lg text-destructive"
                        onClick={() => setProfile((prev) => ({ ...prev, avatar: '' }))}
                        disabled={isSaving}
                      >
                        {t("delete")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">{t("full_name")}</Label>
                  <Input
                    id="profile-name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">{t("email")}</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">{t("phone")}</Label>
                  <Input
                    id="profile-phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-role">{t("role")}</Label>
                  <Input
                    id="profile-role"
                    value={
                      profile.role?.toLowerCase() === 'admin'
                        ? t("admin_role")
                        : profile.role?.toLowerCase() === 'manager'
                          ? t("manager_role")
                          : t("user")
                    }
                    disabled
                    className="rounded-xl bg-muted"
                  />
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <span>{t("user_since")}: {profile.createdAt}</span>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button onClick={handleSaveProfile} disabled={isSaving} className={actionAlignment}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    {t("save_changes")}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("change_password")}</CardTitle>
              <CardDescription>
                {t("update_password_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t("current_password")}</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showApiKey ? 'text' : 'password'}
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                    className="rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2",
                      isRTL ? "left-3" : "right-3"
                    )}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("new_password")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("confirm_new_password")}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button onClick={handleChangePassword} disabled={isSaving} className={actionAlignment}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    {t("updating")}
                  </>
                ) : (
                  t("change_password")
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="rounded-2xl border-border border-destructive/20">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">{t("danger_zone")}</CardTitle>
              <CardDescription>
                {t("dangerous_actions")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                {t("delete_account")}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {t("delete_account_warning")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("notification_preferences")}</CardTitle>
              <CardDescription>
                {t("manage_notification_preferences")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("email_notifications")}</p>
                  <p className="text-sm text-muted-foreground">{t("email_notifications_desc")}</p>
                </div>
                <Switch
                  checked={notificationSettings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, emailNotifications: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("push_notifications")}</p>
                  <p className="text-sm text-muted-foreground">{t("push_notifications_desc")}</p>
                </div>
                <Switch
                  checked={notificationSettings.pushNotifications}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, pushNotifications: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("lead_alerts")}</p>
                  <p className="text-sm text-muted-foreground">{t("lead_alerts_desc")}</p>
                </div>
                <Switch
                  checked={notificationSettings.leadAlerts}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, leadAlerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("automation_alerts")}</p>
                  <p className="text-sm text-muted-foreground">{t("automation_alerts_desc")}</p>
                </div>
                <Switch
                  checked={notificationSettings.automationAlerts}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, automationAlerts: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("daily_digest")}</p>
                  <p className="text-sm text-muted-foreground">{t("daily_digest_desc")}</p>
                </div>
                <Switch
                  checked={notificationSettings.dailyDigest}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, dailyDigest: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("weekly_report")}</p>
                  <p className="text-sm text-muted-foreground">{t("weekly_report_desc")}</p>
                </div>
                <Switch
                  checked={notificationSettings.weeklyReport}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, weeklyReport: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("marketing_updates")}</p>
                  <p className="text-sm text-muted-foreground">{t("marketing_updates_desc")}</p>
                </div>
                <Switch
                  checked={notificationSettings.marketingEmails}
                  onCheckedChange={(checked) =>
                    setNotificationSettings({ ...notificationSettings, marketingEmails: checked })
                  }
                />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button onClick={handleSaveNotifications} disabled={isSaving} className={actionAlignment}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    {t("save_preferences")}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("available_integrations")}</CardTitle>
              <CardDescription>
                {t("integrations_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrations.map((integration) => {
                const Icon = integration.icon;
                return (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 border border-border rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        integration.status === 'connected' ? "bg-success/10" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          integration.status === 'connected' ? "text-success" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <h4 className="font-medium">{integration.name}</h4>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          integration.status === 'connected' && "bg-success/10 text-success border-success/20",
                          integration.status === 'error' && "bg-destructive/10 text-destructive border-destructive/20",
                          integration.status === 'disconnected' && "bg-muted text-muted-foreground"
                        )}
                      >
                        {integration.status === 'connected' && t("connected")}
                        {integration.status === 'error' && t("error")}
                        {integration.status === 'disconnected' && t("disconnected")}
                      </Badge>
                      <Button
                        variant={integration.status === 'connected' ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleIntegration(integration.id)}
                      >
                        {integration.status === 'connected' ? t("disconnect") : t("connect")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data" className="space-y-4">
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("backup_and_restore")}</CardTitle>
              <CardDescription>
                {t("backup_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div>
                  <p className="font-medium">{t("auto_backup")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("auto_backup_desc")}
                  </p>
                </div>
                <Switch
                  checked={backupSettings.autoBackup}
                  onCheckedChange={(checked) =>
                    setBackupSettings({ ...backupSettings, autoBackup: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("backup_frequency")}</Label>
                  <Select value={backupSettings.backupFrequency} onValueChange={(v) => setBackupSettings({ ...backupSettings, backupFrequency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">{t("hourly")}</SelectItem>
                      <SelectItem value="daily">{t("daily")}</SelectItem>
                      <SelectItem value="weekly">{t("weekly")}</SelectItem>
                      <SelectItem value="monthly">{t("monthly")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("retention_days")}</Label>
                  <Input
                    type="number"
                    value={backupSettings.retentionDays}
                    onChange={(e) => setBackupSettings({ ...backupSettings, retentionDays: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <span className="text-sm">{t("last_backup")}:</span>
                <span className="font-mono text-sm">{backupSettings.lastBackup}</span>
                <Button size="sm" variant="outline" onClick={handleBackup}>
                  <RefreshCw className="h-3 w-3 ml-2" />
                  {t("backup_now")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("export_data")}</CardTitle>
              <CardDescription>
                {t("export_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4"
                  disabled={isExporting}
                  onClick={() => handleExportData("csv")}
                >
                  {isExporting ? (
                    <Loader2 className="h-5 w-5 mb-2 mx-auto animate-spin" />
                  ) : (
                    <Download className="h-5 w-5 mb-2 mx-auto" />
                  )}
                  <span>Excel (CSV)</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4"
                  disabled={isExporting}
                  onClick={() => handleExportData("pdf")}
                >
                  {isExporting ? (
                    <Loader2 className="h-5 w-5 mb-2 mx-auto animate-spin" />
                  ) : (
                    <Download className="h-5 w-5 mb-2 mx-auto" />
                  )}
                  <span>PDF</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4"
                  disabled={isExporting}
                  onClick={() => handleExportData("json")}
                >
                  {isExporting ? (
                    <Loader2 className="h-5 w-5 mb-2 mx-auto animate-spin" />
                  ) : (
                    <Download className="h-5 w-5 mb-2 mx-auto" />
                  )}
                  <span>JSON</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("import_data")}</CardTitle>
              <CardDescription>
                {t("import_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium">{t("drag_drop_file")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("import_formats")}
                </p>
                <Button variant="outline" className="mt-4">
                  {t("select_file")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Demo Mode Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 border border-primary/10 p-5 lg:p-6 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
            ⚡ {t("demo_mode")}
          </Badge>
        </div>
        <h3 className="font-bold text-foreground">{t("demo_mode_title")}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          {t("demo_mode_description")}
        </p>
      </div>

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_account")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_account_confirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : undefined}>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive">
              {t("permanently_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
