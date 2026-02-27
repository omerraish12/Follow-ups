import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeRole, ROLE_PAGE_PERMISSIONS, type UserRole } from '@/lib/roles';

export const usePermissions = () => {
    const { user } = useAuth();
    const role = useMemo<UserRole>(() => (user ? normalizeRole(user.role) : 'staff'), [user]);
    const permissions = ROLE_PAGE_PERMISSIONS[role] ?? [];
    const hasPermission = (permission?: string) => {
        if (!permission) return true;
        return permissions.includes(permission);
    };

    return {
        role,
        permissions,
        hasPermission,
    };
};
