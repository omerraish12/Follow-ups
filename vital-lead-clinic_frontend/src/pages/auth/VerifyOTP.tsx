// src/pages/auth/VerifyOTP.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function VerifyOTP() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { verifyOTP, resendOTP, user, isLoading, error, clearError } = useAuth();
    const { t } = useLanguage();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const email = searchParams.get('email') || '';

    // Redirect if already verified
    useEffect(() => {
        if (user?.emailVerified) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!email) {
            navigate('/signup');
        }
    }, [email, navigate]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0 && !canResend) {
            interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer, canResend]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }

        if (error) clearError();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length === 6) {
            await verifyOTP(email, otpCode);
            // Navigation will happen via useEffect when user is updated
        }
    };

    const handleResend = async () => {
        await resendOTP(email);
        setTimer(60);
        setCanResend(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
            <Card className="w-full max-w-md rounded-2xl border-border shadow-card">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center shadow-lg">
                            <Mail className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">אימות מייל</CardTitle>
                    <CardDescription>
                        נשלח קוד אימות לכתובת:<br />
                        <span className="font-semibold text-foreground">{email}</span>
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        {error && (
                            <Alert variant="destructive" className="rounded-xl">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label>הזן קוד אימות בן 6 ספרות</Label>
                            <div className="flex gap-2 justify-between">
                                {otp.map((digit, index) => (
                                    <Input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className="w-12 h-12 text-center text-lg font-bold rounded-xl"
                                        required
                                        dir="ltr"
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="text-center">
                            {canResend ? (
                                <Button
                                    type="button"
                                    variant="link"
                                    onClick={handleResend}
                                    className="text-primary"
                                >
                                    <RefreshCw className="h-3 w-3 ml-1" />
                                    שלח קוד חדש
                                </Button>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    שליחת קוד חדש בעוד {timer} שניות
                                </p>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter>
                        <Button
                            type="submit"
                            className="w-full rounded-xl h-11"
                            disabled={isLoading || otp.join('').length !== 6}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    <span>מאמת...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>אמת</span>
                                </div>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}