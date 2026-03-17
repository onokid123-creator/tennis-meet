import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, age: number, gender: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FETCH_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const queryPromise = supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
      const { data, error } = await withTimeout(queryPromise as unknown as Promise<{ data: Profile | null; error: unknown }>, FETCH_TIMEOUT_MS);
      if (error) {
        console.error('프로필 가져오기 실패:', error);
        return null;
      }
      return data;
    } catch {
      console.warn('프로필 fetch 타임아웃 또는 실패');
      return null;
    }
  };

  const refreshProfile = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const profileData = await fetchProfile(currentUser.id);
      setProfile(profileData);
    }
  };

  const updateProfile = (updates: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { data: { user: verifiedUser } } = await withTimeout(
          supabase.auth.getUser(),
          FETCH_TIMEOUT_MS
        );

        if (cancelled) return;

        if (!verifiedUser) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(verifiedUser);

        const profileData = await fetchProfile(verifiedUser.id);
        if (cancelled) return;
        setProfile(profileData);
      } catch (err) {
        console.warn('초기 세션 로드 실패:', err);
        if (!cancelled) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session?.user) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
        setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid')) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      throw new Error('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const signUp = async (email: string, password: string, name: string, age: number, gender: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, age, gender } },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
        throw new Error('이미 가입된 이메일입니다. 로그인 화면에서 시도해주세요.');
      }
      throw new Error('회원가입에 실패했습니다. 다시 시도해주세요.');
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: data.user.id,
        name,
        age,
        gender,
        profile_completed: false,
      }, { onConflict: 'user_id', ignoreDuplicates: true });
      if (profileError) {
        console.error('프로필 생성 실패:', profileError);
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내에서 사용해야 합니다.');
  }
  return context;
}
