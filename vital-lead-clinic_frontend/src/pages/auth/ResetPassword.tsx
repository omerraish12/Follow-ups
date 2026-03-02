// src/pages/auth/ResetPassword.tsx
import { useState, useEffect, useMemo } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
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
  const { t, language } = useLanguage();
  const isRtl = language === 'he';

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
    if (!token || !email) {
      navigate('/forgot-password');
    }
  }, [token, email, navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validatePassword = (password: string): boolean => {
    const hasMinLength = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasMinLength && hasLetter && hasNumber;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwords_dont_match'));
      return;
    }

    if (!validatePassword(formData.password)) {
      setError(t('password_requirements'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.resetPassword(token!, formData.password);
      setSuccess(true);
      toast({
        title: t('password_updated'),
        description: t('password_updated_description'),
      });
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message;
      setError(serverMessage || err?.message || t('reset_link_send_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string, translate: (key: string) => string): { strength: string; color: string; width: string } => {
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
        return { strength: translate('weak'), color: 'bg-destructive', width: '20%' };
      case 3:
        return { strength: translate('medium'), color: 'bg-warning', width: '50%' };
      case 4:
        return { strength: translate('good'), color: 'bg-info', width: '75%' };
      case 5:
        return { strength: translate('strong'), color: 'bg-success', width: '100%' };
      default:
        return { strength: '', color: 'bg-gray-200', width: '0%' };
    }
  };

  const passwordStrength = useMemo(() => getPasswordStrength(formData.password, t), [formData.password, t]);

  const passwordRequirementStatus = useMemo(() => {
    const hasMinLength = formData.password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(formData.password);
    const hasNumber = /\d/.test(formData.password);

    return [
      { key: 'at_least_8_chars', isValid: hasMinLength },
      { key: 'at_least_one_letter', isValid: hasLetter },
      { key: 'at_least_one_number', isValid: hasNumber },
    ];
  }, [formData.password]);

  if (!token || !email) {
    return null;
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md rounded-2xl border-border shadow-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-r from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Lock className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t('reset_password')}</CardTitle>
          <CardDescription>
            {t('enter_new_password')}
          </CardDescription>
          {email && (
            <p className="text-sm text-muted-foreground mt-2">
              {t('email')}: <span className="font-semibold text-foreground" dir="ltr">{email}</span>
            </p>
          )}
        </CardHeader>

        {success ? (
          <>
            <CardContent>
              <Alert className="rounded-xl bg-success/10 border-success/20">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-success mr-2">
                  {t('password_updated_successfully')}
                </AlertDescription>
              </Alert>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                type="button"
                className="w-full rounded-xl h-11"
                onClick={() => navigate('/login')}
              >
                {t('back_to_login')}
              </Button>
            </CardFooter>
          </>
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
                    aria-label={showPassword ? t('hide_password') : t('show_password')}
                    className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="text-xs space-y-1 text-muted-foreground">
                  <p className="text-xs font-medium text-muted-foreground">{t('password_requirements_title')}</p>
                  <ul className="space-y-1">
                    {passwordRequirementStatus.map((requirement) => (
                      <li key={requirement.key} className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${requirement.isValid ? 'bg-success' : 'bg-muted'}`} />
                        <span className={requirement.isValid ? 'text-foreground' : 'text-muted-foreground'}>
                          {t(requirement.key)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {formData.password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{t('password_strength')}</span>
                      <span className="text-xs font-medium">
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
                <Label htmlFor="confirmPassword" className={isRtl ? 'text-right' : ''}>{t('confirm_password')}</Label>
                <div className="relative">
                  <Lock className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="********"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`${isRtl ? 'pl-10 pr-10 text-right' : 'pr-10 pl-10'} rounded-xl`}
                    required
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? t('hide_password') : t('show_password')}
                    className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground`}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                    <span>{t('resetting_password') || t('reset_password')}</span>
                  </div>
                ) : (
                  <span>{t('reset_password')}</span>
                )}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                {t('remember_password')}{' '}
                <Link to="/login" className="text-primary hover:underline">
                  {t('login')}
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
