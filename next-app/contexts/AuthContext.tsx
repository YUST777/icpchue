'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { CACHE_VERSION } from '@/lib/cache/cache-version';
import { fetchWithCache, clearApiCache } from '@/lib/cache/api-cache';
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

// The last signed-in user is remembered in the browser so the dashboard can
// render immediately on the next visit instead of blocking on the session
// check (getSession + /api/auth/me), which can take many seconds when the
// token needs refreshing or several tabs contend for Supabase's auth lock.
// The session is still verified in the background; protected data is
// enforced by the API either way. The phone number is never stored.
const SNAPSHOT_KEY = `icpchue:auth:${CACHE_VERSION}`;
const PROFILE_FETCH_TIMEOUT_MS = 10_000;

type AuthSnapshot = { user: User; profile: Profile | null };

function readSnapshot(): AuthSnapshot | null {
    try {
        const raw = window.localStorage.getItem(SNAPSHOT_KEY);
        const snap = raw ? JSON.parse(raw) as AuthSnapshot : null;
        return snap?.user ? snap : null;
    } catch {
        return null;
    }
}

function writeSnapshot(user: User | null, profile: Profile | null) {
    try {
        if (!user) {
            window.localStorage.removeItem(SNAPSHOT_KEY);
            return;
        }
        const safeProfile = profile ? { ...profile, telephone: '' } : null;
        window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ user, profile: safeProfile }));
    } catch {
        // Storage can be unavailable (private mode, quota); the live check still runs.
    }
}

const isAuthRejection = (error: unknown) =>
    error instanceof Error && /\b(401|403|404)\b/.test(error.message);

/** /api/auth/me with a timeout and one retry for slow or dropped networks. */
async function fetchProfile() {
    for (let attempt = 1; ; attempt++) {
        try {
            return await fetchWithCache<any>(`/api/auth/me?_v=${CACHE_VERSION}`, {
                credentials: 'include',
                signal: AbortSignal.timeout(PROFILE_FETCH_TIMEOUT_MS),
            }, 300);
        } catch (error) {
            if (attempt >= 2 || isAuthRejection(error)) throw error;
        }
    }
}

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
        writeSnapshot(null, null);
        clearApiCache();
    }, [supabase.auth]);

    const fetchUserProfile = useCallback(async () => {
        try {
            const data = await fetchProfile();

            setUser(data.user);
            setProfile(data.profile);
            writeSnapshot(data.user, data.profile);
        } catch (error) {
            console.error('[AuthContext] Refresh profile error:', error);
        }
    }, []);

    // Refresh CF data — called explicitly from profile page, not on every page load
    const refreshCfData = useCallback(() => {
        fetch('/api/user/refresh-cf', {
            method: 'POST',
            credentials: 'include',
        }).catch(() => {});
    }, []);

    // Initialize auth state from Supabase session
    useEffect(() => {
        const initAuth = async () => {
            const snapshot = readSnapshot();
            if (snapshot) {
                setUser(snapshot.user);
                setProfile(snapshot.profile);
                setIsAuthenticated(true);
                setLoading(false);
            }

            const signOutLocally = () => {
                setUser(null);
                setProfile(null);
                setIsAuthenticated(false);
                writeSnapshot(null, null);
            };

            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // Fetch the app profile from our API
                    const data = await fetchProfile();

                    if (data.user) {
                        setUser(data.user);
                        setProfile(data.profile);
                        setIsAuthenticated(true);
                        writeSnapshot(data.user, data.profile);
                    } else {
                        signOutLocally();
                    }
                } else {
                    signOutLocally();
                }
            } catch (error) {
                // An expired session signs out; a slow or failed network keeps
                // the remembered user so the student is not kicked out offline.
                if (isAuthRejection(error)) signOutLocally();
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
                writeSnapshot(null, null);
                clearApiCache();
            } else if (session && event === 'SIGNED_IN') {
                // Only clear cache on actual sign-in, not token refresh
                clearApiCache();
                try {
                    const data = await fetchProfile();
                    if (data.user) {
                        setUser(data.user);
                        setProfile(data.profile);
                        setIsAuthenticated(true);
                        writeSnapshot(data.user, data.profile);
                    }
                } catch {
                    // Will retry on next interaction
                }
            } else if (session && event === 'TOKEN_REFRESHED') {
                // Token refreshed — don't re-fetch, the cached data is still valid
                // The auth cache in verifyAuth handles token changes
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
