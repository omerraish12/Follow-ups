// src/pages/TeamManagement.tsx
import { useState, useEffect } from "react";
import {
    Users, UserPlus, Shield, Mail, Phone,
    Calendar, Clock, Activity, Star, MoreVertical,
    CheckCircle, XCircle, Edit, Trash2, Key,
    UserCog, Settings, LogOut, Award, TrendingUp,
    Search, Filter, Loader2, Plus, Eye
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

interface TeamMember {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'admin' | 'manager' | 'staff';
    clinicId: string;
    clinicName?: string;
    avatar?: string;
    status: 'active' | 'inactive' | 'pending';
    lastActive: string;
    permissions: string[];
    performance: {
        leadsAssigned: number;
        conversions: number;
        responseTime: string;
        rating: number;
        revenue: number;
    };
    createdAt: string;
}

interface Clinic {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    members: number;
    leads: number;
    conversion: string;
}

export default function TeamManagement() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);

    // Load data
    useEffect(() => {
        loadTeamMembers();
        loadClinics();
    }, []);

    const loadTeamMembers = async () => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data - replace with actual API call
            setTeamMembers([
                {
                    id: '1',
                    name: 'דנה כהן',
                    email: 'dana@clinic.co.il',
                    phone: '050-1234567',
                    role: 'admin',
                    clinicId: '1',
                    clinicName: t('clinic_herzliya') || 'מרפאת שיניים הרצליה',
                    status: 'active',
                    lastActive: new Date().toISOString(),
                    permissions: ['all'],
                    performance: {
                        leadsAssigned: 145,
                        conversions: 89,
                        responseTime: t('minutes_ago').replace('%s', '15'),
                        rating: 4.8,
                        revenue: 178500
                    },
                    createdAt: '2024-01-15'
                },
                {
                    id: '2',
                    name: 'יוסי לוי',
                    email: 'yossi@clinic.co.il',
                    phone: '052-7654321',
                    role: 'manager',
                    clinicId: '2',
                    clinicName: t('clinic_tel_aviv') || 'מרפאת שיניים תל אביב',
                    status: 'active',
                    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    permissions: ['leads', 'analytics', 'team'],
                    performance: {
                        leadsAssigned: 98,
                        conversions: 62,
                        responseTime: t('minutes_ago').replace('%s', '25'),
                        rating: 4.5,
                        revenue: 124000
                    },
                    createdAt: '2024-02-20'
                },
                {
                    id: '3',
                    name: 'מיכל גולן',
                    email: 'michal@clinic.co.il',
                    phone: '054-9876543',
                    role: 'staff',
                    clinicId: '1',
                    clinicName: t('clinic_herzliya') || 'מרפאת שיניים הרצליה',
                    status: 'active',
                    lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                    permissions: ['leads'],
                    performance: {
                        leadsAssigned: 76,
                        conversions: 41,
                        responseTime: t('minutes_ago').replace('%s', '32'),
                        rating: 4.2,
                        revenue: 61500
                    },
                    createdAt: '2024-03-10'
                },
                {
                    id: '4',
                    name: 'אבי אברהם',
                    email: 'avi@clinic.co.il',
                    phone: '053-4567890',
                    role: 'staff',
                    clinicId: '2',
                    clinicName: t('clinic_tel_aviv') || 'מרפאת שיניים תל אביב',
                    status: 'inactive',
                    lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    permissions: ['leads'],
                    performance: {
                        leadsAssigned: 34,
                        conversions: 18,
                        responseTime: t('minutes_ago').replace('%s', '45'),
                        rating: 3.9,
                        revenue: 27000
                    },
                    createdAt: '2024-04-05'
                }
            ]);
        } catch (error) {
            console.error('Error loading team members:', error);
            toast({
                title: t("error"),
                description: t("error_loading_data"),
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const loadClinics = async () => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));

            setClinics([
                { id: '1', name: t('clinic_herzliya') || 'מרפאת שיניים הרצליה', email: 'herzliya@clinic.co.il', phone: '09-1234567', address: t('herzliya_address') || 'הרצל 12, הרצליה', members: 8, leads: 245, conversion: '67%' },
                { id: '2', name: t('clinic_tel_aviv') || 'מרפאת שיניים תל אביב', email: 'tlv@clinic.co.il', phone: '03-1234567', address: t('tel_aviv_address') || 'דיזנגוף 100, תל אביב', members: 12, leads: 389, conversion: '72%' },
                { id: '3', name: t('clinic_haifa') || 'מרפאת שיניים חיפה', email: 'haifa@clinic.co.il', phone: '04-1234567', address: t('haifa_address') || 'הנמל 30, חיפה', members: 6, leads: 156, conversion: '58%' },
            ]);
        } catch (error) {
            console.error('Error loading clinics:', error);
        }
    };

    const handleAddMember = async (memberData: Partial<TeamMember>) => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newMember: TeamMember = {
                id: Date.now().toString(),
                name: memberData.name || '',
                email: memberData.email || '',
                phone: memberData.phone || '',
                role: memberData.role || 'staff',
                clinicId: memberData.clinicId || '1',
                clinicName: clinics.find(c => c.id === memberData.clinicId)?.name,
                status: 'pending',
                lastActive: new Date().toISOString(),
                permissions: memberData.permissions || ['leads'],
                performance: {
                    leadsAssigned: 0,
                    conversions: 0,
                    responseTime: '-',
                    rating: 0,
                    revenue: 0
                },
                createdAt: new Date().toISOString().split('T')[0]
            };

            setTeamMembers(prev => [newMember, ...prev]);
            setShowAddDialog(false);

            toast({
                title: t("member_added") || "חבר צוות נוסף",
                description: t("invitation_sent").replace('%s', memberData.email || ''),
            });
        } catch (error) {
            toast({
                title: t("error"),
                description: t("add_member_failed") || "הוספת חבר צוות נכשלה",
                variant: "destructive"
            });
        }
    };

    const handleUpdateMember = async (id: string, data: Partial<TeamMember>) => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setTeamMembers(prev => prev.map(m =>
                m.id === id ? { ...m, ...data } : m
            ));

            setShowEditDialog(false);
            setSelectedMember(null);

            toast({
                title: t("details_updated") || "פרטים עודכנו",
                description: t("member_updated") || "פרטי חבר הצוות עודכנו בהצלחה",
            });
        } catch (error) {
            toast({
                title: t("error"),
                description: t("update_failed") || "עדכון פרטים נכשל",
                variant: "destructive"
            });
        }
    };

    const handleDeleteMember = async () => {
        if (!memberToDelete) return;

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setTeamMembers(prev => prev.filter(m => m.id !== memberToDelete));
            setShowDeleteDialog(false);
            setMemberToDelete(null);

            toast({
                title: t("member_removed") || "חבר צוות הוסר",
                description: t("member_removed_success") || "חבר הצוות הוסר בהצלחה",
            });
        } catch (error) {
            toast({
                title: t("error"),
                description: t("remove_failed") || "הסרת חבר צוות נכשלה",
                variant: "destructive"
            });
        }
    };

    const filteredMembers = teamMembers.filter(member => {
        const matchesSearch = member.name.includes(search) || member.email.includes(search);
        const matchesRole = roleFilter === 'all' || member.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
    });

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">{t("admin_role")}</Badge>;
            case 'manager':
                return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">{t("manager_role") || "מנהל מרפאה"}</Badge>;
            default:
                return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">{t("staff_role") || "צוות"}</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-success/10 text-success border-success/20">{t("active")}</Badge>;
            case 'inactive':
                return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{t("inactive") || "לא פעיל"}</Badge>;
            default:
                return <Badge className="bg-warning/10 text-warning border-warning/20">{t("pending") || "ממתין לאישור"}</Badge>;
        }
    };

    const stats = {
        total: teamMembers.length,
        active: teamMembers.filter(m => m.status === 'active').length,
        pending: teamMembers.filter(m => m.status === 'pending').length,
        totalRevenue: teamMembers.reduce((sum, m) => sum + m.performance.revenue, 0)
    };

    if (isLoading && !teamMembers.length) {
        return (
            <div className="space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-10 w-full max-w-md" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6" dir={language === 'he' ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-foreground">{t("team_management")}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {t("team_management_description")}
                    </p>
                </div>
                <Button className="rounded-xl" onClick={() => setShowAddDialog(true)}>
                    <UserPlus className="h-4 w-4 ml-2" />
                    {t("add_team_member")}
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("total_team_members")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-success">
                            <TrendingUp className="h-3 w-3" />
                            <span>+2 {t("this_month")}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("active_now")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{stats.active}</div>
                        <div className="flex items-center gap-1 mt-1 text-xs">
                            <Activity className="h-3 w-3 text-success" />
                            <span>{Math.round((stats.active / stats.total) * 100)}% {t("of_team")}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("pending_approval")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-warning">{stats.pending}</div>
                        <div className="flex items-center gap-1 mt-1 text-xs">
                            <Clock className="h-3 w-3 text-warning" />
                            <span>{t("needs_approval")}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("team_revenue")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-success">₪{stats.totalRevenue.toLocaleString()}</div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-success">
                            <Award className="h-3 w-3" />
                            <span>+23% {t("growth")}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="team" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 rounded-xl">
                    <TabsTrigger value="team">{t("team_members")}</TabsTrigger>
                    <TabsTrigger value="clinics">{t("clinics")}</TabsTrigger>
                    <TabsTrigger value="performance">{t("performance")}</TabsTrigger>
                </TabsList>

                {/* Team Tab */}
                <TabsContent value="team" className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={t("search_by_name_email")}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pr-10 rounded-xl"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-[140px] rounded-xl">
                                <SelectValue placeholder={t("role")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("all_roles")}</SelectItem>
                                <SelectItem value="admin">{t("admin_role")}</SelectItem>
                                <SelectItem value="manager">{t("manager_role")}</SelectItem>
                                <SelectItem value="staff">{t("staff_role")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px] rounded-xl">
                                <SelectValue placeholder={t("status")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("all_statuses")}</SelectItem>
                                <SelectItem value="active">{t("active")}</SelectItem>
                                <SelectItem value="inactive">{t("inactive")}</SelectItem>
                                <SelectItem value="pending">{t("pending")}</SelectItem>
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
                                                        <span>{t("joined")}: {member.createdAt}</span>
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
                                                <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedMember(member);
                                                        setShowEditDialog(true);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4 ml-2" />
                                                    {t("edit_details")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Key className="h-4 w-4 ml-2" />
                                                    {t("reset_password")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Shield className="h-4 w-4 ml-2" />
                                                    {t("manage_permissions")}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="cursor-pointer text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMemberToDelete(member.id);
                                                        setShowDeleteDialog(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 ml-2" />
                                                    {t("remove_user")}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Performance Preview */}
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t("leads")}</p>
                                                <p className="font-bold text-foreground">{member.performance.leadsAssigned}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t("conversions")}</p>
                                                <p className="font-bold text-foreground">{member.performance.conversions}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t("response_time")}</p>
                                                <p className="font-bold text-foreground text-sm">{member.performance.responseTime}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">{t("rating")}</p>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Star className="h-3 w-3 fill-warning text-warning" />
                                                    <span className="font-bold">{member.performance.rating}</span>
                                                </div>
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
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground">{clinic.name}</h3>
                                            <div className="flex flex-wrap gap-4 mt-2">
                                                <span className="text-sm text-muted-foreground">
                                                    <Mail className="h-4 w-4 inline ml-1" />
                                                    {clinic.email}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    <Phone className="h-4 w-4 inline ml-1" />
                                                    {clinic.phone}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    <Users className="h-4 w-4 inline ml-1" />
                                                    {clinic.members} {t("team_members")}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    <Activity className="h-4 w-4 inline ml-1" />
                                                    {clinic.leads} {t("active_leads")}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-2">{clinic.address}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={language === 'he' ? 'text-left' : 'text-right'}>
                                                <p className="text-sm text-muted-foreground">{t("conversion_rate")}</p>
                                                <p className="text-2xl font-bold text-success">{clinic.conversion}</p>
                                            </div>
                                            <Button variant="outline" className="rounded-xl">
                                                {t("manage_clinic")}
                                            </Button>
                                        </div>
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
                            <CardTitle className="text-lg">{t("team_performance_leaderboard")}</CardTitle>
                            <CardDescription>
                                {t("performance_description")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-right py-3">{t("name")}</th>
                                            <th className="text-right py-3">{t("clinic")}</th>
                                            <th className="text-right py-3">{t("leads_handled")}</th>
                                            <th className="text-right py-3">{t("conversions")}</th>
                                            <th className="text-right py-3">{t("success_rate")}</th>
                                            <th className="text-right py-3">{t("revenue")}</th>
                                            <th className="text-right py-3">{t("response_time")}</th>
                                            <th className="text-right py-3">{t("rating")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamMembers
                                            .sort((a, b) => b.performance.rating - a.performance.rating)
                                            .map((member, index) => (
                                                <tr key={member.id} className="border-b border-border last:border-0">
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-2">
                                                            {index === 0 && <Award className="h-4 w-4 text-warning" />}
                                                            <span className="font-medium">{member.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-muted-foreground">{member.clinicName}</td>
                                                    <td className="py-3">{member.performance.leadsAssigned}</td>
                                                    <td className="py-3">{member.performance.conversions}</td>
                                                    <td className="py-3">
                                                        <span className="text-success">
                                                            {Math.round((member.performance.conversions / member.performance.leadsAssigned) * 100)}%
                                                        </span>
                                                    </td>
                                                    <td className="py-3 font-bold">₪{member.performance.revenue.toLocaleString()}</td>
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

            {/* Add Member Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("add_team_member")}</DialogTitle>
                        <DialogDescription>
                            {t("add_member_description")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("full_name")}</Label>
                            <Input placeholder={t("israeli_name")} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("email")}</Label>
                            <Input type="email" placeholder="user@clinic.co.il" className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("phone")}</Label>
                            <Input placeholder="050-1234567" className="rounded-xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("role")}</Label>
                                <Select defaultValue="staff">
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">{t("admin_role")}</SelectItem>
                                        <SelectItem value="manager">{t("manager_role")}</SelectItem>
                                        <SelectItem value="staff">{t("staff_role")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("clinic")}</Label>
                                <Select defaultValue="1">
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
                            <Label>{t("permissions")}</Label>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Switch id="perm_leads" defaultChecked />
                                    <Label htmlFor="perm_leads">{t("manage_leads")}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch id="perm_analytics" />
                                    <Label htmlFor="perm_analytics">{t("view_analytics")}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch id="perm_team" />
                                    <Label htmlFor="perm_team">{t("manage_team")}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch id="perm_settings" />
                                    <Label htmlFor="perm_settings">{t("system_settings")}</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className={language === 'he' ? 'flex-row-reverse' : ''}>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
                            {t("cancel")}
                        </Button>
                        <Button onClick={() => handleAddMember({})} className="rounded-xl">
                            {t("send_invitation")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Member Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("edit_user_details")}</DialogTitle>
                        <DialogDescription>
                            {t("edit_member_description")}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedMember && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>{t("full_name")}</Label>
                                <Input defaultValue={selectedMember.name} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("email")}</Label>
                                <Input type="email" defaultValue={selectedMember.email} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("phone")}</Label>
                                <Input defaultValue={selectedMember.phone} className="rounded-xl" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("role")}</Label>
                                    <Select defaultValue={selectedMember.role}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">{t("admin_role")}</SelectItem>
                                            <SelectItem value="manager">{t("manager_role")}</SelectItem>
                                            <SelectItem value="staff">{t("staff_role")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("status")}</Label>
                                    <Select defaultValue={selectedMember.status}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t("active")}</SelectItem>
                                            <SelectItem value="inactive">{t("inactive")}</SelectItem>
                                            <SelectItem value="pending">{t("pending")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className={language === 'he' ? 'flex-row-reverse' : ''}>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
                            {t("cancel")}
                        </Button>
                        <Button onClick={() => selectedMember && handleUpdateMember(selectedMember.id, {})} className="rounded-xl">
                            {t("save_changes")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("remove_team_member")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("delete_member_confirmation")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={language === 'he' ? 'flex-row-reverse' : ''}>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive">
                            {t("remove")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}