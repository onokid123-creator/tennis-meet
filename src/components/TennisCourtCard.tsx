import { useState, useRef } from 'react';
import { Court } from '../types';
import { Pencil, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TennisCourtCardProps {
  court: Court;
  isOwner?: boolean;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function getCourtStatus(court: Court): 'open' | 'closing-soon' | 'closed' {
  if (court.status === 'closed') return 'closed';

  const maleSlots = court.male_slots ?? 0;
  const femaleSlots = court.female_slots ?? 0;
  const confirmedMale = court.confirmed_male_slots ?? 0;
  const confirmedFemale = court.confirmed_female_slots ?? 0;
  const totalMale = confirmedMale + maleSlots;
  const totalFemale = confirmedFemale + femaleSlots;

  const maleFullOrNone = totalMale === 0 || confirmedMale >= totalMale;
  const femaleFullOrNone = totalFemale === 0 || confirmedFemale >= totalFemale;
  const hasAnySlot = totalMale > 0 || totalFemale > 0;

  if (hasAnySlot && maleFullOrNone && femaleFullOrNone) return 'closed';

  const hadSlots = confirmedMale > 0 || confirmedFemale > 0;
  if (hadSlots && maleSlots <= 0 && femaleSlots <= 0) return 'closed';

  if (court.end_time && court.date) {
    const endDateTime = new Date(`${court.date}T${court.end_time}`);
    const oneHourBefore = new Date(endDateTime.getTime() - 60 * 60 * 1000);
    const now = new Date();
    if (now >= oneHourBefore && now < endDateTime) return 'closing-soon';
  }

  return 'open';
}

export default function TennisCourtCard({ court, isOwner, onApply, onEdit, onDelete }: TennisCourtCardProps) {
  const profile = court.profile;
  const status = getCourtStatus(court);
  const isClosed = status === 'closed';
  const isClosingSoon = status === 'closing-soon';

  const [photoIndex, setPhotoIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const modalTouchStartX = useRef<number | null>(null);

  const photos: string[] = (() => {
    if (court.tennis_photo_url) return [court.tennis_photo_url];
    if (profile?.tennis_photo_url) return [profile.tennis_photo_url];
    if (profile?.photo_url) return [profile.photo_url];
    return [];
  })();

  const totalMale = (court.confirmed_male_slots ?? 0) + (court.male_slots ?? 0);
  const totalFemale = (court.confirmed_female_slots ?? 0) + (court.female_slots ?? 0);
  const remainMale = court.male_slots ?? 0;
  const remainFemale = court.female_slots ?? 0;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
  };
  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((i) => (i + 1) % photos.length);
  };
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40 && photos.length > 1) {
      if (diff > 0) setPhotoIndex((i) => (i + 1) % photos.length);
      else setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
    }
    touchStartX.current = null;
  };
  const openModal = (idx: number) => { setModalIndex(idx); setModalOpen(true); };
  const modalPrev = (e: React.MouseEvent) => { e.stopPropagation(); setModalIndex((i) => (i - 1 + photos.length) % photos.length); };
  const modalNext = (e: React.MouseEvent) => { e.stopPropagation(); setModalIndex((i) => (i + 1) % photos.length); };
  const handleModalTouchStart = (e: React.TouchEvent) => { modalTouchStartX.current = e.touches[0].clientX; };
  const handleModalTouchEnd = (e: React.TouchEvent) => {
    if (modalTouchStartX.current === null) return;
    const diff = modalTouchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setModalIndex((i) => (i + 1) % photos.length);
      else setModalIndex((i) => (i - 1 + photos.length) % photos.length);
    }
    modalTouchStartX.current = null;
  };

  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: '22px',
        background: '#fff',
        boxShadow: '0 4px 20px rgba(27,67,50,0.10), 0 1px 4px rgba(27,67,50,0.06)',
        border: '1px solid rgba(27,67,50,0.08)',
      }}
    >
      <div
        className="relative select-none"
        style={{ height: photos.length > 0 ? '220px' : '0px' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {photos.length > 0 && (
          <>
            <button
              className="w-full h-full block"
              onClick={() => openModal(photoIndex)}
              style={{ padding: 0, border: 'none', background: 'none' }}
            >
              <img
                key={photoIndex}
                src={photos[photoIndex]}
                alt={profile?.name}
                className="w-full h-full"
                style={{ objectFit: 'contain', objectPosition: 'center', display: 'block', background: '#0d2218' }}
              />
            </button>

            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 40%, transparent 70%)' }}
            />

            {photos.length > 1 && (
              <>
                <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                  {photos.map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: i === photoIndex ? '18px' : '6px',
                        height: '6px',
                        background: i === photoIndex ? '#C9A84C' : 'rgba(255,255,255,0.5)',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10"
                  style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10"
                  style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </>
            )}

            <div className="absolute top-3 right-3 z-10 flex gap-1.5">
              {court.format && (
                <span
                  className="font-semibold rounded-full px-3 py-1 tracking-normal"
                  style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: 12, border: '1.5px solid rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)', letterSpacing: '0.04em' }}
                >
                  {court.format}
                </span>
              )}
              {isClosingSoon && !isClosed && (
                <span
                  className="font-semibold rounded-full px-2.5 py-1"
                  style={{ background: 'rgba(217,119,6,0.85)', color: '#fff', fontSize: 11 }}
                >
                  마감 임박
                </span>
              )}
              {isClosed && (
                <span
                  className="font-semibold rounded-full px-2.5 py-1"
                  style={{ background: 'rgba(220,38,38,0.85)', color: '#fff', fontSize: 11 }}
                >
                  마감
                </span>
              )}
            </div>

            {isOwner && (
              <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
                <button
                  onClick={onEdit}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95"
                  style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                >
                  <Pencil className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={onDelete}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95"
                  style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            )}

            <div className="absolute bottom-3 left-4 right-16 z-10">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold" style={{ fontSize: 16, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  {profile?.name}
                </span>
                {profile?.experience && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(201,168,76,0.3)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.5)', backdropFilter: 'blur(4px)' }}
                  >
                    {profile.experience}
                  </span>
                )}
                {profile?.tennis_style && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', backdropFilter: 'blur(4px)' }}
                  >
                    {profile.tennis_style}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {photos.length === 0 && (
        <div
          className="px-4 pt-3.5 pb-2.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(27,67,50,0.07)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(27,67,50,0.1)', border: '1.5px solid rgba(201,168,76,0.3)' }}
            >
              <span style={{ color: '#1B4332', fontWeight: 700, fontSize: 18 }}>{profile?.name?.charAt(0) || 'U'}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1A2E22' }}>{profile?.name}</span>
                {profile?.experience && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: '#A07828', border: '1px solid rgba(201,168,76,0.3)' }}>
                    {profile.experience}
                  </span>
                )}
                {profile?.tennis_style && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(27,67,50,0.07)', color: '#1B5E42', border: '1px solid rgba(27,67,50,0.14)' }}>
                    {profile.tennis_style}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {court.format && (
              <span
                className="font-semibold rounded-full px-3 py-1"
                style={{ background: '#1B4332', color: '#fff', fontSize: 12, border: 'none', letterSpacing: '0.04em' }}
              >
                {court.format}
              </span>
            )}
            {isClosingSoon && !isClosed && (
              <span className="font-semibold rounded-full px-2.5 py-1" style={{ background: 'rgba(251,146,60,0.1)', color: '#D97706', fontSize: 11 }}>마감 임박</span>
            )}
            {isClosed && (
              <span className="font-semibold rounded-full px-2.5 py-1" style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', fontSize: 11 }}>마감</span>
            )}
            {isOwner && (
              <>
                <button onClick={onEdit} className="p-1.5 rounded-lg transition active:scale-95" style={{ color: 'rgba(27,67,50,0.4)' }}>
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={onDelete} className="p-1.5 rounded-lg transition active:scale-95" style={{ color: 'rgba(27,67,50,0.4)' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="px-4 pt-3.5 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1A2E22' }} className="truncate">{court.court_name}</span>
        </div>

        <div
          className="rounded-2xl px-4 py-3 mb-3 flex flex-col gap-2"
          style={{ background: 'rgba(27,67,50,0.04)', border: '1px solid rgba(27,67,50,0.09)' }}
        >
          {court.date && (
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B5E42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span style={{ fontSize: 13, color: '#1A2E22', opacity: 0.8 }}>{formatDate(court.date)}</span>
            </div>
          )}
          {court.start_time && (
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B5E42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{ fontSize: 13, color: '#1A2E22', opacity: 0.8 }}>
                {court.start_time}{court.end_time ? ` — ${court.end_time}` : ''}
              </span>
            </div>
          )}
        </div>

        {(totalMale > 0 || totalFemale > 0) && (
          <div className="mb-3">
            {isClosed ? (
              <div
                className="rounded-xl px-4 py-2.5 text-center"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}
              >
                <span className="text-sm font-bold" style={{ color: '#DC2626' }}>모집 마감</span>
              </div>
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: totalMale > 0 && totalFemale > 0 ? '1fr 1fr' : '1fr' }}>
                {totalMale > 0 && (
                  <div
                    className="rounded-xl px-3 py-2.5 flex flex-col items-center gap-0.5"
                    style={{
                      background: remainMale <= 0 ? 'rgba(239,68,68,0.06)' : 'rgba(59,130,246,0.07)',
                      border: `1px solid ${remainMale <= 0 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.18)'}`,
                    }}
                  >
                    <span className="text-xs font-semibold" style={{ color: remainMale <= 0 ? '#DC2626' : '#2563EB', opacity: 0.7 }}>남성</span>
                    <span className="font-bold" style={{ fontSize: 15, color: remainMale <= 0 ? '#DC2626' : '#1D4ED8' }}>
                      {remainMale <= 0 ? '마감' : `${remainMale}명 남음`}
                    </span>
                    {totalMale > 0 && (
                      <span className="text-xs" style={{ color: 'rgba(0,0,0,0.35)' }}>
                        {Math.min(court.confirmed_male_slots ?? 0, totalMale)}/{totalMale} 확정
                      </span>
                    )}
                  </div>
                )}
                {totalFemale > 0 && (
                  <div
                    className="rounded-xl px-3 py-2.5 flex flex-col items-center gap-0.5"
                    style={{
                      background: remainFemale <= 0 ? 'rgba(239,68,68,0.06)' : 'rgba(236,72,153,0.07)',
                      border: `1px solid ${remainFemale <= 0 ? 'rgba(239,68,68,0.2)' : 'rgba(236,72,153,0.18)'}`,
                    }}
                  >
                    <span className="text-xs font-semibold" style={{ color: remainFemale <= 0 ? '#DC2626' : '#DB2777', opacity: 0.7 }}>여성</span>
                    <span className="font-bold" style={{ fontSize: 15, color: remainFemale <= 0 ? '#DC2626' : '#BE185D' }}>
                      {remainFemale <= 0 ? '마감' : `${remainFemale}명 남음`}
                    </span>
                    {totalFemale > 0 && (
                      <span className="text-xs" style={{ color: 'rgba(0,0,0,0.35)' }}>
                        {Math.min(court.confirmed_female_slots ?? 0, totalFemale)}/{totalFemale} 확정
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {court.court_fee != null && court.court_fee >= 0 && (
          <div
            className="flex items-center justify-between rounded-xl px-4 py-2.5 mb-3"
            style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            <span className="text-sm font-semibold" style={{ color: '#8A6520' }}>코트 비용</span>
            <span className="font-bold text-sm" style={{ color: '#C9A84C' }}>1인 {court.court_fee.toLocaleString()}원</span>
          </div>
        )}

        {court.description && (
          <div
            className="mb-3 px-3.5 py-2.5 rounded-2xl"
            style={{ background: 'rgba(201,168,76,0.06)', borderLeft: '2.5px solid rgba(201,168,76,0.4)' }}
          >
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(160,120,40,0.9)', lineHeight: 1.6, margin: 0 }}>
              "{court.description}"
            </p>
          </div>
        )}

        {onApply && (
          isClosed ? (
            <div
              className="w-full py-3 rounded-2xl font-medium text-center"
              style={{ background: 'rgba(27,67,50,0.04)', color: 'rgba(27,67,50,0.3)', fontSize: 14, border: '1px solid rgba(27,67,50,0.08)' }}
            >
              마감된 모임이에요
            </div>
          ) : (
            <button
              onClick={onApply}
              className="w-full py-3.5 rounded-2xl font-bold transition active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                color: '#fff',
                fontSize: 14,
                boxShadow: '0 4px 16px rgba(27,67,50,0.28)',
                letterSpacing: '0.02em',
              }}
            >
              🎾 채팅 보내봐요
            </button>
          )
        )}
      </div>

      {modalOpen && photos.length > 0 && (
        <div
          onClick={() => setModalOpen(false)}
          onTouchStart={handleModalTouchStart}
          onTouchEnd={handleModalTouchEnd}
          style={{
            position: 'fixed', top: 0, left: 0,
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.96)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <img
            src={photos[modalIndex]}
            alt={profile?.name}
            style={{ maxWidth: '100%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px' }}
            onClick={(e) => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={modalPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={modalNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </>
          )}
          <button
            onClick={() => setModalOpen(false)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(4px)',
            }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-6 left-0 right-0 flex justify-center">
            <span className="text-sm text-white/60">{modalIndex + 1} / {photos.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
