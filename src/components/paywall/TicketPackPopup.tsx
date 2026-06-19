type TicketKind = 'court' | 'interest';

type TicketPackPopupProps = {
  kind: TicketKind;
  onPurchase: (productId: string) => void;
  onBack: () => void;
  onClose: () => void;
};

export default function TicketPackPopup({
  kind,
  onPurchase,
  onBack,
  onClose,
}: TicketPackPopupProps) {
  const isInterest = kind === 'interest';
  const mainColor = isInterest ? '#C9A84C' : '#1B4332';
  const titleIcon = isInterest ? '💛' : '🎾';
  const title = isInterest ? '관심 코트 신청권 팩' : '코트 신청권 팩';
  const subtitle = isInterest ? '관심 코트를 원하는 만큼 표시할 수 있어요' : '원하는 만큼 신청할 수 있어요';
  const ticket5ProductId = isInterest ? 'tennis_meet_interest_ticket' : 'tennis_meet_ticket';
  const ticket10ProductId = isInterest ? 'tennis_meet_interest_ticket_10' : 'tennis_meet_ticket_10';

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
          <p className="text-lg font-bold mb-2">
            {titleIcon} {title}
          </p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>

        <div className="px-6 mt-4">
          <div className="rounded-2xl border p-4">
            <p className="font-semibold mb-1">
              {isInterest ? '관심 신청권 5개' : '코트 신청권 5개'}
            </p>
            <p className="text-lg font-bold mb-1" style={{ color: isInterest ? '#7A5A14' : '#1B4332' }}>
              ₩4,900
            </p>
            <p className="text-xs text-gray-400 mb-3">(1개당 ₩980)</p>

            <button
              type="button"
              onClick={() => onPurchase(ticket5ProductId)}
              className="w-full py-3 rounded-xl text-white font-bold active:opacity-80"
              style={{ background: mainColor }}
            >
              지금 구매하기
            </button>
          </div>
        </div>

        <div className="px-6 mt-4">
          <div
            className="rounded-2xl p-4"
            style={{
              border: `1.5px solid ${mainColor}`,
              background: '#fff',
            }}
          >
            <p className="font-semibold mb-1">
              {isInterest ? '관심 신청권 10개' : '코트 신청권 10개'} ⭐ 인기
            </p>
            <p className="text-lg font-bold mb-1" style={{ color: isInterest ? '#7A5A14' : '#1B4332' }}>
              ₩8,900
            </p>
            <p className="text-xs text-gray-400 mb-3">(11% 할인)</p>

            <button
              type="button"
              onClick={() => onPurchase(ticket10ProductId)}
              className="w-full py-3 rounded-xl text-white font-bold active:opacity-80"
              style={{ background: mainColor }}
            >
              지금 구매하기
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
