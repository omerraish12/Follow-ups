import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePermissions } from '@/hooks/usePermissions';
import UnauthorizedAccess from './UnauthorizedAccess';

type ProtectedRouteProps = {
    children: React.ReactNode;
    permission?: string;
};

export default function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const { hasPermission } = usePermissions();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">{t("loading")}</p>
                </div>
            </div>
        );
    }

    if (!user) {
        // Save the attempted location for redirect after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (permission && !hasPermission(permission)) {
        return <UnauthorizedAccess />;
    }

    return <>{children}</>;
}
