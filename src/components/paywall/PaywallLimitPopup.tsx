type TicketKind = 'court' | 'interest';

type PaywallLimitPopupProps = {
  kind: TicketKind;
  onBuyTicket: () => void;
  onSubscribe: () => void;
  onClose: () => void;
};

export default function PaywallLimitPopup({
  kind,
  onBuyTicket,
  onSubscribe,
  onClose,
}: PaywallLimitPopupProps) {
  const isInterest = kind === 'interest';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
        style={{
          background: 'linear-gradient(135deg, #F7FAF8 0%, #EEF5EF 100%)',
          maxHeight: '85dvh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2 text-center">
          <div className="w-10 h-1 rounded-full mx-auto mb-5 bg-green-200" />

          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
            style={{ background: 'rgba(45,106,79,0.08)' }}
          >
            🎾
          </div>

          <p className="text-lg font-bold mb-3" style={{ color: '#10251B' }}>
            무료 신청권을 모두 사용하셨어요
          </p>

          <p className="text-sm leading-relaxed" style={{ color: 'rgba(16,37,27,0.55)' }}>
            계속 이용하시려면<br />
            {isInterest ? '관심 코트 신청권 구매 또는 구독해주세요' : '코트 신청권 구매 또는 구독해주세요'}
          </p>
        </div>

        <div className="px-6 mt-5">
          <button
            type="button"
            onClick={onBuyTicket}
            className="w-full py-4 rounded-xl font-bold text-white active:opacity-80"
            style={{
              background: '#1B4332',
              boxShadow: '0 6px 18px rgba(27,67,50,0.18)',
            }}
          >
            {isInterest ? '관심 코트 신청권 구매' : '코트 신청권 구매'}
          </button>
        </div>

        <div className="px-6 mt-3">
          <button
            type="button"
            onClick={onSubscribe}
            className="w-full py-4 rounded-xl font-bold active:opacity-80"
            style={{
              background: '#fff',
              color: '#C74472',
              border: '1.5px solid #C74472',
            }}
          >
            💎 구독 시작 (무제한)
          </button>
        </div>

        <div className="px-6 mt-3 mb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-400 active:opacity-80"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
