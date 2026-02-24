import api from './api';

export const automationService = {
    // Get all automations
    getAutomations: async () => {
        const response = await api.get('/automations');
        return response.data;
    },

    // Get single automation
    getAutomation: async (id) => {
        const response = await api.get(`/automations/${id}`);
        return response.data;
    },

    // Create automation
    createAutomation: async (automationData) => {
        const response = await api.post('/automations', automationData);
        return response.data;
    },

    // Update automation
    updateAutomation: async (id, automationData) => {
        const response = await api.put(`/automations/${id}`, automationData);
        return response.data;
    },

    // Delete automation
    deleteAutomation: async (id) => {
        const response = await api.delete(`/automations/${id}`);
        return response.data;
    },

    // Toggle automation active status
    toggleAutomation: async (id) => {
        const response = await api.patch(`/automations/${id}/toggle`);
        return response.data;
    },

    // Get performance stats
    getPerformanceStats: async () => {
        const response = await api.get('/automations/stats/performance');
        return response.data;
    }
};