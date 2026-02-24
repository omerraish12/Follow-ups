// src/pages/NotificationsCenter.tsx
import { useState, useEffect } from "react";
import {
    Bell, BellRing, CheckCheck, X, Clock,
    AlertCircle, CheckCircle, Info, AlertTriangle,
    MessageSquare, Users, Zap, Calendar,
    Settings, Filter, Download, Eye,
    Trash2, Archive, RefreshCw, Loader2,
    Mail, Phone, TrendingUp, Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { he, enUS } from "date-fns/locale";

interface Notification {
    id: string;
    type: 'lead' | 'system' | 'alert' | 'success' | 'reminder';
    title: string;
    message: string;
    time: string;
    read: boolean;
    actionable: boolean;
    actionLabel?: string;
    actionLink?: string;
    priority: 'high' | 'medium' | 'low';
    metadata?: {
        leadId?: string;
        leadName?: string;
        value?: number;
    };
}

const notificationIcons = {
    lead: MessageSquare,
    system: Settings,
    alert: AlertTriangle,
    success: CheckCircle,
    reminder: Clock
};

const notificationColors = {
    lead: 'text-blue-500 bg-blue-500/10',
    system: 'text-purple-500 bg-purple-500/10',
    alert: 'text-destructive bg-destructive/10',
    success: 'text-success bg-success/10',
    reminder: 'text-warning bg-warning/10'
};

export default function NotificationsCenter() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [filter, setFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [settings, setSettings] = useState({
        leadAlerts: true,
        systemAlerts: true,
        emailNotifications: false,
        soundAlerts: true,
        desktopNotifications: true,
        dailyDigest: false,
        marketingAlerts: false
    });

    // Load notifications
    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data - replace with actual API call
            setNotifications([
                {
                    id: '1',
                    type: 'lead',
                    title: t('new_hot_lead'),
                    message: t('lead_responded').replace('%s', 'דנה כהן'),
                    time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                    read: false,
                    actionable: true,
                    actionLabel: t('view_lead'),
                    priority: 'high',
                    metadata: { leadId: '101', leadName: 'דנה כהן', value: 450 }
                },
                {
                    id: '2',
                    type: 'success',
                    title: t('client_returned'),
                    message: t('lead_scheduled_followup').replace('%s', 'יוסי לוי'),
                    time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                    read: false,
                    actionable: true,
                    actionLabel: t('view_details') || 'ראה פרטים',
                    priority: 'high',
                    metadata: { leadId: '102', leadName: 'יוסי לוי', value: 800 }
                },
                {
                    id: '3',
                    type: 'system',
                    title: t('import_completed'),
                    message: t('messages_processed').replace('%s', '1,284'),
                    time: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                    read: true,
                    actionable: false,
                    priority: 'medium'
                },
                {
                    id: '4',
                    type: 'alert',
                    title: t('automation_rule_inactive'),
                    message: t('rule_disabled').replace('%s', t('follow_up_1_week')),
                    time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                    read: false,
                    actionable: true,
                    actionLabel: t('fix_now'),
                    priority: 'high'
                },
                {
                    id: '5',
                    type: 'reminder',
                    title: t('reminder_leads_need_followup').replace('%s', '5'),
                    message: t('leads_not_responded_followup'),
                    time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                    read: true,
                    actionable: true,
                    actionLabel: t('view_leads'),
                    priority: 'medium'
                },
                {
                    id: '6',
                    type: 'lead',
                    title: t('new_message_from_lead'),
                    message: t('lead_message').replace('%s', t('moshe_golan') || 'משה גולן').replace('%s', t('whitening_info') || '"אשמח לפרטים נוספים על טיפול הלבנה"'),
                    time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    read: true,
                    actionable: true,
                    actionLabel: t('reply'),
                    priority: 'medium',
                    metadata: { leadId: '103', leadName: 'משה גולן' }
                }
            ]);
        } catch (error) {
            console.error('Error loading notifications:', error);
            toast({
                title: t("error"),
                description: t("error_loading_notifications"),
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 300));

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );

            toast({
                title: t("marked_as_read"),
                description: t("notification_marked_read") || "ההתראה סומנה כנקראה",
            });
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            );

            toast({
                title: t("all_read") || "הכל נקרא",
                description: t("all_notifications_read") || "כל ההתראות סומנו כנקראו",
            });
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 300));

            setNotifications(prev => prev.filter(n => n.id !== id));

            toast({
                title: t("deleted"),
                description: t("notification_deleted") || "ההתראה נמחקה",
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const clearAll = async () => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            setNotifications([]);

            toast({
                title: t("all_cleared") || "הכל נקה",
                description: t("all_notifications_cleared") || "כל ההתראות נמחקו",
            });
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    const saveSettings = async () => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            toast({
                title: t("settings_saved") || "הגדרות נשמרו",
                description: t("notification_preferences_updated") || "העדפות ההתראות עודכנו",
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.read;
        if (filter === 'high') return n.priority === 'high';
        if (filter !== 'all') return n.type === filter;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    const formatTime = (time: string) => {
        try {
            return formatDistanceToNow(new Date(time), {
                addSuffix: true,
                locale: language === 'he' ? he : enUS
            });
        } catch {
            return time;
        }
    };

    if (isLoading && !notifications.length) {
        return (
            <div className="space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-10" />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-2xl" />
                        ))}
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-64 rounded-2xl" />
                        <Skeleton className="h-48 rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Bell className="h-6 w-6 text-foreground" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-foreground">{t("notifications_center")}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {t("notifications_description")}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                    >
                        <CheckCheck className="h-4 w-4 ml-2" />
                        {t("mark_all_read")}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-xl">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={language === 'he' ? 'start' : 'end'} className="rounded-xl w-56">
                            <DropdownMenuLabel>{t("notification_settings")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">
                                <BellRing className="h-4 w-4 ml-2" />
                                {t("manage_preferences")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                                <Archive className="h-4 w-4 ml-2" />
                                {t("archive")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                                <Download className="h-4 w-4 ml-2" />
                                {t("export_report")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="cursor-pointer text-destructive"
                                onClick={clearAll}
                            >
                                <Trash2 className="h-4 w-4 ml-2" />
                                {t("clear_all")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl"
                        onClick={loadNotifications}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Notifications List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <Button
                            variant={filter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('all')}
                            className="rounded-full"
                        >
                            {t("all")}
                        </Button>
                        <Button
                            variant={filter === 'unread' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('unread')}
                            className="rounded-full"
                        >
                            {t("unread")} ({unreadCount})
                        </Button>
                        <Button
                            variant={filter === 'high' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('high')}
                            className="rounded-full"
                        >
                            {t("important")}
                        </Button>
                        <Button
                            variant={filter === 'lead' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('lead')}
                            className="rounded-full"
                        >
                            {t("leads")}
                        </Button>
                        <Button
                            variant={filter === 'alert' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('alert')}
                            className="rounded-full"
                        >
                            {t("alerts")}
                        </Button>
                        <Button
                            variant={filter === 'success' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('success')}
                            className="rounded-full"
                        >
                            {t("successes")}
                        </Button>
                    </div>

                    {/* Notifications */}
                    <div className="space-y-3">
                        {filteredNotifications.length > 0 ? filteredNotifications.map((notification) => {
                            const Icon = notificationIcons[notification.type];
                            return (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "relative rounded-2xl border p-4 transition-all",
                                        notification.read ? "border-border bg-card" : "border-primary/20 bg-primary/5",
                                        notification.priority === 'high' && !notification.read &&
                                        (language === 'he' ? "border-r-4 border-r-destructive" : "border-l-4 border-l-destructive")
                                    )}
                                >
                                    <div className="flex gap-4">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", notificationColors[notification.type])}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h4 className="font-bold text-foreground flex items-center gap-2">
                                                        {notification.title}
                                                        {!notification.read && (
                                                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                        )}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {notification.message}
                                                    </p>
                                                    {notification.metadata?.value && (
                                                        <p className="text-xs font-bold text-success mt-2">
                                                            {t("potential_value")}: ₪{notification.metadata.value}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {formatTime(notification.time)}
                                                    </span>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align={language === 'he' ? 'start' : 'end'} className="rounded-xl">
                                                            <DropdownMenuItem onClick={() => markAsRead(notification.id)} className="cursor-pointer">
                                                                <CheckCheck className="h-4 w-4 ml-2" />
                                                                {t("mark_as_read")}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => deleteNotification(notification.id)} className="cursor-pointer text-destructive">
                                                                <Trash2 className="h-4 w-4 ml-2" />
                                                                {t("delete")}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                            {notification.actionable && (
                                                <div className="mt-3">
                                                    <Button size="sm" variant="outline" className="rounded-lg h-8 text-xs">
                                                        {notification.actionLabel}
                                                        <Eye className="h-3 w-3 mr-2" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-center py-12">
                                <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                                <p className="font-medium text-foreground">{t("no_notifications")}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {filter !== 'all' ? t("try_different_filter") : t("all_notifications_will_appear")}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Settings Panel */}
                <div className="space-y-4">
                    <Card className="rounded-2xl border-border">
                        <CardHeader>
                            <CardTitle className="text-lg">{t("notification_settings")}</CardTitle>
                            <CardDescription>
                                {t("manage_notification_preferences")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{t("lead_alerts")}</p>
                                    <p className="text-xs text-muted-foreground">{t("new_leads_and_messages")}</p>
                                </div>
                                <Switch
                                    checked={settings.leadAlerts}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, leadAlerts: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{t("system_alerts")}</p>
                                    <p className="text-xs text-muted-foreground">{t("system_and_automation_updates")}</p>
                                </div>
                                <Switch
                                    checked={settings.systemAlerts}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, systemAlerts: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{t("marketing_alerts")}</p>
                                    <p className="text-xs text-muted-foreground">{t("promotions_and_updates")}</p>
                                </div>
                                <Switch
                                    checked={settings.marketingAlerts}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, marketingAlerts: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{t("sound_alerts")}</p>
                                    <p className="text-xs text-muted-foreground">{t("play_sound_on_new_notification")}</p>
                                </div>
                                <Switch
                                    checked={settings.soundAlerts}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, soundAlerts: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{t("desktop_notifications")}</p>
                                    <p className="text-xs text-muted-foreground">{t("receive_notifications_in_browser")}</p>
                                </div>
                                <Switch
                                    checked={settings.desktopNotifications}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, desktopNotifications: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{t("daily_digest")}</p>
                                    <p className="text-xs text-muted-foreground">{t("receive_daily_summary_email")}</p>
                                </div>
                                <Switch
                                    checked={settings.dailyDigest}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, dailyDigest: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{t("email_notifications")}</p>
                                    <p className="text-xs text-muted-foreground">{t("receive_email_copy")}</p>
                                </div>
                                <Switch
                                    checked={settings.emailNotifications}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, emailNotifications: checked })
                                    }
                                />
                            </div>

                            <Button className="w-full mt-2" onClick={saveSettings}>
                                {t("save_settings")}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-border">
                        <CardHeader>
                            <CardTitle className="text-lg">{t("statistics")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                <span className="text-sm">{t("today")}</span>
                                <span className="font-bold">{notifications.filter(n => {
                                    const today = new Date().toDateString();
                                    return new Date(n.time).toDateString() === today;
                                }).length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                <span className="text-sm">{t("this_week")}</span>
                                <span className="font-bold">{notifications.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                <span className="text-sm">{t("hot_leads")}</span>
                                <span className="font-bold text-destructive">
                                    {notifications.filter(n => n.type === 'lead' && n.priority === 'high').length}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                <span className="text-sm">{t("system_alerts")}</span>
                                <span className="font-bold text-warning">
                                    {notifications.filter(n => n.type === 'alert').length}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                <span className="text-sm">{t("successes")}</span>
                                <span className="font-bold text-success">
                                    {notifications.filter(n => n.type === 'success').length}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-border bg-gradient-to-br from-primary/5 to-transparent">
                        <CardHeader>
                            <CardTitle className="text-lg">{t("important_notifications")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <AlertCircle className="h-4 w-4 text-warning" />
                                    <span>{t("reminder_leads_need_followup").replace('%s', '5')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Zap className="h-4 w-4 text-primary" />
                                    <span>{t("automations_will_run_today").replace('%s', '3')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="h-4 w-4 text-success" />
                                    <span>{t("clients_returned_this_week").replace('%s', '2')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <TrendingUp className="h-4 w-4 text-info" />
                                    <span>{t("weekly_revenue")}: ₪12,450</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}