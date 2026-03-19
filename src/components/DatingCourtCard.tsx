import { useState, useRef, useEffect } from 'react';
import { Court, Profile } from '../types';
import { ChevronLeft, ChevronRight, X, Pencil, Trash2, MapPin, Calendar, Clock, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DatingCourtCardProps {
  court: Court;
  isOwner?: boolean;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const PINK = '#FF7E8A';
const PINK2 = '#FF9EB3';
const ROSE = '#FFF0F3';
const GOLD = '#C9A84C';
const DARK = '#1a1a1a';
const MUTED = '#9CA3AF';
const CARD_BG = '#FFFFFF';
const PAGE_BG = '#FFF8F6';

function isDatingClosed(court: Court): boolean {
  const tm = court.male_count ?? 0;
  const tf = court.female_count ?? 0;
  const cm = court.confirmed_male_slots ?? 0;
  const cf = court.confirmed_female_slots ?? 0;
  if (tm === 0 && tf === 0) return false;
  return (tm === 0 || cm >= tm) && (tf === 0 || cf >= tf);
}

function formatBadge(court: Court): string | null {
  const src = court.format ?? court.match_type ?? null;
  if (!src) return null;
  if (src === '단식') return '단식 · 1대1';
  if (src === '혼복') return '혼복 · 2대2';
  return src;
}

function costLabel(court: Court): string | null {
  if (court.cost === 'dutch') return '같이 나눠요';
  if (court.cost === 'host') return '제가 낼게요';
  return null;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function ProfileAvatar({ src, name, size = 40, border }: { src?: string; name?: string; size?: number; border?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: `linear-gradient(135deg, ${PINK} 0%, ${PINK2} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: border ?? '2px solid #fff',
      boxShadow: '0 2px 8px rgba(255,126,138,0.25)',
    }}>
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
      ) : (
        <span style={{ color: '#fff', fontWeight: 700, fontSize: size * 0.38 }}>{name?.charAt(0) || '?'}</span>
      )}
    </div>
  );
}

interface DetailSheetProps {
  court: Court;
  isOwner?: boolean;
  onClose: () => void;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function DetailSheet({ court, isOwner, onClose, onApply, onEdit, onDelete }: DetailSheetProps) {
  const profile = court.profile;
  const isClosed = isDatingClosed(court);

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

  const [photoIndex, setPhotoIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [confirmedProfiles, setConfirmedProfiles] = useState<Profile[]>([]);
  const touchStartX = useRef<number | null>(null);
  const modalTouchX = useRef<number | null>(null);

  const tm = court.male_count ?? 0;
  const tf = court.female_count ?? 0;
  const cm = court.confirmed_male_slots ?? 0;
  const cf = court.confirmed_female_slots ?? 0;
  const rmM = Math.max(0, tm - cm);
  const rmF = Math.max(0, tf - cf);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: apps } = await supabase
        .from('applications')
        .select('applicant_id')
        .eq('court_id', court.id)
        .eq('status', 'accepted');
      if (!mounted || !apps || apps.length === 0) return;
      const ids = apps.map((a) => a.applicant_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', ids);
      if (mounted) setConfirmedProfiles(profiles ?? []);
    }
    load();
    return () => { mounted = false; };
  }, [court.id]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40 && photos.length > 1) {
      if (diff > 0) setPhotoIndex((i) => (i + 1) % photos.length);
      else setPhotoIndex((i) => (i - 1 + photos.length) % photos.length);
    }
    touchStartX.current = null;
  };

  const genderColor = ownerGender === '남성' ? '#60A5FA' : ownerGender === '여성' ? PINK : MUTED;

  const infoItems = [
    ownerMbti && { label: 'MBTI', value: ownerMbti },
    ownerHeight && { label: '키', value: `${ownerHeight}cm` },
    ownerAge && { label: '나이', value: `${ownerAge}세` },
    ownerGender && { label: '성별', value: ownerGender },
    ownerExperience && { label: '구력', value: ownerExperience },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PAGE_BG,
          borderRadius: '28px 28px 0 0',
          maxHeight: '94dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'max(env(safe-area-inset-bottom), 96px)',
          position: 'relative',
        }}
      >
        {/* 핸들 */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,126,138,0.2)' }} />
        </div>

        {/* 이미지 슬라이드 */}
        <div
          style={{ position: 'relative', margin: '6px 16px 0', borderRadius: 20, overflow: 'hidden' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {photos.length > 0 ? (
            <>
              <div style={{ width: '100%', aspectRatio: '4/5', overflow: 'hidden', borderRadius: 20 }}>
                <img
                  src={photos[photoIndex]}
                  alt={ownerName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block', cursor: 'pointer' }}
                  draggable={false}
                  onClick={() => { setModalIndex(photoIndex); setModalOpen(true); }}
                />
              </div>

              {/* 그라데이션 오버레이 */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 20,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)',
                pointerEvents: 'none',
              }} />

              {/* 이름/나이 오버레이 */}
              <div style={{ position: 'absolute', bottom: 14, left: 16, zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-0.03em', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>{ownerName}</span>
                  {ownerAge && <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{ownerAge}세</span>}
                  {ownerGender && (
                    <span style={{ fontSize: 13, color: genderColor, fontWeight: 700, background: 'rgba(255,255,255,0.18)', borderRadius: 99, padding: '1px 7px', backdropFilter: 'blur(4px)' }}>
                      {ownerGender}
                    </span>
                  )}
                </div>
                {formatBadge(court) && (
                  <span style={{
                    display: 'inline-block', marginTop: 5,
                    background: `linear-gradient(135deg,${PINK},${PINK2})`,
                    color: '#fff', borderRadius: 99, padding: '3px 10px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                  }}>{formatBadge(court)}</span>
                )}
              </div>

              {/* 닫기 버튼 */}
              <button
                onClick={onClose}
                style={{
                  position: 'absolute', top: 12, right: 12, zIndex: 10,
                  width: 34, height: 34, borderRadius: '50%', border: 'none',
                  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <X style={{ width: 16, height: 16, color: '#fff' }} />
              </button>

              {/* 화살표 */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPhotoIndex((i) => (i - 1 + photos.length) % photos.length); }}
                    style={{
                      position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                      width: 34, height: 34, borderRadius: '50%', border: 'none',
                      background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(6px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 3,
                    }}
                  >
                    <ChevronLeft style={{ width: 17, height: 17, color: '#fff' }} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPhotoIndex((i) => (i + 1) % photos.length); }}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      width: 34, height: 34, borderRadius: '50%', border: 'none',
                      background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(6px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 3,
                    }}
                  >
                    <ChevronRight style={{ width: 17, height: 17, color: '#fff' }} />
                  </button>
                  <div style={{ position: 'absolute', bottom: 52, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, zIndex: 3 }}>
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setPhotoIndex(i); }}
                        style={{
                          width: i === photoIndex ? 18 : 5, height: 5, borderRadius: 3,
                          background: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.45)',
                          border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{
              width: '100%', aspectRatio: '4/5', borderRadius: 20,
              background: `linear-gradient(135deg,${PINK} 0%,${PINK2} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontSize: 64, fontWeight: 700, opacity: 0.5 }}>{ownerName?.charAt(0) || '?'}</span>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 16px 0' }}>

          {/* 일정 + 매칭비 카드 */}
          <div style={{
            background: CARD_BG, borderRadius: 20, padding: '16px 18px',
            boxShadow: '0 2px 16px rgba(255,126,138,0.09)', border: '1px solid rgba(255,126,138,0.12)',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {court.date && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: ROSE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar style={{ width: 13, height: 13, color: PINK }} />
                  </div>
                  <span style={{ fontSize: 13, color: DARK, fontWeight: 600 }}>{fmtDate(court.date)}</span>
                </div>
              )}
              {court.start_time && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: ROSE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock style={{ width: 13, height: 13, color: PINK }} />
                  </div>
                  <span style={{ fontSize: 14, color: DARK, fontWeight: 700 }}>
                    {court.start_time}{court.end_time ? ` – ${court.end_time}` : ''}
                  </span>
                </div>
              )}
              {court.court_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: ROSE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin style={{ width: 13, height: 13, color: PINK }} />
                  </div>
                  <span style={{ fontSize: 13, color: MUTED }}>{court.court_name}</span>
                </div>
              )}
            </div>

            {costLabel(court) && (
              <div style={{
                marginTop: 12, paddingTop: 12,
                borderTop: '1px solid rgba(255,126,138,0.1)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: `linear-gradient(135deg,rgba(255,126,138,0.1),rgba(255,158,179,0.1))`,
                  border: '1px solid rgba(255,126,138,0.25)',
                  color: PINK, borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                }}>
                  💳 {costLabel(court)}
                </span>
              </div>
            )}
          </div>

          {/* 모집 현황 */}
          {(tm > 0 || tf > 0) && (
            <div style={{
              background: CARD_BG, borderRadius: 20, padding: '16px 18px',
              boxShadow: '0 2px 16px rgba(255,126,138,0.09)', border: '1px solid rgba(255,126,138,0.12)',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <div style={{ width: 4, height: 16, borderRadius: 2, background: `linear-gradient(180deg,${PINK},${PINK2})` }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: DARK }}>모집 현황</span>
              </div>
              {isClosed ? (
                <div style={{ background: ROSE, borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: PINK }}>모집이 마감되었습니다</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  {tm > 0 && (
                    <div style={{ flex: 1, background: rmM <= 0 ? 'rgba(239,68,68,0.04)' : 'rgba(96,165,250,0.06)', border: `1px solid ${rmM <= 0 ? 'rgba(239,68,68,0.2)' : 'rgba(96,165,250,0.2)'}`, borderRadius: 14, padding: '11px 14px' }}>
                      <div style={{ fontSize: 11, color: '#60A5FA', fontWeight: 600, marginBottom: 4 }}>남성</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                        <span style={{ fontWeight: 800, fontSize: 20, color: '#60A5FA' }}>{cm}</span>
                        <span style={{ fontSize: 12, color: MUTED }}>/ {tm}명</span>
                      </div>
                      <div style={{ fontSize: 11, color: rmM <= 0 ? '#EF4444' : '#60A5FA', fontWeight: 700, marginTop: 3 }}>
                        {rmM <= 0 ? '마감' : `${rmM}명 남음`}
                      </div>
                    </div>
                  )}
                  {tf > 0 && (
                    <div style={{ flex: 1, background: rmF <= 0 ? 'rgba(239,68,68,0.04)' : `rgba(255,126,138,0.06)`, border: `1px solid ${rmF <= 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,126,138,0.2)'}`, borderRadius: 14, padding: '11px 14px' }}>
                      <div style={{ fontSize: 11, color: PINK, fontWeight: 600, marginBottom: 4 }}>여성</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                        <span style={{ fontWeight: 800, fontSize: 20, color: PINK }}>{cf}</span>
                        <span style={{ fontSize: 12, color: MUTED }}>/ {tf}명</span>
                      </div>
                      <div style={{ fontSize: 11, color: rmF <= 0 ? '#EF4444' : PINK, fontWeight: 700, marginTop: 3 }}>
                        {rmF <= 0 ? '마감' : `${rmF}명 남음`}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 호스트 */}
          {profile && (
            <div style={{
              background: CARD_BG, borderRadius: 20, padding: '16px 18px',
              boxShadow: '0 2px 16px rgba(255,126,138,0.09)', border: '1px solid rgba(255,126,138,0.12)',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <div style={{ width: 4, height: 16, borderRadius: 2, background: `linear-gradient(180deg,${PINK},${PINK2})` }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: DARK }}>호스트</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: ROSE, borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(255,126,138,0.12)' }}>
                <ProfileAvatar
                  src={profile.photo_urls?.[0] || profile.photo_url}
                  name={profile.name}
                  size={50}
                  border={`2.5px solid ${PINK}`}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: DARK }}>{profile.name}</span>
                    <span style={{ background: `linear-gradient(135deg,${PINK},${PINK2})`, color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>호스트</span>
                  </div>
                  {profile.experience && <div style={{ fontSize: 12, color: MUTED }}>구력 {profile.experience}</div>}
                </div>
              </div>
            </div>
          )}

          {/* 확정 참여자 */}
          <div style={{
            background: CARD_BG, borderRadius: 20, padding: '16px 18px',
            boxShadow: '0 2px 16px rgba(255,126,138,0.09)', border: '1px solid rgba(255,126,138,0.12)',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{ width: 4, height: 16, borderRadius: 2, background: `linear-gradient(180deg,${PINK2},${PINK})` }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: DARK }}>확정 참여자</span>
              <span style={{ background: ROSE, color: PINK, borderRadius: 99, padding: '1px 8px', fontSize: 11, fontWeight: 700, marginLeft: 2 }}>
                {confirmedProfiles.length}명
              </span>
            </div>
            {confirmedProfiles.length === 0 ? (
              <div style={{ background: ROSE, borderRadius: 12, padding: '16px', textAlign: 'center', border: '1px solid rgba(255,126,138,0.1)' }}>
                <span style={{ fontSize: 13, color: MUTED }}>아직 확정된 참여자가 없습니다</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {confirmedProfiles.map((p, i) => (
                  <div key={p.user_id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 60 }}>
                    <ProfileAvatar src={p.photo_urls?.[0] || p.photo_url} name={p.name} size={48} />
                    <span style={{ fontSize: 11, color: DARK, fontWeight: 600, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{p.name}</span>
                    {p.experience && <span style={{ fontSize: 10, color: MUTED, marginTop: -3 }}>{p.experience}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 프로필 정보 그리드 */}
          {infoItems.length > 0 && (
            <div style={{
              background: CARD_BG, borderRadius: 20, padding: '16px 18px',
              boxShadow: '0 2px 16px rgba(255,126,138,0.09)', border: '1px solid rgba(255,126,138,0.12)',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <div style={{ width: 4, height: 16, borderRadius: 2, background: `linear-gradient(180deg,${PINK},${PINK2})` }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: DARK }}>프로필 정보</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {infoItems.map((item) => (
                  <div key={item.label} style={{
                    background: ROSE, borderRadius: 14, padding: '12px 10px',
                    textAlign: 'center', border: '1px solid rgba(255,126,138,0.1)',
                  }}>
                    <div style={{ fontSize: 10, color: MUTED, fontWeight: 500, marginBottom: 5, letterSpacing: '0.04em' }}>{item.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: DARK, letterSpacing: '-0.02em' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 자기소개 */}
          {ownerBio && (
            <div style={{
              background: CARD_BG, borderRadius: 20, padding: '16px 18px',
              boxShadow: '0 2px 16px rgba(255,126,138,0.09)', border: '1px solid rgba(255,126,138,0.12)',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <div style={{ width: 4, height: 16, borderRadius: 2, background: `linear-gradient(180deg,${PINK},${PINK2})` }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: DARK }}>자기소개</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#4B5563', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {ownerBio}
              </p>
            </div>
          )}

          {/* 소유자 액션 */}
          {isOwner && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => { onClose(); onEdit?.(); }}
                style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid rgba(255,126,138,0.2)', background: '#fff', color: PINK, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Pencil style={{ width: 13, height: 13 }} />수정하기
              </button>
              <button
                onClick={() => { onClose(); onDelete?.(); }}
                style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid #FCA5A5', background: '#FFF5F5', color: '#DC2626', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Trash2 style={{ width: 13, height: 13 }} />삭제하기
              </button>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        {onApply && (
          <div style={{
            position: 'sticky', bottom: 0, left: 0, right: 0,
            padding: '12px 16px max(env(safe-area-inset-bottom),12px)',
            background: `linear-gradient(to top, ${PAGE_BG} 70%, rgba(255,248,246,0))`,
            zIndex: 20,
          }}>
            {isClosed ? (
              <div style={{ width: '100%', padding: '16px', borderRadius: 18, textAlign: 'center', background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: MUTED }}>이미 마감된 모임이에요</span>
              </div>
            ) : (
              <button
                onClick={() => { onClose(); onApply(); }}
                style={{
                  width: '100%', padding: '17px', borderRadius: 20, border: 'none',
                  background: `linear-gradient(135deg,${PINK} 0%,${PINK2} 100%)`,
                  color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '0.01em',
                  cursor: 'pointer', boxShadow: '0 8px 24px rgba(255,126,138,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseDown={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseUp={(e) => (e.currentTarget.style.opacity = '1')}
                onTouchStart={(e) => (e.currentTarget.style.opacity = '0.9')}
                onTouchEnd={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Heart style={{ width: 17, height: 17, fill: '#fff', strokeWidth: 0 }} />
                관심 있어요, 말 걸어볼게요
              </button>
            )}
          </div>
        )}
      </div>

      {/* 전체화면 모달 */}
      {modalOpen && photos.length > 0 && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModalOpen(false)}
          onTouchStart={(e) => { modalTouchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (modalTouchX.current === null) return;
            const diff = modalTouchX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40 && photos.length > 1) {
              if (diff > 0) setModalIndex((i) => (i + 1) % photos.length);
              else setModalIndex((i) => (i - 1 + photos.length) % photos.length);
            }
            modalTouchX.current = null;
          }}
        >
          <img
            src={photos[modalIndex]}
            alt={ownerName}
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, userSelect: 'none' }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
          <button
            onClick={() => setModalOpen(false)}
            style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: '50%', background: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
          >
            <X style={{ width: 18, height: 18, color: '#333' }} />
          </button>
          {photos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setModalIndex((i) => (i - 1 + photos.length) % photos.length); }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                <ChevronLeft style={{ width: 22, height: 22, color: '#333' }} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setModalIndex((i) => (i + 1) % photos.length); }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                <ChevronRight style={{ width: 22, height: 22, color: '#333' }} />
              </button>
              <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 7 }}>
                {photos.map((_, i) => (
                  <button key={i} onClick={(e) => { e.stopPropagation(); setModalIndex(i); }} style={{ width: i === modalIndex ? 20 : 8, height: 8, borderRadius: 4, background: i === modalIndex ? PINK : 'rgba(255,255,255,0.4)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.2s' }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DatingCourtCard({ court, isOwner, onApply, onEdit, onDelete }: DatingCourtCardProps) {
  const profile = court.profile;
  const isClosed = isDatingClosed(court);
  const [detailOpen, setDetailOpen] = useState(false);

  const ownerName = court.owner_name || profile?.name;
  const ownerAge = court.owner_age || profile?.age;
  const ownerGender = court.owner_gender || profile?.gender;
  const ownerMbti = court.owner_mbti || profile?.mbti;

  const photos: string[] = (() => {
    if (court.owner_photos?.length) return court.owner_photos;
    if (court.owner_photo) return [court.owner_photo];
    if (court.tennis_photo_url) return [court.tennis_photo_url];
    if (profile?.photo_urls?.length) return profile.photo_urls;
    if (profile?.photo_url) return [profile.photo_url];
    return [];
  })();

  const primaryPhoto = photos[0] || null;
  const badge = formatBadge(court);
  const cost = costLabel(court);

  const tm = court.male_count ?? 0;
  const tf = court.female_count ?? 0;
  const cm = court.confirmed_male_slots ?? 0;
  const cf = court.confirmed_female_slots ?? 0;
  const rmM = Math.max(0, tm - cm);
  const rmF = Math.max(0, tf - cf);

  const genderColor = ownerGender === '남성' ? '#60A5FA' : ownerGender === '여성' ? PINK : MUTED;

  return (
    <>
      <div
        className="select-none"
        style={{
          background: CARD_BG,
          borderRadius: 24,
          boxShadow: '0 4px 24px rgba(255,126,138,0.12), 0 1px 4px rgba(0,0,0,0.05)',
          border: '1px solid rgba(255,126,138,0.1)',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        onClick={() => setDetailOpen(true)}
      >
        {/* 소유자 버튼 */}
        {isOwner && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '12px 14px 0' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', cursor: 'pointer' }}
            >
              <Pencil style={{ width: 12, height: 12, color: GOLD }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}
            >
              <Trash2 style={{ width: 12, height: 12, color: '#F87171' }} />
            </button>
          </div>
        )}

        {/* 메인 이미지 */}
        <div style={{ position: 'relative', margin: isOwner ? '10px 14px 0' : '14px 14px 0', borderRadius: 18, overflow: 'hidden' }}>
          {primaryPhoto ? (
            <>
              <div style={{ width: '100%', aspectRatio: '3/4', overflow: 'hidden', borderRadius: 18 }}>
                <img
                  src={primaryPhoto}
                  alt={ownerName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                  draggable={false}
                />
              </div>
              {/* 그라데이션 오버레이 */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 18,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%)',
                pointerEvents: 'none',
              }} />
              {/* 하단 오버레이 텍스트 */}
              <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16, zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.03em', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>{ownerName}</span>
                  {ownerAge && <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{ownerAge}세</span>}
                  {ownerGender && (
                    <span style={{ fontSize: 12, color: genderColor, fontWeight: 700, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '1px 7px', backdropFilter: 'blur(4px)' }}>
                      {ownerGender}
                    </span>
                  )}
                  {isClosed && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(239,68,68,0.85)', color: '#fff', backdropFilter: 'blur(4px)' }}>마감</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {badge && (
                    <span style={{ background: `linear-gradient(135deg,${PINK},${PINK2})`, color: '#fff', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{badge}</span>
                  )}
                  {ownerMbti && (
                    <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.25)' }}>{ownerMbti}</span>
                  )}
                </div>
              </div>
              {/* 이미지 수 표시 */}
              {photos.length > 1 && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)', borderRadius: 99, padding: '3px 8px', fontSize: 11, color: '#fff', fontWeight: 600 }}>
                  1 / {photos.length}
                </div>
              )}
            </>
          ) : (
            <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: 18, background: `linear-gradient(135deg,${PINK} 0%,${PINK2} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 56, fontWeight: 700, opacity: 0.5 }}>{ownerName?.charAt(0) || '?'}</span>
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div style={{ padding: '14px 16px' }}>
          {/* 날짜/시간/가격 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {court.date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar style={{ width: 12, height: 12, color: PINK, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#6B7280' }}>{fmtDate(court.date)}</span>
              </div>
            )}
            {court.start_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock style={{ width: 12, height: 12, color: PINK, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#6B7280' }}>{court.start_time}{court.end_time ? ` – ${court.end_time}` : ''}</span>
              </div>
            )}
          </div>

          {/* 모집 현황 간략 */}
          {(tm > 0 || tf > 0) && !isClosed && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {tm > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: 10, padding: '5px 10px' }}>
                  <span style={{ fontSize: 11, color: '#60A5FA', fontWeight: 600 }}>남 {cm}/{tm}</span>
                  <span style={{ fontSize: 11, color: rmM <= 0 ? '#EF4444' : '#60A5FA', fontWeight: 700 }}>{rmM <= 0 ? '마감' : `${rmM}명 남음`}</span>
                </div>
              )}
              {tf > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: `rgba(255,126,138,0.08)`, border: `1px solid rgba(255,126,138,0.18)`, borderRadius: 10, padding: '5px 10px' }}>
                  <span style={{ fontSize: 11, color: PINK, fontWeight: 600 }}>여 {cf}/{tf}</span>
                  <span style={{ fontSize: 11, color: rmF <= 0 ? '#EF4444' : PINK, fontWeight: 700 }}>{rmF <= 0 ? '마감' : `${rmF}명 남음`}</span>
                </div>
              )}
              {cost && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 10, padding: '5px 10px' }}>
                  <span style={{ fontSize: 11, color: GOLD, fontWeight: 600 }}>{cost}</span>
                </div>
              )}
            </div>
          )}
          {isClosed && (
            <div style={{ background: ROSE, border: '1px solid rgba(255,126,138,0.2)', borderRadius: 10, padding: '8px', textAlign: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 600, fontSize: 12, color: PINK }}>모집 마감</span>
            </div>
          )}

          {/* CTA 버튼 */}
          {onApply && (
            isClosed ? (
              <div style={{ width: '100%', padding: '13px', borderRadius: 16, textAlign: 'center', background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: MUTED }}>마감된 모임이에요</span>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onApply(); }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 18, border: 'none',
                  background: `linear-gradient(135deg,${PINK} 0%,${PINK2} 100%)`,
                  color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '0.01em',
                  cursor: 'pointer', boxShadow: '0 6px 18px rgba(255,126,138,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
                onMouseDown={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseUp={(e) => (e.currentTarget.style.opacity = '1')}
                onTouchStart={(e) => (e.currentTarget.style.opacity = '0.9')}
                onTouchEnd={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Heart style={{ width: 15, height: 15, fill: '#fff', strokeWidth: 0 }} />
                관심 있어요, 말 걸어볼게요
              </button>
            )
          )}
        </div>
      </div>

      {detailOpen && (
        <DetailSheet
          court={court}
          isOwner={isOwner}
          onClose={() => setDetailOpen(false)}
          onApply={onApply}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
