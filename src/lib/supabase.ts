import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL과 Anon Key가 필요합니다.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    // 동시 접속자가 많아도 안정적으로 유지되도록 설정
    params: {
      // 초당 이벤트 제한 (기본 10 → 5로 낮춰서 서버 부하 감소)
      eventsPerSecond: 5,
    },
    // heartbeat: 연결이 살아있는지 확인하는 주기 (기본 30초 유지)
    heartbeatIntervalMs: 30_000,
    // 재연결 시도 간격: 점진적으로 늘어남 (1초 → 2초 → 5초 → 10초)
    reconnectAfterMs: (tries: number) => {
      return [1000, 2000, 5000, 10000][tries - 1] ?? 10000;
    },
  },
  // 전역 fetch 타임아웃: 네트워크가 느려도 무한 대기하지 않음
  global: {
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15_000);
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
});
