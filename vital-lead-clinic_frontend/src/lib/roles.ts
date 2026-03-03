export type UserRole = 'admin' | 'manager' | 'staff' | 'super_admin';

export const normalizeRole = (role?: string | null): UserRole => {
  if (!role) return 'staff';
  const upper = role.toUpperCase();
  if (upper === 'ADMIN') return 'admin';
  if (upper === 'MANAGER') return 'manager';
  if (upper === 'SUPER_ADMIN') return 'super_admin';
  return 'staff';
};

export const ROLE_PAGE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['dashboard', 'leads', 'automations', 'analytics', 'whatsapp', 'team', 'notifications', 'settings'],
  manager: ['dashboard', 'leads', 'automations', 'analytics', 'whatsapp', 'notifications'],
  staff: ['dashboard', 'leads', 'notifications'],
  super_admin: [
    'dashboard',
    'leads',
    'automations',
    'analytics',
    'whatsapp',
    'team',
    'notifications',
    'settings',
    'platform'
  ]
};

export const roleHasPermission = (role: UserRole, permission: string): boolean => {
  return ROLE_PAGE_PERMISSIONS[role]?.includes(permission) ?? false;
};
