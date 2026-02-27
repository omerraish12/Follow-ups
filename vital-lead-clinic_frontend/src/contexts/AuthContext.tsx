import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { toast } from '@/hooks/use-toast';
import type { User, LoginCredentials, SignupCredentials } from '@/types/auth';
import { normalizeRole } from '@/lib/roles';

type AuthContextValue = {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    login: (credentials: LoginCredentials) => Promise<any>;
    signup: (userData: SignupCredentials) => Promise<any>;
    logout: () => void;
    refreshUser: () => Promise<User | null>;
    clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeUserRecord = (user?: Partial<User> | null): User | null => {
    if (!user) return null;
    return {
        ...user,
        role: normalizeRole(user.role),
    } as User;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const applyUser = (raw?: Partial<User> | null) => {
        const normalized = normalizeUserRecord(raw);
        setUser(normalized);
        return normalized;
    };

    const checkUser = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('user');
            if (token && storedUser) {
                const parsed = JSON.parse(storedUser);
                applyUser(parsed);
            }
        } catch (error) {
            console.error('Error checking user:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkUser();
    }, []);

    const login = async (credentials: LoginCredentials) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authService.login(credentials);
            const normalized = applyUser(data?.user);
            if (normalized) {
                localStorage.setItem('user', JSON.stringify(normalized));
                data.user = normalized;
            }
            toast({
                title: "Signed in",
                description: `Welcome back, ${normalized?.name || 'user'}!`,
            });
            return data;
        } catch (error) {
            const message =
                error.response?.data?.message ||
                error.response?.data?.errors?.[0]?.msg ||
                'Sign in failed';
            setError(message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (userData: SignupCredentials) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authService.signup(userData);
            const normalized = applyUser(data?.user);
            if (normalized) {
                localStorage.setItem('user', JSON.stringify(normalized));
            }
            toast({
                title: "Account created",
                description: "Your account is ready. You can sign in now.",
            });
            return data;
        } catch (error) {
            const message =
                error.response?.data?.message ||
                error.response?.data?.errors?.[0]?.msg ||
                'Sign up failed';
            setError(message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const refreshUser = async () => {
        try {
            const data = await authService.getCurrentUser();
            const normalized = applyUser(data);
            if (normalized) {
                localStorage.setItem('user', JSON.stringify(normalized));
            }
            return normalized;
        } catch (error) {
            console.error('Error refreshing user:', error);
            return null;
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        toast({
            title: "Signed out",
            description: "You have been logged out.",
        });
    };

    const clearError = () => {
        setError(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            error,
            login,
            signup,
            logout,
            refreshUser,
            clearError,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
