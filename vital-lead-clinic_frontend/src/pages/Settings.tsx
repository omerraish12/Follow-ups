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
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Clinic settings
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>({
    id: '1',
    name: t('clinic_herzliya') || 'מרפאת שיניים הרצליה',
    email: 'clinic@herzliya.co.il',
    phone: '09-1234567',
    address: t('herzliya_address') || 'הרצל 12, הרצליה',
    timezone: 'Asia/Jerusalem',
    language: 'he',
    currency: 'ILS'
  });

  // User profile
  const [profile, setProfile] = useState<UserProfile>({
    id: '1',
    name: user?.name || t('admin_role') || 'מנהל מערכת',
    email: user?.email || 'admin@clinic.co.il',
    phone: '050-1234567',
    role: 'admin',
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
    lastBackup: '2025-02-23 03:00'
  });

  // Load data
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Data would be loaded from API here
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

  const handleSaveClinic = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

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

  const handleExportData = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

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
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: t("account_deleted"),
        description: t("account_deleted_success"),
      });

      // Redirect to login
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setIntegrations(prev => prev.map(int =>
        int.id === id
          ? { ...int, status: int.status === 'connected' ? 'disconnected' : 'connected' }
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
      <div className="space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
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
    <div className="space-y-5 lg:space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{t("settings")}</h1>
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
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {clinicSettings.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <Upload className="h-4 w-4 ml-2" />
                    {t("upload_logo")}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
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
                  <Select value={clinicSettings.language} onValueChange={(v) => setClinicSettings({ ...clinicSettings, language: v })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="he">{t("hebrew")}</SelectItem>
                      <SelectItem value="en">{t("english")}</SelectItem>
                      <SelectItem value="ru">{t("russian")}</SelectItem>
                      <SelectItem value="ar">{t("arabic")}</SelectItem>
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
              <Button onClick={handleSaveClinic} disabled={isSaving} className={language === 'he' ? 'mr-auto' : 'ml-auto'}>
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
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {profile.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <Upload className="h-4 w-4 ml-2" />
                    {t("upload_photo")}
                  </Button>
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
                    value={profile.role === 'admin' ? t("admin_role") : t("user")}
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
              <Button onClick={handleSaveProfile} disabled={isSaving} className={language === 'he' ? 'mr-auto' : 'ml-auto'}>
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
                    className="absolute left-3 top-1/2 -translate-y-1/2"
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
              <Button onClick={handleChangePassword} disabled={isSaving} className={language === 'he' ? 'mr-auto' : 'ml-auto'}>
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
              <Button onClick={handleSaveNotifications} disabled={isSaving} className={language === 'he' ? 'mr-auto' : 'ml-auto'}>
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
                <Button variant="outline" className="h-auto py-4" onClick={handleExportData}>
                  <Download className="h-5 w-5 mb-2 mx-auto" />
                  <span>Excel (CSV)</span>
                </Button>
                <Button variant="outline" className="h-auto py-4" onClick={handleExportData}>
                  <Download className="h-5 w-5 mb-2 mx-auto" />
                  <span>PDF</span>
                </Button>
                <Button variant="outline" className="h-auto py-4" onClick={handleExportData}>
                  <Download className="h-5 w-5 mb-2 mx-auto" />
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
          <AlertDialogFooter className={language === 'he' ? 'flex-row-reverse' : ''}>
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