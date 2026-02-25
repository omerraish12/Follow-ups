export type TeamRole = 'admin' | 'manager' | 'staff';
export type TeamStatus = 'active' | 'inactive' | 'pending';

export interface TeamMemberApi {
  id: string | number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status?: string | null;
  clinic_id?: string | number | null;
  clinic_name?: string | null;
  created_at?: string | null;
  last_active?: string | null;
  leads_assigned?: number | string | null;
  conversions?: number | string | null;
  revenue?: number | string | null;
}

export interface ClinicApi {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  address: string;
  members: number | string;
  leads: number | string;
  conversion: string;
}
