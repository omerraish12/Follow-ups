// src/pages/auth/ResetPassword.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        // Redirect if no token or email
        if (!token || !email) {
            navigate('/forgot-password');
        }
    }, [token, email, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const validatePassword = (password: string): boolean => {
        // Password must be at least 8 characters, contain at least one number and one letter
        const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        return regex.test(password);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate passwords
        if (formData.password !== formData.confirmPassword) {
            setError('הסיסמאות אינן תואמות');
            return;
        }

        if (!validatePassword(formData.password)) {
            setError('סיסמה חייבת להכיל לפחות 8 תווים, אות אחת ומספר אחד');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await authService.resetPassword(token!, formData.password);
            setSuccess(true);
            toast({
                title: "סיסמה עודכנה",
                description: "סיסמתך עודכנה בהצלחה. כעת תוכל להתחבר עם הסיסמה החדשה.",
            });

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'איפוס סיסמה נכשל. ייתכן שהקישור פג תוקף.');
        } finally {
            setIsLoading(false);
        }
    };

    const getPasswordStrength = (password: string): { strength: string; color: string; width: string } => {
        if (!password) return { strength: '', color: 'bg-gray-200', width: '0%' };

        let score = 0;
        if (password.length >= 8) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        switch (score) {
            case 1:
            case 2:
                return { strength: 'חלשה', color: 'bg-destructive', width: '20%' };
            case 3:
                return { strength: 'בינונית', color: 'bg-warning', width: '50%' };
            case 4:
                return { strength: 'טובה', color: 'bg-info', width: '75%' };
            case 5:
                return { strength: 'חזקה', color: 'bg-success', width: '100%' };
            default:
                return { strength: '', color: 'bg-gray-200', width: '0%' };
        }
    };

    const passwordStrength = getPasswordStrength(formData.password);

    if (!token || !email) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
            <Card className="w-full max-w-md rounded-2xl border-border shadow-card">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center shadow-lg">
                            <Lock className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">איפוס סיסמה</CardTitle>
                    <CardDescription>
                        הזן סיסמה חדשה עבור החשבון שלך
                    </CardDescription>
                    {email && (
                        <p className="text-sm text-muted-foreground mt-2">
                            עבור הכתובת: <span className="font-semibold text-foreground" dir="ltr">{email}</span>
                        </p>
                    )}
                </CardHeader>

                {success ? (
                    <CardContent>
                        <Alert className="rounded-xl bg-success/10 border-success/20">
                            <CheckCircle className="h-4 w-4 text-success" />
                            <AlertDescription className="text-success mr-2">
                                הסיסמה עודכנה בהצלחה! מעבר לדף ההתחברות...
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-4">
                            {error && (
                                <Alert variant="destructive" className="rounded-xl">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="mr-2">{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password">סיסמה חדשה</Label>
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

                                {/* Password strength indicator */}
                                {formData.password && (
                                    <div className="mt-2 space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">עוצמת סיסמה:</span>
                                            <span className={`text-xs font-medium ${passwordStrength.strength === 'חזקה' ? 'text-success' :
                                                    passwordStrength.strength === 'טובה' ? 'text-info' :
                                                        passwordStrength.strength === 'בינונית' ? 'text-warning' :
                                                            'text-destructive'
                                                }`}>
                                                {passwordStrength.strength}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${passwordStrength.color} transition-all duration-300`}
                                                style={{ width: passwordStrength.width }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">אימות סיסמה חדשה</Label>
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

                            {/* Password requirements */}
                            <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1">
                                <p className="font-semibold mb-2">דרישות לסיסמה:</p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${formData.password.length >= 8 ? 'bg-success' : 'bg-muted-foreground'}`} />
                                    <span className={formData.password.length >= 8 ? 'text-success' : 'text-muted-foreground'}>
                                        לפחות 8 תווים
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${/[A-Za-z]/.test(formData.password) ? 'bg-success' : 'bg-muted-foreground'}`} />
                                    <span className={/[A-Za-z]/.test(formData.password) ? 'text-success' : 'text-muted-foreground'}>
                                        לפחות אות אחת
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(formData.password) ? 'bg-success' : 'bg-muted-foreground'}`} />
                                    <span className={/[0-9]/.test(formData.password) ? 'text-success' : 'text-muted-foreground'}>
                                        לפחות מספר אחד
                                    </span>
                                </div>
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
                                        <span>מעדכן סיסמה...</span>
                                    </div>
                                ) : (
                                    <span>עדכן סיסמה</span>
                                )}
                            </Button>

                            <p className="text-sm text-muted-foreground text-center">
                                <Link to="/login" className="text-primary hover:underline">
                                    חזרה להתחברות
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    );
}