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
  const totalMale = court.male_count ?? 0;
  const totalFemale = court.female_count ?? 0;
  const confirmedMale = court.confirmed_male_slots ?? 0;
  const confirmedFemale = court.confirmed_female_slots ?? 0;
  if (totalMale > 0 || totalFemale > 0) {
    const maleDone = totalMale === 0 || confirmedMale >= totalMale;
    const femaleDone = totalFemale === 0 || confirmedFemale >= totalFemale;
    if (maleDone && femaleDone) return 'closed';
  }
  if (court.end_time && court.date) {
    const endDateTime = new Date(`${court.date}T${court.end_time}`);
    const oneHourBefore = new Date(endDateTime.getTime() - 60 * 60 * 1000);
    const now = new Date();
    if (now >= oneHourBefore && now < endDateTime) return 'closing-soon';
  }
  return 'open';
}

const PRIMARY = '#1F5A3C';
const SECONDARY = '#5FAF7B';
const LIGHT_GREEN = '#B8D9C4';
const CARD_BG = '#EEF6F1';
const TEXT_PRIMARY = '#111C16';
const TEXT_SECONDARY = '#6B8070';
const GOLD = '#B8953A';

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

  const prevPhoto = (e: React.MouseEvent) => { e.stopPropagation(); setPhotoIndex((i) => (i - 1 + photos.length) % photos.length); };
  const nextPhoto = (e: React.MouseEvent) => { e.stopPropagation(); setPhotoIndex((i) => (i + 1) % photos.length); };
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
    <>
      <div
        className="overflow-hidden select-none"
        style={{
          background: '#FAFDF8',
          borderRadius: '20px',
          boxShadow: '0 4px 24px rgba(31,90,60,0.10), 0 1px 4px rgba(0,0,0,0.05)',
          border: `1px solid ${LIGHT_GREEN}`,
        }}
      >
        {/* Owner controls */}
        {isOwner && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={onEdit}
                style={{
                  width: 30, height: 30,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.85)',
                  border: `1px solid ${LIGHT_GREEN}`,
                  boxShadow: '0 1px 4px rgba(31,90,60,0.10)',
                  cursor: 'pointer',
                }}
              >
                <Pencil style={{ width: 13, height: 13, color: PRIMARY }} />
              </button>
              <button
                onClick={onDelete}
                style={{
                  width: 30, height: 30,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(185,50,50,0.22)',
                  boxShadow: '0 1px 4px rgba(185,50,50,0.10)',
                  cursor: 'pointer',
                }}
              >
                <Trash2 style={{ width: 13, height: 13, color: '#B03030' }} />
              </button>
            </div>
          </div>
        )}

        {/* 1. 상단 프로필 영역 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isOwner ? '10px 16px 0' : '14px 16px 0' }}>
          <div style={{ flexShrink: 0 }}>
            {photos.length > 0 ? (
              <img
                src={photos[0]}
                alt={profile?.name}
                style={{
                  width: 52, height: 52,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  border: `2px solid ${SECONDARY}`,
                  cursor: 'pointer',
                  display: 'block',
                }}
                onClick={() => openModal(0)}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div
                style={{
                  width: 52, height: 52,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`,
                  border: `2px solid ${SECONDARY}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>{profile?.name?.charAt(0) || 'T'}</span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 15.5, color: TEXT_PRIMARY, letterSpacing: '-0.02em' }}>
                {profile?.name}
              </span>
              {isClosed && (
                <span style={{ background: 'rgba(185,50,50,0.1)', color: '#B03030', borderRadius: 99, padding: '2px 8px', fontSize: 10.5, fontWeight: 600 }}>마감</span>
              )}
              {isClosingSoon && !isClosed && (
                <span style={{ background: 'rgba(196,130,20,0.12)', color: '#9A7010', borderRadius: 99, padding: '2px 8px', fontSize: 10.5, fontWeight: 600 }}>마감 임박</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {profile?.experience && (
                <span style={{
                  background: `${PRIMARY}12`, color: PRIMARY,
                  border: `1px solid ${PRIMARY}28`,
                  borderRadius: 99, padding: '2px 8px', fontSize: 10.5, fontWeight: 600,
                }}>
                  {profile.experience}
                </span>
              )}
              {profile?.tennis_style && (
                <span style={{
                  background: `${SECONDARY}1A`, color: PRIMARY,
                  border: `1px solid ${SECONDARY}45`,
                  borderRadius: 99, padding: '2px 8px', fontSize: 10.5,
                }}>
                  {profile.tennis_style}
                </span>
              )}
              {court.format && (
                <span style={{
                  background: PRIMARY, color: '#fff',
                  borderRadius: 99, padding: '2px 9px', fontSize: 10.5, fontWeight: 600,
                }}>
                  {court.format}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. 소개글 */}
        {court.description && (
          <div style={{ padding: '10px 16px 0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 2.5, flexShrink: 0, borderRadius: 99, background: SECONDARY, alignSelf: 'stretch', minHeight: 16 }} />
            <p style={{ fontSize: 13.5, color: '#4C5B52', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
              "{court.description}"
            </p>
          </div>
        )}

        {/* 3. 이미지 영역 */}
        {photos.length > 0 && (
          <div
            className="relative"
            style={{ margin: '12px 16px 0', borderRadius: 14, overflow: 'hidden' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div style={{ width: '100%', height: 260, overflow: 'hidden', borderRadius: 14 }}>
              <img
                key={photoIndex}
                src={photos[photoIndex]}
                alt={profile?.name}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  display: 'block',
                  cursor: 'pointer',
                  borderRadius: 14,
                }}
                onClick={() => openModal(photoIndex)}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>

            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.32)', border: 'none',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2,
                  }}
                >
                  <ChevronLeft style={{ width: 18, height: 18, color: '#fff' }} />
                </button>
                <button
                  onClick={nextPhoto}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.32)', border: 'none',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2,
                  }}
                >
                  <ChevronRight style={{ width: 18, height: 18, color: '#fff' }} />
                </button>
                <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, zIndex: 2 }}>
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                      style={{
                        width: i === photoIndex ? 18 : 6, height: 6,
                        borderRadius: 99,
                        background: i === photoIndex ? SECONDARY : 'rgba(255,255,255,0.5)',
                        border: 'none', padding: 0, cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 4. 정보 카드 영역 */}
        <div style={{ padding: '14px 16px 18px' }}>
          <div
            style={{
              background: CARD_BG,
              borderRadius: 16,
              padding: '14px 16px',
              border: `1px solid ${LIGHT_GREEN}`,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            {/* 코트명 + 가격 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: TEXT_PRIMARY, letterSpacing: '-0.02em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📍 {court.court_name}
              </span>
              {court.court_fee != null && court.court_fee >= 0 && (
                <span style={{ fontWeight: 600, fontSize: 13.5, color: GOLD, whiteSpace: 'nowrap', letterSpacing: '-0.01em', flexShrink: 0 }}>
                  {court.court_fee === 0 ? '무료' : `${court.court_fee.toLocaleString()}원`}
                </span>
              )}
            </div>

            {/* 날짜 · 시간 */}
            {(court.date || court.start_time) && (
              <span style={{ fontSize: 13, color: TEXT_SECONDARY, letterSpacing: '0.01em' }}>
                ⏰ {court.date ? formatDate(court.date) : ''}
                {court.date && court.start_time ? '  ·  ' : ''}
                {court.start_time ? `${court.start_time}${court.end_time ? ` – ${court.end_time}` : ''}` : ''}
              </span>
            )}

            {/* 남은 인원 */}
            {(totalMale > 0 || totalFemale > 0) && (
              isClosed ? (
                <div style={{
                  background: 'rgba(185,50,50,0.06)',
                  border: '1px solid rgba(185,50,50,0.15)',
                  borderRadius: 10, padding: '8px 14px', textAlign: 'center',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 12.5, color: '#B03030' }}>모집 마감</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 7 }}>
                  {totalMale > 0 && (
                    <div style={{
                      flex: 1,
                      background: remainMale <= 0 ? 'rgba(185,50,50,0.05)' : '#fff',
                      border: `1px solid ${remainMale <= 0 ? 'rgba(185,50,50,0.18)' : LIGHT_GREEN}`,
                      borderRadius: 10,
                      padding: '7px 11px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: 11, color: TEXT_SECONDARY, fontWeight: 500 }}>
                        남성 <span style={{ opacity: 0.55 }}>{confirmedMale}/{totalMale}</span>
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 12.5, color: remainMale <= 0 ? '#B03030' : PRIMARY, letterSpacing: '-0.01em' }}>
                        {remainMale <= 0 ? '마감' : `${remainMale}명 남음`}
                      </span>
                    </div>
                  )}
                  {totalFemale > 0 && (
                    <div style={{
                      flex: 1,
                      background: remainFemale <= 0 ? 'rgba(185,50,50,0.05)' : '#fff',
                      border: `1px solid ${remainFemale <= 0 ? 'rgba(185,50,50,0.18)' : LIGHT_GREEN}`,
                      borderRadius: 10,
                      padding: '7px 11px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: 11, color: TEXT_SECONDARY, fontWeight: 500 }}>
                        여성 <span style={{ opacity: 0.55 }}>{confirmedFemale}/{totalFemale}</span>
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 12.5, color: remainFemale <= 0 ? '#B03030' : PRIMARY, letterSpacing: '-0.01em' }}>
                        {remainFemale <= 0 ? '마감' : `${remainFemale}명 남음`}
                      </span>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* CTA 버튼 */}
          {onApply && (
            <div style={{ marginTop: 12 }}>
              {isClosed ? (
                <div style={{
                  padding: '13px 0', textAlign: 'center',
                  background: CARD_BG, borderRadius: 13,
                  border: `1px solid ${LIGHT_GREEN}`,
                }}>
                  <span style={{ fontSize: 13, color: TEXT_SECONDARY, fontWeight: 500 }}>마감된 모임이에요</span>
                </div>
              ) : (
                <button
                  onClick={onApply}
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    borderRadius: 13,
                    border: 'none',
                    background: `linear-gradient(135deg, ${SECONDARY} 0%, ${PRIMARY} 100%)`,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13.5,
                    letterSpacing: '0.01em',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(31,90,60,0.28)',
                    transition: 'transform 0.12s',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.982)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.982)')}
                  onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  참여 신청하기
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 풀스크린 모달 */}
      {modalOpen && photos.length > 0 && (
        <div
          onClick={() => setModalOpen(false)}
          onTouchStart={handleModalTouchStart}
          onTouchEnd={handleModalTouchEnd}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.96)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <img
            src={photos[modalIndex]}
            alt={profile?.name}
            style={{ maxWidth: '100%', maxHeight: '90%', objectFit: 'contain', borderRadius: 8, userSelect: 'none' }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
          <button
            onClick={() => setModalOpen(false)}
            style={{
              position: 'absolute', top: 20, right: 20,
              width: 44, height: 44, borderRadius: '50%',
              background: '#fff', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            <X style={{ width: 18, height: 18, color: '#333' }} />
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={modalPrev}
                style={{
                  position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#fff', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
              >
                <ChevronLeft style={{ width: 22, height: 22, color: '#333' }} />
              </button>
              <button
                onClick={modalNext}
                style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#fff', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
              >
                <ChevronRight style={{ width: 22, height: 22, color: '#333' }} />
              </button>
              <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 7 }}>
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setModalIndex(i); }}
                    style={{
                      width: i === modalIndex ? 20 : 8, height: 8,
                      borderRadius: 4,
                      background: i === modalIndex ? SECONDARY : 'rgba(255,255,255,0.4)',
                      border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.2s',
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
