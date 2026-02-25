import api from './api';
import type { TeamMemberApi, ClinicApi } from '@/types/team';

export const teamService = {
  getMembers: async (): Promise<TeamMemberApi[]> => {
    const response = await api.get('/team/members');
    return response.data;
  },

  createMember: async (data: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
  }): Promise<TeamMemberApi> => {
    const response = await api.post('/team/members', data);
    return response.data;
  },

  updateMember: async (
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      status?: string;
    }
  ): Promise<TeamMemberApi> => {
    const response = await api.put(`/team/members/${id}`, data);
    return response.data;
  },

  deleteMember: async (id: string): Promise<void> => {
    await api.delete(`/team/members/${id}`);
  },

  resetPassword: async (id: string): Promise<void> => {
    await api.post(`/team/members/${id}/reset-password`);
  },

  getClinics: async (): Promise<ClinicApi[]> => {
    const response = await api.get('/team/clinics');
    return response.data;
  }
};
