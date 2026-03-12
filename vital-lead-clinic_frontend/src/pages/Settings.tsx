// src/pages/Settings.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import {
  User, Bell, Shield, Database, Globe, Palette,
  Mail, Phone, Building, MapPin, Clock, Save,
  RefreshCw, CheckCircle, XCircle, AlertCircle,
  Key, Smartphone, CreditCard, Users, Download,
  Upload, Trash2, Edit, Eye, EyeOff, Loader2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
import { teamService } from "@/services/teamService";
import type { TeamMemberApi } from "@/types/team";
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
  whatsappNumber?: string;
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

interface NotificationSettingsState {
  emailNotifications: boolean;
  pushNotifications: boolean;
  leadAlerts: boolean;
  automationAlerts: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  marketingEmails: boolean;
}

interface BackupSettingsState {
  autoBackup: boolean;
  backupFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  lastBackup: string;
  lastBackupFile: string;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsState = {
  emailNotifications: true,
  pushNotifications: true,
  leadAlerts: true,
  automationAlerts: true,
  soundAlerts: true,
  dailyDigest: false,
  weeklyReport: true,
  marketingEmails: false,
};

const DEFAULT_BACKUP_SETTINGS: BackupSettingsState = {
  autoBackup: true,
  backupFrequency: 'daily',
  retentionDays: 30,
  lastBackup: '2025-02-23 03:00',
  lastBackupFile: '',
};

type NotificationSettingField = {
  key: keyof NotificationSettingsState;
  title: string;
  description: string;
  dividerAfter?: boolean;
};

type ExportFormat = "csv" | "json" | "pdf";

const DATA_EXPORT_FORMATS: { format: ExportFormat; label: string }[] = [
  { format: "csv", label: "Excel (CSV)" },
  { format: "pdf", label: "PDF" },
  { format: "json", label: "JSON" },
];

const CONVERSATION_EXPORT_OPTIONS: { format: ExportFormat; labelKey: string }[] = [
  { format: "csv", labelKey: "conversation_history_export_csv" },
  { format: "json", labelKey: "conversation_history_export_json" },
  { format: "pdf", labelKey: "conversation_history_export_pdf" },
];

const MAX_IMAGE_UPLOAD_SIZE = 2 * 1024 * 1024; // 2MB

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [conversationFilters, setConversationFilters] = useState({
    startDate: "",
    endDate: "",
    messageType: "all",
    limit: "1000"
  });
  const [isExportingConversation, setIsExportingConversation] = useState(false);
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
    currency: 'ILS',
    whatsappNumber: ''
  });

  const actionAlignment = isRTL ? "mr-auto" : "ml-auto";
  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const languageOptions = useMemo<{ value: Language; label: string }[]>(() => [
    { value: "he", label: t("hebrew") },
    { value: "en", label: t("english") },
  ], [t]);

  const timezoneOptions = useMemo(() => [
    { value: "Asia/Jerusalem", label: t("israel_timezone") },
    { value: "Europe/London", label: t("london_timezone") },
    { value: "America/New_York", label: t("ny_timezone") },
  ], [t]);

  const currencyOptions = useMemo(() => [
    { value: "ILS", label: t("ils") },
    { value: "USD", label: t("usd") },
    { value: "EUR", label: t("eur") },
  ], [t]);

  const notificationToggleFields = useMemo<NotificationSettingField[]>(() => [
    { key: "leadAlerts", title: t("lead_alerts"), description: t("lead_alerts_desc") },
    { key: "automationAlerts", title: t("automation_alerts"), description: t("automation_alerts_desc") },
    { key: "marketingEmails", title: t("marketing_updates"), description: t("marketing_updates_desc"), dividerAfter: true },
    { key: "soundAlerts", title: t("sound_alerts"), description: t("sound_alerts_desc") },
    { key: "pushNotifications", title: t("desktop_notifications"), description: t("desktop_notifications_desc"), dividerAfter: true },
    { key: "dailyDigest", title: t("daily_digest"), description: t("daily_digest_desc") },
    { key: "weeklyReport", title: t("weekly_report"), description: t("weekly_report_desc") },
    { key: "emailNotifications", title: t("email_notifications"), description: t("email_notifications_desc") },
  ], [t]);

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
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsState>(DEFAULT_NOTIFICATION_SETTINGS);

  // Backup settings
  const [backupSettings, setBackupSettings] = useState<BackupSettingsState>(DEFAULT_BACKUP_SETTINGS);
  const [teamMembers, setTeamMembers] = useState<TeamMemberApi[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState<boolean>(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadTeamMembers = async () => {
      setIsTeamLoading(true);
      setTeamError(null);
      try {
        const data = await teamService.getMembers();
        if (!cancelled) {
          setTeamMembers(data);
        }
      } catch (error) {
        console.error('Error loading team members:', error);
        if (!cancelled) {
          setTeamError(t("error_loading_data"));
        }
      } finally {
        if (!cancelled) {
          setIsTeamLoading(false);
        }
      }
    };
    void loadTeamMembers();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await settingsService.getSettings();

      if (data?.clinic) {
        const safeLanguage: Language = data.clinic.language === "he" ? "he" : "en";
        setClinicSettings({
          id: data.clinic.id,
          name: data.clinic.name || "",
          email: data.clinic.email || "",
          phone: data.clinic.phone || "",
          address: data.clinic.address || "",
          logo: data.clinic.logo || undefined,
          timezone: data.clinic.timezone || "Asia/Jerusalem",
          language: safeLanguage,
          currency: data.clinic.currency || "ILS",
          whatsappNumber: data.clinic.whatsappNumber || "",
        });
        // Respect the user's existing preference; only fall back to clinic default
        // when no language has been chosen yet.
        const hasUserPreference = Boolean(localStorage.getItem("language"));
        if (!hasUserPreference) {
          setLanguage(safeLanguage);
        }
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
        setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...data.notificationSettings });
      }

      if (data?.backupSettings) {
        setBackupSettings({
          autoBackup: data.backupSettings.autoBackup ?? DEFAULT_BACKUP_SETTINGS.autoBackup,
          backupFrequency: data.backupSettings.backupFrequency || DEFAULT_BACKUP_SETTINGS.backupFrequency,
          retentionDays: data.backupSettings.retentionDays ?? DEFAULT_BACKUP_SETTINGS.retentionDays,
          lastBackup: data.backupSettings.lastBackup || DEFAULT_BACKUP_SETTINGS.lastBackup,
          lastBackupFile: data.backupSettings.lastBackupFile || DEFAULT_BACKUP_SETTINGS.lastBackupFile
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

  const runSaving = async (action: () => Promise<void>) => {
    setIsSaving(true);
    try {
      await action();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClinicFieldChange = (field: keyof ClinicSettings, value: string) => {
    setClinicSettings((prev) => ({ ...prev, [field]: value }));
  };

  const updateConversationFilterField = (field: keyof typeof conversationFilters, value: string) => {
    setConversationFilters((prev) => ({ ...prev, [field]: value }));
  };

  const updateNotificationSetting = (key: NotificationSettingField["key"], value: boolean) => {
    setNotificationSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleLanguageSelect = (value: string) => {
    const nextLanguage: Language = value === "he" ? "he" : "en";
    handleClinicFieldChange("language", nextLanguage);
    setLanguage(nextLanguage);
  };

  const handleRemoveLogo = async () => {
    if (!clinicSettings.logo) return;

    await runSaving(async () => {
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
      }
    });
  };

  const handleLogoUpload = async (file: File) => {
    if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
      toast({
        title: t("error"),
        description: t("logo_format"),
        variant: "destructive"
      });
      return;
    }

    await runSaving(async () => {
      try {
        const formData = new FormData();
        formData.append('logo', file);
        const { logo } = await settingsService.uploadLogo(formData);
        setClinicSettings((prev) => ({ ...prev, logo }));
        toast({ title: t("settings_saved"), description: t("clinic_settings_updated") });
      } catch (error) {
        toast({
          title: t("error"),
          description: t("settings_save_failed"),
          variant: "destructive"
        });
      }
    });
  };

  const handleProfilePhotoUpload = async (file: File) => {
    if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
      toast({
        title: t("error"),
        description: t("photo_format"),
        variant: "destructive"
      });
      return;
    }

    await runSaving(async () => {
      try {
        const formData = new FormData();
        formData.append("photo", file);
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
      }
    });
  };

  const handleSaveClinic = async () => {
    await runSaving(async () => {
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
          whatsappNumber: clinicSettings.whatsappNumber
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
      }
    });
  };

  const handleSaveProfile = async () => {
    await runSaving(async () => {
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
      }
    });
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
    await runSaving(async () => {
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
      }
    });
  };

  const handleSaveNotifications = async () => {
    await runSaving(async () => {
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
      }
    });
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

  const handleExportData = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      const response = await settingsService.exportData(format);
      downloadBlob(response, "clinic-export", format);

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

  const handleExportConversation = async (format: ExportFormat) => {
    setIsExportingConversation(true);
    try {
      const response = await settingsService.exportData(format, {
        messagesOnly: true,
        messages: getConversationFilterPayload()
      });
      downloadBlob(response, "conversation-export", format);
      toast({
        title: t("export_completed"),
        description: t("conversation_history_description"),
      });
    } catch (error) {
      toast({
        title: t("error"),
        description: t("export_failed"),
        variant: "destructive"
      });
    } finally {
      setIsExportingConversation(false);
    }
  };

  const downloadBlob = (response: any, baseName: string, extension: string) => {
    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const disposition = response.headers['content-disposition'] as string | undefined;
    const suggested = disposition?.match(/filename=\"?([^\";]+)\"?/i)?.[1];
    const filename = suggested || `${baseName}-${Date.now()}.${extension}`;

    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const formatMemberDate = (value?: string | null) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const normalizeTeamRole = (role?: string | null): "admin" | "manager" | "staff" => {
    const normalized = (role || '').toString().trim().toLowerCase();
    if (normalized === 'admin') return 'admin';
    if (normalized === 'manager') return 'manager';
    return 'staff';
  };

  const normalizeTeamStatus = (status?: string | null): "active" | "pending" | "inactive" => {
    const normalized = (status || '').toString().trim().toLowerCase();
    if (normalized === 'pending') return 'pending';
    if (normalized === 'inactive') return 'inactive';
    return 'active';
  };

  const roleCounts = teamMembers.reduce(
    (acc, member) => {
      const role = normalizeTeamRole(member.role);
      acc[role] += 1;
      return acc;
    },
    { admin: 0, manager: 0, staff: 0 }
  );

  const statusCounts = teamMembers.reduce(
    (acc, member) => {
      const status = normalizeTeamStatus(member.status);
      acc[status] += 1;
      return acc;
    },
    { active: 0, pending: 0, inactive: 0 }
  );

  const roleSummaries = [
    {
      key: 'admin',
      label: t("admin_role"),
      description: t("team_role_description_admin"),
      count: roleCounts.admin
    },
    {
      key: 'manager',
      label: t("manager_role"),
      description: t("team_role_description_manager"),
      count: roleCounts.manager
    },
    {
      key: 'staff',
      label: t("user"),
      description: t("team_role_description_staff"),
      count: roleCounts.staff
    }
  ];

  const statusSummaries = [
    { key: 'active', label: t("team_status_active"), count: statusCounts.active, variant: 'success' },
    { key: 'pending', label: t("team_status_pending"), count: statusCounts.pending, variant: 'warning' },
    { key: 'inactive', label: t("team_status_inactive"), count: statusCounts.inactive, variant: 'secondary' }
  ];

  const recentMembers = teamMembers.slice(0, 4);

  const getConversationFilterPayload = () => {
    const payload: Record<string, unknown> = {};
    if (conversationFilters.startDate) {
      payload.startDate = conversationFilters.startDate;
    }
    if (conversationFilters.endDate) {
      payload.endDate = conversationFilters.endDate;
    }
    if (conversationFilters.messageType && conversationFilters.messageType !== "all") {
      payload.messageType = conversationFilters.messageType;
    }
    const parsedLimit = parseInt(conversationFilters.limit, 10);
    payload.limit = Number.isNaN(parsedLimit) ? 1000 : Math.min(Math.max(parsedLimit, 1), 5000);
    return payload;
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
      if (integration.type === 'whatsapp') return;

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
      toast({
        title: t("error"),
        description: t("settings_save_failed"),
        variant: "destructive"
      });
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
        <TabsList className="grid w-full grid-cols-6 items-center rounded-xl">
          <TabsTrigger value="general">{t("general")}</TabsTrigger>
          <TabsTrigger value="profile">{t("profile")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("notifications")}</TabsTrigger>
          <TabsTrigger value="integrations">{t("integrations")}</TabsTrigger>
          <TabsTrigger value="data">{t("data")}</TabsTrigger>
          <TabsTrigger value="team">{t("team")}</TabsTrigger>
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
                      ref={logoInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleLogoUpload(file);
                        }
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => logoInputRef.current?.click()}
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
                    value={clinicSettings.name ?? ""}
                    onChange={(e) => handleClinicFieldChange("name", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-email">{t("email")}</Label>
                  <Input
                    id="clinic-email"
                    type="email"
                    value={clinicSettings.email ?? ""}
                    onChange={(e) => handleClinicFieldChange("email", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-phone">{t("phone")}</Label>
                  <Input
                    id="clinic-phone"
                    value={clinicSettings.phone ?? ""}
                    onChange={(e) => handleClinicFieldChange("phone", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-whatsapp">{t("whatsapp_number_label")}</Label>
                  <Input
                    id="clinic-whatsapp"
                    value={clinicSettings.whatsappNumber ?? ""}
                    onChange={(e) => handleClinicFieldChange("whatsappNumber", e.target.value)}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">{t("whatsapp_number_description")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-address">{t("address")}</Label>
                  <Input
                    id="clinic-address"
                    value={clinicSettings.address ?? ""}
                    onChange={(e) => handleClinicFieldChange("address", e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">{t("timezone")}</Label>
                  <Select value={clinicSettings.timezone} onValueChange={(v) => handleClinicFieldChange("timezone", v)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezoneOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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
                  <Select value={clinicSettings.currency} onValueChange={(v) => handleClinicFieldChange("currency", v)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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
                    <>
                      <Input
                        type="time"
                        defaultValue={i === 5 ? "09:00" : i === 6 ? "10:00" : "09:00"}
                        className="w-24"
                      />
                      <span>-</span>
                      <Input
                        type="time"
                        defaultValue={i === 5 ? "13:00" : i === 6 ? "14:00" : "17:00"}
                        className="w-24"
                      />
                    </>
                  </div>
                ))}
              </div>
          </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("conversation_history_title")}</CardTitle>
              <CardDescription>
                {t("conversation_history_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-[0.3em]">{t("conversation_history_start_label")}</Label>
                  <Input
                    type="date"
                    value={conversationFilters.startDate}
                    onChange={(e) => updateConversationFilterField("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-[0.3em]">{t("conversation_history_end_label")}</Label>
                  <Input
                    type="date"
                    value={conversationFilters.endDate}
                    onChange={(e) => updateConversationFilterField("endDate", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-[0.3em]">{t("conversation_history_message_type")}</Label>
                  <Select
                    value={conversationFilters.messageType}
                    onValueChange={(value) => updateConversationFilterField("messageType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("conversation_history_type_all")}</SelectItem>
                      <SelectItem value="sent">{t("conversation_history_type_sent")}</SelectItem>
                      <SelectItem value="received">{t("conversation_history_type_received")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-[0.3em]">{t("conversation_history_limit_label")}</Label>
                  <Input
                    type="number"
                    value={conversationFilters.limit}
                    onChange={(e) => updateConversationFilterField("limit", e.target.value)}
                    min={1}
                    max={5000}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {CONVERSATION_EXPORT_OPTIONS.map((option) => (
                  <Button
                    key={option.format}
                    variant="outline"
                    size="sm"
                    disabled={isExportingConversation}
                    onClick={() => handleExportConversation(option.format)}
                  >
                    {isExportingConversation ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {t(option.labelKey)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("conversation_history_note")}
              </p>
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
                    ref={avatarInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleProfilePhotoUpload(file);
                      }
                      e.target.value = "";
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => avatarInputRef.current?.click()}
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
                    value={profile.name ?? ""}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">{t("email")}</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={profile.email ?? ""}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">{t("phone")}</Label>
                  <Input
                    id="profile-phone"
                    value={profile.phone ?? ""}
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
              {notificationToggleFields.map((field) => (
                <div key={field.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{field.title}</p>
                      <p className="text-sm text-muted-foreground">{field.description}</p>
                    </div>
                    <Switch
                      checked={notificationSettings[field.key]}
                      onCheckedChange={(checked) => updateNotificationSetting(field.key, checked)}
                    />
                  </div>
                  {field.dividerAfter && <Separator />}
                </div>
              ))}
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
                const isWhatsApp = integration.type === 'whatsapp';
                const whatsappSender = integration.displayPhoneNumber || integration.whatsappNumber || null;
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
                      {isWhatsApp ? (
                        <div className="flex flex-col items-end gap-1 text-right text-xs text-muted-foreground">
                          <span className="uppercase tracking-[0.3em]">{t("system_number_label")}</span>
                          <span className="font-mono text-[11px] text-foreground">
                            {whatsappSender || t("not_available")}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{t("system_number_managed_note")}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/whatsapp")}
                            className="rounded-lg text-xs font-medium"
                          >
                            {t("view_sender_info")}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant={integration.status === 'connected' ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleIntegration(integration.id)}
                        >
                          {integration.status === 'connected' ? t("disconnect") : t("connect")}
                        </Button>
                      )}
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
                      setBackupSettings((prev) => ({ ...prev, autoBackup: checked }))
                    }
                  />
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("backup_frequency")}</Label>
                  <Select value={backupSettings.backupFrequency} onValueChange={(v) => setBackupSettings((prev) => ({ ...prev, backupFrequency: v }))}>
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
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      setBackupSettings((prev) => ({
                        ...prev,
                        retentionDays: Number.isNaN(parsed) ? prev.retentionDays : parsed
                      }));
                    }}
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
                {DATA_EXPORT_FORMATS.map((format) => (
                  <Button
                    key={format.format}
                    variant="outline"
                    className="h-auto py-4"
                    disabled={isExporting}
                    onClick={() => handleExportData(format.format)}
                  >
                    {isExporting ? (
                      <Loader2 className="h-5 w-5 mb-2 mx-auto animate-spin" />
                    ) : (
                      <Download className="h-5 w-5 mb-2 mx-auto" />
                    )}
                    <span>{format.label}</span>
                  </Button>
                ))}
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

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card className="rounded-2xl border-border space-y-0">
            <CardHeader>
              <CardTitle className="text-lg">{t("team_summary_title")}</CardTitle>
              <CardDescription>
                {t("team_summary_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {roleSummaries.map((summary) => (
                  <div
                    key={summary.key}
                    className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                      {summary.label}
                    </p>
                    <p className="text-3xl font-semibold">{summary.count}</p>
                    <p className="text-xs text-muted-foreground">{summary.description}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {statusSummaries.map((status) => (
                  <div
                    key={status.key}
                    className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-[0.3em]">
                        {status.label}
                      </p>
                      <p className="text-lg font-semibold">{status.count}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="rounded-full px-3 text-[10px] font-semibold uppercase tracking-[0.3em]"
                    >
                      {status.label}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t pt-3">
              <div className="text-sm text-muted-foreground">
                {teamMembers.length > 0
                  ? `${teamMembers.length} ${t("team_members_title")}`
                  : t("team_no_members")}
              </div>
              <Link to="/team">
                <Button variant="outline" size="sm" className="rounded-xl inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t("team_view_all")}
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-lg">{t("team_members_title")}</CardTitle>
              <CardDescription>
                {t("team_tab_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isTeamLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <Skeleton key={index} className="h-16 rounded-2xl" />
                  ))}
                </div>
              ) : teamError ? (
                <p className="text-sm text-destructive">{teamError}</p>
              ) : recentMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("team_no_members")}</p>
              ) : (
                <div className="space-y-3">
                  {recentMembers.map((member) => {
                    const roleKey = normalizeTeamRole(member.role);
                    const statusKey = normalizeTeamStatus(member.status);
                    const roleLabel =
                      roleKey === 'admin'
                        ? t("admin_role")
                        : roleKey === 'manager'
                          ? t("manager_role")
                          : t("user");
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-2xl border border-border p-4"
                      >
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-[0.3em]"
                          >
                            {t(`team_status_${statusKey}`)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{roleLabel}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatMemberDate(member.last_active || member.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
