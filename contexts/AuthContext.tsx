'use client';
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/db/client';

interface AuthUser {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  role: string;
  job_title: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  website_url: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  profileError: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The session is an HttpOnly cookie, so the browser sends it on its own.
async function fetchProfileViaAPI(): Promise<Profile | null> {
  try {
    const response = await fetch('/api/auth/profile');
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const db = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    setUser(session.user);
    setProfileError(false);
    const profileData = await fetchProfileViaAPI();
    if (profileData) setProfile(profileData);
    else setProfileError(true);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  const signIn = useCallback(async (email: string, password: string) => {
    setProfileError(false);
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (!error) await load();
    return { error: error ? new Error(error.message) : null };
  }, [db, load]);

  const signOut = useCallback(async () => {
    await db.auth.signOut();
    setUser(null);
    setProfile(null);
    setProfileError(false);
  }, [db]);

  const refreshProfile = useCallback(async () => {
    setProfileError(false);
    const profileData = await fetchProfileViaAPI();
    if (profileData) setProfile(profileData);
    else setProfileError(true);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileError, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
