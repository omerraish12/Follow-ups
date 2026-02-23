// src/pages/auth/ForgotPassword.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await authService.forgotPassword(email);
            setSuccess(true);
            toast({
                title: "קישור נשלח",
                description: "הוראות לאיפוס סיסמה נשלחו למייל שלך",
            });
        } catch (err: any) {
            setError(err.message || 'שליחת קישור נכשלה');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4" dir="rtl">
            <Card className="w-full max-w-md rounded-2xl border-border shadow-card">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">איפוס סיסמה</CardTitle>
                    <CardDescription>
                        הזן את המייל שלך ונשלח לך קישור לאיפוס סיסמה
                    </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive" className="rounded-xl">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success ? (
                            <Alert className="rounded-xl bg-success/10 border-success/20">
                                <AlertDescription className="text-success">
                                    ✓ קישור לאיפוס סיסמה נשלח לכתובת {email}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="email">אימייל</Label>
                                <div className="relative">
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pr-10 rounded-xl"
                                        required
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex flex-col gap-4">
                        {!success ? (
                            <Button
                                type="submit"
                                className="w-full rounded-xl h-11"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        <span>שולח...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Send className="h-4 w-4" />
                                        <span>שלח קישור</span>
                                    </div>
                                )}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full rounded-xl h-11"
                                onClick={() => window.location.href = '/login'}
                            >
                                חזרה להתחברות
                            </Button>
                        )}

                        <p className="text-sm text-muted-foreground text-center">
                            <Link to="/login" className="text-primary hover:underline">
                                חזרה להתחברות
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}