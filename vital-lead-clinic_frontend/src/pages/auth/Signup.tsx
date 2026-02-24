import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone as PhoneIcon, Building, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

export default function Signup() {
    const navigate = useNavigate();
    const { signup, user, isLoading, error, clearError } = useAuth();
    const { t } = useLanguage();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        clinicName: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false,
    });

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (error) clearError();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert(t('passwords_dont_match'));
            return;
        }

        if (!formData.agreeTerms) {
            alert(t('agree_terms_required'));
            return;
        }

        await signup({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            clinicName: formData.clinicName,
            phone: formData.phone,
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
            <Card className="w-full max-w-2xl rounded-2xl border-border shadow-card">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center shadow-lg">
                            <Building className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">{t('signup_title')}</CardTitle>
                    <CardDescription>
                        {t('signup_subtitle')}
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="rounded-xl">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('full_name')}</Label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="ישראל ישראלי"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="pr-10 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">{t('email')}</Label>
                                <div className="relative">
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="your@clinic.co.il"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="pr-10 rounded-xl"
                                        required
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">{t('phone_number')}</Label>
                                <div className="relative">
                                    <PhoneIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        name="phone"
                                        placeholder="050-1234567"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="pr-10 rounded-xl"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="clinicName">{t('clinic_name')}</Label>
                                <div className="relative">
                                    <Building className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="clinicName"
                                        name="clinicName"
                                        placeholder="מרפאת שיניים הרצליה"
                                        value={formData.clinicName}
                                        onChange={handleChange}
                                        className="pr-10 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">{t('password')}</Label>
                                <div className="relative">
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="********"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="pr-10 rounded-xl"
                                        required
                                        dir="ltr"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">{t('confirm_password')}</Label>
                                <div className="relative">
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="********"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="pr-10 rounded-xl"
                                        required
                                        dir="ltr"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                                id="agreeTerms"
                                name="agreeTerms"
                                checked={formData.agreeTerms}
                                onCheckedChange={(checked) =>
                                    setFormData(prev => ({ ...prev, agreeTerms: checked as boolean }))
                                }
                            />
                            <Label htmlFor="agreeTerms" className="text-sm">
                                {t('agree_terms')}{' '}
                                <Link to="/terms" className="text-primary hover:underline">
                                    {t('terms_of_service')}
                                </Link>{' '}
                                {t('and')}{' '}
                                <Link to="/privacy" className="text-primary hover:underline">
                                    {t('privacy_policy')}
                                </Link>
                            </Label>
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
                                    <span>{t('registering')}</span>
                                </div>
                            ) : (
                                <span>{t('signup')}</span>
                            )}
                        </Button>

                        <p className="text-sm text-muted-foreground">
                            {t('already_have_account')}{' '}
                            <Link to="/login" className="text-primary font-semibold hover:underline">
                                {t('login')}
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}