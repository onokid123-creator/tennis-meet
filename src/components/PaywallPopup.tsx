import { Capacitor } from '@capacitor/core';
import { purchaseProduct } from '../lib/billing';

type PaywallStep =
  | 'first_limit'
  | 'subscription_intro'
  | 'ticket_pack'
  | 'out_of_tickets'
  | null;

interface PaywallPopupProps {
  show: boolean;
  step: PaywallStep;
  onClose: () => void;
  onChangeStep: (step: PaywallStep) => void;
}

export default function PaywallPopup({
  show,
  step,
  onClose,
  onChangeStep,
}: PaywallPopupProps) {
  const handlePurchase = async (productId: string) => {
    try {
      await purchaseProduct(productId);
      alert('결제 진행 중');
    } catch (e: any) {
      alert(e.message || '결제 실패');
    }
  };

  if (!show || !step) return null;

  return (
    <>
      {step === 'first_limit' && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <div
            className="w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
            style={{
              background: 'linear-gradient(135deg, #FFF5F7 0%, #FFE4E6 100%)',
              maxHeight: '85dvh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-2 text-center">
              <div className="w-10 h-1 rounded-full mx-auto mb-5 bg-pink-200" />
              <p className="text-lg font-bold mb-2 text-[#4A1D1F]">
                🎾 더 많은 매칭을 원하세요?
              </p>
              <p className="text-sm text-[#7C2D2F]">
                신청 횟수를 모두 사용했어요.
                <br />
                구독하거나 신청권을 구매해 계속 만나보세요!
              </p>
            </div>

            <div className="px-6 mt-4">
              <div
                className="rounded-2xl p-4"
                style={{
                  background: '#fff',
                  border: '1px solid rgba(244,63,94,0.2)',
                  boxShadow: '0 6px 20px rgba(244,63,94,0.15)',
                }}
              >
                <p className="font-bold text-sm mb-2 text-[#4A1D1F]">💎 월 구독</p>
                <p className="text-base font-bold mb-2">₩14,900 / 월</p>
               <p className="text-xs text-gray-500 mb-3 leading-5">
  • 코트 신청 무제한
  <br />
  • 관심 신청 무제한
  <br />
  • 사람부터 구할래요에서 먼저 노출
  <br />
  • 더 많은 이성에게 프로필 노출
  <br />
  • 월간 자동 갱신 구독
  <br />
  • {Capacitor.getPlatform() === 'android'
    ? 'Google Play 구독에서 언제든 해지 가능'
    : 'App Store 구독에서 언제든 해지 가능'}
</p>

<p className="text-[11px] text-gray-400 text-center leading-5 mt-3">
  구독 시{' '}
  <a
    href="https://www.notion.so/Tennis-Meet-3227ab850607803d85ecf5380d35a1bd?source=copy_link"
    target="_blank"
    rel="noopener noreferrer"
    className="underline"
  >
    개인정보처리방침
  </a>
  {' '}및{' '}
  <a
    href="https://www.notion.so/Tennis-Meet-3227ab850607805fbd52d118989b2407?source=copy_link"
    target="_blank"
    rel="noopener noreferrer"
    className="underline"
  >
    이용약관
  </a>
  에 동의하는 것으로 간주됩니다.
</p>

                <button
                  onClick={() => handlePurchase('dating_monthly_premium')}
                  className="w-full py-3 rounded-xl text-white font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)',
                  }}
                >
                  지금 구독 시작
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-gray-400 mt-4">또는</div>

            <div className="px-6 mt-3">
              <button
                onClick={() => onChangeStep('ticket_pack')}
                className="w-full py-3 rounded-xl font-semibold"
                style={{
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              >
                💳 신청권만 구매하기
              </button>
            </div>

            <div className="px-6 mt-3 mb-6">
              <button
                onClick={onClose}
                className="w-full py-2 text-sm text-gray-400"
              >
                나중에
              </button>
            </div>
          </div>
        </div>
      )}
{step === 'subscription_intro' && (
  <div
    className="fixed inset-0 z-[9999] flex items-end justify-center"
    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    onClick={onClose}
  >
    <div
      className="w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #FFF5F7 0%, #FFE4E6 100%)',
        maxHeight: '85dvh',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-6 pt-6 pb-2 text-center">
        <div className="w-10 h-1 rounded-full mx-auto mb-5 bg-pink-200" />

        <p className="text-lg font-bold mb-2 text-[#4A1D1F]">
          💎 설레는 만남 프리미엄
        </p>

        <p className="text-sm text-[#7C2D2F]">
          더 많은 매칭과 프리미엄 기능을 이용해보세요!
        </p>
      </div>

      <div className="px-6 mt-4">
        <div
          className="rounded-2xl p-4"
          style={{
            background: '#fff',
            border: '1px solid rgba(244,63,94,0.2)',
            boxShadow: '0 6px 20px rgba(244,63,94,0.15)',
          }}
        >
          <p className="font-bold text-sm mb-2 text-[#4A1D1F]">
            💎 월 구독
          </p>

          <p className="text-base font-bold mb-2">
            ₩14,900 / 월
          </p>

        <p className="text-xs text-gray-500 mb-3 leading-5">
  • 코트 신청 무제한
  <br />
  • 관심 신청 무제한
  <br />
  • 사람부터 구할래요에서 먼저 노출
  <br />
  • 더 많은 이성에게 프로필 노출
  <br />
  • 월간 자동 갱신 구독
  <br />
  • {Capacitor.getPlatform() === 'android'
    ? 'Google Play 구독에서 언제든 해지 가능'
    : 'App Store 구독에서 언제든 해지 가능'}
</p>

<p className="text-[11px] text-gray-400 text-center leading-5 mt-3">
  구독 시{' '}
  <a
   href="https://www.notion.so/Tennis-Meet-3227ab850607803d85ecf5380d35a1bd?source=copy_link"
    target="_blank"
    rel="noopener noreferrer"
    className="underline"
  >
    개인정보처리방침
  </a>
  {' '}및{' '}
  <a
   href="https://www.notion.so/Tennis-Meet-3227ab850607805fbd52d118989b2407?source=copy_link"
    target="_blank"
    rel="noopener noreferrer"
    className="underline"
  >
    이용약관
  </a>
  에 동의하는 것으로 간주됩니다.
</p>

          <button
            onClick={() => handlePurchase('dating_monthly_premium')}
            className="w-full py-3 rounded-xl text-white font-semibold"
            style={{
              background:
                'linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)',
            }}
          >
            지금 구독 시작
          </button>
        </div>
      </div>

      <div className="px-6 mt-3 mb-6">
        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-gray-400"
        >
          닫기
        </button>
      </div>
    </div>
  </div>
)}
      {step === 'ticket_pack' && (
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
              <p className="text-lg font-bold mb-2">🎾 신청권 팩</p>
              <p className="text-sm text-gray-500">원하는 만큼 신청할 수 있어요.</p>
            </div>

            <div className="px-6 mt-4">
              <div className="rounded-2xl border p-4">
                <p className="font-semibold mb-1">신청권 5개</p>
                <p className="text-lg font-bold mb-1">₩4,900</p>
                <p className="text-xs text-gray-400 mb-3">(1개당 ₩980)</p>

                <button
                  onClick={() => handlePurchase('tennis_meet_ticket')}
                  className="w-full py-3 rounded-xl bg-black text-white"
                >
                  지금 구매하기
                </button>
              </div>
            </div>

            <div className="px-6 mt-4">
              <div className="rounded-2xl border p-4">
                <p className="font-semibold mb-1">신청권 10개 ⭐ 인기</p>
                <p className="text-lg font-bold mb-1">₩8,900</p>
                <p className="text-xs text-gray-400 mb-3">(11% 할인)</p>

                <button
                  onClick={() => handlePurchase('tennis_meet_ticket_10')}
                  className="w-full py-3 rounded-xl bg-black text-white"
                >
                  지금 구매하기
                </button>
              </div>
            </div>

            <div className="px-6 mt-4 mb-6">
              <button
                onClick={() => onChangeStep('first_limit')}
                className="w-full py-2 text-sm text-gray-400"
              >
                뒤로 가기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}