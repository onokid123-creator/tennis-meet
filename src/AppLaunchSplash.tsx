import { useEffect } from "react";

export default function AppLaunchSplash({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    // 이전: 무조건 650ms 고정 대기 → 앱 켤 때마다 강제로 0.65초 손해
    // 변경: 200ms만 보여주고 바로 넘어감 (스플래시는 깜빡임 방지용 최소 시간만)
    // 실제 데이터 로딩은 각 화면이 캐시를 먼저 보여주며 처리
    const timer = setTimeout(() => {
      onFinish();
    }, 200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      <img
        src="/splash.png"
        alt="Tennis Meet"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
