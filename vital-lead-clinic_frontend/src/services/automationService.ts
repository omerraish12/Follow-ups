import api from './api';
import type {
    Automation,
    AutomationPerformanceResponse,
    SeedDefaultAutomationsResponse
} from "@/types/automation";

export const automationService = {
    // Get all automations
    getAutomations: async (): Promise<Automation[]> => {
        const response = await api.get('/automations');
        return response.data;
    },

    // Get single automation
    getAutomation: async (id: string): Promise<Automation> => {
        const response = await api.get(`/automations/${id}`);
        return response.data;
    },

    // Create automation
    createAutomation: async (automationData: Partial<Automation>): Promise<Automation> => {
        const response = await api.post('/automations', automationData);
        return response.data;
    },

    // Update automation
    updateAutomation: async (id: string, automationData: Partial<Automation>): Promise<Automation> => {
        const response = await api.put(`/automations/${id}`, automationData);
        return response.data;
    },

    // Delete automation
    deleteAutomation: async (id: string): Promise<{ message: string }> => {
        const response = await api.delete(`/automations/${id}`);
        return response.data;
    },

    // Toggle automation active status
    toggleAutomation: async (id: string): Promise<Automation> => {
        const response = await api.patch(`/automations/${id}/toggle`);
        return response.data;
    },

    // Get performance stats
    getPerformanceStats: async (): Promise<AutomationPerformanceResponse> => {
        const response = await api.get('/automations/stats/performance');
        return response.data;
    },

    // Seed default automation rules
    seedDefaultAutomations: async (): Promise<SeedDefaultAutomationsResponse> => {
        const response = await api.post('/automations/defaults');
        return response.data;
    },

    // Get recent automation replies
    getRecentReplies: async (): Promise<any[]> => {
        const response = await api.get('/automations/replies/recent');
        return response.data;
    }
};
