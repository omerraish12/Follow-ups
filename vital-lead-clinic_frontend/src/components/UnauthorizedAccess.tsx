import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

export default function UnauthorizedAccess() {
    const { t } = useLanguage();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center">
                <p className="text-3xl font-semibold text-foreground">{t('unauthorized_title')}</p>
                <p className="text-sm text-muted-foreground">{t('unauthorized_description')}</p>
                <Button onClick={() => navigate('/dashboard')}>
                    {t('go_to_dashboard')}
                </Button>
            </div>
        </div>
    );
}
