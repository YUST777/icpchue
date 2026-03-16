'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { CACHE_VERSION } from '@/lib/cache-version';
import { fetchWithCache, clearApiCache } from '@/lib/api-cache';
import { createClient } from '@/lib/supabase/client';

interface User {
    id: number;
    email: string;
    is_verified?: boolean;
    telegram_username?: string;
    is_public?: boolean;
    role?: string;
    profile_visibility?: 'public' | 'private';
    profile_picture?: string | null;
    created_at?: string;
}

interface Profile {
    id: number;
    name: string;
    faculty: string;
    student_id: string;
    student_level: string;
    telephone: string;
    codeforces_profile?: string;
    leetcode_profile?: string;
    telegram_username?: string;
    codeforces_data?: {
        rating?: number;
        maxRating?: number;
        rank?: string;
        handle?: string;
    };
    leetcode_data?: {
        totalSolved?: number;
        ranking?: number;
    };
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ user: User }>;
    register: (userData: any) => Promise<{ user: User }>;
    checkEmail: (email: string) => Promise<{ exists: boolean; hasAccount: boolean }>;
    logout: () => void;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const supabase = createClient();

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        // Also clear legacy tokens
        if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('token');
            document.cookie = 'authToken=; Max-Age=0; path=/;';
            document.cookie = 'token=; Max-Age=0; path=/;';
        }
        // Call server-side logout to clear httpOnly cookies
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        clearApiCache();
    }, [supabase.auth]);

    const fetchUserProfile = useCallback(async () => {
        try {
            const data = await fetchWithCache<any>(`/api/auth/me?_v=${CACHE_VERSION}`, {
                credentials: 'include',
            }, 60);

            setUser(data.user);
            setProfile(data.profile);

            // Smart Refresh: Check if Codeforces data is stale (> 1 hour)
            const cfData = data.profile?.codeforces_data;
            if (cfData) {
                const lastUpdated = cfData.lastUpdated ? new Date(cfData.lastUpdated).getTime() : 0;
                const oneHour = 60 * 60 * 1000;
                const now = Date.now();

                if (!lastUpdated || (now - lastUpdated > oneHour)) {
                    fetch('/api/user/refresh-cf', {
                        method: 'POST',
                        credentials: 'include',
                    }).catch(() => {});
                }
            }
        } catch (error) {
            console.error('[AuthContext] Refresh profile error:', error);
        }
    }, []);

    // Initialize auth state from Supabase session
    useEffect(() => {
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // Fetch the app profile from our API
                    const data = await fetchWithCache<any>(`/api/auth/me?_v=${CACHE_VERSION}`, {
                        credentials: 'include',
                    }, 300);

                    if (data.user) {
                        setUser(data.user);
                        setProfile(data.profile);
                        setIsAuthenticated(true);
                    }
                }
            } catch (error: any) {
                if (error.message?.includes('401') || error.message?.includes('403')) {
                    // Session expired
                }
            }
            setLoading(false);
        };

        initAuth();

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setIsAuthenticated(false);
                clearApiCache();
            } else if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                // Re-fetch profile on sign-in or token refresh
                try {
                    const data = await fetchWithCache<any>(`/api/auth/me?_v=${CACHE_VERSION}`, {
                        credentials: 'include',
                    }, 60);
                    if (data.user) {
                        setUser(data.user);
                        setProfile(data.profile);
                        setIsAuthenticated(true);
                    }
                } catch {
                    // Will retry on next interaction
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const login = async (email: string, password: string) => {
        const sanitizedEmail = email.trim().toLowerCase();

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email: sanitizedEmail, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        setIsAuthenticated(true);
        setUser(data.user);

        await fetchUserProfile();

        return data;
    };

    const register = async (userData: any) => {
        const sanitizedEmail = userData.email.trim().toLowerCase();

        let response: Response;
        try {
            response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ...userData, email: sanitizedEmail }),
            });
        } catch (e) {
            throw new Error('Network error. Please check your connection and try again.');
        }

        const text = await response.text();
        let data: { success?: boolean; user?: unknown; error?: string };
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            if (response.status >= 500) {
                throw new Error('Server is busy. Please try again in a moment.');
            }
            throw new Error('Registration failed. Please try again.');
        }

        if (!response.ok) {
            throw new Error(data?.error || 'Registration failed');
        }

        if (!data?.success || !data?.user) {
            throw new Error('Invalid response. Please try again.');
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: sanitizedEmail,
            password: userData.password,
        });

        if (error) {
            throw new Error('Account created. Please sign in with your email and password.');
        }

        const returnedData = data as { success: boolean; user: User; error?: string };

        setIsAuthenticated(true);
        setUser(returnedData.user);

        fetchUserProfile().catch(() => {});

        return returnedData;
    };

    const checkEmail = async (email: string) => {
        const response = await fetch('/api/auth/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Email check failed');
        }

        return {
            exists: data.status === 'exists' || data.status === 'application_found',
            hasAccount: data.status === 'exists'
        };
    };

    const value: AuthContextType = {
        user,
        profile,
        loading,
        isAuthenticated,
        login,
        register,
        checkEmail,
        logout,
        refreshProfile: fetchUserProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
