// src/pages/auth/Signup.tsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone as PhoneIcon, Building, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

export default function Signup() {
    const navigate = useNavigate();
    const { signup, user, isLoading, error, clearError } = useAuth();
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
            alert('הסיסמאות אינן תואמות');
            return;
        }

        if (!formData.agreeTerms) {
            alert('יש לאשר את תנאי השימוש');
            return;
        }

        await signup({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            clinicName: formData.clinicName,
            phone: formData.phone,
        });

        // Navigate to OTP verification after successful signup
        navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}`);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4" dir="rtl">
            <Card className="w-full max-w-2xl rounded-2xl border-border shadow-card">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center shadow-lg">
                            <Building className="h-8 w-8 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">הרשמה למערכת</CardTitle>
                    <CardDescription>
                        הצטרפו ל-1,200+ מרפאות שכבר מגדילות הכנסות אוטומטית
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
                                <Label htmlFor="name">שם מלא</Label>
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
                                <Label htmlFor="email">אימייל</Label>
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
                                <Label htmlFor="phone">טלפון</Label>
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
                                <Label htmlFor="clinicName">שם המרפאה</Label>
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
                                <Label htmlFor="password">סיסמה</Label>
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
                                <Label htmlFor="confirmPassword">אימות סיסמה</Label>
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
                                אני מאשר/ת את{' '}
                                <Link to="/terms" className="text-primary hover:underline">
                                    תנאי השימוש
                                </Link>{' '}
                                ו{' '}
                                <Link to="/privacy" className="text-primary hover:underline">
                                    מדיניות הפרטיות
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
                                    <span>נרשם...</span>
                                </div>
                            ) : (
                                <span>הרשמה</span>
                            )}
                        </Button>

                        <p className="text-sm text-muted-foreground">
                            כבר יש לך חשבון?{' '}
                            <Link to="/login" className="text-primary font-semibold hover:underline">
                                התחבר
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}