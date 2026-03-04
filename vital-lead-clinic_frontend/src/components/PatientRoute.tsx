import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface PatientRouteProps {
    children: React.ReactNode;
}

export default function PatientRoute({ children }: PatientRouteProps) {
    const { user, isLoading } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();

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

    if (!user || user.entryType !== 'patient') {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
