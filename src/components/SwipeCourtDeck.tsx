import { Court } from '../types';
import DatingCourtCard from './DatingCourtCard';

interface SwipeCourtDeckProps {
  courts: Court[];
  onApply: (court: Court) => void;
  onCardClick?: (court: Court) => void;
  isOwnerMode?: boolean;
  onEdit?: (court: Court) => void;
  onDelete?: (court: Court) => void;
}

export default function SwipeCourtDeck({ courts, onApply, isOwnerMode, onEdit, onDelete }: SwipeCourtDeckProps) {
  if (courts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,126,138,0.1)', border: '1.5px solid rgba(255,126,138,0.25)' }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FF7E8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm mb-1" style={{ color: '#FF7E8A' }}>아직 인연이 없어요</p>
          <p className="text-xs" style={{ color: 'rgba(255,126,138,0.55)' }}>첫 번째 설레는 만남을 열어보세요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courts.map((court) => (
        <DatingCourtCard
          key={court.id}
          court={court}
          isOwner={isOwnerMode}
          onApply={!isOwnerMode ? () => onApply(court) : undefined}
          onEdit={onEdit ? () => onEdit(court) : undefined}
          onDelete={onDelete ? () => onDelete(court) : undefined}
        />
      ))}
    </div>
  );
}
