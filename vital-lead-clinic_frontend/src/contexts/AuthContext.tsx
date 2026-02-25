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
                title: "Signed in",
                description: `Welcome back, ${data.user.name}!`,
            });
            return data;
        } catch (error) {
            setError(error.response?.data?.message || 'Sign in failed');
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
                title: "Account created",
                description: "Your account is ready. You can sign in now.",
            });
            return data;
        } catch (error) {
            setError(error.response?.data?.message || 'Sign up failed');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const refreshUser = async () => {
        try {
            const data = await authService.getCurrentUser();
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
            return data;
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
            clearError
        }}>
            {children}
        </AuthContext.Provider>
    );
};
