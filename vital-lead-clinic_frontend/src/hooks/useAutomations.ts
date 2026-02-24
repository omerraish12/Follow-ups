import { useState, useEffect } from 'react';
import { automationService } from '@/services/automationService';
import { toast } from '@/hooks/use-toast';

interface Automation {
    id: string;
    name: string;
    active: boolean;
    // Add other fields that are part of the automation object
}

interface Stats {
    totalAutomations: number;
    activeAutomations: number;
    // Add other performance stats if needed
}

interface ErrorResponse {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export const useAutomations = () => {
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);

    const fetchAutomations = async (): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await automationService.getAutomations();
            setAutomations(data);
        } catch (error: ErrorResponse) {
            setError(error.response?.data?.message || 'שגיאה בטעינת אוטומציות');
            toast({
                title: "שגיאה",
                description: 'שגיאה בטעינת אוטומציות',
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async (): Promise<void> => {
        try {
            const data = await automationService.getPerformanceStats();
            setStats(data);
        } catch (error: any) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        fetchAutomations();
        fetchStats();
    }, []);

    const getAutomation = async (id: string): Promise<Automation> => {
        try {
            return await automationService.getAutomation(id);
        } catch (error: ErrorResponse) {
            toast({
                title: "שגיאה",
                description: 'שגיאה בטעינת אוטומציה',
                variant: "destructive",
            });
            throw error;
        }
    };

    const addAutomation = async (automationData: Omit<Automation, 'id'>): Promise<Automation> => {
        try {
            const newAutomation = await automationService.createAutomation(automationData);
            setAutomations(prev => [newAutomation, ...prev]);
            toast({
                title: "אוטומציה נוספה",
                description: "האוטומציה נוספה בהצלחה",
            });
            return newAutomation;
        } catch (error: ErrorResponse) {
            toast({
                title: "שגיאה",
                description: error.response?.data?.message || 'שגיאה בהוספת אוטומציה',
                variant: "destructive",
            });
            throw error;
        }
    };

    const updateAutomation = async (id: string, automationData: Omit<Automation, 'id'>): Promise<Automation> => {
        try {
            const updated = await automationService.updateAutomation(id, automationData);
            setAutomations(prev => prev.map(a => a.id === id ? updated : a));
            toast({
                title: "אוטומציה עודכנה",
                description: "האוטומציה עודכנה בהצלחה",
            });
            return updated;
        } catch (error: ErrorResponse) {
            toast({
                title: "שגיאה",
                description: error.response?.data?.message || 'שגיאה בעדכון אוטומציה',
                variant: "destructive",
            });
            throw error;
        }
    };

    const deleteAutomation = async (id: string): Promise<void> => {
        try {
            await automationService.deleteAutomation(id);
            setAutomations(prev => prev.filter(a => a.id !== id));
            toast({
                title: "אוטומציה נמחקה",
                description: "האוטומציה נמחקה בהצלחה",
            });
        } catch (error: ErrorResponse) {
            toast({
                title: "שגיאה",
                description: error.response?.data?.message || 'שגיאה במחיקת אוטומציה',
                variant: "destructive",
            });
            throw error;
        }
    };

    const toggleAutomation = async (id: string): Promise<Automation> => {
        try {
            const updated = await automationService.toggleAutomation(id);
            setAutomations(prev => prev.map(a => a.id === id ? updated : a));
            toast({
                title: updated.active ? "אוטומציה הופעלה" : "אוטומציה הושבתה",
                description: `האוטומציה ${updated.active ? 'הופעלה' : 'הושבתה'} בהצלחה`,
            });
            return updated;
        } catch (error: ErrorResponse) {
            toast({
                title: "שגיאה",
                description: error.response?.data?.message || 'שגיאה בשינוי סטטוס',
                variant: "destructive",
            });
            throw error;
        }
    };

    return {
        automations,
        isLoading,
        error,
        stats,
        fetchAutomations,
        fetchStats,
        getAutomation,
        addAutomation,
        updateAutomation,
        deleteAutomation,
        toggleAutomation
    };
};