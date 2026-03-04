import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeRole, ROLE_PAGE_PERMISSIONS, type UserRole } from '@/lib/roles';

export const usePermissions = () => {
    const { user } = useAuth();
    const role = useMemo<UserRole>(() => (user ? normalizeRole(user.role) : 'staff'), [user]);
    const entryType = user?.entryType ?? 'clinic';
    const basePermissions = ROLE_PAGE_PERMISSIONS[role] ?? [];
    const permissions = entryType === 'patient' ? [] : basePermissions;

    const hasPermission = (permission?: string) => {
        if (!permission) return entryType !== 'patient';
        if (entryType === 'patient') return false;
        return permissions.includes(permission);
    };

    return {
        entryType,
        role,
        permissions,
        hasPermission,
    };
};
