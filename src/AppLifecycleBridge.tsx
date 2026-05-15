import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from './lib/supabase';

/**
 * iOS WebView 백그라운드 복귀 처리 전략
 *
 * ── 왜 이렇게 하는가 ──
 * iOS는 앱이 background로 가면 WebView의 네트워크 연결(fetch, WebSocket)을
 * 죽여버린다. 문제는 이 연결이 "죽은 채로" 객체는 살아있어서,
 * getUser()나 realtime.connect()가 죽은 연결을 재사용하려다 영원히 멈춘다.
 * → disconnect/connect로 살리려 해도 안 됨 (CLOSED 무한 반복)
 *
 * ── 해결책 ──
 * "연결을 살리려 애쓰지 말고, 죽었으면 페이지를 새로고침한다."
 * reload는 모든 연결을 처음부터 다시 만들기 때문에 100% 확실하다.
 *
 * - background 3초 미만: 거의 연결 안 죽음 → 아무것도 안 함
 * - background 3초 이상: 연결 죽었을 가능성 높음 → 즉시 reload
 *
 * reload가 느리게 느껴지지 않도록, 각 화면이 sessionStorage 캐시를
 * 먼저 보여주고 뒤에서 갱신하는 구조와 함께 동작한다.
 */

// 이 시간 이상 background에 있었으면 reload
// 30초 이상 background일 때만 reload한다. 짧은 background 복귀는 soft resync로 처리한다.
// 짧은 알림 확인(2~3초)은 살아남고, 그 이상은 reload가 안전.
const RELOAD_THRESHOLD_MS = 8_000;

export default function AppLifecycleBridge() {
  const backgroundAtRef = useRef<number | null>(null);
  const handlingRef = useRef(false);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;

    const handleResume = async () => {
      if (handlingRef.current) return;
      handlingRef.current = true;

      const backgroundAt = backgroundAtRef.current;
      const backgroundDuration = backgroundAt ? Date.now() - backgroundAt : 0;

      console.log('[LifecycleBridge] 복귀', { backgroundDuration });

      // ── 3초 이상 background → reload (가장 확실한 복구) ──
      if (backgroundDuration >= RELOAD_THRESHOLD_MS) {
        console.log('[LifecycleBridge] 연결이 죽었을 가능성 높음 → reload');
        // reload 직전, 현재 경로를 저장해서 reload 후 같은 화면으로 복귀
        try {
          sessionStorage.setItem('resume_path', window.location.pathname + window.location.search);
        } catch {
          // sessionStorage 접근 실패해도 무시
        }
        window.location.reload();
        return;
      }

      // ── 아주 짧은 background 복귀는 아무것도 하지 않는다 ──
      // iOS에서 1~5초 홈 화면/앱 전환만으로 auth-resync를 돌리면
      // Chats/Auth 흐름이 오히려 흔들릴 수 있다.
      if (backgroundDuration < 5_000) {
        console.log('[LifecycleBridge] 짧은 background 복귀 → resync 생략', { backgroundDuration });
        handlingRef.current = false;
        return;
      }

      // ── 5초 이상 30초 미만 → 전체 reload 없이 soft resync ──
      try {
        await supabase.realtime.connect();
        window.dispatchEvent(new CustomEvent('app-resumed', {
          detail: { backgroundDuration },
        }));
      } catch (err) {
        console.warn('[LifecycleBridge] 가벼운 복구 실패 → reload', err);
        window.location.reload();
        return;
      } finally {
        handlingRef.current = false;
      }
    };

    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        // background 진입 시각 기록
        backgroundAtRef.current = Date.now();
        handlingRef.current = false;
      } else {
        // foreground 복귀 → 바로 처리 (디바운스 없음, 빠르게)
        handleResume();
      }
    }).then((handle) => {
      sub = handle;
    });

    return () => {
      sub?.remove();
    };
  }, []);

  return null;
}
