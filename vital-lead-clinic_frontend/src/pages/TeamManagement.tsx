// src/pages/TeamManagement.tsx
import { useState } from "react";
import {
    Users, UserPlus, Shield, Mail, Phone,
    Calendar, Clock, Activity, Star, MoreVertical,
    CheckCircle, XCircle, Edit, Trash2, Key,
    UserCog, Settings, LogOut, Award, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

interface TeamMember {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'admin' | 'manager' | 'staff';
    clinic: string;
    avatar?: string;
    status: 'active' | 'inactive' | 'pending';
    lastActive: string;
    permissions: string[];
    performance: {
        leadsAssigned: number;
        conversions: number;
        responseTime: string;
        rating: number;
    };
}

const mockTeamMembers: TeamMember[] = [
    {
        id: '1',
        name: 'דנה כהן',
        email: 'dana@clinic.co.il',
        phone: '050-1234567',
        role: 'admin',
        clinic: 'מרפאת שיניים הרצליה',
        status: 'active',
        lastActive: '2025-02-20T10:30:00',
        permissions: ['all'],
        performance: {
            leadsAssigned: 145,
            conversions: 89,
            responseTime: '15 דקות',
            rating: 4.8
        }
    },
    {
        id: '2',
        name: 'יוסי לוי',
        email: 'yossi@clinic.co.il',
        phone: '052-7654321',
        role: 'manager',
        clinic: 'מרפאת שיניים תל אביב',
        status: 'active',
        lastActive: '2025-02-20T09:15:00',
        permissions: ['leads', 'analytics', 'team'],
        performance: {
            leadsAssigned: 98,
            conversions: 62,
            responseTime: '25 דקות',
            rating: 4.5
        }
    },
    {
        id: '3',
        name: 'מיכל גולן',
        email: 'michal@clinic.co.il',
        phone: '054-9876543',
        role: 'staff',
        clinic: 'מרפאת שיניים הרצליה',
        status: 'active',
        lastActive: '2025-02-20T11:45:00',
        permissions: ['leads'],
        performance: {
            leadsAssigned: 76,
            conversions: 41,
            responseTime: '32 דקות',
            rating: 4.2
        }
    },
    {
        id: '4',
        name: 'אבי אברהם',
        email: 'avi@clinic.co.il',
        phone: '053-4567890',
        role: 'staff',
        clinic: 'מרפאת שיניים תל אביב',
        status: 'inactive',
        lastActive: '2025-02-15T14:20:00',
        permissions: ['leads'],
        performance: {
            leadsAssigned: 34,
            conversions: 18,
            responseTime: '45 דקות',
            rating: 3.9
        }
    }
];

const clinics = [
    { id: '1', name: 'מרפאת שיניים הרצליה', members: 8, leads: 245, conversion: '67%' },
    { id: '2', name: 'מרפאת שיניים תל אביב', members: 12, leads: 389, conversion: '72%' },
    { id: '3', name: 'מרפאת שיניים חיפה', members: 6, leads: 156, conversion: '58%' },
];

export default function TeamManagement() {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [addMemberOpen, setAddMemberOpen] = useState(false);

    const filteredMembers = mockTeamMembers.filter(member => {
        const matchesSearch = member.name.includes(search) || member.email.includes(search);
        const matchesRole = roleFilter === 'all' || member.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">מנהל מערכת</Badge>;
            case 'manager':
                return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">מנהל מרפאה</Badge>;
            default:
                return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">צוות</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-success/10 text-success border-success/20">פעיל</Badge>;
            case 'inactive':
                return <Badge className="bg-destructive/10 text-destructive border-destructive/20">לא פעיל</Badge>;
            default:
                return <Badge className="bg-warning/10 text-warning border-warning/20">ממתין</Badge>;
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-foreground">ניהול צוות</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        ניהול משתמשים, הרשאות וביצועי צוות במרפאות
                    </p>
                </div>
                <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl">
                            <UserPlus className="h-4 w-4 ml-2" />
                            הוסף חבר צוות
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                        <DialogHeader>
                            <DialogTitle>הוסף חבר צוות חדש</DialogTitle>
                            <DialogDescription>
                                הזן את פרטי המשתמש והגדר הרשאות מתאימות
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>שם מלא</Label>
                                <Input placeholder="ישראל ישראלי" className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>אימייל</Label>
                                <Input type="email" placeholder="user@clinic.co.il" className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>טלפון</Label>
                                <Input placeholder="050-1234567" className="rounded-xl" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>תפקיד</Label>
                                    <Select defaultValue="staff">
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">מנהל מערכת</SelectItem>
                                            <SelectItem value="manager">מנהל מרפאה</SelectItem>
                                            <SelectItem value="staff">צוות</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>מרפאה</Label>
                                    <Select>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clinics.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>הרשאות מיוחדות</Label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Switch id="perm_leads" defaultChecked />
                                        <Label htmlFor="perm_leads">ניהול לידים</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch id="perm_analytics" />
                                        <Label htmlFor="perm_analytics">צפייה באנליטיקס</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch id="perm_team" />
                                        <Label htmlFor="perm_team">ניהול צוות</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch id="perm_settings" />
                                        <Label htmlFor="perm_settings">הגדרות מערכת</Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setAddMemberOpen(false)} className="rounded-xl">
                                ביטול
                            </Button>
                            <Button onClick={() => setAddMemberOpen(false)} className="rounded-xl">
                                הוסף משתמש
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            סה"כ חברי צוות
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{mockTeamMembers.length}</div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-success">
                            <TrendingUp className="h-3 w-3" />
                            <span>+2 החודש</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            פעילים כעת
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">3</div>
                        <div className="flex items-center gap-1 mt-1 text-xs">
                            <Activity className="h-3 w-3 text-success" />
                            <span>75% מהצוות</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            לידים לטיפול
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">24</div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-warning">
                            <Clock className="h-3 w-3" />
                            <span>ממתינים להקצאה</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            ביצועי צוות
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">84%</div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-success">
                            <Star className="h-3 w-3 fill-success" />
                            <span>ממוצע המרות</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="team" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 rounded-xl">
                    <TabsTrigger value="team">חברי צוות</TabsTrigger>
                    <TabsTrigger value="clinics">מרפאות</TabsTrigger>
                    <TabsTrigger value="performance">ביצועים</TabsTrigger>
                </TabsList>

                {/* Team Tab */}
                <TabsContent value="team" className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Input
                                placeholder="חיפוש לפי שם או אימייל..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pr-10 rounded-xl"
                            />
                            <Users className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-[140px] rounded-xl">
                                <SelectValue placeholder="תפקיד" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">כל התפקידים</SelectItem>
                                <SelectItem value="admin">מנהל מערכת</SelectItem>
                                <SelectItem value="manager">מנהל מרפאה</SelectItem>
                                <SelectItem value="staff">צוות</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] rounded-xl">
                                <SelectValue placeholder="סטטוס" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">כל הסטטוסים</SelectItem>
                                <SelectItem value="active">פעיל</SelectItem>
                                <SelectItem value="inactive">לא פעיל</SelectItem>
                                <SelectItem value="pending">ממתין</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Team Members Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredMembers.map((member) => (
                            <Card
                                key={member.id}
                                className="rounded-2xl border-border hover:shadow-card-hover transition-all cursor-pointer"
                                onClick={() => setSelectedMember(member)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4">
                                            <Avatar className="h-12 w-12">
                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                    {member.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-foreground">{member.name}</h3>
                                                    {getRoleBadge(member.role)}
                                                    {getStatusBadge(member.status)}
                                                </div>
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        <span>{member.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Phone className="h-3.5 w-3.5" />
                                                        <span>{member.phone}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <span>פעיל לאחרונה: {new Date(member.lastActive).toLocaleString('he-IL')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="rounded-xl">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="rounded-xl">
                                                <DropdownMenuLabel>פעולות</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Edit className="h-4 w-4 ml-2" />
                                                    ערוך פרטים
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Key className="h-4 w-4 ml-2" />
                                                    אפס סיסמה
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Shield className="h-4 w-4 ml-2" />
                                                    נהל הרשאות
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="cursor-pointer text-destructive">
                                                    <Trash2 className="h-4 w-4 ml-2" />
                                                    הסר משתמש
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Performance Preview */}
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            <div>
                                                <p className="text-xs text-muted-foreground">לידים</p>
                                                <p className="font-bold text-foreground">{member.performance.leadsAssigned}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">המרות</p>
                                                <p className="font-bold text-foreground">{member.performance.conversions}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">זמן תגובה</p>
                                                <p className="font-bold text-foreground text-sm">{member.performance.responseTime}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">דירוג</p>
                                                <p className="font-bold text-foreground">{member.performance.rating}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Clinics Tab */}
                <TabsContent value="clinics" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        {clinics.map((clinic) => (
                            <Card key={clinic.id} className="rounded-2xl border-border">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground">{clinic.name}</h3>
                                            <div className="flex gap-4 mt-2">
                                                <span className="text-sm text-muted-foreground">
                                                    <Users className="h-4 w-4 inline ml-1" />
                                                    {clinic.members} חברי צוות
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    <Activity className="h-4 w-4 inline ml-1" />
                                                    {clinic.leads} לידים פעילים
                                                </span>
                                                <span className="text-sm text-success">
                                                    <TrendingUp className="h-4 w-4 inline ml-1" />
                                                    המרה: {clinic.conversion}
                                                </span>
                                            </div>
                                        </div>
                                        <Button variant="outline" className="rounded-xl">
                                            נהל מרפאה
                                        </Button>
                                    </div>
                                    <div className="mt-4">
                                        <Progress value={parseInt(clinic.conversion)} className="h-2" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance" className="space-y-4">
                    <Card className="rounded-2xl border-border">
                        <CardHeader>
                            <CardTitle className="text-lg">ביצועי צוות - טבלת מובילים</CardTitle>
                            <CardDescription>
                                דירוג חברי צוות לפי מדדי ביצוע שונים
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-right py-3">שם</th>
                                            <th className="text-right py-3">מרפאה</th>
                                            <th className="text-right py-3">לידים שטופלו</th>
                                            <th className="text-right py-3">המרות</th>
                                            <th className="text-right py-3">אחוז הצלחה</th>
                                            <th className="text-right py-3">זמן תגובה ממוצע</th>
                                            <th className="text-right py-3">דירוג</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mockTeamMembers
                                            .sort((a, b) => b.performance.rating - a.performance.rating)
                                            .map((member, index) => (
                                                <tr key={member.id} className="border-b border-border last:border-0">
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-2">
                                                            {index === 0 && <Award className="h-4 w-4 text-warning" />}
                                                            <span className="font-medium">{member.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-muted-foreground">{member.clinic}</td>
                                                    <td className="py-3">{member.performance.leadsAssigned}</td>
                                                    <td className="py-3">{member.performance.conversions}</td>
                                                    <td className="py-3">
                                                        <span className="text-success">
                                                            {Math.round((member.performance.conversions / member.performance.leadsAssigned) * 100)}%
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-muted-foreground">{member.performance.responseTime}</td>
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-1">
                                                            <Star className="h-3 w-3 fill-warning text-warning" />
                                                            <span>{member.performance.rating}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Member Details Dialog */}
            <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
                <DialogContent className="max-w-2xl rounded-2xl">
                    {selectedMember && (
                        <>
                            <DialogHeader>
                                <DialogTitle>פרטי חבר צוות</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xl">
                                            {selectedMember.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="text-xl font-bold">{selectedMember.name}</h3>
                                        <div className="flex gap-2 mt-1">
                                            {getRoleBadge(selectedMember.role)}
                                            {getStatusBadge(selectedMember.status)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>אימייל</Label>
                                        <p className="text-sm bg-muted/30 p-2 rounded-xl">{selectedMember.email}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>טלפון</Label>
                                        <p className="text-sm bg-muted/30 p-2 rounded-xl">{selectedMember.phone}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>מרפאה</Label>
                                        <p className="text-sm bg-muted/30 p-2 rounded-xl">{selectedMember.clinic}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>פעיל לאחרונה</Label>
                                        <p className="text-sm bg-muted/30 p-2 rounded-xl">
                                            {new Date(selectedMember.lastActive).toLocaleString('he-IL')}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <Label>הרשאות</Label>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        {selectedMember.permissions.map((perm, i) => (
                                            <Badge key={i} variant="outline" className="justify-start">
                                                <CheckCircle className="h-3 w-3 ml-1 text-success" />
                                                {perm === 'all' ? 'כל ההרשאות' : perm}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label>ביצועים</Label>
                                    <div className="mt-2 grid grid-cols-4 gap-4">
                                        <div className="text-center p-3 bg-muted/30 rounded-xl">
                                            <p className="text-xs text-muted-foreground">לידים</p>
                                            <p className="text-xl font-bold">{selectedMember.performance.leadsAssigned}</p>
                                        </div>
                                        <div className="text-center p-3 bg-muted/30 rounded-xl">
                                            <p className="text-xs text-muted-foreground">המרות</p>
                                            <p className="text-xl font-bold">{selectedMember.performance.conversions}</p>
                                        </div>
                                        <div className="text-center p-3 bg-muted/30 rounded-xl">
                                            <p className="text-xs text-muted-foreground">אחוז המרה</p>
                                            <p className="text-xl font-bold text-success">
                                                {Math.round((selectedMember.performance.conversions / selectedMember.performance.leadsAssigned) * 100)}%
                                            </p>
                                        </div>
                                        <div className="text-center p-3 bg-muted/30 rounded-xl">
                                            <p className="text-xs text-muted-foreground">דירוג</p>
                                            <p className="text-xl font-bold">{selectedMember.performance.rating}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}