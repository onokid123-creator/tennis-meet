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

const SAGE = '#5B7F6E';
const LIGHT_GREEN = '#A8C5A0';
const MINT_BG = '#F4FAF6';
const TEXT_PRIMARY = '#1C2B24';
const TEXT_SECONDARY = '#6B7F74';
const GOLD = '#C4A24A';

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
    <div
      style={{
        borderRadius: '24px',
        background: '#fff',
        boxShadow: '0 4px 24px rgba(91,127,110,0.10), 0 1px 4px rgba(0,0,0,0.04)',
        border: `1px solid ${LIGHT_GREEN}55`,
        overflow: 'hidden',
      }}
    >
      {/* ── Photo ── */}
      {photos.length > 0 && (
        <div
          className="relative select-none"
          style={{ height: '240px' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            onClick={() => openModal(photoIndex)}
            style={{ width: '100%', height: '100%', padding: 0, border: 'none', background: 'none', display: 'block' }}
          >
            <img
              key={photoIndex}
              src={photos[photoIndex]}
              alt={profile?.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 20%',
                display: 'block',
              }}
            />
          </button>

          <div
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(to top, rgba(28,43,36,0.55) 0%, rgba(28,43,36,0.08) 45%, transparent 70%)',
            }}
          />

          {photos.length > 1 && (
            <>
              <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, pointerEvents: 'none' }}>
                {photos.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === photoIndex ? 18 : 5,
                      height: 5,
                      borderRadius: 999,
                      background: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                      transition: 'all 0.25s',
                    }}
                  />
                ))}
              </div>
              <button onClick={prevPhoto} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: 'none', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                <ChevronLeft style={{ width: 16, height: 16, color: '#fff' }} />
              </button>
              <button onClick={nextPhoto} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: 'none', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                <ChevronRight style={{ width: 16, height: 16, color: '#fff' }} />
              </button>
            </>
          )}

          {/* Status badge */}
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, zIndex: 2 }}>
            {court.format && (
              <span style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
                {court.format}
              </span>
            )}
            {isClosingSoon && !isClosed && (
              <span style={{ background: 'rgba(220,150,30,0.88)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>마감 임박</span>
            )}
            {isClosed && (
              <span style={{ background: 'rgba(200,60,60,0.88)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>마감</span>
            )}
          </div>

          {/* Owner controls */}
          {isOwner && (
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, zIndex: 2 }}>
              <button onClick={onEdit} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: 'none', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Pencil style={{ width: 13, height: 13, color: '#fff' }} />
              </button>
              <button onClick={onDelete} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: 'none', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Trash2 style={{ width: 13, height: 13, color: '#fff' }} />
              </button>
            </div>
          )}

          {/* Profile name overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 18px 16px', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: '-0.01em', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
                {profile?.name}
              </span>
              {profile?.experience && (
                <span style={{ background: 'rgba(255,255,255,0.18)', color: '#E8F5E0', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600, backdropFilter: 'blur(4px)', marginBottom: 2 }}>
                  {profile.experience}
                </span>
              )}
              {profile?.tennis_style && (
                <span style={{ background: 'rgba(168,197,160,0.28)', color: '#D4F0C8', border: '1px solid rgba(168,197,160,0.35)', borderRadius: 20, padding: '2px 9px', fontSize: 11, backdropFilter: 'blur(4px)', marginBottom: 2 }}>
                  {profile.tennis_style}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── No photo header ── */}
      {photos.length === 0 && (
        <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${LIGHT_GREEN}40`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: MINT_BG }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${SAGE} 0%, ${LIGHT_GREEN} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{profile?.name?.charAt(0) || 'T'}</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: TEXT_PRIMARY, letterSpacing: '-0.01em' }}>{profile?.name}</span>
                {profile?.experience && (
                  <span style={{ background: `${SAGE}18`, color: SAGE, border: `1px solid ${SAGE}35`, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>{profile.experience}</span>
                )}
                {profile?.tennis_style && (
                  <span style={{ background: `${LIGHT_GREEN}22`, color: SAGE, border: `1px solid ${LIGHT_GREEN}40`, borderRadius: 20, padding: '2px 9px', fontSize: 11 }}>{profile.tennis_style}</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {court.format && (
              <span style={{ background: SAGE, color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{court.format}</span>
            )}
            {isClosingSoon && !isClosed && <span style={{ background: `rgba(220,150,30,0.12)`, color: '#B8850A', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>마감 임박</span>}
            {isClosed && <span style={{ background: 'rgba(200,60,60,0.1)', color: '#C03030', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>마감</span>}
            {isOwner && (
              <>
                <button onClick={onEdit} style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: TEXT_SECONDARY }}><Pencil style={{ width: 14, height: 14 }} /></button>
                <button onClick={onDelete} style={{ padding: 6, border: 'none', background: 'none', cursor: 'pointer', color: TEXT_SECONDARY }}><Trash2 style={{ width: 14, height: 14 }} /></button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ padding: '16px 18px 18px' }}>

        {/* Row 1: Court name + date/time */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: TEXT_PRIMARY, letterSpacing: '-0.01em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {court.court_name}
            </span>
            {court.court_fee != null && court.court_fee >= 0 && (
              <span style={{ fontWeight: 700, fontSize: 14, color: GOLD, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                {court.court_fee === 0 ? '무료' : `${court.court_fee.toLocaleString()}원`}
              </span>
            )}
          </div>
          {(court.date || court.start_time) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12.5, color: TEXT_SECONDARY }}>
                {court.date ? formatDate(court.date) : ''}
                {court.date && court.start_time ? ' · ' : ''}
                {court.start_time ? `${court.start_time}${court.end_time ? ` ~ ${court.end_time}` : ''}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Row 2: Slots */}
        {(totalMale > 0 || totalFemale > 0) && (
          <div style={{ marginBottom: 14 }}>
            {isClosed ? (
              <div style={{ background: 'rgba(200,60,60,0.06)', border: '1px solid rgba(200,60,60,0.18)', borderRadius: 14, padding: '10px 16px', textAlign: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#C03030' }}>모집 마감</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                {totalMale > 0 && (
                  <div style={{ flex: 1, background: remainMale <= 0 ? 'rgba(200,60,60,0.05)' : MINT_BG, border: `1px solid ${remainMale <= 0 ? 'rgba(200,60,60,0.2)' : LIGHT_GREEN + '60'}`, borderRadius: 14, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_SECONDARY, letterSpacing: '0.02em' }}>남성</span>
                      <span style={{ fontSize: 10, color: TEXT_SECONDARY, opacity: 0.7 }}>{confirmedMale}/{totalMale}</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: remainMale <= 0 ? '#C03030' : SAGE, letterSpacing: '-0.02em' }}>
                      {remainMale <= 0 ? '마감' : `${remainMale}명 남음`}
                    </span>
                  </div>
                )}
                {totalFemale > 0 && (
                  <div style={{ flex: 1, background: remainFemale <= 0 ? 'rgba(200,60,60,0.05)' : MINT_BG, border: `1px solid ${remainFemale <= 0 ? 'rgba(200,60,60,0.2)' : LIGHT_GREEN + '60'}`, borderRadius: 14, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_SECONDARY, letterSpacing: '0.02em' }}>여성</span>
                      <span style={{ fontSize: 10, color: TEXT_SECONDARY, opacity: 0.7 }}>{confirmedFemale}/{totalFemale}</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: remainFemale <= 0 ? '#C03030' : SAGE, letterSpacing: '-0.02em' }}>
                      {remainFemale <= 0 ? '마감' : `${remainFemale}명 남음`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Row 3: Description */}
        {court.description && (
          <div style={{ marginBottom: 14, paddingLeft: 12, borderLeft: `2px solid ${LIGHT_GREEN}` }}>
            <p style={{ fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 1.65, margin: 0 }}>{court.description}</p>
          </div>
        )}

        {/* Row 4: CTA */}
        {onApply && (
          isClosed ? (
            <div style={{ padding: '13px 0', textAlign: 'center', background: `${MINT_BG}`, borderRadius: 16, border: `1px solid ${LIGHT_GREEN}40` }}>
              <span style={{ fontSize: 13, color: TEXT_SECONDARY, fontWeight: 500 }}>마감된 모임이에요</span>
            </div>
          ) : (
            <button
              onClick={onApply}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 16,
                border: 'none',
                background: `linear-gradient(135deg, ${SAGE} 0%, #3D6B52 100%)`,
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                boxShadow: `0 6px 20px ${SAGE}45`,
                transition: 'opacity 0.15s, transform 0.12s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.985)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.985)')}
              onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              참여 신청하기
            </button>
          )
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && photos.length > 0 && (
        <div
          onClick={() => setModalOpen(false)}
          onTouchStart={handleModalTouchStart}
          onTouchEnd={handleModalTouchEnd}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <img
            src={photos[modalIndex]}
            alt={profile?.name}
            style={{ maxWidth: '100%', maxHeight: '90%', objectFit: 'contain', borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <>
              <button onClick={modalPrev} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronLeft style={{ width: 20, height: 20, color: '#fff' }} />
              </button>
              <button onClick={modalNext} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight style={{ width: 20, height: 20, color: '#fff' }} />
              </button>
            </>
          )}
          <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X style={{ width: 16, height: 16, color: '#fff' }} />
          </button>
          <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{modalIndex + 1} / {photos.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
