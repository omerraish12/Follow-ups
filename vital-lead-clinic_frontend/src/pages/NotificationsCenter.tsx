// src/pages/NotificationsCenter.tsx
import { useState } from "react";
import {
    Bell, BellRing, CheckCheck, X, Clock,
    AlertCircle, CheckCircle, Info, AlertTriangle,
    MessageSquare, Users, Zap, Calendar,
    Settings, Filter, Download, Eye,
    Trash2, Archive, RefreshCw
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
}

const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'lead',
        title: 'ליד חם חדש!',
        message: 'דנה כהן הגיבה להודעת מעקב ומעוניינת לקבוע תור',
        time: 'לפני 5 דקות',
        read: false,
        actionable: true,
        actionLabel: 'צפה בליד',
        priority: 'high'
    },
    {
        id: '2',
        type: 'success',
        title: 'לקוח חזר! 🎉',
        message: 'יוסי לוי קבע תור חוזר בעקבות אוטומציה',
        time: 'לפני 15 דקות',
        read: false,
        actionable: true,
        actionLabel: 'ראה פרטים',
        priority: 'high'
    },
    {
        id: '3',
        type: 'system',
        title: 'ייבוא הודעות הושלם',
        message: '1,284 הודעות עבר יובאו ועובדו בהצלחה',
        time: 'לפני שעה',
        read: true,
        actionable: false,
        priority: 'medium'
    },
    {
        id: '4',
        type: 'alert',
        title: 'חוק אוטומציה לא פעיל',
        message: 'החוק "מעקב אחרי שבוע" הושבת עקב שגיאה בתבנית',
        time: 'לפני 3 שעות',
        read: false,
        actionable: true,
        actionLabel: 'תקן כעת',
        priority: 'high'
    },
    {
        id: '5',
        type: 'reminder',
        title: 'תזכורת: 5 לידים דורשים מעקב',
        message: 'לידים שלא הגיבו להודעות מעל 3 ימים',
        time: 'לפני 5 שעות',
        read: true,
        actionable: true,
        actionLabel: 'צפה בלידים',
        priority: 'medium'
    },
    {
        id: '6',
        type: 'lead',
        title: 'הודעה חדשה מליד',
        message: 'משה גולן: "אשמח לפרטים נוספים על טיפול הלבנה"',
        time: 'אתמול',
        read: true,
        actionable: true,
        actionLabel: 'הגב',
        priority: 'medium'
    }
];

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
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const [filter, setFilter] = useState('all');
    const [settings, setSettings] = useState({
        leadAlerts: true,
        systemAlerts: true,
        emailNotifications: false,
        soundAlerts: true,
        desktopNotifications: true,
        dailyDigest: false
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.read;
        if (filter === 'high') return n.priority === 'high';
        if (filter !== 'all') return n.type === filter;
        return true;
    });

    return (
        <div className="space-y-6" dir="rtl">
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
                        <h1 className="text-2xl font-extrabold text-foreground">מרכז ההתראות</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            התראות על לידים חדשים, אירועי מערכת ועוד
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
                        סמן הכל כנקרא
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-xl">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-xl w-56">
                            <DropdownMenuLabel>הגדרות התראות</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">
                                <BellRing className="h-4 w-4 ml-2" />
                                נהל העדפות
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                                <Archive className="h-4 w-4 ml-2" />
                                ארכיון
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                                <Download className="h-4 w-4 ml-2" />
                                ייצוא דוח
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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
                            הכל
                        </Button>
                        <Button
                            variant={filter === 'unread' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('unread')}
                            className="rounded-full"
                        >
                            לא נקראו ({unreadCount})
                        </Button>
                        <Button
                            variant={filter === 'high' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('high')}
                            className="rounded-full"
                        >
                            חשוב
                        </Button>
                        <Button
                            variant={filter === 'lead' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('lead')}
                            className="rounded-full"
                        >
                            לידים
                        </Button>
                        <Button
                            variant={filter === 'alert' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('alert')}
                            className="rounded-full"
                        >
                            התראות
                        </Button>
                    </div>

                    {/* Notifications */}
                    <div className="space-y-3">
                        {filteredNotifications.map((notification) => {
                            const Icon = notificationIcons[notification.type];
                            return (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "relative rounded-2xl border p-4 transition-all",
                                        notification.read ? "border-border bg-card" : "border-primary/20 bg-primary/5",
                                        notification.priority === 'high' && !notification.read && "border-r-4 border-r-destructive"
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
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {notification.time}
                                                    </span>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start" className="rounded-xl">
                                                            <DropdownMenuItem onClick={() => markAsRead(notification.id)} className="cursor-pointer">
                                                                <CheckCheck className="h-4 w-4 ml-2" />
                                                                סמן כנקרא
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => deleteNotification(notification.id)} className="cursor-pointer text-destructive">
                                                                <Trash2 className="h-4 w-4 ml-2" />
                                                                מחק
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
                        })}

                        {filteredNotifications.length === 0 && (
                            <div className="text-center py-12">
                                <Bell className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                                <p className="font-medium text-foreground">אין התראות</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    כל ההתראות יעוצבו כאן
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Settings Panel */}
                <div className="space-y-4">
                    <Card className="rounded-2xl border-border">
                        <CardHeader>
                            <CardTitle className="text-lg">הגדרות התראות</CardTitle>
                            <CardDescription>
                                נהל אילו התראות תרצה לקבל וכיצד
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">התראות על לידים</p>
                                    <p className="text-xs text-muted-foreground">לידים חדשים והודעות</p>
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
                                    <p className="font-medium">התראות מערכת</p>
                                    <p className="text-xs text-muted-foreground">עדכוני מערכת ואוטומציות</p>
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
                                    <p className="font-medium">צלילים</p>
                                    <p className="text-xs text-muted-foreground">השמע צליל בהתראה חדשה</p>
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
                                    <p className="font-medium">התראות דסקטופ</p>
                                    <p className="text-xs text-muted-foreground">קבל התראות גם בדפדפן</p>
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
                                    <p className="font-medium">תקציר יומי</p>
                                    <p className="text-xs text-muted-foreground">קבל סיכום יומי במייל</p>
                                </div>
                                <Switch
                                    checked={settings.dailyDigest}
                                    onCheckedChange={(checked) =>
                                        setSettings({ ...settings, dailyDigest: checked })
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-border">
                        <CardHeader>
                            <CardTitle className="text-lg">סטטיסטיקות</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                <span className="text-sm">היום</span>
                                <span className="font-bold">{notifications.filter(n => n.time.includes('דקות')).length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                <span className="text-sm">השבוע</span>
                                <span className="font-bold">{notifications.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                <span className="text-sm">לידים חמים</span>
                                <span className="font-bold text-destructive">3</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                <span className="text-sm">אזהרות מערכת</span>
                                <span className="font-bold text-warning">1</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-border bg-gradient-to-br from-primary/5 to-transparent">
                        <CardHeader>
                            <CardTitle className="text-lg">התראות חשובות</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <AlertCircle className="h-4 w-4 text-warning" />
                                    <span>5 לידים ממתינים למעקב</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Zap className="h-4 w-4 text-primary" />
                                    <span>3 אוטומציות יופעלו היום</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="h-4 w-4 text-success" />
                                    <span>2 לקוחות חזרו השבוע</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}