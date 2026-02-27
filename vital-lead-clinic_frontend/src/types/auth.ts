// src/types/auth.ts
import type { UserRole } from "@/lib/roles";

export interface User {
    id: string;
    email: string;
    name: string;
    clinicName?: string;
    phone?: string;
    role: UserRole;
    emailVerified: boolean;
    createdAt: string;
}

export interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface SignupCredentials {
    email: string;
    password: string;
    name: string;
    clinicName?: string;
    phone?: string;
}
