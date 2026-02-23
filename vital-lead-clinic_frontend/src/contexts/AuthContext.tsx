// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, LoginCredentials, SignupCredentials } from '@/types/auth';
import { toast } from '@/hooks/use-toast';
import { authService } from '@/services/authService';

interface AuthContextType extends AuthState {
    login: (credentials: LoginCredentials) => Promise<void>;
    signup: (credentials: SignupCredentials) => Promise<void>;
    verifyOTP: (email: string, otp: string) => Promise<void>;
    resendOTP: (email: string) => Promise<void>;
    logout: () => void;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        error: null,
    });

    useEffect(() => {
        // Check for stored session on mount
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                if (token) {
                    const user = await authService.getCurrentUser();
                    setState({ user, isLoading: false, error: null });
                } else {
                    setState({ user: null, isLoading: false, error: null });
                }
            } catch (error) {
                setState({ user: null, isLoading: false, error: 'Session expired' });
                localStorage.removeItem('auth_token');
            }
        };

        checkAuth();
    }, []);

    const login = async (credentials: LoginCredentials) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const response = await authService.login(credentials);
            localStorage.setItem('auth_token', response.token);
            setState({ user: response.user, isLoading: false, error: null });
            toast({
                title: "התחברות successful",
                description: "ברוך הבא kembali!",
            });
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'התחברות נכשלה'
            }));
            toast({
                title: "שגיאה",
                description: error.message || 'התחברות נכשלה',
                variant: "destructive",
            });
        }
    };

    const signup = async (credentials: SignupCredentials) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            await authService.signup(credentials);
            setState({ user: null, isLoading: false, error: null });
            toast({
                title: "נרשמת בהצלחה!",
                description: "נשלח קוד אימות למייל שלך",
            });
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'הרשמה נכשלה'
            }));
            toast({
                title: "שגיאה",
                description: error.message || 'הרשמה נכשלה',
                variant: "destructive",
            });
        }
    };

    const verifyOTP = async (email: string, otp: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const response = await authService.verifyOTP({ email, otp });
            localStorage.setItem('auth_token', response.token);
            setState({ user: response.user, isLoading: false, error: null });
            toast({
                title: "אימות successful",
                description: "החשבון שלך אומת בהצלחה!",
            });
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error.message || 'אימות נכשל'
            }));
            toast({
                title: "שגיאה",
                description: error.message || 'קוד אימות לא תקין',
                variant: "destructive",
            });
        }
    };

    const resendOTP = async (email: string) => {
        try {
            await authService.resendOTP(email);
            toast({
                title: "קוד נשלח",
                description: "קוד אימות חדש נשלח למייל שלך",
            });
        } catch (error: any) {
            toast({
                title: "שגיאה",
                description: error.message || 'שליחת קוד נכשלה',
                variant: "destructive",
            });
        }
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        setState({ user: null, isLoading: false, error: null });
        toast({
            title: "התנתקת",
            description: "להתראות, נתראה בקרוב!",
        });
    };

    const clearError = () => {
        setState(prev => ({ ...prev, error: null }));
    };

    return (
        <AuthContext.Provider value={{
            ...state,
            login,
            signup,
            verifyOTP,
            resendOTP,
            logout,
            clearError,
        }}>
            {children}
        </AuthContext.Provider>
    );
};