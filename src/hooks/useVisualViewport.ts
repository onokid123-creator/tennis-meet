import { useEffect, useState, useRef } from 'react';

/**
 * visualViewport 높이를 추적하는 훅.
 *
 * 키보드 깜빡임 수정:
 * - 이전: resize/scroll 이벤트마다 즉시 setState → 키보드 애니메이션 중
 *   수십 번 리렌더 → 스크롤 → 또 viewport 변화 → 무한 깜빡임
 * - 수정: 디바운스를 걸어서 "키보드 애니메이션이 끝난 뒤" 한 번만 반영
 *   + 변화량이 작으면(10px 이하) 무시
 */
export function useVisualViewport() {
  const [height, setHeight] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return window.visualViewport?.height || window.innerHeight;
  });

  const lastHeightRef = useRef(height);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const updateHeight = () => {
      const newHeight = window.visualViewport?.height || window.innerHeight;

      // 변화량이 10px 이하면 무시 (미세한 흔들림 = 깜빡임 원인)
      if (Math.abs(newHeight - lastHeightRef.current) < 10) return;

      // 디바운스: 연속 이벤트를 묶어서 마지막 한 번만 반영
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        lastHeightRef.current = newHeight;
        setHeight(newHeight);
      }, 100);
    };

    window.visualViewport?.addEventListener('resize', updateHeight);
    window.addEventListener('resize', updateHeight);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.visualViewport?.removeEventListener('resize', updateHeight);
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return height;
}
