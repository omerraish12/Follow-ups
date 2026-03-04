import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, Phone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { EntryType } from '@/types/auth';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, user, isLoading, error, clearError } = useAuth();
    const { t, language } = useLanguage();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [entryType, setEntryType] = useState<EntryType>('clinic');
    const [entryCode, setEntryCode] = useState('');
    const isRtl = language === 'he';
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    const [redirectAfterLogin, setRedirectAfterLogin] = useState(from);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate(redirectAfterLogin, { replace: true });
        }
    }, [user, navigate, redirectAfterLogin]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) clearError();
    };

    const handleEntryTypeChange = (type: EntryType) => {
        setEntryType(type);
        if (type === 'clinic') {
            setEntryCode('');
        }
        setRedirectAfterLogin(from);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            entryType,
            entryCode: entryType === 'patient' ? entryCode.trim() : undefined,
        };

        try {
            const result = await login(payload);
            const target =
                result?.redirectPath ||
                (entryType === 'patient' ? '/patient/dashboard' : from);
            setRedirectAfterLogin(target);
        } catch {
            // login error already handled in context
        }
    };

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
            <Card className="w-full max-w-md rounded-2xl border-border shadow-card">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center shadow-lg">
                            <Phone className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">{t('login_to_system')}</CardTitle>
                    <CardDescription>
                        {t('app_subtitle')}
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="rounded-xl">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label>{t('entry_mode_label')}</Label>
                            <div className="flex gap-2 rounded-2xl border border-border p-1 bg-card">
                                <button
                                    type="button"
                                    onClick={() => handleEntryTypeChange('clinic')}
                                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                        entryType === 'clinic'
                                            ? 'bg-primary text-primary-foreground shadow'
                                            : 'bg-card text-muted-foreground hover:bg-muted/50'
                                    }`}
                                >
                                    {t('entry_mode_clinic')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleEntryTypeChange('patient')}
                                    className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                        entryType === 'patient'
                                            ? 'bg-primary text-primary-foreground shadow'
                                            : 'bg-card text-muted-foreground hover:bg-muted/50'
                                    }`}
                                >
                                    {t('entry_mode_patient')}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {entryType === 'clinic'
                                    ? t('entry_mode_description_clinic')
                                    : t('entry_mode_description_patient')}
                            </p>
                        </div>

                        {entryType === 'patient' && (
                            <div className="space-y-2">
                                <Label htmlFor="entry-code">{t('patient_entry_code_label')}</Label>
                                <Input
                                    id="entry-code"
                                    type="text"
                                    placeholder={t('patient_entry_code_placeholder')}
                                    value={entryCode}
                                    onChange={(e) => setEntryCode(e.target.value)}
                                    className="rounded-xl"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('patient_entry_code_help')}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className={isRtl ? 'text-right' : ''}>{t('email')}</Label>
                            <div className="relative">
                                <Mail className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`${isRtl ? 'pl-10' : 'pr-10'} rounded-xl`}
                                    required
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className={isRtl ? 'text-right' : ''}>{t('password')}</Label>
                            <div className="relative">
                                <Lock className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="********"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={`${isRtl ? 'pl-10 pr-10 text-right' : 'pr-10 pl-10'} rounded-xl`}
                                    required
                                    dir="ltr"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground`}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="text-left">
                            <Link
                                to="/forgot-password"
                                className="text-sm text-primary hover:underline"
                            >
                                {t('forgot_password')}
                            </Link>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        <Button
                            type="submit"
                            className="w-full rounded-xl h-11"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    <span>{t('signing_in')}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <LogIn className="h-4 w-4 ml-2" />
                                    <span>{t('login')}</span>
                                </div>
                            )}
                        </Button>

                        <p className="text-sm text-muted-foreground">
                            {t('no_account')}{' '}
                            <Link to="/signup" className="text-primary font-semibold hover:underline">
                                {t('signup')}
                            </Link>
                        </p>

                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
