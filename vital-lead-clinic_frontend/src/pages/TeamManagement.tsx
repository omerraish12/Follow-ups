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
import { teamService } from "@/services/teamService";
import type { TeamMemberApi, TeamRole, TeamStatus } from "@/types/team";
import { formatDistanceToNow } from "date-fns";
import { he, enUS } from "date-fns/locale";
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
    role: TeamRole;
    clinicId: string;
    clinicName?: string;
    avatar?: string;
    status: TeamStatus;
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

interface PermissionFlags {
    leads: boolean;
    analytics: boolean;
    team: boolean;
    settings: boolean;
}

const initialPermissionFlags: PermissionFlags = {
    leads: false,
    analytics: false,
    team: false,
    settings: false,
};

const permissionListToFlags = (permissions: string[]): PermissionFlags => ({
    leads: permissions.includes("all") || permissions.includes("leads"),
    analytics: permissions.includes("all") || permissions.includes("analytics"),
    team: permissions.includes("all") || permissions.includes("team"),
    settings: permissions.includes("all") || permissions.includes("settings"),
});

const permissionFlagsToList = (flags: PermissionFlags): string[] => {
    const entries: string[] = [];
    if (flags.leads) entries.push("leads");
    if (flags.analytics) entries.push("analytics");
    if (flags.team) entries.push("team");
    if (flags.settings) entries.push("settings");
    if (entries.length === 4) {
        return ["all"];
    }
    return entries;
};

const permissionOptions: Array<{ key: keyof PermissionFlags; label: string; description: string }> = [
    { key: "leads", label: "permission_leads_label", description: "permission_leads_description" },
    { key: "analytics", label: "permission_analytics_label", description: "permission_analytics_description" },
    { key: "team", label: "permission_team_label", description: "permission_team_description" },
    { key: "settings", label: "permission_settings_label", description: "permission_settings_description" },
];

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
    const [isSaving, setIsSaving] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [permissionMember, setPermissionMember] = useState<TeamMember | null>(null);
    const [permissionFlags, setPermissionFlags] = useState<PermissionFlags>(initialPermissionFlags);
    const [showClinicDialog, setShowClinicDialog] = useState(false);
    const [activeClinic, setActiveClinic] = useState<Clinic | null>(null);

    const [newMember, setNewMember] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'staff' as TeamRole,
        clinicId: '',
        permissions: {
            leads: true,
            analytics: false,
            team: false,
            settings: false
        }
    });

    const [editMember, setEditMember] = useState({
        id: '',
        name: '',
        email: '',
        phone: '',
        role: 'staff' as TeamRole,
        status: 'active' as TeamStatus
    });

    const normalizeRole = (role?: string | null): TeamRole => {
        const upper = (role || '').toUpperCase();
        if (upper === 'ADMIN') return 'admin';
        if (upper === 'MANAGER') return 'manager';
        return 'staff';
    };

    const normalizeStatus = (status?: string | null): TeamStatus => {
        const lower = (status || '').toLowerCase();
        if (lower === 'inactive') return 'inactive';
        if (lower === 'pending') return 'pending';
        return 'active';
    };

    const roleToPermissions = (role: TeamRole): string[] => {
        if (role === 'admin') return ['all'];
        if (role === 'manager') return ['leads', 'analytics', 'team'];
        return ['leads'];
    };

    const toNumber = (value: unknown) => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value) || 0;
        return 0;
    };

    const formatRelativeTime = (value?: string | null) => {
        if (!value) return '-';
        try {
            return formatDistanceToNow(new Date(value), {
                addSuffix: true,
                locale: language === 'he' ? he : enUS
            });
        } catch {
            return '-';
        }
    };

    const mapMember = (member: TeamMemberApi): TeamMember => {
        const leadsAssigned = toNumber(member.leads_assigned);
        const conversions = toNumber(member.conversions);
        const revenue = toNumber(member.revenue);
        const successRate = leadsAssigned > 0 ? conversions / leadsAssigned : 0;

        return {
            id: String(member.id),
            name: member.name,
            email: member.email,
            phone: member.phone || '',
            role: normalizeRole(member.role),
            clinicId: String(member.clinic_id || user?.clinicId || ''),
            clinicName: member.clinic_name || user?.clinicName,
            status: normalizeStatus(member.status),
            lastActive: member.last_active || member.created_at || new Date().toISOString(),
            permissions: roleToPermissions(normalizeRole(member.role)),
            performance: {
                leadsAssigned,
                conversions,
                responseTime: formatRelativeTime(member.last_active || member.created_at || undefined),
                rating: leadsAssigned > 0 ? Math.min(5, Math.round(successRate * 5 * 10) / 10) : 0,
                revenue
            },
            createdAt: member.created_at ? new Date(member.created_at).toISOString().split('T')[0] : ''
        };
    };

    // Load data
    useEffect(() => {
        loadTeamMembers();
        loadClinics();
    }, []);

    useEffect(() => {
        if (!newMember.clinicId) {
            const defaultClinicId = user?.clinicId?.toString() || clinics[0]?.id?.toString();
            if (defaultClinicId) {
                setNewMember((prev) => ({ ...prev, clinicId: defaultClinicId }));
            }
        }
    }, [clinics, newMember.clinicId, user]);

    const loadTeamMembers = async () => {
        setIsLoading(true);
        try {
            const data = await teamService.getMembers();
            setTeamMembers(data.map(mapMember));
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
            const data = await teamService.getClinics();
            setClinics(
                data.map((clinic) => ({
                    id: String(clinic.id),
                    name: clinic.name,
                    email: clinic.email,
                    phone: clinic.phone,
                    address: clinic.address,
                    members: Number(clinic.members) || 0,
                    leads: Number(clinic.leads) || 0,
                    conversion: clinic.conversion
                }))
            );
        } catch (error) {
            console.error('Error loading clinics:', error);
        }
    };

    const handleAddMember = async () => {
        if (!newMember.name || !newMember.email) {
            toast({
                title: t("error"),
                description: t("add_member_failed"),
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            await teamService.createMember({
                name: newMember.name,
                email: newMember.email,
                phone: newMember.phone,
                role: newMember.role
            });

            await loadTeamMembers();
            setShowAddDialog(false);
            setNewMember((prev) => ({
                ...prev,
                name: '',
                email: '',
                phone: '',
                role: 'staff'
            }));

            toast({
                title: t("member_added"),
                description: t("invitation_sent").replace('%s', newMember.email),
            });
        } catch (error) {
            toast({
                title: t("error"),
                description: t("add_member_failed"),
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateMember = async () => {
        if (!editMember.id) return;

        setIsSaving(true);
        try {
            await teamService.updateMember(editMember.id, {
                name: editMember.name,
                email: editMember.email,
                phone: editMember.phone,
                role: editMember.role,
                status: editMember.status
            });

            await loadTeamMembers();
            setShowEditDialog(false);
            setSelectedMember(null);

            toast({
                title: t("details_updated"),
                description: t("member_updated"),
            });
        } catch (error) {
            toast({
                title: t("error"),
                description: t("update_failed"),
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMember = async () => {
        if (!memberToDelete) return;

        try {
            setIsSaving(true);
            await teamService.deleteMember(memberToDelete);
            await loadTeamMembers();
            setShowDeleteDialog(false);
            setMemberToDelete(null);

            toast({
                title: t("member_removed"),
                description: t("member_removed_success"),
            });
        } catch (error) {
            toast({
                title: t("error"),
                description: t("remove_failed"),
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetPassword = async (member: TeamMember) => {
        try {
            await teamService.resetPassword(member.id);
            toast({
                title: t("settings_saved"),
                description: t("invitation_sent").replace('%s', member.email),
            });
        } catch (error) {
            toast({
                title: t("error"),
                description: t("update_failed"),
                variant: "destructive"
            });
        }
    };

    const openPermissionDialog = (member: TeamMember) => {
        setPermissionMember(member);
        setPermissionFlags(permissionListToFlags(member.permissions));
        setShowPermissionDialog(true);
    };

    const closePermissionDialog = () => {
        setShowPermissionDialog(false);
        setPermissionMember(null);
        setPermissionFlags(initialPermissionFlags);
    };

    const handleSavePermissions = () => {
        if (!permissionMember) return;
        const permissions = permissionFlagsToList(permissionFlags);
        setTeamMembers((prev) =>
            prev.map((m) =>
                m.id === permissionMember.id ? { ...m, permissions } : m
            )
        );
        toast({
            title: t("permissions_updated"),
            description: t("permissions_updated_description"),
        });
        closePermissionDialog();
    };

    const openClinicDialog = (clinic: Clinic) => {
        setActiveClinic(clinic);
        setShowClinicDialog(true);
    };

    const closeClinicDialog = () => {
        setShowClinicDialog(false);
        setActiveClinic(null);
    };

    const fallbackCopy = (value: string) => {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
    };

    const handleCopyValue = async (value: string, label: string) => {
        if (!value) return;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else if (typeof document !== "undefined") {
                fallbackCopy(value);
            } else {
                throw new Error("Clipboard not supported");
            }
            toast({
                title: t("copied"),
                description: t("copied_to_clipboard").replace('%s', label),
            });
        } catch (error) {
            toast({
                title: t("error"),
                description: t("clipboard_copy_failed"),
                variant: "destructive",
            });
        }
    };

    const openEditDialog = (member: TeamMember) => {
        setSelectedMember(member);
        setEditMember({
            id: member.id,
            name: member.name,
            email: member.email,
            phone: member.phone,
            role: member.role,
            status: member.status
        });
        setShowEditDialog(true);
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
                return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">{t("manager_role")}</Badge>;
            default:
                return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">{t("staff_role")}</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-success/10 text-success border-success/20">{t("active")}</Badge>;
            case 'inactive':
                return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{t("inactive")}</Badge>;
            default:
                return <Badge className="bg-warning/10 text-warning border-warning/20">{t("pending")}</Badge>;
        }
    };

    const stats = {
        total: teamMembers.length,
        active: teamMembers.filter(m => m.status === 'active').length,
        pending: teamMembers.filter(m => m.status === 'pending').length,
        totalRevenue: teamMembers.reduce((sum, m) => sum + m.performance.revenue, 0)
    };
    const activePercent = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

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
                    <h1 className="text-2xl font-semibold text-foreground font-display">Team & Roles</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Manage access, performance, and accountability across your clinic.
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
                            <span>{activePercent}% {t("of_team")}</span>
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
                                                        openEditDialog(member);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4 ml-2" />
                                                    {t("edit_details")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleResetPassword(member);
                                                    }}
                                                >
                                                    <Key className="h-4 w-4 ml-2" />
                                                    {t("reset_password")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openPermissionDialog(member);
                                                    }}
                                                >
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
                                            <Button
                                                variant="outline"
                                                className="rounded-xl"
                                                onClick={() => openClinicDialog(clinic)}
                                            >
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
                                                            {member.performance.leadsAssigned > 0
                                                                ? Math.round((member.performance.conversions / member.performance.leadsAssigned) * 100)
                                                                : 0}%
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
                            <Input
                                placeholder={t("israeli_name")}
                                className="rounded-xl"
                                value={newMember.name}
                                onChange={(e) => setNewMember((prev) => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("email")}</Label>
                            <Input
                                type="email"
                                placeholder="user@clinic.co.il"
                                className="rounded-xl"
                                value={newMember.email}
                                onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("phone")}</Label>
                            <Input
                                placeholder="050-1234567"
                                className="rounded-xl"
                                value={newMember.phone}
                                onChange={(e) => setNewMember((prev) => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("role")}</Label>
                                <Select
                                    value={newMember.role}
                                    onValueChange={(value) =>
                                        setNewMember((prev) => ({ ...prev, role: value as TeamRole }))
                                    }
                                >
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
                                <Select
                                    value={newMember.clinicId}
                                    onValueChange={(value) =>
                                        setNewMember((prev) => ({ ...prev, clinicId: value }))
                                    }
                                >
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
                                    <Switch
                                        id="perm_leads"
                                        checked={newMember.permissions.leads}
                                        onCheckedChange={(checked) =>
                                            setNewMember((prev) => ({
                                                ...prev,
                                                permissions: { ...prev.permissions, leads: checked }
                                            }))
                                        }
                                    />
                                    <Label htmlFor="perm_leads">{t("manage_leads")}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="perm_analytics"
                                        checked={newMember.permissions.analytics}
                                        onCheckedChange={(checked) =>
                                            setNewMember((prev) => ({
                                                ...prev,
                                                permissions: { ...prev.permissions, analytics: checked }
                                            }))
                                        }
                                    />
                                    <Label htmlFor="perm_analytics">{t("view_analytics")}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="perm_team"
                                        checked={newMember.permissions.team}
                                        onCheckedChange={(checked) =>
                                            setNewMember((prev) => ({
                                                ...prev,
                                                permissions: { ...prev.permissions, team: checked }
                                            }))
                                        }
                                    />
                                    <Label htmlFor="perm_team">{t("manage_team")}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="perm_settings"
                                        checked={newMember.permissions.settings}
                                        onCheckedChange={(checked) =>
                                            setNewMember((prev) => ({
                                                ...prev,
                                                permissions: { ...prev.permissions, settings: checked }
                                            }))
                                        }
                                    />
                                    <Label htmlFor="perm_settings">{t("system_settings")}</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className={language === 'he' ? 'flex-row-reverse' : ''}>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleAddMember} className="rounded-xl" disabled={isSaving}>
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
                                <Input
                                    value={editMember.name}
                                    className="rounded-xl"
                                    onChange={(e) => setEditMember((prev) => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("email")}</Label>
                                <Input
                                    type="email"
                                    value={editMember.email}
                                    className="rounded-xl"
                                    onChange={(e) => setEditMember((prev) => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("phone")}</Label>
                                <Input
                                    value={editMember.phone}
                                    className="rounded-xl"
                                    onChange={(e) => setEditMember((prev) => ({ ...prev, phone: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t("role")}</Label>
                                    <Select
                                        value={editMember.role}
                                        onValueChange={(value) =>
                                            setEditMember((prev) => ({ ...prev, role: value as TeamRole }))
                                        }
                                    >
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
                                    <Select
                                        value={editMember.status}
                                        onValueChange={(value) =>
                                            setEditMember((prev) => ({ ...prev, status: value as TeamStatus }))
                                        }
                                    >
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
                        <Button onClick={handleUpdateMember} className="rounded-xl" disabled={isSaving}>
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

            {/* Permissions Dialog */}
            <Dialog open={showPermissionDialog} onOpenChange={(open) => !open && closePermissionDialog()}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("permissions_dialog_title")}</DialogTitle>
                        <DialogDescription>
                            {t("permissions_dialog_description")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {permissionOptions.map(({ key, label, description }) => (
                            <div key={key} className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{t(label)}</p>
                                    <p className="text-xs text-muted-foreground">{t(description)}</p>
                                </div>
                                <Switch
                                    checked={permissionFlags[key]}
                                    onCheckedChange={(checked) =>
                                        setPermissionFlags((prev) => ({ ...prev, [key]: checked }))
                                    }
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter className={language === 'he' ? 'flex-row-reverse' : ''}>
                        <Button variant="outline" onClick={closePermissionDialog} className="rounded-xl">
                            {t("cancel")}
                        </Button>
                        <Button onClick={handleSavePermissions} className="rounded-xl">
                            {t("save_changes")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clinic Dialog */}
            <Dialog open={showClinicDialog} onOpenChange={(open) => !open && closeClinicDialog()}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("clinic_overview_title")}</DialogTitle>
                        <DialogDescription>
                            {t("clinic_overview_description").replace('%s', activeClinic?.name || "")}
                        </DialogDescription>
                    </DialogHeader>
                    {activeClinic && (
                        <div className="space-y-4 py-4">
                            <div>
                                <h3 className="text-xl font-semibold text-foreground">{activeClinic.name}</h3>
                                <p className="text-sm text-muted-foreground">{activeClinic.address}</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                                <Button
                                    variant="outline"
                                    className="w-full rounded-xl"
                                    onClick={() => handleCopyValue(activeClinic.phone, t("phone"))}
                                >
                                    {t("clinic_copy_phone")}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full rounded-xl"
                                    onClick={() => handleCopyValue(activeClinic.email, t("email"))}
                                >
                                    {t("clinic_copy_email")}
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                                <Button
                                    asChild
                                    variant="secondary"
                                    className="w-full rounded-xl"
                                >
                                    <a href={`tel:${activeClinic.phone.replace(/[^\d+]/g, "")}`}>
                                        {t("clinic_call_phone")}
                                    </a>
                                </Button>
                                <Button
                                    asChild
                                    variant="secondary"
                                    className="w-full rounded-xl"
                                >
                                    <a href={`mailto:${activeClinic.email}`}>{t("clinic_view_email")}</a>
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em]">{t("team_members")}</p>
                                    <p className="text-lg font-semibold text-foreground">{activeClinic.members}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em]">{t("active_leads")}</p>
                                    <p className="text-lg font-semibold text-foreground">{activeClinic.leads}</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-xs uppercase tracking-[0.3em]">{t("conversion_rate")}</p>
                                    <p className="text-lg font-semibold text-success">{activeClinic.conversion}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className={language === 'he' ? 'flex-row-reverse' : ''}>
                        <Button variant="outline" onClick={closeClinicDialog} className="rounded-xl">
                            {t("close")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
