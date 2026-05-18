import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** @deprecated 항상 false. 하위 호환용. */
  isResyncing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, age: number, gender: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
  /**
   * resume 후에도 안전하게 현재 유저를 가져옴.
   * getSession()은 캐시를 쓰므로 resume 직후 stale할 수 있어서
   * 모든 화면은 getSession() 대신 이걸 써야 함.
   */
  getSafeUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_FIELDS =
  'user_id,id,name,age,gender,purpose,profile_completed,photo_url,photo_urls,experience,tennis_style,bio,mbti,height,tennis_photo_url,phone_number,ticket_count,is_subscribed,free_meeting_count,fcm_token';

// ── 프로필 캐시 (30초 TTL) ────────────────────────────
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
    profileCache[userId] = { data: data as unknown as Profile, ts: Date.now() };
    return data as unknown as Profile;
  } catch {
    return null;
  }
}

export function clearProfileCache(userId?: string) {
  if (userId) {
    delete profileCache[userId];
  } else {
    Object.keys(profileCache).forEach((k) => delete profileCache[k]);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isResyncing = false; // 항상 false, 하위 호환용

  const initDone = useRef(false);
  // user를 ref로도 유지 → 클로저 stale 방지
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  // resync 중복 실행 방지
  const resyncingRef = useRef(false);

  // ── 핵심: resume 후에도 안전하게 user를 가져오는 헬퍼 ──
  // getSession()은 로컬 캐시를 반환 → resume 직후 stale
  // getUser()는 항상 서버 토큰 검증 → 정확하지만 네트워크 필요
  // 따라서 getUser()를 쓰되 타임아웃을 걸고, 실패 시 ref 값으로 폴백
  const getSafeUser = useCallback(async (): Promise<User | null> => {
    // 1) getUser()를 2초만 기다린다 (서버 검증, 가장 정확)
    //    iOS 복귀 직후엔 연결이 죽어서 멈출 수 있으므로 짧게.
    try {
      const result = await Promise.race([
        supabase.auth.getUser(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (result) {
        const { data: { user: freshUser }, error } = result;
        if (!error && freshUser) return freshUser;
      }
    } catch {
      // 무시하고 폴백으로
    }

    // 2) getUser()가 멈췄거나 실패 → getSession()으로 폴백
    //    getSession()은 로컬 저장소를 읽으므로 네트워크 없이 즉시 응답.
    //    resume 직후라 약간 stale할 수 있지만 "멈추는 것"보단 낫다.
    try {
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);
      if (sessionResult) {
        const sessionUser = sessionResult.data.session?.user;
        if (sessionUser) return sessionUser;
      }
    } catch {
      // 무시
    }

    // 3) 그것마저 실패 → 메모리에 들고 있던 ref 값
    return userRef.current;
  }, []);

  const refreshProfile = useCallback(async () => {
    const freshUser = await getSafeUser();
    if (!freshUser) return;
    clearProfileCache(freshUser.id);
    const profileData = await fetchProfileById(freshUser.id);
    setProfile(profileData);
  }, [getSafeUser]);

  const updateProfile = useCallback((updates: Partial<Profile>) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      if (prev.user_id && profileCache[prev.user_id]) {
        profileCache[prev.user_id] = { data: next, ts: Date.now() };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    // ── 초기 세션 로드 ──────────────────────────────
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          setUser(null);
          setProfile(null);
          return;
        }
        setUser(session.user);
        const profileData = await fetchProfileById(session.user.id);
        if (!cancelled) setProfile(profileData);
      } catch (err) {
        console.warn('[AuthContext] 초기 세션 로드 실패:', err);
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

    // ── app-resumed: 조용히 세션 갱신, UI 절대 block 안 함 ──
    const resyncSession = async () => {
      if (resyncingRef.current) return;
      resyncingRef.current = true;
      let didResync = false;
      console.log('[AuthContext] app-resumed → 세션 갱신');

      try {
        const result = await Promise.race([
          supabase.auth.getUser(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);

        if (cancelled || !result) {
          console.warn('[AuthContext] getUser 응답 없음 → 기존 상태 유지');
          return;
        }

        const { data: { user: freshUser }, error } = result;
        if (error || !freshUser) {
          // 401(토큰 완전 만료)일 때만 로그아웃 처리
          if (error?.status === 401) {
            setUser(null);
            setProfile(null);
          }
          return;
        }

        setUser(freshUser);
        clearProfileCache(freshUser.id);
        const profileData = await fetchProfileById(freshUser.id);
        if (!cancelled) setProfile(profileData);
        didResync = true;

        // 토큰 만료 5분 이내면 refresh
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.expires_at) {
          const needsRefresh = session.expires_at * 1000 < Date.now() + 5 * 60 * 1000;
          if (needsRefresh) {
            await supabase.auth.refreshSession();
          }
        }
      } catch (err) {
        console.error('[AuthContext] resync 예외:', err);
      } finally {
        resyncingRef.current = false;
        // 세션 확인이 실제로 성공했을 때만 화면들에게 갱신 알림을 보낸다.
        // getUser timeout 상태에서 auth-resynced를 쏘면 Home/Applications/Chats가 불필요하게 재조회되며 느려진다.
        if (!cancelled && didResync) {
          window.dispatchEvent(new CustomEvent('auth-resynced'));
        }
      }
    };

    window.addEventListener('app-resumed', resyncSession);

    // ── Supabase auth 상태 변화 구독 ────────────────
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
      window.removeEventListener('app-resumed', resyncSession);
      subscription.unsubscribe();
    };
  }, []);

  // ── 로그인 ─────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid')) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      throw new Error('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // ── 회원가입 ────────────────────────────────────────
  const signUp = async (email: string, password: string, name: string, age: number, gender: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, age, gender } },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already'))
        throw new Error('이미 가입된 이메일입니다. 로그인 화면에서 시도해주세요.');
      if (msg.includes('password')) throw new Error('비밀번호는 6자 이상이어야 합니다.');
      if (msg.includes('email')) throw new Error('올바른 이메일 형식이 아닙니다.');
      throw new Error(`회원가입에 실패했습니다: ${error.message}`);
    }
    if (!data.user) throw new Error('회원가입 처리 중 오류가 발생했습니다. 다시 시도해주세요.');

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { user_id: data.user.id, name, age, gender, profile_completed: false },
        { onConflict: 'user_id' }
      );
    if (profileError && profileError.code !== '23505') {
      console.error('[SignUp] profile upsert error:', profileError.message);
    }

    const pendingToken = localStorage.getItem('pending_fcm_token');
    if (pendingToken) {
      await supabase.from('profiles').update({ fcm_token: pendingToken }).eq('user_id', data.user.id);
      localStorage.removeItem('pending_fcm_token');
    }
  };

  // ── 로그아웃 ────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
    clearProfileCache();
    setProfile(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isResyncing,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
        getSafeUser,
      }}
    >
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
