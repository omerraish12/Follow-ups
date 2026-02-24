import { useState, useEffect } from 'react';
import { analyticsService } from '@/services/analyticsService';

interface KPI {
    // Define the structure of the KPI data
    total: number;
    conversionRate: number;
    // Add other KPI-specific fields as necessary
}

interface StatusDistribution {
    status: string;
    count: number;
}

interface SourcePerformance {
    source: string;
    performance: number;
}

interface WeeklyActivity {
    date: string;
    activityCount: number;
}

interface TeamPerformance {
    teamName: string;
    performance: number;
}

interface ErrorResponse {
    response?: {
        data?: {
            message?: string;
        };
    };
}

export const useAnalytics = (initialPeriod: string = 'month') => {
    const [kpi, setKpi] = useState<KPI | null>(null);
    const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
    const [sourcePerformance, setSourcePerformance] = useState<SourcePerformance[]>([]);
    const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([]);
    const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<string>(initialPeriod);

    const fetchAll = async (): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            const [kpiData, statusData, sourceData, weeklyData, teamData] = await Promise.all([
                analyticsService.getKPI(period),
                analyticsService.getStatusDistribution(),
                analyticsService.getSourcePerformance(),
                analyticsService.getWeeklyActivity(),
                analyticsService.getTeamPerformace()
            ]);

            setKpi(kpiData);
            setStatusDistribution(statusData);
            setSourcePerformance(sourceData);
            setWeeklyActivity(weeklyData);
            setTeamPerformance(teamData);
        } catch (error: ErrorResponse) {
            setError(error.response?.data?.message || 'שגיאה בטעינת נתונים');
            console.error('Error fetching analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [period]);

    const refresh = (): void => {
        fetchAll();
    };

    return {
        kpi,
        statusDistribution,
        sourcePerformance,
        weeklyActivity,
        teamPerformance,
        isLoading,
        error,
        period,
        setPeriod,
        refresh
    };
};