import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
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

const PROFILE_FIELDS = 'user_id,id,name,age,gender,purpose,profile_completed,photo_url,photo_urls,experience,tennis_style,bio,mbti,height,tennis_photo_url,phone_number';

const profileCache: { [userId: string]: { data: Profile; ts: number } } = {};
const CACHE_TTL_MS = 30_000;

async function fetchProfileById(userId: string): Promise<Profile | null> {
  const cached = profileCache[userId];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    profileCache[userId] = { data: data as Profile, ts: Date.now() };
    return data as Profile;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);

  const refreshProfile = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      if (profileCache[currentUser.id]) delete profileCache[currentUser.id];
      const profileData = await fetchProfileById(currentUser.id);
      setProfile(profileData);
    }
  };

  const updateProfile = (updates: Partial<Profile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      if (prev.user_id && profileCache[prev.user_id]) {
        profileCache[prev.user_id] = { data: next, ts: Date.now() };
      }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (cancelled) return;

        if (!session?.user) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const sessionUser = session.user;
        setUser(sessionUser);

        const profileData = await fetchProfileById(sessionUser.id);
        if (cancelled) return;
        setProfile(profileData);
      } catch (err) {
        console.warn('초기 세션 로드 실패:', err);
        if (!cancelled) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          initDone.current = true;
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!initDone.current) return;

      (async () => {
        if (!session?.user) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setUser(session.user);
        const profileData = await fetchProfileById(session.user.id);
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
      console.error('[Login] error code:', error.status, '| message:', error.message);
      if (error.message.includes('Invalid') || error.message.includes('invalid')) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      throw new Error('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const signUp = async (email: string, password: string, name: string, age: number, gender: string) => {
    console.log('[SignUp] 시도 이메일:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, age, gender } },
    });

    if (error) {
      console.error('[SignUp] auth signup error:', error.status, error.message);
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
        throw new Error('이미 가입된 이메일입니다. 로그인 화면에서 시도해주세요.');
      }
      if (msg.includes('password')) {
        throw new Error('비밀번호는 6자 이상이어야 합니다.');
      }
      if (msg.includes('email')) {
        throw new Error('올바른 이메일 형식이 아닙니다.');
      }
      throw new Error(`회원가입에 실패했습니다: ${error.message}`);
    }

    console.log('[SignUp] auth.user uid:', data.user?.id ?? '없음');

    if (!data.user) {
      throw new Error('회원가입 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      user_id: data.user.id,
      name,
      age,
      gender,
      profile_completed: false,
    }, { onConflict: 'user_id' });

    if (profileError) {
      console.error('[SignUp] profile insert/upsert error:', profileError.code, profileError.message);
      if (profileError.code === '23505') {
        console.warn('[SignUp] 기존 프로필 row 존재 - 이메일 중복 또는 orphan row. upsert로 덮어씀');
      }
    } else {
      console.log('[SignUp] 프로필 생성 완료');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    Object.keys(profileCache).forEach((k) => delete profileCache[k]);
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
