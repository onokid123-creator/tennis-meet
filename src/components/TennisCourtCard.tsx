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

const PRIMARY = '#1A5C35';
const ACCENT = '#6CBF6C';
const LIGHT = '#E8F5EC';
const TEXT = '#111C16';
const MUTED = '#6B8070';
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
  const totalSlots = totalMale + totalFemale;
  const confirmedSlots = confirmedMale + confirmedFemale;
  const remainSlots = Math.max(0, totalSlots - confirmedSlots);
  const remainMale = Math.max(0, totalMale - confirmedMale);
  const remainFemale = Math.max(0, totalFemale - confirmedFemale);
  const hasSlotsInfo = totalSlots > 0;

  const fillRatio = hasSlotsInfo ? confirmedSlots / totalSlots : 0;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

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
          background: '#fff',
          borderRadius: '20px',
          boxShadow: '0 2px 16px rgba(26,92,53,0.10), 0 1px 3px rgba(0,0,0,0.04)',
          border: `1px solid ${LIGHT}`,
        }}
      >
        {/* 상단 헤더: 코트명 + 시간 */}
        <div
          style={{
            background: `linear-gradient(135deg, ${PRIMARY} 0%, #2D7A4A 100%)`,
            padding: isOwner ? '14px 16px 12px' : '16px 16px 12px',
          }}
        >
          {isOwner && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 6 }}>
              <button
                onClick={onEdit}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                }}
              >
                <Pencil style={{ width: 12, height: 12, color: '#fff' }} />
              </button>
              <button
                onClick={onDelete}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,80,80,0.2)', border: '1px solid rgba(255,100,100,0.3)',
                  cursor: 'pointer',
                }}
              >
                <Trash2 style={{ width: 12, height: 12, color: '#ffaaaa' }} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                {isClosed && (
                  <span style={{ background: 'rgba(255,80,80,0.22)', color: '#ffaaaa', borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.02em' }}>
                    마감
                  </span>
                )}
                {isClosingSoon && !isClosed && (
                  <span style={{ background: 'rgba(255,200,50,0.2)', color: '#FFD060', borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                    마감 임박
                  </span>
                )}
                {court.format && (
                  <span style={{ background: 'rgba(108,191,108,0.2)', color: ACCENT, borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                    {court.format}
                  </span>
                )}
                {court.level && (
                  <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                    {court.level}
                  </span>
                )}
              </div>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em', lineHeight: 1.2, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {court.court_name}
              </h2>
            </div>
            {court.court_fee != null && court.court_fee >= 0 && (
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <span style={{ color: GOLD, fontWeight: 700, fontSize: 14, background: 'rgba(184,149,58,0.15)', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(184,149,58,0.3)' }}>
                  {court.court_fee === 0 ? '무료' : `${court.court_fee.toLocaleString()}원`}
                </span>
              </div>
            )}
          </div>

          {court.start_time && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <Clock style={{ width: 13, height: 13, color: ACCENT, flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
                {court.start_time}{court.end_time ? ` – ${court.end_time}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* 인원 현황 (핵심 강조) */}
        {hasSlotsInfo && (
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${LIGHT}` }}>
            {isClosed ? (
              <div style={{ background: 'rgba(185,50,50,0.06)', border: '1px solid rgba(185,50,50,0.15)', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#B03030' }}>모집 마감</span>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Users style={{ width: 14, height: 14, color: PRIMARY }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>현재 인원</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                    <span style={{ fontWeight: 900, fontSize: 22, color: PRIMARY, letterSpacing: '-0.03em' }}>
                      {confirmedSlots}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: 14, color: MUTED }}>/ {totalSlots}명</span>
                    {remainSlots > 0 && (
                      <span style={{
                        marginLeft: 6,
                        background: remainSlots <= 1 ? 'rgba(239,68,68,0.1)' : `rgba(108,191,108,0.15)`,
                        color: remainSlots <= 1 ? '#DC2626' : PRIMARY,
                        border: `1px solid ${remainSlots <= 1 ? 'rgba(239,68,68,0.25)' : 'rgba(108,191,108,0.35)'}`,
                        borderRadius: 99,
                        padding: '2px 9px',
                        fontSize: 11,
                        fontWeight: 700,
                      }}>
                        {remainSlots}명 남음
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ height: 7, background: LIGHT, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(fillRatio * 100, 100)}%`,
                    background: fillRatio >= 0.8
                      ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)'
                      : `linear-gradient(90deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
                    borderRadius: 99,
                    transition: 'width 0.4s ease',
                  }} />
                </div>

                {(totalMale > 0 && totalFemale > 0) && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: LIGHT, borderRadius: 9, padding: '5px 10px' }}>
                      <span style={{ fontSize: 11, color: '#4A90D9', fontWeight: 600 }}>남 {confirmedMale}/{totalMale}</span>
                      <span style={{ fontSize: 11, color: remainMale <= 0 ? '#B03030' : PRIMARY, fontWeight: 700 }}>
                        {remainMale <= 0 ? '마감' : `${remainMale}명 남음`}
                      </span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: LIGHT, borderRadius: 9, padding: '5px 10px' }}>
                      <span style={{ fontSize: 11, color: '#E57A8A', fontWeight: 600 }}>여 {confirmedFemale}/{totalFemale}</span>
                      <span style={{ fontSize: 11, color: remainFemale <= 0 ? '#B03030' : PRIMARY, fontWeight: 700 }}>
                        {remainFemale <= 0 ? '마감' : `${remainFemale}명 남음`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 추가 정보: 위치 / 날짜 */}
        <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, borderBottom: `1px solid ${LIGHT}` }}>
          {court.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin style={{ width: 13, height: 13, color: MUTED, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: MUTED, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{court.location}</span>
            </div>
          )}
          {court.date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar style={{ width: 13, height: 13, color: MUTED, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: MUTED }}>{formatDate(court.date)}</span>
            </div>
          )}
        </div>

        {/* 참여자 썸네일 + 신청 버튼 */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: -6 }}>
            {photos.slice(0, 2).map((src, i) => (
              <div
                key={i}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  overflow: 'hidden', border: '2px solid #fff',
                  marginLeft: i > 0 ? -10 : 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 2 - i,
                }}
                onClick={() => openModal(i)}
              >
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              </div>
            ))}
            {photos.length === 0 && (
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: `linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%)`,
                border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{profile?.name?.charAt(0) || 'T'}</span>
              </div>
            )}
            {profile?.name && (
              <div style={{ marginLeft: photos.length > 0 ? 8 : 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{profile.name}</span>
                {profile?.experience && (
                  <span style={{ fontSize: 11, color: MUTED, marginLeft: 4 }}>{profile.experience}</span>
                )}
              </div>
            )}
          </div>

          {onApply && (
            isClosed ? (
              <div style={{
                padding: '9px 16px', borderRadius: 12,
                background: LIGHT, border: `1px solid rgba(107,128,112,0.2)`,
              }}>
                <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>마감</span>
              </div>
            ) : (
              <button
                onClick={onApply}
                style={{
                  padding: '10px 20px',
                  borderRadius: 14,
                  border: 'none',
                  background: `linear-gradient(135deg, ${ACCENT} 0%, ${PRIMARY} 100%)`,
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: '0.01em',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(26,92,53,0.30)',
                  transition: 'transform 0.12s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
                onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                참여 신청하기
              </button>
            )
          )}
        </div>
      </div>

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
                      background: i === modalIndex ? ACCENT : 'rgba(255,255,255,0.4)',
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
