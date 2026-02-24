import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { toast } from '@/hooks/use-toast';

const AuthContext = createContext(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error('Error checking user:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (credentials) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authService.login(credentials);
            setUser(data.user);
            toast({
                title: "התחברת בהצלחה",
                description: `ברוך הבא, ${data.user.name}!`,
            });
            return data;
        } catch (error) {
            setError(error.response?.data?.message || 'התחברות נכשלה');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (userData) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authService.signup(userData);
            setUser(data.user);
            toast({
                title: "נרשמת בהצלחה!",
                description: "חשבונך נוצר. כעת תוכל להתחבר.",
            });
            return data;
        } catch (error) {
            setError(error.response?.data?.message || 'הרשמה נכשלה');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        toast({
            title: "התנתקת",
            description: "להתראות, נתראה בקרוב!",
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
            clearError
        }}>
            {children}
        </AuthContext.Provider>
    );
};