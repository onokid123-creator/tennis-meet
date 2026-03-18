import { useState, useRef } from 'react';
import { Court } from '../types';
import { Pencil, Trash2, X, ChevronLeft, ChevronRight, MapPin, Calendar, Clock, Users } from 'lucide-react';

interface TennisCourtCardProps {
  court: Court;
  isOwner?: boolean;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function getCourtStatus(court: Court): 'open' | 'closing-soon' | 'closed' {
  if (court.status === 'closed') return 'closed';

  const totalMale = court.male_count ?? 0;
  const totalFemale = court.female_count ?? 0;
  const confirmedMale = court.confirmed_male_slots ?? 0;
  const confirmedFemale = court.confirmed_female_slots ?? 0;

  const maleRemain = Math.max(0, totalMale - confirmedMale);
  const femaleRemain = Math.max(0, totalFemale - confirmedFemale);

  const hasAnySlot = totalMale > 0 || totalFemale > 0;
  if (hasAnySlot && maleRemain === 0 && (totalFemale === 0 || femaleRemain === 0) && (totalMale === 0 || maleRemain === 0)) {
    const maleDone = totalMale === 0 || maleRemain === 0;
    const femaleDone = totalFemale === 0 || femaleRemain === 0;
    if (maleDone && femaleDone) return 'closed';
  }

  if (court.male_slots !== undefined && court.female_slots !== undefined) {
    const hadSlots = confirmedMale > 0 || confirmedFemale > 0;
    if (hadSlots && court.male_slots <= 0 && court.female_slots <= 0) return 'closed';
  }

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

  const totalMale = court.male_count ?? 0;
  const totalFemale = court.female_count ?? 0;
  const confirmedMale = court.confirmed_male_slots ?? 0;
  const confirmedFemale = court.confirmed_female_slots ?? 0;
  const remainMale = Math.max(0, totalMale - confirmedMale);
  const remainFemale = Math.max(0, totalFemale - confirmedFemale);

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
        borderRadius: '20px',
        background: '#fff',
        boxShadow: '0 2px 16px rgba(27,67,50,0.10), 0 1px 4px rgba(0,0,0,0.04)',
        border: '1px solid rgba(27,67,50,0.07)',
      }}
    >
      {/* Photo Section */}
      <div
        className="relative select-none"
        style={{ height: photos.length > 0 ? '200px' : '0px', overflow: 'hidden' }}
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
                style={{ objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
              />
            </button>

            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 50%, transparent 80%)' }}
            />

            {photos.length > 1 && (
              <>
                <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                  {photos.map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: i === photoIndex ? '16px' : '5px',
                        height: '5px',
                        background: i === photoIndex ? '#C9A84C' : 'rgba(255,255,255,0.5)',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10"
                  style={{ background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(4px)' }}
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center z-10"
                  style={{ background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(4px)' }}
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </>
            )}

            {/* Top-right badges */}
            <div className="absolute top-3 right-3 z-10 flex gap-1.5">
              {court.format && (
                <span
                  className="font-bold rounded-full px-2.5 py-1"
                  style={{
                    background: 'rgba(201,168,76,0.85)',
                    color: '#fff',
                    fontSize: 11,
                    backdropFilter: 'blur(6px)',
                    letterSpacing: '0.03em',
                  }}
                >
                  {court.format}
                </span>
              )}
              {isClosingSoon && !isClosed && (
                <span
                  className="font-bold rounded-full px-2.5 py-1"
                  style={{ background: 'rgba(217,119,6,0.88)', color: '#fff', fontSize: 11 }}
                >
                  마감 임박
                </span>
              )}
              {isClosed && (
                <span
                  className="font-bold rounded-full px-2.5 py-1"
                  style={{ background: 'rgba(220,38,38,0.88)', color: '#fff', fontSize: 11 }}
                >
                  마감
                </span>
              )}
            </div>

            {/* Owner controls */}
            {isOwner && (
              <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                <button
                  onClick={onEdit}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95"
                  style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
                >
                  <Pencil className="w-3 h-3 text-white" />
                </button>
                <button
                  onClick={onDelete}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95"
                  style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
              </div>
            )}

            {/* Bottom overlay: profile info */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-3 pt-8">
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold" style={{ fontSize: 15, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                    {profile?.name}
                  </span>
                  {profile?.experience && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(201,168,76,0.35)',
                        color: '#FFE8A0',
                        border: '1px solid rgba(201,168,76,0.5)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {profile.experience}
                    </span>
                  )}
                  {profile?.tennis_style && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        color: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {profile.tennis_style}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* No photo: header row */}
      {photos.length === 0 && (
        <div
          className="px-4 pt-4 pb-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(27,67,50,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
            >
              <span style={{ color: '#C9A84C', fontWeight: 800, fontSize: 16 }}>{profile?.name?.charAt(0) || 'T'}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1A2E22' }}>{profile?.name}</span>
                {profile?.experience && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: '#A07828', border: '1px solid rgba(201,168,76,0.3)' }}>
                    {profile.experience}
                  </span>
                )}
                {profile?.tennis_style && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(27,67,50,0.07)', color: '#1B5E42', border: '1px solid rgba(27,67,50,0.12)' }}>
                    {profile.tennis_style}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {court.format && (
              <span
                className="font-bold rounded-full px-2.5 py-1"
                style={{ background: '#1B4332', color: '#C9A84C', fontSize: 11, letterSpacing: '0.03em' }}
              >
                {court.format}
              </span>
            )}
            {isClosingSoon && !isClosed && (
              <span className="font-bold rounded-full px-2 py-0.5" style={{ background: 'rgba(251,146,60,0.1)', color: '#D97706', fontSize: 11 }}>마감 임박</span>
            )}
            {isClosed && (
              <span className="font-bold rounded-full px-2 py-0.5" style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', fontSize: 11 }}>마감</span>
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

      {/* Body */}
      <div className="px-4 pt-3.5 pb-4">
        {/* Court name */}
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#C9A84C' }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1A2E22' }} className="truncate">{court.court_name}</span>
        </div>

        {/* Date & Time row */}
        {(court.date || court.start_time) && (
          <div
            className="rounded-2xl px-3.5 py-2.5 mb-3 flex items-center gap-4"
            style={{ background: 'rgba(27,67,50,0.04)', border: '1px solid rgba(27,67,50,0.08)' }}
          >
            {court.date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: '#2D6A4F', opacity: 0.7 }} />
                <span style={{ fontSize: 12, color: '#1A2E22', opacity: 0.8 }}>{formatDate(court.date)}</span>
              </div>
            )}
            {court.start_time && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 flex-shrink-0" style={{ color: '#2D6A4F', opacity: 0.7 }} />
                <span style={{ fontSize: 12, color: '#1A2E22', opacity: 0.8 }}>
                  {court.start_time}{court.end_time ? ` ~ ${court.end_time}` : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Slots */}
        {(totalMale > 0 || totalFemale > 0) && (
          <div className="mb-3">
            {isClosed ? (
              <div
                className="rounded-xl px-4 py-2.5 flex items-center justify-center gap-2"
                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                <Users className="w-3.5 h-3.5" style={{ color: '#DC2626' }} />
                <span className="text-sm font-bold" style={{ color: '#DC2626' }}>모집 마감</span>
              </div>
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: totalMale > 0 && totalFemale > 0 ? '1fr 1fr' : '1fr' }}>
                {totalMale > 0 && (
                  <div
                    className="rounded-xl px-3 py-2.5 flex flex-col items-center gap-0.5"
                    style={{
                      background: remainMale <= 0 ? 'rgba(239,68,68,0.05)' : 'rgba(59,130,246,0.06)',
                      border: `1px solid ${remainMale <= 0 ? 'rgba(239,68,68,0.18)' : 'rgba(59,130,246,0.15)'}`,
                    }}
                  >
                    <span className="text-xs font-semibold" style={{ color: remainMale <= 0 ? '#DC2626' : '#2563EB', opacity: 0.75 }}>남성</span>
                    <span className="font-bold" style={{ fontSize: 15, color: remainMale <= 0 ? '#DC2626' : '#1D4ED8' }}>
                      {remainMale <= 0 ? '마감' : `${remainMale}명 남음`}
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(0,0,0,0.3)' }}>
                      {confirmedMale}/{totalMale} 확정
                    </span>
                  </div>
                )}
                {totalFemale > 0 && (
                  <div
                    className="rounded-xl px-3 py-2.5 flex flex-col items-center gap-0.5"
                    style={{
                      background: remainFemale <= 0 ? 'rgba(239,68,68,0.05)' : 'rgba(236,72,153,0.06)',
                      border: `1px solid ${remainFemale <= 0 ? 'rgba(239,68,68,0.18)' : 'rgba(236,72,153,0.15)'}`,
                    }}
                  >
                    <span className="text-xs font-semibold" style={{ color: remainFemale <= 0 ? '#DC2626' : '#DB2777', opacity: 0.75 }}>여성</span>
                    <span className="font-bold" style={{ fontSize: 15, color: remainFemale <= 0 ? '#DC2626' : '#BE185D' }}>
                      {remainFemale <= 0 ? '마감' : `${remainFemale}명 남음`}
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(0,0,0,0.3)' }}>
                      {confirmedFemale}/{totalFemale} 확정
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Court fee */}
        {court.court_fee != null && court.court_fee >= 0 && (
          <div
            className="flex items-center justify-between rounded-xl px-3.5 py-2.5 mb-3"
            style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)' }}
          >
            <span className="text-xs font-semibold" style={{ color: '#8A6520' }}>코트 비용</span>
            <span className="font-bold text-sm" style={{ color: '#C9A84C' }}>1인 {court.court_fee.toLocaleString()}원</span>
          </div>
        )}

        {/* Description */}
        {court.description && (
          <div
            className="mb-3 px-3.5 py-2.5 rounded-xl"
            style={{ background: 'rgba(27,67,50,0.03)', borderLeft: '2.5px solid rgba(201,168,76,0.45)' }}
          >
            <p style={{ fontSize: 12.5, fontStyle: 'italic', color: 'rgba(100,80,30,0.85)', lineHeight: 1.6, margin: 0 }}>
              "{court.description}"
            </p>
          </div>
        )}

        {/* Apply button */}
        {onApply && (
          isClosed ? (
            <div
              className="w-full py-3 rounded-2xl font-medium text-center"
              style={{ background: 'rgba(27,67,50,0.04)', color: 'rgba(27,67,50,0.3)', fontSize: 13, border: '1px solid rgba(27,67,50,0.07)' }}
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
                boxShadow: '0 4px 14px rgba(27,67,50,0.25)',
                letterSpacing: '0.02em',
              }}
            >
              채팅 보내봐요
            </button>
          )
        )}
      </div>

      {/* Modal */}
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
