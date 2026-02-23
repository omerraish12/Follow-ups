// src/pages/WhatsAppIntegration.tsx
import { useState } from "react";
import {
    MessageSquare, Phone, CheckCircle, XCircle,
    AlertCircle, Settings, Webhook, RefreshCw,
    Shield, Globe, Key, Smartphone, Download,
    Upload, FileText, Filter, Clock, Users,
    Eye, EyeOff, Copy, Check
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
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

export default function WhatsAppIntegration() {
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [showApiKey, setShowApiKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importing, setImporting] = useState(false);
    const [filterSettings, setFilterSettings] = useState({
        ignorePersonal: true,
        minMessageLength: 10,
        businessKeywords: true,
        ignoreGroups: true,
        dateRange: '3months'
    });

    const handleConnect = () => {
        setConnectionStatus('connecting');
        setTimeout(() => {
            setConnectionStatus('connected');
            toast({
                title: "התחברות הושלמה",
                description: "חשבון הוואטסאפ העסקי חובר בהצלחה",
            });
        }, 2000);
    };

    const handleImport = () => {
        setImporting(true);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setImportProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setImporting(false);
                toast({
                    title: "ייבוא הושלם",
                    description: "הייבוא הסתיים בהצלחה. 1,284 הודעות עובדו.",
                });
            }
        }, 500);
    };

    const mockChats = [
        { id: 1, name: "דנה כהן", phone: "050-1234567", lastMessage: "היי, מתי אפשר להגיע?", type: "business", date: "2025-02-20", status: "new" },
        { id: 2, name: "יוסי לוי", phone: "052-7654321", lastMessage: "תודה, נתראה מחר", type: "business", date: "2025-02-19", status: "followup" },
        { id: 3, name: "אמא", phone: "054-9876543", lastMessage: "מה שלומך היום?", type: "personal", date: "2025-02-20", status: "ignore" },
        { id: 4, name: "משה גולן", phone: "053-4567890", lastMessage: "אשמח לקבוע תור להלבנת שיניים", type: "business", date: "2025-02-18", status: "hot" },
    ];

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-foreground">חיבור וואטסאפ</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        חבר את ה-WhatsApp Business API לניהול אוטומטי של הודעות ולידים
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
                        {connectionStatus === 'connected' ? 'מחובר' :
                            connectionStatus === 'connecting' ? 'מתחבר...' : 'מנותק'}
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="connection" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 rounded-xl">
                    <TabsTrigger value="connection">חיבור והגדרות</TabsTrigger>
                    <TabsTrigger value="import">ייבוא הודעות</TabsTrigger>
                    <TabsTrigger value="filter">סינון וסיווג</TabsTrigger>
                    <TabsTrigger value="templates">תבניות הודעות</TabsTrigger>
                </TabsList>

                {/* Connection Tab */}
                <TabsContent value="connection" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="rounded-2xl border-border lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-lg">הגדרות חיבור WhatsApp Business API</CardTitle>
                                <CardDescription>
                                    הזן את פרטי החיבור מ-Meta Business Suite
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">מספר טלפון עסקי</Label>
                                    <Input
                                        id="phone"
                                        placeholder="972501234567"
                                        dir="ltr"
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="apiKey">API Key</Label>
                                    <div className="relative">
                                        <Input
                                            id="apiKey"
                                            type={showApiKey ? "text" : "password"}
                                            placeholder="Enter your API key"
                                            dir="ltr"
                                            className="rounded-xl pl-10"
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
                                    <Label htmlFor="webhook">Webhook URL</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="webhook"
                                            value="https://api.yourclinic.com/whatsapp/webhook"
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
                                            }}
                                        >
                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        העתק כתובת זו והגדר ב-Webhooks ב-Meta Developers
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="verify">Verification Token</Label>
                                    <Input
                                        id="verify"
                                        value="your_verification_token_here"
                                        type="password"
                                        dir="ltr"
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-4">
                                    <Switch id="webhook_ssl" defaultChecked />
                                    <Label htmlFor="webhook_ssl">אמת SSL עבור Webhook</Label>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between border-t border-border pt-4">
                                <Button variant="outline" className="rounded-xl">
                                    בדוק חיבור
                                </Button>
                                <Button
                                    onClick={handleConnect}
                                    disabled={connectionStatus === 'connected'}
                                    className="rounded-xl bg-whatsapp hover:bg-whatsapp/90"
                                >
                                    {connectionStatus === 'connected' ? 'מחובר' : 'חבר חשבון'}
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="rounded-2xl border-border">
                            <CardHeader>
                                <CardTitle className="text-lg">סטטוס חיבור</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                    <span className="text-sm">סטטוס Webhook</span>
                                    <Badge variant="outline" className="bg-success/10 text-success">
                                        פעיל
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                    <span className="text-sm">הוד�ות שהתקבלו היום</span>
                                    <span className="font-bold">47</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                    <span className="text-sm">קצב שליחה (לשעה)</span>
                                    <span className="font-bold">250</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                    <span className="text-sm">מכסה יומית</span>
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
                            <CardTitle className="text-lg">ייבוא הודעות עבר</CardTitle>
                            <CardDescription>
                                ייבא הודעות וואטסאפ מ-1-3 חודשים אחורה לסריקה וסיווג אוטומטי
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>טווח תאריכים</Label>
                                    <Select defaultValue="3months">
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="בחר טווח" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1month">חודש אחרון</SelectItem>
                                            <SelectItem value="2months">חודשיים אחרונים</SelectItem>
                                            <SelectItem value="3months">שלושה חודשים אחרונים</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>פורמט ייצוא</Label>
                                    <Select defaultValue="chat">
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="בחר פורמט" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="chat">ייצוא צ'אט (.txt)</SelectItem>
                                            <SelectItem value="csv">קובץ CSV</SelectItem>
                                            <SelectItem value="json">JSON</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>סוג הודעות</Label>
                                    <Select defaultValue="all">
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="בחר סוג" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">הכל</SelectItem>
                                            <SelectItem value="business">עסקי בלבד</SelectItem>
                                            <SelectItem value="personal">אישי בלבד</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center">
                                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                                <p className="text-sm font-medium">גרור לכאן קובץ ייצוא או לחץ לבחירה</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    תמיכה בקבצי .txt, .csv, .json עד 50MB
                                </p>
                                <Button variant="outline" className="mt-4 rounded-xl">
                                    בחר קובץ
                                </Button>
                            </div>

                            {importing && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>מייבא הודעות...</span>
                                        <span>{importProgress}%</span>
                                    </div>
                                    <Progress value={importProgress} className="h-2" />
                                    <p className="text-xs text-muted-foreground">
                                        מעובדות 847 מתוך 1,284 הודעות
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
                                        <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                                        מייבא...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 ml-2" />
                                        התחל ייבוא
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-border">
                        <CardHeader>
                            <CardTitle className="text-lg">היסטוריית ייבוא</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">ייצוא_וואטסאפ_פברואר.txt</p>
                                                <p className="text-xs text-muted-foreground">הוסף ב-15/02/2025</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm">1,284 הודעות</span>
                                            <Badge variant="outline" className="bg-success/10 text-success">
                                                הושלם
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
                                <CardTitle className="text-lg">הגדרות סינון וסיווג</CardTitle>
                                <CardDescription>
                                    הגדר כללים לזיהוי אוטומטי של הודעות עסקיות ולידים פוטנציאליים
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                                    <div>
                                        <p className="font-medium">התעלם מהודעות אישיות</p>
                                        <p className="text-xs text-muted-foreground">
                                            מסנן שיחות עם בני משפחה וחברים
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
                                        <p className="font-medium">התעלם מקבוצות</p>
                                        <p className="text-xs text-muted-foreground">
                                            מסנן הודעות מקבוצות וואטסאפ
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
                                        <p className="font-medium">זיהוי מילות מפתח עסקיות</p>
                                        <p className="text-xs text-muted-foreground">
                                            חפש מילים כמו "טיפול", "תור", "מחיר", "המלצה"
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
                                    <Label>אורך מינימלי להודעה</Label>
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
                                            <SelectItem value="5">5 תווים</SelectItem>
                                            <SelectItem value="10">10 תווים</SelectItem>
                                            <SelectItem value="15">15 תווים</SelectItem>
                                            <SelectItem value="20">20 תווים</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>מילות מפתח לסינון (מופרדות בפסיקים)</Label>
                                    <Textarea
                                        placeholder="טיפול, תור, מרפאה, שיניים, הלבנה, ייעוץ, מחיר, עלות, המלצה"
                                        className="rounded-xl min-h-[100px]"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-border">
                            <CardHeader>
                                <CardTitle className="text-lg">תצוגה מקדימה</CardTitle>
                                <CardDescription>
                                    הודעות שיסווגו לפי ההגדרות הנוכחיות
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
                                                    {chat.type === 'business' ? 'עסקי' : 'אישי'}
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
                            <CardTitle className="text-lg">סיווג לפי תוכן</CardTitle>
                            <CardDescription>
                                הגדר כללים לזיהוי אוטומטי של סטטוס ליד לפי תוכן ההודעה
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="p-4 border border-border rounded-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="font-medium">סטטוס חדש</span>
                                        </div>
                                        <Textarea
                                            placeholder="מילות מפתח: שלום, אשמח, שאלה, מתעניין"
                                            className="text-sm min-h-[80px] rounded-xl"
                                        />
                                    </div>

                                    <div className="p-4 border border-border rounded-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <span className="font-medium">סטטוס חם</span>
                                        </div>
                                        <Textarea
                                            placeholder="מילות מפתח: מתי אפשר, רוצה לקבוע, כן, מעוניין"
                                            className="text-sm min-h-[80px] rounded-xl"
                                        />
                                    </div>

                                    <div className="p-4 border border-border rounded-xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <span className="font-medium">צריך מעקב</span>
                                        </div>
                                        <Textarea
                                            placeholder="מילות מפתח: אחשוב על זה, אחזור, עוד לא החלטתי"
                                            className="text-sm min-h-[80px] rounded-xl"
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
                                    <CardTitle className="text-lg">תבניות הודעות</CardTitle>
                                    <CardDescription>
                                        נהל תבניות להודעות מעקב אוטומטיות
                                    </CardDescription>
                                </div>
                                <Button className="rounded-xl">
                                    <MessageSquare className="h-4 w-4 ml-2" />
                                    תבנית חדשה
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {[
                                    { name: "מעקב אחרי 3 ימים", message: "היי {שם}, רצינו לבדוק אם הגעת לטיפול שלך? 😊", usage: 45, success: "68%" },
                                    { name: "מעקב אחרי שבוע", message: "שלום {שם}, מזכירים לך שאצלנו תמיד אפשר לקבוע תור חוזר. נשמח לראותך! 🦷", usage: 32, success: "72%" },
                                    { name: "מעקב אחרי חודש", message: "עבר חודש מהטיפול האחרון שלך! איך היתה ההרגשה? מוזמן לספר לנו", usage: 28, success: "81%" },
                                    { name: "לקוח אבוד - הצעה מיוחדת", message: "{שם}, מזמן לא ראינו אותך! הפתעה מיוחדת מחכה לך - 20% הנחה על הטיפול הבא ✨", usage: 56, success: "91%" },
                                ].map((template, i) => (
                                    <div key={i} className="p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold">{template.name}</h4>
                                                <p className="text-sm text-muted-foreground mt-1">"{template.message}"</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" className="rounded-lg">ערוך</Button>
                                                <Button variant="ghost" size="sm" className="rounded-lg text-destructive">מחק</Button>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 mt-3 text-xs">
                                            <span className="text-muted-foreground">נשלח: {template.usage} פעמים</span>
                                            <span className="text-success">הצלחה: {template.success}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}