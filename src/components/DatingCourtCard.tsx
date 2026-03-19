import { useState, useRef } from 'react';
import { Court } from '../types';
import { ChevronLeft, ChevronRight, X, Pencil, Trash2, MapPin, Calendar, Clock, Maximize2 } from 'lucide-react';

interface DatingCourtCardProps {
  court: Court;
  isOwner?: boolean;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function isDatingClosed(court: Court): boolean {
  const totalMale = court.male_count ?? 0;
  const totalFemale = court.female_count ?? 0;
  const confirmedMale = court.confirmed_male_slots ?? 0;
  const confirmedFemale = court.confirmed_female_slots ?? 0;
  const hasAnySlot = totalMale > 0 || totalFemale > 0;
  if (!hasAnySlot) return false;
  const maleDone = totalMale === 0 || confirmedMale >= totalMale;
  const femaleDone = totalFemale === 0 || confirmedFemale >= totalFemale;
  return maleDone && femaleDone;
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

  const costLabel = court.cost === 'dutch' ? '같이 나눠요' : court.cost === 'host' ? '제가 낼게요' : null;

  const activeBadgeSource = court.format ?? court.match_type ?? null;
  const formatBadgeLabel = (() => {
    if (!activeBadgeSource) return null;
    if (activeBadgeSource === '단식') return '단식 · 1대1 미팅';
    if (activeBadgeSource === '혼복') return '혼복 · 2대2 미팅';
    return activeBadgeSource;
  })();

  const dateFormatted = court.date
    ? new Date(court.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    : '';

  const primaryPhoto = photos[0] || null;

  const totalMale = court.male_count ?? 0;
  const totalFemale = court.female_count ?? 0;
  const confirmedMale = court.confirmed_male_slots ?? 0;
  const confirmedFemale = court.confirmed_female_slots ?? 0;
  const displayMale = Math.max(0, totalMale - confirmedMale);
  const displayFemale = Math.max(0, totalFemale - confirmedFemale);
  const showRecruitment = totalMale > 0 || totalFemale > 0;

  return (
    <>
      <div
        className="overflow-hidden select-none"
        style={{
          background: '#FDF8F0',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(201,168,76,0.13), 0 2px 8px rgba(0,0,0,0.07)',
          border: '1px solid rgba(201,168,76,0.16)',
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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: isOwner ? '10px 16px 0' : '16px 16px 0' }}>
          {/* 동그란 프로필 사진 */}
          <div className="relative flex-shrink-0">
            {primaryPhoto ? (
              <img
                src={primaryPhoto}
                alt={ownerName}
                className="w-14 h-14 rounded-full object-cover object-top"
                style={{ border: '2px solid rgba(201,168,76,0.6)', cursor: 'pointer' }}
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                onClick={() => openModal(0)}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #e8a5b4 0%, #c97d91 100%)', border: '2px solid rgba(201,168,76,0.4)', fontSize: 22 }}
              >
                {ownerName?.charAt(0) || '?'}
              </div>
            )}
            {ownerGender && (
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: genderColor, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
              >
                {genderSymbol}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            {/* 이름 + 나이 + 마감 배지 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', letterSpacing: '-0.02em' }}>{ownerName}</span>
              {ownerAge && (
                <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 400 }}>{ownerAge}세</span>
              )}
              {ownerHeight && (
                <span style={{ fontSize: 13, color: '#9CA3AF' }}>{ownerHeight}cm</span>
              )}
              {isClosed && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>마감</span>
              )}
            </div>

            {/* 구력 + MBTI + 경기방식 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {ownerExperience && (
                <span
                  style={{ padding: '2px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', color: '#9A6F20' }}
                >
                  {ownerExperience}
                </span>
              )}
              {ownerMbti && (
                <span
                  style={{ padding: '2px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: 'transparent', border: '1.5px solid rgba(201,168,76,0.55)', color: '#B8922A' }}
                >
                  {ownerMbti}
                </span>
              )}
              {formatBadgeLabel && (
                <span
                  style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: 'linear-gradient(135deg, #C9A84C 0%, #E8A598 100%)', color: '#fff' }}
                >
                  {formatBadgeLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. 사진 영역 */}
        <div
          className="relative mx-4 mt-3"
          style={{ borderRadius: 14, overflow: 'hidden' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {photos.length > 0 ? (
            <>
              <div style={{ width: '100%', height: '288px', overflow: 'hidden', borderRadius: '14px' }}>
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
                    borderRadius: '14px',
                    display: 'block',
                    cursor: 'pointer',
                  }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  onClick={() => openModal(photoIndex)}
                />
              </div>

              {/* 사진 탐색 버튼 */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={prevPhoto}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
                    style={{
                      width: 36, height: 36,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.3)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={nextPhoto}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center z-10"
                    style={{
                      width: 36, height: 36,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.3)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                  {/* 페이지 인디케이터 */}
                  <div className="absolute bottom-9 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                        className="rounded-full transition-all duration-200"
                        style={{
                          width: i === photoIndex ? 16 : 5,
                          height: 5,
                          background: i === photoIndex ? '#C9A84C' : 'rgba(255,255,255,0.5)',
                          border: 'none',
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* 하단 그라디언트 + 크게보기 라벨 */}
              <div
                className="absolute bottom-0 left-0 right-0 z-10"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
                  paddingBottom: 10,
                  paddingTop: 36,
                  borderBottomLeftRadius: 14,
                  borderBottomRightRadius: 14,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                  paddingLeft: 12,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'rgba(0,0,0,0.28)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 99,
                    padding: '4px 10px',
                    cursor: 'pointer',
                  }}
                  onClick={() => openModal(photoIndex)}
                >
                  <Maximize2 style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.85)' }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 500, letterSpacing: 0.2 }}>
                    크게 보기
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-center" style={{ height: '288px', background: 'linear-gradient(135deg, #e8a5b4 0%, #c97d91 100%)', borderRadius: '14px' }}>
              <span className="text-white text-6xl font-bold opacity-60">{ownerName?.charAt(0) || '?'}</span>
            </div>
          )}
        </div>

        {/* 3. 정보 영역 */}
        <div style={{ padding: '14px 16px 18px' }}>
          <div
            style={{
              background: 'rgba(253,248,240,0.7)',
              borderRadius: 16,
              padding: '14px 16px',
              border: '1px solid rgba(201,168,76,0.2)',
              display: 'flex', flexDirection: 'column', gap: 0,
            }}
          >
            {/* 장소명 + 코트비 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                <MapPin style={{ width: 14, height: 14, color: '#C9A84C', flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 14.5, color: '#1a1a1a', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {court.court_name}
                </span>
              </div>
              {costLabel && (
                <span style={{ fontSize: 11.5, color: '#A07832', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.22)' }}>
                  {costLabel}
                </span>
              )}
            </div>

            {/* 날짜 · 시간 */}
            {(dateFormatted || court.start_time) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                {dateFormatted && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar style={{ width: 12, height: 12, color: '#B0B8C1', flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: '#6B7280' }}>{dateFormatted}</span>
                  </div>
                )}
                {court.start_time && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock style={{ width: 12, height: 12, color: '#B0B8C1', flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: '#6B7280' }}>
                      {court.start_time}{court.end_time ? ` – ${court.end_time}` : ''}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 구분선 */}
            {(showRecruitment || ownerBio) && (
              <div style={{ height: 1, background: 'rgba(201,168,76,0.14)', marginBottom: 10 }} />
            )}

            {/* 모집 상태 */}
            {isClosed ? (
              <div style={{
                background: 'rgba(201,168,76,0.07)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: 10, padding: '7px 14px', textAlign: 'center',
                marginBottom: ownerBio ? 10 : 0,
              }}>
                <span style={{ fontWeight: 600, fontSize: 12.5, color: '#A07832' }}>모집 마감</span>
              </div>
            ) : showRecruitment ? (
              <div style={{ display: 'flex', gap: 7, marginBottom: ownerBio ? 10 : 0 }}>
                {totalMale > 0 && (
                  <div style={{
                    flex: 1,
                    background: displayMale <= 0 ? 'rgba(239,68,68,0.04)' : '#fff',
                    border: `1px solid ${displayMale <= 0 ? 'rgba(239,68,68,0.15)' : 'rgba(201,168,76,0.22)'}`,
                    borderRadius: 10, padding: '7px 11px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
                      남성 <span style={{ opacity: 0.6 }}>{confirmedMale}/{totalMale}</span>
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: displayMale <= 0 ? '#ef4444' : '#C9A84C' }}>
                      {displayMale <= 0 ? '마감' : `${displayMale}명 남음`}
                    </span>
                  </div>
                )}
                {totalFemale > 0 && (
                  <div style={{
                    flex: 1,
                    background: displayFemale <= 0 ? 'rgba(239,68,68,0.04)' : '#fff',
                    border: `1px solid ${displayFemale <= 0 ? 'rgba(239,68,68,0.15)' : 'rgba(201,168,76,0.22)'}`,
                    borderRadius: 10, padding: '7px 11px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
                      여성 <span style={{ opacity: 0.6 }}>{confirmedFemale}/{totalFemale}</span>
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: displayFemale <= 0 ? '#ef4444' : '#C9A84C' }}>
                      {displayFemale <= 0 ? '마감' : `${displayFemale}명 남음`}
                    </span>
                  </div>
                )}
              </div>
            ) : null}

            {/* 소개글 */}
            {ownerBio && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 2, flexShrink: 0, borderRadius: 99, background: 'linear-gradient(to bottom, #C9A84C, #E8A598)', alignSelf: 'stretch', minHeight: 20 }} />
                <p style={{ fontSize: 13.5, color: '#6B5520', lineHeight: 1.65, margin: 0, fontWeight: 400 }}>
                  {ownerBio}
                </p>
              </div>
            )}
          </div>

          {/* 신청 버튼 */}
          {onApply && (
            <div style={{ marginTop: 12 }}>
              {isClosed ? (
                <div style={{ width: '100%', padding: '13px 0', borderRadius: 14, textAlign: 'center', fontSize: 13.5, fontWeight: 500, color: '#B0B8C1', background: '#F0EDE7' }}>
                  마감된 모임이에요
                </div>
              ) : (
                <button
                  onClick={handleApply}
                  className="w-full font-bold text-white transition active:scale-[0.98]"
                  style={{
                    padding: '13px 0',
                    borderRadius: 14,
                    fontSize: 14,
                    background: applied
                      ? 'linear-gradient(135deg, #a8d5b8 0%, #d4a0a8 100%)'
                      : 'linear-gradient(135deg, #C9A84C 0%, #E8A598 100%)',
                    border: 'none',
                    letterSpacing: '-0.01em',
                    boxShadow: '0 2px 10px rgba(201,168,76,0.25)',
                  }}
                >
                  코트 위 설레는 만남 신청하기
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-[#2D6A4F] text-white px-6 py-3 rounded-lg shadow-lg z-50">
          코트 위 설레는 만남을 신청했어요
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
