export type UserRole = 'admin' | 'manager' | 'staff';

export const normalizeRole = (role?: string | null): UserRole => {
  if (!role) return 'staff';
  const upper = role.toUpperCase();
  if (upper === 'ADMIN') return 'admin';
  if (upper === 'MANAGER') return 'manager';
  return 'staff';
};

export const ROLE_PAGE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['dashboard', 'leads', 'automations', 'analytics', 'whatsapp', 'team', 'notifications', 'settings'],
  manager: ['dashboard', 'leads', 'automations', 'analytics', 'whatsapp', 'notifications'],
  staff: ['dashboard', 'leads', 'notifications'],
};

export const roleHasPermission = (role: UserRole, permission: string): boolean => {
  return ROLE_PAGE_PERMISSIONS[role]?.includes(permission) ?? false;
};
