import api from "./api";

export const analyticsService = {
    getKPI: async (period = 'month') => {
        const response = await api.get(`/analytics/kpi?period=${period}`);
        return response;
    },

    getStatusDistribution: async () => {
        const response = await api.get('/analytics/status-distribution');
        return response.data;
    },

    getSourcePerformance: async () => {
        const response = await api.get('/analytics/source-performance');
        return response.data;
    },

    getWeeklyActivity: async () => {
        const response = await api.get('/analytics/weekly-activity');
        return response.data;
    },

    getTeamPerformace: async () => {
        const response = await api.get('/analytics/team-performance');
        return response.data;
    }
};