// src/pages/WhatsAppIntegration.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { getDefaultWhatsAppConfig, whatsappService, type WhatsAppIntegrationConfig } from "@/services/whatsappService";

interface Template {
    id: string;
    name: string;
    message: string;
    usage: number;
    successRate: number;
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

interface ConnectionForm {
    phoneNumber: string;
    apiKey: string;
    webhookUrl: string;
    verificationToken: string;
    webhookSsl: boolean;
}

interface TemplateForm {
    name: string;
    message: string;
    category: string;
    language: string;
}

export default function WhatsAppIntegration() {
    const { t, language } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [showApiKey, setShowApiKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importing, setImporting] = useState(false);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [templateForm, setTemplateForm] = useState<TemplateForm>({ name: "", message: "", category: "followup", language: "he" });
    const [templates, setTemplates] = useState<Template[]>([]);
    const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [integrationUpdatedAt, setIntegrationUpdatedAt] = useState<string | null>(null);
    const [connectionForm, setConnectionForm] = useState<ConnectionForm>({
        phoneNumber: "",
        apiKey: "",
        webhookUrl: "https://api.yourclinic.com/whatsapp/webhook",
        verificationToken: "",
        webhookSsl: true,
    });
    const [filterSettings, setFilterSettings] = useState({
        ignorePersonal: true,
        minMessageLength: 10,
        businessKeywords: true,
        ignoreGroups: true,
        dateRange: '3months',
        keywords: "appointment, treatment, quote, whitening, consultation"
    });

    const syncFromConfig = useCallback((config: WhatsAppIntegrationConfig) => {
        setConnectionStatus(config.status);
        setConnectionForm({
            phoneNumber: config.phoneNumber,
            apiKey: config.apiKey,
            webhookUrl: config.webhookUrl,
            verificationToken: config.verificationToken,
            webhookSsl: config.webhookSsl,
        });
        setFilterSettings({
            ignorePersonal: config.filters.ignorePersonal,
            minMessageLength: config.filters.minMessageLength,
            businessKeywords: config.filters.businessKeywords,
            ignoreGroups: config.filters.ignoreGroups,
            dateRange: config.filters.dateRange,
            keywords: config.filters.keywords,
        });
        setTemplates(
            config.templates.map((template) => ({
                ...template,
                successRate: Number(template.successRate) || 0,
            }))
        );
        setImportHistory(config.importHistory);
        setIntegrationUpdatedAt(config.updatedAt);
    }, []);

    const buildConfig = useCallback(
        (overrides: Partial<WhatsAppIntegrationConfig> = {}): WhatsAppIntegrationConfig => ({
            ...getDefaultWhatsAppConfig(),
            status: connectionStatus,
            phoneNumber: connectionForm.phoneNumber,
            apiKey: connectionForm.apiKey,
            webhookUrl: connectionForm.webhookUrl,
            verificationToken: connectionForm.verificationToken,
            webhookSsl: connectionForm.webhookSsl,
            filters: {
                ignorePersonal: filterSettings.ignorePersonal,
                minMessageLength: filterSettings.minMessageLength,
                businessKeywords: filterSettings.businessKeywords,
                ignoreGroups: filterSettings.ignoreGroups,
                dateRange: filterSettings.dateRange as "week" | "month" | "3months" | "6months" | "year",
                keywords: filterSettings.keywords,
            },
            templates,
            importHistory,
            ...overrides,
        }),
        [connectionStatus, connectionForm, filterSettings, templates, importHistory]
    );

    const saveToBackend = useCallback(
        async (overrides: Partial<WhatsAppIntegrationConfig> = {}, successMessage?: string) => {
            setIsSaving(true);
            try {
                const saved = await whatsappService.saveConfig(buildConfig(overrides));
                syncFromConfig(saved);
                if (successMessage) {
                    toast({
                        title: t("success"),
                        description: successMessage,
                    });
                }
            } catch (error) {
                console.error("Error saving WhatsApp config:", error);
                toast({
                    title: t("error"),
                    description: t("settings_save_failed"),
                    variant: "destructive",
                });
                throw error;
            } finally {
                setIsSaving(false);
            }
        },
        [buildConfig, syncFromConfig, t]
    );

    const loadConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const config = await whatsappService.getConfig();
            syncFromConfig(config);
        } catch (error) {
            console.error("Error loading WhatsApp config:", error);
            toast({
                title: t("error"),
                description: t("error_loading_data"),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [syncFromConfig, t]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const handleConnect = async () => {
        setConnectionStatus('connecting');
        try {
            await new Promise(resolve => setTimeout(resolve, 900));
            await saveToBackend(
                {
                    status: "connected",
                    lastConnectedAt: new Date().toISOString(),
                },
                t("whatsapp_account_connected")
            );
        } catch (error) {
            setConnectionStatus('disconnected');
        }
    };

    const handleDisconnect = async () => {
        try {
            await saveToBackend({ status: "disconnected" }, t("disconnected"));
        } catch (error) {
            setConnectionStatus("connected");
        }
    };

    const handleSaveConnectionDetails = async () => {
        await saveToBackend({}, "WhatsApp settings saved.");
    };

    const handleSelectFile = () => {
        fileInputRef.current?.click();
    };

    const handleImport = async (file?: File) => {
        setImporting(true);
        setImportProgress(0);
        try {
            for (let i = 0; i <= 80; i += 20) {
                await new Promise(resolve => setTimeout(resolve, 120));
                setImportProgress(i);
            }
            const processedMessages = file
                ? (await file.text()).split(/\r?\n/).filter(Boolean).length
                : 1284;
            setImportProgress(100);

            const entry: ImportHistory = {
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
                filename: file?.name || `import-${new Date().toISOString().slice(0, 10)}.txt`,
                date: new Date().toISOString(),
                messages: processedMessages,
                status: "completed",
            };
            const nextHistory = [entry, ...importHistory].slice(0, 30);
            setImportHistory(nextHistory);
            await saveToBackend({ importHistory: nextHistory }, `Imported ${processedMessages.toLocaleString()} messages.`);
        } finally {
            setImporting(false);
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const allowed = /\.(txt|csv|json)$/i.test(file.name);
        if (!allowed) {
            toast({
                title: t("error"),
                description: "Please upload a .txt, .csv, or .json file.",
                variant: "destructive",
            });
            event.target.value = "";
            return;
        }
        await handleImport(file);
        event.target.value = "";
    };

    const handleSaveFilterSettings = async () => {
        await saveToBackend({}, "Filter settings saved.");
    };

    const handleOpenCreateTemplate = () => {
        setEditingTemplate(null);
        setTemplateForm({ name: "", message: "", category: "followup", language: "he" });
        setShowTemplateDialog(true);
    };

    const handleOpenEditTemplate = (template: Template) => {
        setEditingTemplate(template);
        setTemplateForm({
            name: template.name,
            message: template.message,
            category: template.category,
            language: template.language,
        });
        setShowTemplateDialog(true);
    };

    const handleSaveTemplate = async () => {
        const templateData: Partial<Template> = {
            name: templateForm.name.trim(),
            message: templateForm.message.trim(),
            category: templateForm.category,
            language: templateForm.language,
        };
        if (!templateData.name || !templateData.message) {
            toast({
                title: t("error"),
                description: "Template name and message are required.",
                variant: "destructive",
            });
            return;
        }
        try {
            let nextTemplates: Template[];
            if (editingTemplate) {
                nextTemplates = templates.map(t =>
                    t.id === editingTemplate.id ? { ...t, ...templateData } : t
                );
            } else {
                const newTemplate: Template = {
                    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                    name: templateData.name || t("template_name"),
                    message: templateData.message || '',
                    usage: 0,
                    successRate: 0,
                    language: templateData.language || "he",
                    category: templateData.category || 'followup'
                };
                nextTemplates = [newTemplate, ...templates];
            }
            setTemplates(nextTemplates);
            await saveToBackend(
                { templates: nextTemplates },
                editingTemplate ? t("rule_updated_successfully") : t("rule_created_successfully")
            );
        } catch (error) {
            // handled in saveToBackend
        } finally {
            setShowTemplateDialog(false);
            setEditingTemplate(null);
            setTemplateForm({ name: "", message: "", category: "followup", language: "he" });
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        try {
            const nextTemplates = templates.filter(t => t.id !== id);
            setTemplates(nextTemplates);
            await saveToBackend({ templates: nextTemplates }, t("rule_removed_successfully"));
        } catch (error) {
            // handled in saveToBackend
        }
    };

    const mockChats = [
        { id: 1, name: "דנה כהן", phone: "050-1234567", lastMessage: t("when_can_come"), type: "business", date: "2025-02-20", status: "new" },
        { id: 2, name: "יוסי לוי", phone: "052-7654321", lastMessage: t("thank_you_see_you_tomorrow"), type: "business", date: "2025-02-19", status: "followup" },
        { id: 3, name: t("mom"), phone: "054-9876543", lastMessage: t("how_are_you_today"), type: "personal", date: "2025-02-20", status: "ignore" },
        { id: 4, name: "משה גולן", phone: "053-4567890", lastMessage: t("whitening_appointment"), type: "business", date: "2025-02-18", status: "hot" },
    ];
    const previewChats = mockChats.filter((chat) => {
        const keywords = filterSettings.keywords
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean);
        if (filterSettings.ignorePersonal && chat.type === "personal") return false;
        if (filterSettings.ignoreGroups && chat.type === "group") return false;
        if (chat.lastMessage.length < filterSettings.minMessageLength) return false;
        if (!filterSettings.businessKeywords || keywords.length === 0) return true;
        const text = `${chat.name} ${chat.lastMessage}`.toLowerCase();
        return keywords.some((keyword) => text.includes(keyword));
    });
    const totalImportedMessages = useMemo(
        () => importHistory.reduce((sum, item) => sum + item.messages, 0),
        [importHistory]
    );
    const importedToday = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return importHistory
            .filter((item) => item.date.slice(0, 10) === today)
            .reduce((sum, item) => sum + item.messages, 0);
    }, [importHistory]);
    const averageTemplateSuccessRate = useMemo(() => {
        if (templates.length === 0) {
            return 0;
        }
        const total = templates.reduce((sum, template) => sum + template.successRate, 0);
        return Math.round(total / templates.length);
    }, [templates]);
    const setupProgress = useMemo(() => {
        let points = 0;
        if (connectionForm.phoneNumber.trim()) points += 20;
        if (connectionForm.apiKey.trim()) points += 25;
        if (connectionForm.webhookUrl.trim()) points += 15;
        if (connectionStatus === "connected") points += 20;
        if (templates.length > 0) points += 10;
        if (importHistory.length > 0) points += 10;
        return points;
    }, [connectionForm, connectionStatus, templates.length, importHistory.length]);
    const formatDateTime = useCallback(
        (value: string | null) => {
            if (!value) return "-";
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return "-";
            return date.toLocaleString(language === "he" ? "he-IL" : "en-US");
        },
        [language]
    );

    return (
        <div className="space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
            <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.json,text/plain,text/csv,application/json"
                className="hidden"
                onChange={handleFileChange}
            />
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground font-display">WhatsApp Engagement</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Connect your WhatsApp Business account to centralize conversations and automate follow‑ups.
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
                                        value={connectionForm.phoneNumber}
                                        onChange={(event) => setConnectionForm({ ...connectionForm, phoneNumber: event.target.value })}
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
                                            value={connectionForm.apiKey}
                                            onChange={(event) => setConnectionForm({ ...connectionForm, apiKey: event.target.value })}
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
                                            value={connectionForm.webhookUrl}
                                            onChange={(event) => setConnectionForm({ ...connectionForm, webhookUrl: event.target.value })}
                                            dir="ltr"
                                            className="rounded-xl font-mono text-sm"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="rounded-xl shrink-0"
                                            onClick={() => {
                                                navigator.clipboard.writeText(connectionForm.webhookUrl);
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
                                        value={connectionForm.verificationToken}
                                        onChange={(event) => setConnectionForm({ ...connectionForm, verificationToken: event.target.value })}
                                        type="password"
                                        dir="ltr"
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-4">
                                    <Switch
                                        id="webhook_ssl"
                                        checked={connectionForm.webhookSsl}
                                        onCheckedChange={(checked) => setConnectionForm({ ...connectionForm, webhookSsl: checked })}
                                    />
                                    <Label htmlFor="webhook_ssl">{t("enable_ssl_verification")}</Label>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
                                <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={handleSaveConnectionDetails}
                                    disabled={isSaving}
                                >
                                    {isSaving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                                    {t("save") || "Save"}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={handleDisconnect}
                                    disabled={connectionStatus !== 'connected' || isSaving}
                                >
                                    {t("disconnect")}
                                </Button>
                                <Button
                                    onClick={handleConnect}
                                    disabled={connectionStatus === 'connected' || isSaving}
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
                                    <Badge variant="outline" className={cn( connectionStatus === "connected" && "bg-success/10 text-success", connectionStatus === "connecting" && "bg-warning/10 text-warning", connectionStatus === "disconnected" && "bg-destructive/10 text-destructive" )}>`n                                        {connectionStatus === "connected" ? t("active") : connectionStatus}`n                                    </Badge>
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
                                    <span className="text-sm">{t("last_update") || "Last update"}</span>`n                                    <span className="font-bold text-xs">`n                                        {integrationUpdatedAt ? new Date(integrationUpdatedAt).toLocaleString(language === "he" ? "he-IL" : "en-US") : "-"}`n                                    </span>
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
                                <Button variant="outline" className="mt-4 rounded-xl" onClick={handleSelectFile}>
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
                                onClick={handleSelectFile}
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
                                        value={filterSettings.keywords}
                                        onChange={(event) => setFilterSettings({ ...filterSettings, keywords: event.target.value })}
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
                                    {previewChats.map((chat) => (
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







