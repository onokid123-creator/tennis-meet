import { useState, useRef } from 'react';
import { Court } from '../types';
import { MapPin, Clock, ChevronLeft, ChevronRight, X, Pencil, Trash2 } from 'lucide-react';

interface SwipeCourtDeckProps {
  courts: Court[];
  onApply: (court: Court) => void;
  onCardClick?: (court: Court) => void;
  isOwnerMode?: boolean;
  onEdit?: (court: Court) => void;
  onDelete?: (court: Court) => void;
}

function isDatingClosed(court: Court): boolean {
  const male = court.male_slots ?? 0;
  const female = court.female_slots ?? 0;
  const confirmedMale = court.confirmed_male_slots ?? 0;
  const confirmedFemale = court.confirmed_female_slots ?? 0;
  const totalMale = confirmedMale + male;
  const totalFemale = confirmedFemale + female;
  const maleFullOrNone = totalMale === 0 || confirmedMale >= totalMale;
  const femaleFullOrNone = totalFemale === 0 || confirmedFemale >= totalFemale;
  const hasAnySlot = totalMale > 0 || totalFemale > 0;
  if (hasAnySlot && maleFullOrNone && femaleFullOrNone) return true;
  const hadSlots = confirmedMale > 0 || confirmedFemale > 0;
  return hadSlots && male <= 0 && female <= 0;
}

function DatingCard({
  court,
  onApply,
  onCardClick,
  isOwner,
  onEdit,
  onDelete,
}: {
  court: Court;
  onApply: () => void;
  onCardClick?: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const profile = court.profile;
  const isClosed = isDatingClosed(court);
  const [applied, setApplied] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const modalTouchStartX = useRef<number | null>(null);

  const ownerName = court.owner_name || profile?.name;
  const ownerAge = court.owner_age || profile?.age;
  const ownerGender = court.owner_gender || profile?.gender;
  const ownerExperience = court.owner_experience || profile?.experience;
  const ownerMbti = court.owner_mbti || profile?.mbti;
  const ownerHeight = court.owner_height || profile?.height;
  const ownerBio = court.court_intro || court.owner_bio || profile?.bio;

  const photos: string[] = (() => {
    if (court.owner_photos?.length) return court.owner_photos;
    if (court.owner_photo) return [court.owner_photo];
    if (court.tennis_photo_url) return [court.tennis_photo_url];
    if (profile?.photo_urls?.length) return profile.photo_urls;
    if (profile?.photo_url) return [profile.photo_url];
    return [];
  })();

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onApply) return;
    setApplied(true);
    onApply();
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((i) => (i + 1) % photos.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setPhotoIndex((i) => (i + 1) % photos.length);
      else setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
    }
    touchStartX.current = null;
  };

  const openModal = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalIndex(idx);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const modalPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalIndex((i) => (i - 1 + photos.length) % photos.length);
  };

  const modalNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalIndex((i) => (i + 1) % photos.length);
  };

  const handleModalTouchStart = (e: React.TouchEvent) => {
    modalTouchStartX.current = e.touches[0].clientX;
  };

  const handleModalTouchEnd = (e: React.TouchEvent) => {
    if (modalTouchStartX.current === null) return;
    const diff = modalTouchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setModalIndex((i) => (i + 1) % photos.length);
      else setModalIndex((i) => (i - 1 + photos.length) % photos.length);
    }
    modalTouchStartX.current = null;
  };

  const genderColor = ownerGender === '남성' ? '#93C5FD' : '#F9A8D4';
  const genderSymbol = ownerGender === '남성' ? '♂' : '♀';
  const costLabel = court.cost === 'dutch' ? '같이 나눠요' : court.cost === 'host' ? '제가 낼게요' : null;
  const dateFormatted = court.date
    ? new Date(court.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    : '';

  const activeBadgeSource = court.format ?? court.match_type ?? null;
  const formatBadgeLabel = (() => {
    if (!activeBadgeSource) return null;
    if (activeBadgeSource === '단식') return '1대1 미팅';
    if (activeBadgeSource === '혼복') return '2대2 미팅';
    return activeBadgeSource;
  })();

  const totalMale = court.male_count ?? court.male_slots ?? 0;
  const totalFemale = court.female_count ?? court.female_slots ?? 0;
  const confirmedMale = court.confirmed_male_slots ?? 0;
  const confirmedFemale = court.confirmed_female_slots ?? 0;
  const displayMale = Math.max(0, totalMale - confirmedMale);
  const displayFemale = Math.max(0, totalFemale - confirmedFemale);
  const hasAnyConfirmed = confirmedMale > 0 || confirmedFemale > 0;
  const showRecruitment = totalMale > 0 || totalFemale > 0;

  return (
    <>
      <div
        className="overflow-hidden select-none cursor-pointer"
        style={{
          background: 'linear-gradient(160deg, #FFF9F6 0%, #FFF5F0 50%, #FFF8F5 100%)',
          borderRadius: '24px',
          boxShadow: '0 4px 24px rgba(183,110,121,0.12), 0 1px 6px rgba(0,0,0,0.06)',
          border: '1px solid rgba(183,110,121,0.15)',
        }}
        onClick={onCardClick}
      >
        {isOwner && (
          <div className="flex items-center justify-end px-4 pt-3">
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95"
                style={{ background: 'rgba(183,110,121,0.1)', border: '1px solid rgba(183,110,121,0.2)' }}
              >
                <Pencil className="w-3 h-3" style={{ color: '#B76E79' }} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          </div>
        )}

        <div className={`px-4 flex items-start gap-3.5 ${isOwner ? 'pt-2 pb-3' : 'pt-4 pb-3'}`}>
          <div className="relative flex-shrink-0">
            {photos[0] ? (
              <img
                src={photos[0]}
                alt={ownerName}
                className="w-14 h-14 rounded-2xl object-cover object-top"
                style={{ border: '2px solid rgba(183,110,121,0.35)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(183,110,121,0.2)' }}
                loading="eager"
                decoding="sync"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                onClick={(e) => openModal(0, e)}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #B76E79 0%, #C9A84C 100%)', border: '2px solid rgba(183,110,121,0.35)', fontSize: 22 }}
              >
                {ownerName?.charAt(0) || '?'}
              </div>
            )}
            {ownerGender && (
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: '#fff', border: '1.5px solid rgba(183,110,121,0.3)', color: genderColor, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
              >
                {genderSymbol}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold" style={{ fontSize: 17, color: '#1A0D12', letterSpacing: '-0.01em' }}>{ownerName}</span>
              {ownerAge && <span style={{ fontSize: 15, color: '#9B7B82' }}>{ownerAge}세</span>}
              {isClosed && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(183,110,121,0.12)', color: '#B76E79', border: '1px solid rgba(183,110,121,0.3)' }}>마감</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {formatBadgeLabel && (
                <span
                  className="font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg, #B76E79 0%, #C9A84C 100%)', color: '#fff', fontSize: 11 }}
                >
                  {formatBadgeLabel}
                </span>
              )}
              {ownerExperience && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', color: '#A07832' }}
                >
                  {ownerExperience}
                </span>
              )}
              {ownerMbti && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'transparent', border: '1.5px solid rgba(183,110,121,0.5)', color: '#B76E79' }}
                >
                  {ownerMbti}
                </span>
              )}
              {ownerHeight && (
                <span style={{ fontSize: 13, color: '#B8949A' }}>{ownerHeight}cm</span>
              )}
            </div>
          </div>
        </div>

        {ownerBio && (
          <div className="px-4 pb-3">
            <p style={{ fontSize: 14, lineHeight: '1.6', color: '#7A4A52', fontFamily: "'Georgia', serif", fontStyle: 'italic' }}>
              "{ownerBio}"
            </p>
          </div>
        )}

        <div
          className="relative mx-4 mb-0"
          style={{ borderRadius: 16, overflow: 'hidden' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {photos.length > 0 ? (
            <>
              <div style={{ width: '100%', height: '300px', overflow: 'hidden', borderRadius: '16px' }}>
                <img
                  key={photoIndex}
                  src={photos[photoIndex] || ''}
                  alt={ownerName}
                  loading="eager"
                  decoding="sync"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    borderRadius: '16px',
                    display: 'block',
                    cursor: 'pointer',
                  }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  onClick={(e) => openModal(photoIndex, e)}
                />
              </div>

              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(26,13,18,0.55) 0%, transparent 50%)', borderRadius: '16px' }}
              />

              {photos.length > 1 && (
                <>
                  <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                        className="rounded-full transition-all duration-300"
                        style={{ width: i === photoIndex ? 18 : 5, height: 5, background: i === photoIndex ? '#C9A84C' : 'rgba(255,255,255,0.5)', border: 'none', padding: 0 }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
                    style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
                    style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </>
              )}

              <div className="absolute bottom-3 right-3 z-10">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: applied ? 'rgba(183,110,121,0.9)' : 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={applied ? '#fff' : 'none'} stroke={applied ? '#fff' : 'rgba(255,255,255,0.8)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 z-10">
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 500, letterSpacing: 0.2, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                  탭하여 크게 보기
                </span>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-center" style={{ height: '300px', background: 'linear-gradient(135deg, #2D1820 0%, #B76E79 100%)', borderRadius: '16px' }}>
              <span className="text-white text-6xl font-bold opacity-40">{ownerName?.charAt(0) || '?'}</span>
            </div>
          )}
        </div>

        <div className="px-4 pt-3.5 pb-4">
          <div
            className="rounded-2xl px-3.5 py-3 mb-3 flex flex-col gap-1.5"
            style={{ background: 'rgba(183,110,121,0.06)', border: '1px solid rgba(183,110,121,0.12)' }}
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#B76E79' }} />
              <span className="text-sm font-semibold truncate" style={{ color: '#3D1E26' }}>{court.court_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#B76E79' }} />
              <span className="text-sm" style={{ color: '#7A4A52' }}>{dateFormatted}{court.start_time ? ` · ${court.start_time} ~ ${court.end_time}` : ''}</span>
            </div>
          </div>

          {(showRecruitment || costLabel) && (
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              {isClosed ? (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(183,110,121,0.1)', color: '#B76E79', border: '1px solid rgba(183,110,121,0.25)' }}>
                  모집 마감
                </span>
              ) : showRecruitment ? (
                <>
                  {totalMale > 0 && (
                    <span
                      className="text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1"
                      style={{
                        background: displayMale <= 0 ? 'rgba(239,68,68,0.06)' : 'rgba(147,197,253,0.1)',
                        color: displayMale <= 0 ? '#ef4444' : '#93C5FD',
                        border: `1px solid ${displayMale <= 0 ? 'rgba(239,68,68,0.2)' : 'rgba(147,197,253,0.25)'}`,
                      }}
                    >
                      ♂ 남 {displayMale <= 0 ? '마감' : `${displayMale}명`}
                      {hasAnyConfirmed && displayMale > 0 && <span style={{ opacity: 0.55 }}>남음</span>}
                    </span>
                  )}
                  {totalFemale > 0 && (
                    <span
                      className="text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1"
                      style={{
                        background: displayFemale <= 0 ? 'rgba(239,68,68,0.06)' : 'rgba(249,168,212,0.1)',
                        color: displayFemale <= 0 ? '#ef4444' : '#F9A8D4',
                        border: `1px solid ${displayFemale <= 0 ? 'rgba(239,68,68,0.2)' : 'rgba(249,168,212,0.3)'}`,
                      }}
                    >
                      ♀ 여 {displayFemale <= 0 ? '마감' : `${displayFemale}명`}
                      {hasAnyConfirmed && displayFemale > 0 && <span style={{ opacity: 0.55 }}>남음</span>}
                    </span>
                  )}
                </>
              ) : null}
              {costLabel && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#A07832' }}>
                  {costLabel}
                </span>
              )}
            </div>
          )}

          {!isOwner && (
            isClosed ? (
              <div className="w-full py-3 rounded-2xl text-center text-sm font-medium" style={{ background: 'rgba(183,110,121,0.06)', color: 'rgba(183,110,121,0.4)', border: '1px solid rgba(183,110,121,0.12)' }}>
                마감된 만남이에요
              </div>
            ) : (
              <button
                onClick={handleApply}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white transition active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #B76E79 0%, #C9547A 50%, #B76E79 100%)',
                  boxShadow: '0 4px 16px rgba(183,110,121,0.3)',
                  letterSpacing: '0.02em',
                }}
              >
                관심 있어요, 말 걸어볼게요
              </button>
            )
          )}
        </div>
      </div>

      {modalOpen && photos.length > 0 && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.97)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeModal}
          onTouchStart={handleModalTouchStart}
          onTouchEnd={handleModalTouchEnd}
        >
          <img
            src={photos[modalIndex] || ''}
            alt={ownerName}
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', userSelect: 'none' }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
          <button
            onClick={closeModal}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
          >
            <X className="w-5 h-5 text-gray-800" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={modalPrev}
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={modalNext}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
              <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setModalIndex(i); }}
                    style={{ width: i === modalIndex ? 20 : 8, height: 8, borderRadius: '4px', background: i === modalIndex ? '#C9A84C' : 'rgba(255,255,255,0.35)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.2s' }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default function SwipeCourtDeck({ courts, onApply, onCardClick, isOwnerMode, onEdit, onDelete }: SwipeCourtDeckProps) {
  if (courts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(183,110,121,0.1)', border: '1.5px solid rgba(183,110,121,0.25)' }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B76E79" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm mb-1" style={{ color: '#B76E79' }}>아직 인연이 없어요</p>
          <p className="text-xs" style={{ color: 'rgba(183,110,121,0.55)' }}>첫 번째 설레는 만남을 열어보세요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courts.map((court) => (
        <DatingCard
          key={court.id}
          court={court}
          onApply={() => onApply(court)}
          onCardClick={onCardClick ? () => onCardClick(court) : undefined}
          isOwner={isOwnerMode}
          onEdit={onEdit ? () => onEdit(court) : undefined}
          onDelete={onDelete ? () => onDelete(court) : undefined}
        />
      ))}
    </div>
  );
}
