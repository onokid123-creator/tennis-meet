import { useState, useRef } from 'react';
import { Court } from '../types';
import { ChevronLeft, ChevronRight, X, Pencil, Trash2 } from 'lucide-react';

interface DatingCourtCardProps {
  court: Court;
  isOwner?: boolean;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function isDatingClosed(court: Court): boolean {
  const male = court.male_slots ?? 0;
  const female = court.female_slots ?? 0;
  const confirmedMale = court.confirmed_male_slots ?? 0;
  const confirmedFemale = court.confirmed_female_slots ?? 0;
  const hadSlots = confirmedMale > 0 || confirmedFemale > 0;
  return hadSlots && male <= 0 && female <= 0;
}

export default function DatingCourtCard({ court, isOwner, onApply, onEdit, onDelete }: DatingCourtCardProps) {
  const profile = court.profile;
  const isClosed = isDatingClosed(court);
  const [applied, setApplied] = useState(false);
  const [showToast, setShowToast] = useState(false);
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

  const handleApply = () => {
    if (!onApply) return;
    setApplied(true);
    setShowToast(true);
    onApply();
    setTimeout(() => setShowToast(false), 3000);
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

  const openModal = (idx: number) => {
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

  const genderColor = ownerGender === '남성' ? '#60A5FA' : '#F472B6';
  const genderSymbol = ownerGender === '남성' ? '♂' : '♀';

  const costLabel = court.cost === 'dutch' ? '같이 나눠요 💑' : court.cost === 'host' ? '제가 낼게요 😊' : null;

  const activeBadgeSource = court.format ?? court.match_type ?? null;
  const formatBadgeLabel = (() => {
    if (!activeBadgeSource) return null;
    if (activeBadgeSource === '단식') return '단식 (1대1 미팅 💑)';
    if (activeBadgeSource === '혼복') return '혼복 (2대2 미팅 👫👫)';
    return activeBadgeSource;
  })();

  const dateFormatted = court.date
    ? new Date(court.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    : '';

  const primaryPhoto = photos[0] || null;

  const totalMale = court.male_count ?? court.male_slots ?? 0;
  const totalFemale = court.female_count ?? court.female_slots ?? 0;
  const displayMale = Math.max(0, totalMale - (court.confirmed_male_slots ?? 0));
  const displayFemale = Math.max(0, totalFemale - (court.confirmed_female_slots ?? 0));
  const showRecruitment = totalMale > 0 || totalFemale > 0;

  return (
    <>
      <div
        className="overflow-hidden select-none"
        style={{
          background: '#FDF8F0',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(201,168,76,0.14), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid rgba(201,168,76,0.18)',
        }}
      >
        {/* Owner controls */}
        {isOwner && (
          <div className="flex items-center justify-end px-4 pt-3 pb-0">
            <div className="flex gap-1">
              <button
                onClick={onEdit}
                className="w-7 h-7 rounded-full flex items-center justify-center transition"
                style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}
              >
                <Pencil className="w-3 h-3" style={{ color: '#C9A84C' }} />
              </button>
              <button
                onClick={onDelete}
                className="w-7 h-7 rounded-full flex items-center justify-center transition"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          </div>
        )}

        {/* 1. 상단 프로필 영역 */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-0">
          {/* 동그란 프로필 사진 */}
          <div className="relative flex-shrink-0">
            {primaryPhoto ? (
              <img
                src={primaryPhoto}
                alt={ownerName}
                className="w-14 h-14 rounded-full object-cover object-top"
                style={{ border: '2px solid #C9A84C', cursor: 'pointer' }}
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                onClick={() => openModal(0)}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)', border: '2px solid #C9A84C', fontSize: 22 }}
              >
                {ownerName?.charAt(0) || '?'}
              </div>
            )}
            {ownerGender && (
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: genderColor }}
              >
                {genderSymbol}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* 이름 + 나이 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900" style={{ fontSize: 16 }}>{ownerName}</span>
              {ownerAge && (
                <span style={{ fontSize: 15, color: '#6B7280' }}>{ownerAge}세</span>
              )}
              {isClosed && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>마감</span>
              )}
            </div>
            {/* 구력 뱃지 + MBTI 뱃지 + 키 */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {ownerExperience && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.5)', color: '#A07832' }}
                >
                  {ownerExperience}
                </span>
              )}
              {ownerMbti && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: 'transparent', border: '1.5px solid #C9A84C', color: '#C9A84C' }}
                >
                  {ownerMbti}
                </span>
              )}
              {ownerHeight && (
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{ownerHeight}cm</span>
              )}
            </div>
            {/* 경기방식 뱃지 */}
            {formatBadgeLabel && (
              <div className="mt-1">
                <span
                  className="font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: '#C9A84C', color: '#fff', fontSize: 12 }}
                >
                  {formatBadgeLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2. 한줄소개 이탤릭체 */}
        {ownerBio && (
          <div className="px-4 pt-2 pb-0">
            <p style={{ fontSize: 13, fontStyle: 'italic', color: '#A07832', lineHeight: 1.5, margin: 0 }}>
              "{ownerBio}"
            </p>
          </div>
        )}

        {/* 3. 코트 사진 크게 */}
        <div
          className="relative mx-4 mt-3"
          style={{ borderRadius: 14, overflow: 'hidden' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {photos.length > 0 ? (
            <>
              <div style={{ width: '100%', height: '280px', overflow: 'hidden', borderRadius: '12px' }}>
                <img
                  key={photoIndex}
                  src={photos[photoIndex] || ''}
                  alt={ownerName}
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    borderRadius: '12px',
                    display: 'block',
                    cursor: 'pointer',
                  }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  onClick={() => openModal(photoIndex)}
                />
              </div>
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
                    style={{
                      width: 40, height: 40,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.35)',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                      border: 'none',
                    }}
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
                    style={{
                      width: 40, height: 40,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.35)',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                      border: 'none',
                    }}
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                        className="rounded-full transition-all duration-200"
                        style={{
                          width: i === photoIndex ? 18 : 6,
                          height: 6,
                          background: i === photoIndex ? '#C9A84C' : 'rgba(255,255,255,0.55)',
                          border: 'none',
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
              <div className="absolute bottom-2 right-2 z-10">
                <div className="text-xl">{applied ? '💚' : '🤍'}</div>
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 flex items-center justify-center z-10"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)',
                  paddingBottom: 8,
                  paddingTop: 20,
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
                }}
              >
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 500, letterSpacing: 0.2, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                  📸 사진을 눌러서 확인해보세요 👆
                </span>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-center" style={{ height: '280px', background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)', borderRadius: '12px' }}>
              <span className="text-white text-6xl font-bold opacity-60">{ownerName?.charAt(0) || '?'}</span>
            </div>
          )}
        </div>

        {/* 4. 정보 영역 (사진 아래) */}
        <div className="px-4 pt-4 pb-5">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* 📍 장소명 */}
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 15 }}>📍</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }} className="truncate">{court.court_name}</span>
            </div>

            {/* ⏰ 날짜 · 시작시간 ~ 종료시간 */}
            {court.start_time && (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 14 }}>⏰</span>
                <span style={{ fontSize: 14, color: '#4B5563' }}>{dateFormatted} · {court.start_time} ~ {court.end_time}</span>
              </div>
            )}

            {/* 👥 남 N명 · 여 N명 모집중 */}
            {isClosed ? (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#C9A84C' }}>✅ 모집 마감</span>
            ) : showRecruitment ? (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#C9A84C' }}>
                {(() => {
                  const hasAnyConfirmed = (court.confirmed_male_slots ?? 0) > 0 || (court.confirmed_female_slots ?? 0) > 0;
                  const malePart = totalMale > 0
                    ? (displayMale <= 0 ? '남 마감' : `남 ${displayMale}명${hasAnyConfirmed ? ' 남음' : ''}`)
                    : null;
                  const femalePart = totalFemale > 0
                    ? (displayFemale <= 0 ? '여 마감' : `여 ${displayFemale}명${hasAnyConfirmed ? ' 남음' : ''}`)
                    : null;
                  const parts = [malePart, femalePart].filter(Boolean).join(' · ');
                  return `👥 ${parts} 모집중`;
                })()}
              </span>
            ) : null}

            {/* 💰 코트비 */}
            {costLabel && (
              <span style={{ fontSize: 13, color: '#6B7280' }}>💰 코트비 · {costLabel}</span>
            )}
          </div>

          {/* 5. 신청 버튼 */}
          {onApply && (
            <div className="mt-4">
              {isClosed ? (
                <div className="w-full py-3 rounded-xl text-center text-sm font-medium text-gray-400" style={{ background: '#F0EDE7' }}>
                  마감된 모임이에요
                </div>
              ) : (
                <button
                  onClick={handleApply}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white transition active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #E8A598 100%)' }}
                >
                  💚 코트 위 설레는 만남 신청하기
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-[#2D6A4F] text-white px-6 py-3 rounded-lg shadow-lg z-50">
          코트 위 설레는 만남을 신청했어요 💚
        </div>
      )}

      {/* Fullscreen modal */}
      {modalOpen && photos.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.97)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={closeModal}
          onTouchStart={handleModalTouchStart}
          onTouchEnd={handleModalTouchEnd}
        >
          <img
            src={photos[modalIndex] || ''}
            alt={ownerName}
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
              userSelect: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
          <button
            onClick={closeModal}
            style={{
              position: 'absolute',
              top: '20px', right: '20px',
              background: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '48px', height: '48px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            <X className="w-5 h-5 text-gray-800" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={modalPrev}
                style={{
                  position: 'absolute',
                  left: '16px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px', height: '48px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
              >
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>
              <button
                onClick={modalNext}
                style={{
                  position: 'absolute',
                  right: '16px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '48px', height: '48px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
              >
                <ChevronRight className="w-6 h-6 text-gray-800" />
              </button>
              <div
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setModalIndex(i); }}
                    style={{
                      width: i === modalIndex ? 20 : 8,
                      height: 8,
                      borderRadius: '4px',
                      background: i === modalIndex ? '#C9A84C' : 'rgba(255,255,255,0.45)',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
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
