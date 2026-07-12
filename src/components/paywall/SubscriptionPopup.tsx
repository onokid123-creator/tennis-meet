import { Capacitor } from '@capacitor/core';

type SubscriptionPopupProps = {
  onPurchase: () => void;
  onBack: () => void;
  onClose: () => void;
};

export default function SubscriptionPopup({
  onPurchase,
  onBack,
  onClose,
}: SubscriptionPopupProps) {
  const platform = Capacitor.getPlatform();
  const cancelGuide =
    platform === 'android'
      ? 'Google Play 구독에서 언제든 해지 가능'
      : 'Apple 계정 설정에서 언제든 해지 가능';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
        style={{ background: '#fff', maxHeight: '85dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2 text-center">
          <div className="w-10 h-1 rounded-full mx-auto mb-5 bg-gray-200" />
          <div className="text-4xl mb-3">💎</div>
          <p className="text-lg font-bold mb-1">테니스 메이트 프리미엄</p>
        </div>

        <div className="px-6 mt-4">
          <div className="rounded-2xl border p-5">
            <p className="font-bold text-sm mb-2">💎 월 구독</p>
            <p className="text-2xl font-extrabold mb-4">
              ₩14,900 <span className="text-sm font-bold text-gray-400">/ 월</span>
            </p>

            <p className="text-sm leading-relaxed text-gray-700 mb-4">
              · 코트 신청 무제한<br />
              · 관심 신청 무제한<br />
              · 월간 자동 갱신 구독<br />
              · {cancelGuide}
            </p>

            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              구독 시 개인정보처리방침 및 이용약관에 동의하는 것으로 간주됩니다.
            </p>

            <button
              type="button"
              onClick={onPurchase}
              className="w-full py-3.5 rounded-xl text-white font-bold active:opacity-80"
              style={{ background: '#C74472' }}
            >
              지금 구독 시작
            </button>
          </div>
        </div>

        <div className="px-6 mt-4 mb-6">
          <button
            type="button"
            onClick={onBack}
            className="w-full py-2 text-sm text-gray-400 active:opacity-80"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    </div>
  );
}
