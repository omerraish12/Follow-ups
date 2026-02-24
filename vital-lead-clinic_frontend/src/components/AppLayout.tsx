// src/components/AppLayout.tsx (updated with auth)
import { useState } from "react";
import { NavLink, useLocation, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Zap,
  Settings,
  Menu,
  X,
  Phone,
  Home,
  Bell,
  BarChart3,
  Globe,
  UserCog,
  AlertCircle,
  LogOut,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItemsConfig = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { to: "/leads", icon: Users, labelKey: "leads" },
  { to: "/automations", icon: Zap, labelKey: "automations" },
  { to: "/analytics", icon: BarChart3, labelKey: "analytics" },
  { to: "/whatsapp", icon: Globe, labelKey: "whatsapp" },
  { to: "/team", icon: UserCog, labelKey: "team" },
  { to: "/notifications", icon: AlertCircle, labelKey: "notifications" },
  { to: "/settings", icon: Settings, labelKey: "settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();

  // Mock data for badges
  const notificationCount = 3;
  const leadsNeedingFollowup = 5;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 bg-card border-l border-border transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary/70 shadow-lg">
              <Phone className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-foreground truncate">{t("app_title")}</h1>
              <p className="text-[11px] text-muted-foreground">{t("app_subtitle")}</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info - Mobile */}
          <div className="p-3 border-b border-border lg:hidden">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{user?.name || t("user")}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-muted transition-all mb-2"
              onClick={() => setSidebarOpen(false)}
            >
              <Home className="h-4 w-4" />
              {t("dashboard")}
            </Link>
            <div className="h-px bg-border my-2" />

            {navItemsConfig.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-primary")} />
                  <span className="flex-1">{t(item.labelKey)}</span>

                  {/* Badges for specific items */}
                  {item.to === "/leads" && leadsNeedingFollowup > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/10 px-1.5 text-[10px] font-bold text-warning">
                      {leadsNeedingFollowup}
                    </span>
                  )}

                  {item.to === "/notifications" && notificationCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/10 px-1.5 text-[10px] font-bold text-destructive">
                      {notificationCount}
                    </span>
                  )}

                  {item.to === "/whatsapp" && (
                    <span className="h-2 w-2 rounded-full bg-warning animate-pulse-soft" />
                  )}

                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* WhatsApp status */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted/80 p-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-whatsapp/10">
                <MessageSquare className="h-4 w-4 text-whatsapp" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">וואטסאפ</p>
                <p className="text-[11px] text-muted-foreground">ממתין לחיבור</p>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-warning animate-pulse-soft" />
            </div>

            {/* Quick stats */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted/30 p-2 text-center">
                <p className="text-xs font-bold text-foreground">78%</p>
                <p className="text-[9px] text-muted-foreground">החזרת לקוחות</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-2 text-center">
                <p className="text-xs font-bold text-foreground">₪45K</p>
                <p className="text-[9px] text-muted-foreground">הכנסות</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 border-b border-border bg-card/80 backdrop-blur-md px-4 py-3 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground lg:hidden">{t("app_title")}</h2>
            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("app_title")}</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-semibold text-foreground">
                {navItemsConfig.find(item => item.to === location.pathname)
                  ? t(navItemsConfig.find(item => item.to === location.pathname)?.labelKey || "dashboard")
                  : t("dashboard")}
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="hidden md:block relative">
            <input
              type="text"
              placeholder={t("quick_search")}
              className="w-64 h-9 rounded-xl border border-border bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications button */}
          <Link
            to="/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center border-2 border-card">
                {notificationCount}
              </span>
            )}
          </Link>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {user?.name || t("user")}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {user?.clinicName || t("clinic_name")}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-xl">
              <DropdownMenuLabel>{t("my_account")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/profile')}>
                <User className="h-4 w-4 ml-2" />
                {t("profile")}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 ml-2" />
                {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 ml-2" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}