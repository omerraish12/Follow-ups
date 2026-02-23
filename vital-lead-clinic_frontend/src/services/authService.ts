// src/services/authService.ts
import { User, LoginCredentials, SignupCredentials, OTPVerification } from '@/types/auth';

// Mock database - replace with real API calls
const MOCK_USERS: User[] = [
    {
        id: '1',
        email: 'admin@clinic.co.il',
        name: 'מנהל מערכת',
        clinicName: 'מרפאת שיניים הרצליה',
        phone: '050-1234567',
        role: 'admin',
        emailVerified: true,
        createdAt: new Date().toISOString(),
    },
];

// Mock OTP storage - in production, this would be on the server
const PENDING_VERIFICATIONS: Map<string, { otp: string; userData: any }> = new Map();

export const authService = {
    // Login
    login: async (credentials: LoginCredentials): Promise<{ user: User; token: string }> => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const user = MOCK_USERS.find(u => u.email === credentials.email);

        if (!user) {
            throw new Error('משתמש לא קיים');
        }

        // In production, verify password here
        if (credentials.password !== 'password123') {
            throw new Error('סיסמה שגויה');
        }

        if (!user.emailVerified) {
            throw new Error('נא לאמת את המייל תחילה');
        }

        return {
            user,
            token: `mock_jwt_token_${user.id}`,
        };
    },

    // Signup
    signup: async (credentials: SignupCredentials): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if user exists
        if (MOCK_USERS.some(u => u.email === credentials.email)) {
            throw new Error('משתמש עם מייל זה כבר קיים');
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store pending verification
        PENDING_VERIFICATIONS.set(credentials.email, {
            otp,
            userData: credentials,
        });

        // In production, send actual email
        console.log(`📧 OTP for ${credentials.email}: ${otp}`);

        // Simulate email sending
        await authService.sendOTPEmail(credentials.email, otp);
    },

    // Verify OTP
    verifyOTP: async ({ email, otp }: OTPVerification): Promise<{ user: User; token: string }> => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const pending = PENDING_VERIFICATIONS.get(email);

        if (!pending) {
            throw new Error('לא נמצא אימות ממתין');
        }

        if (pending.otp !== otp) {
            throw new Error('קוד אימות שגוי');
        }

        // Create new user
        const newUser: User = {
            id: `user_${Date.now()}`,
            ...pending.userData,
            emailVerified: true,
            role: 'staff',
            createdAt: new Date().toISOString(),
        };

        MOCK_USERS.push(newUser);
        PENDING_VERIFICATIONS.delete(email);

        return {
            user: newUser,
            token: `mock_jwt_token_${newUser.id}`,
        };
    },

    // Resend OTP
    resendOTP: async (email: string): Promise<void> => {
        const pending = PENDING_VERIFICATIONS.get(email);

        if (!pending) {
            throw new Error('לא נמצא אימות ממתין');
        }

        // Generate new OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        pending.otp = newOtp;
        PENDING_VERIFICATIONS.set(email, pending);

        console.log(`📧 New OTP for ${email}: ${newOtp}`);
        await authService.sendOTPEmail(email, newOtp);
    },

    // Get current user from token
    getCurrentUser: async (): Promise<User> => {
        await new Promise(resolve => setTimeout(resolve, 500));

        const token = localStorage.getItem('auth_token');
        if (!token) {
            throw new Error('לא מחובר');
        }

        // Mock - extract user from token
        const userId = token.replace('mock_jwt_token_', '');
        const user = MOCK_USERS.find(u => u.id === userId);

        if (!user) {
            throw new Error('משתמש לא קיים');
        }

        return user;
    },

    // Send OTP email (mock)
    sendOTPEmail: async (email: string, otp: string): Promise<void> => {
        // In production, integrate with actual email service (SendGrid, AWS SES, etc.)
        console.log(`
      =================================
      📧 אימות מייל
      לכתובת: ${email}
      קוד אימות: ${otp}
      
      העתק קוד זה לדף האימות
      =================================
    `);

        // Simulate email delay
        await new Promise(resolve => setTimeout(resolve, 500));
    },

    // Forgot password
    forgotPassword: async (email: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const user = MOCK_USERS.find(u => u.email === email);
        if (!user) {
            throw new Error('משתמש לא קיים');
        }

        const resetToken = Math.random().toString(36).substring(7);
        console.log(`🔐 Password reset for ${email}: ${resetToken}`);
    },

    // Reset password
    resetPassword: async (token: string, newPassword: string): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Password reset with token: ${token}`);
    },
};