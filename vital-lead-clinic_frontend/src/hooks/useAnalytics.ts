import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '@/services/analyticsService';

interface KPI {
    totalLeads: number;
    newLeads: number;
    hotLeads: number;
    closedLeads: number;
    lostLeads?: number;
    totalRevenue: number;
    followupNeeded: number;
    returnedLeads: number;
    returnedRevenue?: number;
    returnRate: number;
    avgResponseHours?: number;
    period?: string;
}

interface StatusDistribution {
    status: string;
    count: number | string;
}

interface SourcePerformance {
    source: string;
    count: number;
}

interface WeeklyActivity {
    day: string;
    leads: number;
}

interface TeamPerformance {
    id: string;
    name: string;
    role: string;
    leadsAssigned: number;
    activitiesCount: number;
    conversions: number;
    revenue: number;
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

    useEffect(() => {
        setPeriod(initialPeriod);
    }, [initialPeriod]);

    const fetchAll = useCallback(async (selectedPeriod = period): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            const [kpiData, statusData, sourceData, weeklyData, teamData] = await Promise.all([
                analyticsService.getKPI(selectedPeriod),
                analyticsService.getStatusDistribution(),
                analyticsService.getSourcePerformance(),
                analyticsService.getWeeklyActivity(),
                analyticsService.getTeamPerformance()
            ]);

            setKpi(kpiData);
            setStatusDistribution(statusData);
            setSourcePerformance(sourceData);
            setWeeklyActivity(weeklyData);
            setTeamPerformance(teamData);
        } catch (error: ErrorResponse) {
            setError(error.response?.data?.message || 'Unable to load analytics.');
            console.error('Error fetching analytics:', error);
        } finally {
            setIsLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchAll(period);
    }, [period, fetchAll]);

    const refresh = useCallback(async (): Promise<void> => {
        await fetchAll(period);
    }, [fetchAll, period]);

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
