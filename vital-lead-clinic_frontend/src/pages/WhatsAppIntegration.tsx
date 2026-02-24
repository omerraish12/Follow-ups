// src/pages/WhatsAppIntegration.tsx
import { useState, useEffect } from "react";
import {
    MessageSquare, Phone, CheckCircle, XCircle,
    AlertCircle, Settings, Webhook, RefreshCw,
    Shield, Globe, Key, Smartphone, Download,
    Upload, FileText, Filter, Clock, Users,
    Eye, EyeOff, Copy, Check, Plus, Trash2,
    Edit, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Template {
    id: string;
    name: string;
    message: string;
    usage: number;
    successRate: string;
    language: string;
    category: string;
}

interface ImportHistory {
    id: string;
    filename: string;
    date: string;
    messages: number;
    status: 'completed' | 'processing' | 'failed';
}

export default function WhatsAppIntegration() {
    const { t, language } = useLanguage();
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [showApiKey, setShowApiKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importing, setImporting] = useState(false);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filterSettings, setFilterSettings] = useState({
        ignorePersonal: true,
        minMessageLength: 10,
        businessKeywords: true,
        ignoreGroups: true,
        dateRange: '3months'
    });

    // Mock data - replace with actual API calls
    useEffect(() => {
        loadTemplates();
        loadImportHistory();
    }, []);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setTemplates([
                {
                    id: '1',
                    name: t("follow_up_3_days"),
                    message: t("hi_name_check_treatment"),
                    usage: 45,
                    successRate: "68%",
                    language: "he",
                    category: "followup"
                },
                {
                    id: '2',
                    name: t("follow_up_1_week"),
                    message: t("hello_name_reminder"),
                    usage: 32,
                    successRate: "72%",
                    language: "he",
                    category: "followup"
                },
                {
                    id: '3',
                    name: t("follow_up_1_month"),
                    message: t("last_treatment_how_feel"),
                    usage: 28,
                    successRate: "81%",
                    language: "he",
                    category: "followup"
                },
                {
                    id: '4',
                    name: t("lost_client_special_offer"),
                    message: t("lost_client_offer"),
                    usage: 56,
                    successRate: "91%",
                    language: "he",
                    category: "promotion"
                }
            ]);
        } catch (error) {
            console.error('Error loading templates:', error);
            toast({
                title: t("error"),
                description: t("error_loading_data"),
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const loadImportHistory = async () => {
        try {
            // Simulate API call
            setImportHistory([
                {
                    id: '1',
                    filename: t("february_export"),
                    date: '15/02/2025',
                    messages: 1284,
                    status: 'completed'
                },
                {
                    id: '2',
                    filename: t("january_export"),
                    date: '10/01/2025',
                    messages: 956,
                    status: 'completed'
                },
                {
                    id: '3',
                    filename: t("december_export"),
                    date: '05/12/2024',
                    messages: 1102,
                    status: 'completed'
                }
            ]);
        } catch (error) {
            console.error('Error loading import history:', error);
        }
    };

    const handleConnect = async () => {
        setConnectionStatus('connecting');
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            setConnectionStatus('connected');
            toast({
                title: t("connection_completed"),
                description: t("whatsapp_account_connected"),
            });
        } catch (error) {
            setConnectionStatus('disconnected');
            toast({
                title: t("error"),
                description: t("connection_failed"),
                variant: "destructive"
            });
        }
    };

    const handleDisconnect = async () => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setConnectionStatus('disconnected');
            toast({
                title: t("disconnect"),
                description: t("disconnected"),
            });
        } catch (error) {
            toast({
                title: t("error"),
                description: t("connection_failed"),
                variant: "destructive"
            });
        }
    };

    const handleImport = async () => {
        setImporting(true);
        setImportProgress(0);

        // Simulate import progress
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 300));
            setImportProgress(i);
        }

        setImporting(false);
        toast({
            title: t("import_completed"),
            description: t("messages_processed").replace('%s', '1,284'),
        });
    };

    const handleSaveTemplate = async (templateData: Partial<Template>) => {
        try {
            if (editingTemplate) {
                // Update existing template
                setTemplates(prev => prev.map(t =>
                    t.id === editingTemplate.id ? { ...t, ...templateData } : t
                ));
                toast({
                    title: t("rule_updated"),
                    description: t("rule_updated_successfully"),
                });
            } else {
                // Create new template
                const newTemplate: Template = {
                    id: Date.now().toString(),
                    name: templateData.name || t("template_name"),
                    message: templateData.message || '',
                    usage: 0,
                    successRate: "0%",
                    language: "he",
                    category: templateData.category || 'followup'
                };
                setTemplates(prev => [newTemplate, ...prev]);
                toast({
                    title: t("rule_created"),
                    description: t("rule_created_successfully"),
                });
            }
        } catch (error) {
            toast({
                title: t("error"),
                description: t("error_loading_data"),
                variant: "destructive"
            });
        } finally {
            setShowTemplateDialog(false);
            setEditingTemplate(null);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        try {
            setTemplates(prev => prev.filter(t => t.id !== id));
            toast({
                title: t("rule_deleted"),
                description: t("rule_removed_successfully"),
            });
        } catch (error) {
            toast({
                title: t("error"),
                description: t("error_loading_data"),
                variant: "destructive"
            });
        }
    };

    const mockChats = [
        { id: 1, name: "דנה כהן", phone: "050-1234567", lastMessage: t("when_can_come"), type: "business", date: "2025-02-20", status: "new" },
        { id: 2, name: "יוסי לוי", phone: "052-7654321", lastMessage: t("thank_you_see_you_tomorrow"), type: "business", date: "2025-02-19", status: "followup" },
        { id: 3, name: t("mom"), phone: "054-9876543", lastMessage: t("how_are_you_today"), type: "personal", date: "2025-02-20", status: "ignore" },
        { id: 4, name: "משה גולן", phone: "053-4567890", lastMessage: t("whitening_appointment"), type: "business", date: "2025-02-18", status: "hot" },
    ];

    return (
        <div className="space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-foreground">{t('whatsapp_integration')}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {t('whatsapp_description')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className={cn(
                            "px-3 py-1 rounded-full",
                            connectionStatus === 'connected' ? "bg-success/10 text-success border-success/20" :
                                connectionStatus === 'connecting' ? "bg-warning/10 text-warning border-warning/20" :
                                    "bg-destructive/10 text-destructive border-destructive/20"
                        )}
                    >
                        {connectionStatus === 'connected' && <CheckCircle className="h-3 w-3 ml-1" />}
                        {connectionStatus === 'connecting' && <RefreshCw className="h-3 w-3 ml-1 animate-spin" />}
                        {connectionStatus === 'disconnected' && <XCircle className="h-3 w-3 ml-1" />}
                        {connectionStatus === 'connected' ? t('connected') :
                            connectionStatus === 'connecting' ? t('connecting') : t('disconnected')}
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="connection" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 rounded-xl">
                    <TabsTrigger value="connection">{t('settings_connection')}</TabsTrigger>
                    <TabsTrigger value="import">{t('import_messages')}</TabsTrigger>
                    <TabsTrigger value="filter">{t('filter_classify')}</TabsTrigger>
                    <TabsTrigger value="templates">{t('message_templates')}</TabsTrigger>
                </TabsList>

                {/* Connection Tab */}
                <TabsContent value="connection" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="rounded-2xl border-border lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg">{t('whatsapp_business_api')}</CardTitle>
                                <CardDescription>
                                    {t('enter_connection_details')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t('business_phone_number')}</Label>
                                    <Input
                                        id="phone"
                                        placeholder="972501234567"
                                        dir="ltr"
                                        className="rounded-xl"
                                        defaultValue="972501234567"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="apiKey">{t('api_key')}</Label>
                                    <div className="relative">
                                        <Input
                                            id="apiKey"
                                            type={showApiKey ? "text" : "password"}
                                            placeholder={t("api_key")}
                                            dir="ltr"
                                            className="rounded-xl pl-10"
                                            defaultValue="sk_live_123456789"
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
                                    <Label htmlFor="webhook">{t('webhook_url')}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="webhook"
                                            defaultValue="https://api.yourclinic.com/whatsapp/webhook"
                                            readOnly
                                            dir="ltr"
                                            className="rounded-xl font-mono text-sm"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="rounded-xl shrink-0"
                                            onClick={() => {
                                                navigator.clipboard.writeText("https://api.yourclinic.com/whatsapp/webhook");
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                                toast({
                                                    title: t("copied"),
                                                    description: t("webhook_url") + " " + t("copied"),
                                                });
                                            }}
                                        >
                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t("copy_webhook_address")}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="verify">{t('verification_token')}</Label>
                                    <Input
                                        id="verify"
                                        defaultValue="your_verification_token_here"
                                        type="password"
                                        dir="ltr"
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-4">
                                    <Switch id="webhook_ssl" defaultChecked />
                                    <Label htmlFor="webhook_ssl">{t("enable_ssl_verification")}</Label>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between border-t border-border pt-4">
                                <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={handleDisconnect}
                                    disabled={connectionStatus !== 'connected'}
                                >
                                    {t("disconnect")}
                                </Button>
                                <Button
                                    onClick={handleConnect}
                                    disabled={connectionStatus === 'connected'}
                                    className="rounded-xl bg-whatsapp hover:bg-whatsapp/90"
                                >
                                    {connectionStatus === 'connected' ? t('connected') : t('connect')}
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="rounded-2xl border-border">
                            <CardHeader>
                                <CardTitle className="text-lg">{t("whatsapp_status")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                    <span className="text-sm">{t("webhook_url")}</span>
                                    <Badge variant="outline" className="bg-success/10 text-success">
                                        {t("active")}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                    <span className="text-sm">{t("messages_received_today") || "הודעות שהתקבלו היום"}</span>
                                    <span className="font-bold">47</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                    <span className="text-sm">{t("send_rate_per_hour") || "קצב שליחה (לשעה)"}</span>
                                    <span className="font-bold">250</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                    <span className="text-sm">{t("daily_quota") || "מכסה יומית"}</span>
                                    <span className="font-bold">1,000 / 10,000</span>
                                </div>
                                <div className="mt-4">
                                    <Progress value={10} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Import Tab */}
                <TabsContent value="import" className="space-y-4">
                    <Card className="rounded-2xl border-border">
                        <CardHeader>
                            <CardTitle className="text-lg">{t("import_messages")}</CardTitle>
                            <CardDescription>
                                {t("import_history")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("date_range")}</Label>
                                    <Select defaultValue="3months">
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder={t("date_range")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1month">{t("last_month_option")}</SelectItem>
                                            <SelectItem value="2months">{t("last_2_months") || "חודשיים אחרונים"}</SelectItem>
                                            <SelectItem value="3months">{t("last_3_months")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("export_format") || "פורמט ייצוא"}</Label>
                                    <Select defaultValue="chat">
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder={t("select_format") || "בחר פורמט"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="chat">{t("chat_export") || "ייצוא צ'אט (.txt)"}</SelectItem>
                                            <SelectItem value="csv">CSV</SelectItem>
                                            <SelectItem value="json">JSON</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("message_type") || "סוג הודעות"}</Label>
                                    <Select defaultValue="all">
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder={t("select_type") || "בחר סוג"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t("all")}</SelectItem>
                                            <SelectItem value="business">{t("business")}</SelectItem>
                                            <SelectItem value="personal">{t("personal") || "אישי"}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center">
                                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                                <p className="text-sm font-medium">{t("drag_drop_file") || "גרור לכאן קובץ ייצוא או לחץ לבחירה"}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t("file_format_support") || "תמיכה בקבצי .txt, .csv, .json עד 50MB"}
                                </p>
                                <Button variant="outline" className="mt-4 rounded-xl">
                                    {t("select_file") || "בחר קובץ"}
                                </Button>
                            </div>

                            {importing && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{t("importing_messages") || "מייבא הודעות..."}</span>
                                        <span>{importProgress}%</span>
                                    </div>
                                    <Progress value={importProgress} className="h-2" />
                                    <p className="text-xs text-muted-foreground">
                                        {t("processed_count").replace('{count}', Math.floor(importProgress * 12.84).toString())}
                                    </p>
                                </div>
                            )}

                            <Button
                                onClick={handleImport}
                                disabled={importing}
                                className="w-full rounded-xl"
                            >
                                {importing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                                        {t("importing")}
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 ml-2" />
                                        {t("import_start")}
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-border">
                        <CardHeader>
                            <CardTitle className="text-lg">{t("import_history")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {importHistory.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{item.filename}</p>
                                                <p className="text-xs text-muted-foreground">{t("imported_on")} {item.date}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm">{item.messages} {t("messages")}</span>
                                            <Badge variant="outline" className="bg-success/10 text-success">
                                                {t("completed")}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Filter Tab */}
                <TabsContent value="filter" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="rounded-2xl border-border lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg">{t("filter_classify")}</CardTitle>
                                <CardDescription>
                                    {t("filter_settings_description") || "הגדר כללים לזיהוי אוטומטי של הודעות עסקיות ולידים פוטנציאליים"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                                    <div>
                                        <p className="font-medium">{t("ignore_personal_chats")}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {t("ignore_personal_description") || "מסנן שיחות עם בני משפחה וחברים"}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={filterSettings.ignorePersonal}
                                        onCheckedChange={(checked) =>
                                            setFilterSettings({ ...filterSettings, ignorePersonal: checked })
                                        }
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                                    <div>
                                        <p className="font-medium">{t("ignore_group_chats")}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {t("ignore_groups_description") || "מסנן הודעות מקבוצות וואטסאפ"}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={filterSettings.ignoreGroups}
                                        onCheckedChange={(checked) =>
                                            setFilterSettings({ ...filterSettings, ignoreGroups: checked })
                                        }
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                                    <div>
                                        <p className="font-medium">{t("enable_business_keywords")}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {t("business_keywords_description") || "חפש מילים כמו \"טיפול\", \"תור\", \"מחיר\", \"המלצה\""}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={filterSettings.businessKeywords}
                                        onCheckedChange={(checked) =>
                                            setFilterSettings({ ...filterSettings, businessKeywords: checked })
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("min_message_length")}</Label>
                                    <Select
                                        value={filterSettings.minMessageLength.toString()}
                                        onValueChange={(value) =>
                                            setFilterSettings({ ...filterSettings, minMessageLength: parseInt(value) })
                                        }
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5 {t("characters")}</SelectItem>
                                            <SelectItem value="10">10 {t("characters")}</SelectItem>
                                            <SelectItem value="15">15 {t("characters")}</SelectItem>
                                            <SelectItem value="20">20 {t("characters")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("keyword_filter") || "מילות מפתח לסינון (מופרדות בפסיקים)"}</Label>
                                    <Textarea
                                        placeholder={t("keyword_placeholder") || "טיפול, תור, מרפאה, שיניים, הלבנה, ייעוץ, מחיר, עלות, המלצה"}
                                        className="rounded-xl min-h-[100px]"
                                        defaultValue={t("keyword_default") || "טיפול, תור, מרפאה, שיניים, הלבנה, ייעוץ, מחיר, עלות, המלצה"}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-border">
                            <CardHeader>
                                <CardTitle className="text-lg">{t("preview") || "תצוגה מקדימה"}</CardTitle>
                                <CardDescription>
                                    {t("preview_description") || "הודעות שיסווגו לפי ההגדרות הנוכחיות"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                    {mockChats.map((chat) => (
                                        <div
                                            key={chat.id}
                                            className={cn(
                                                "p-3 rounded-xl border",
                                                chat.type === 'business' ? "border-primary/20 bg-primary/5" : "border-border"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <Users className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{chat.name}</p>
                                                        <p className="text-xs text-muted-foreground">{chat.phone}</p>
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        chat.type === 'business' ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                                                    )}
                                                >
                                                    {chat.type === 'business' ? t('business') : t('personal') || 'אישי'}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-1">{chat.lastMessage}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="rounded-2xl border-border">
                        <CardHeader>
                            <CardTitle className="text-lg">{t("content_classification") || "סיווג לפי תוכן"}</CardTitle>
                            <CardDescription>
                                {t("classification_description") || "הגדר כללים לזיהוי אוטומטי של סטטוס ליד לפי תוכן ההודעה"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="p-4 border border-border rounded-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="font-medium">{t("new_status")}</span>
                                        </div>
                                        <Textarea
                                            placeholder={t("new_keywords") || "מילות מפתח: שלום, אשמח, שאלה, מתעניין"}
                                            className="text-sm min-h-[80px] rounded-xl"
                                            defaultValue={t("new_keywords_default") || "שלום, אשמח, שאלה, מתעניין"}
                                        />
                                    </div>

                                    <div className="p-4 border border-border rounded-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <span className="font-medium">{t("hot_status")}</span>
                                        </div>
                                        <Textarea
                                            placeholder={t("hot_keywords") || "מילות מפתח: מתי אפשר, רוצה לקבוע, כן, מעוניין"}
                                            className="text-sm min-h-[80px] rounded-xl"
                                            defaultValue={t("hot_keywords_default") || "מתי אפשר, רוצה לקבוע, כן, מעוניין"}
                                        />
                                    </div>

                                    <div className="p-4 border border-border rounded-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <span className="font-medium">{t("needs_followup_clock")}</span>
                                        </div>
                                        <Textarea
                                            placeholder={t("followup_keywords") || "מילות מפתח: אחשוב על זה, אחזור, עוד לא החלטתי"}
                                            className="text-sm min-h-[80px] rounded-xl"
                                            defaultValue={t("followup_keywords_default") || "אחשוב על זה, אחזור, עוד לא החלטתי"}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-4">
                    <Card className="rounded-2xl border-border">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg">{t("message_templates")}</CardTitle>
                                    <CardDescription>
                                        {t("manage_templates") || "נהל תבניות להודעות מעקב אוטומטיות"}
                                    </CardDescription>
                                </div>
                                <Button
                                    className="rounded-xl"
                                    onClick={() => {
                                        setEditingTemplate(null);
                                        setShowTemplateDialog(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4 ml-2" />
                                    {t("new_rule")}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-3">
                                    {[...Array(4)].map((_, i) => (
                                        <Skeleton key={i} className="h-24 rounded-xl" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {templates.map((template) => (
                                        <div key={template.id} className="p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold">{template.name}</h4>
                                                    <p className="text-sm text-muted-foreground mt-1">"{template.message}"</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="rounded-lg"
                                                        onClick={() => {
                                                            setEditingTemplate(template);
                                                            setShowTemplateDialog(true);
                                                        }}
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="rounded-lg text-destructive"
                                                        onClick={() => handleDeleteTemplate(template.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 mt-3 text-xs">
                                                <span className="text-muted-foreground">{t("sent")} {template.usage} {t("times")}</span>
                                                <span className="text-success">{t("success_rate")}: {template.successRate}</span>
                                                <Badge variant="outline" className="bg-primary/5">
                                                    {template.category === 'followup' ? t("followup") || 'מעקב' : t("promotion") || 'מבצע'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Template Dialog */}
            <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTemplate ? t('edit_rule') : t('new_rule')}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTemplate
                                ? t('edit_template_description') || 'ערוך את פרטי התבנית הקיימת'
                                : t('create_template_description') || 'צור תבנית חדשה להודעות מעקב אוטומטיות'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="template-name">{t("template_name")}</Label>
                            <Input
                                id="template-name"
                                placeholder={t("template_name_placeholder") || "לדוגמה: מעקב אחרי 3 ימים"}
                                defaultValue={editingTemplate?.name}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="template-message">{t("template_message")}</Label>
                            <Textarea
                                id="template-message"
                                placeholder={t("template_message_placeholder") || "היי {name}, רצינו לבדוק אם הגעת לטיפול שלך? 😊"}
                                className="min-h-[100px]"
                                defaultValue={editingTemplate?.message}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("message_variables")}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="template-category">{t("category") || "קטגוריה"}</Label>
                                <Select defaultValue={editingTemplate?.category || 'followup'}>
                                    <SelectTrigger id="template-category">
                                        <SelectValue placeholder={t("select_category") || "בחר קטגוריה"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="followup">{t("followup") || "מעקב"}</SelectItem>
                                        <SelectItem value="promotion">{t("promotion") || "מבצע"}</SelectItem>
                                        <SelectItem value="welcome">{t("welcome") || "ברוך הבא"}</SelectItem>
                                        <SelectItem value="reminder">{t("reminder") || "תזכורת"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="template-language">{t("language")}</Label>
                                <Select defaultValue="he">
                                    <SelectTrigger id="template-language">
                                        <SelectValue placeholder={t("select_language")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="he">{t("hebrew")}</SelectItem>
                                        <SelectItem value="en">{t("english")}</SelectItem>
                                        <SelectItem value="ru">{t("russian") || "רוסית"}</SelectItem>
                                        <SelectItem value="ar">{t("arabic") || "ערבית"}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className={language === 'he' ? 'flex-row-reverse' : ''}>
                        <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                            {t("cancel")}
                        </Button>
                        <Button onClick={() => handleSaveTemplate({})}>
                            {editingTemplate ? t("save_rule") : t("create_rule")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}