import { useState, useRef, useEffect } from 'react';
import { Court, Profile } from '../types';
import {
  ChevronLeft, ChevronRight, X, Pencil, Trash2,
  MapPin, Calendar, Clock, Heart, Users, ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ─────────── Design tokens ─────────── */
const PINK  = '#C9637A';
const PINK2 = '#D4849A';
const ROSE  = '#FFF5F7';
const GOLD  = '#C9A84C';
const DARK  = '#1a1a1a';
const MUTED = '#9CA3AF';
const WHITE = '#FFFFFF';
const PAGE  = '#FFF8F6';

/* ─────────── Helpers ─────────── */
function isClosed(court: Court) {
  const tm = court.male_count   ?? 0, tf = court.female_count   ?? 0;
  const cm = court.confirmed_male_slots ?? 0, cf = court.confirmed_female_slots ?? 0;
  if (tm === 0 && tf === 0) return false;
  return (tm === 0 || cm >= tm) && (tf === 0 || cf >= tf);
}

function badge(court: Court): string | null {
  const s = court.format ?? court.match_type ?? null;
  if (!s) return null;
  if (s === '단식') return '단식 · 1대1';
  if (s === '혼복') return '혼복 · 2대2';
  return s;
}

function cost(court: Court): string | null {
  if (court.cost === 'dutch') return '같이 나눠요';
  if (court.cost === 'host')  return '제가 낼게요';
  return null;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

/* ─────────── Avatar ─────────── */
function Avatar({
  src, name, size = 44, ring,
}: { src?: string; name?: string; size?: number; ring?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: `linear-gradient(135deg,${PINK},${PINK2})`,
      border: ring ?? `2px solid ${WHITE}`,
      boxShadow: '0 2px 8px rgba(255,126,138,0.22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        : <span style={{ color: WHITE, fontWeight: 700, fontSize: size * 0.38 }}>{name?.charAt(0) ?? '?'}</span>
      }
    </div>
  );
}

/* ─────────── Photo lightbox ─────────── */
function Lightbox({
  photos, index, onClose, onChange,
}: { photos: string[]; index: number; onClose: () => void; onChange: (i: number) => void }) {
  const tx = useRef<number | null>(null);
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
      onTouchStart={(e) => { tx.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (tx.current === null) return;
        const d = tx.current - e.changedTouches[0].clientX;
        if (Math.abs(d) > 40 && photos.length > 1) onChange(d > 0 ? (index + 1) % photos.length : (index - 1 + photos.length) % photos.length);
        tx.current = null;
      }}
    >
      <img
        src={photos[index]} alt=""
        style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, userSelect: 'none' }}
        onClick={(e) => e.stopPropagation()} draggable={false}
      />
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: '50%', background: WHITE, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <X style={{ width: 18, height: 18, color: '#333' }} />
      </button>
      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onChange((index - 1 + photos.length) % photos.length); }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: WHITE, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            <ChevronLeft style={{ width: 22, height: 22, color: '#333' }} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onChange((index + 1) % photos.length); }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: WHITE, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            <ChevronRight style={{ width: 22, height: 22, color: '#333' }} />
          </button>
          <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {photos.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); onChange(i); }} style={{ width: i === index ? 20 : 7, height: 7, borderRadius: 4, background: i === index ? PINK : 'rgba(255,255,255,0.38)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.2s' }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────── Section header ─────────── */
function SectionHead({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      <div style={{ width: 3, height: 15, borderRadius: 2, background: `linear-gradient(180deg,${PINK},${PINK2})` }} />
      <span style={{ fontWeight: 700, fontSize: 14, color: DARK }}>{label}</span>
    </div>
  );
}

/* ─────────── Card wrapper ─────────── */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: WHITE, borderRadius: 20, padding: '16px 18px',
      boxShadow: '0 2px 14px rgba(255,126,138,0.08)',
      border: '1px solid rgba(255,126,138,0.11)',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─────────── Detail bottom-sheet ─────────── */
interface SheetProps {
  court: Court;
  isOwner?: boolean;
  onClose: () => void;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function DetailSheet({ court, isOwner, onClose, onApply, onEdit, onDelete }: SheetProps) {
  const p       = court.profile;
  const closed  = isClosed(court);
  const [tab, setTab]   = useState<0 | 1>(0);
  const [pidx, setPidx] = useState(0);
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIdx,  setLbIdx]  = useState(0);
  const [confirmed, setConfirmed] = useState<Profile[]>([]);
  const tx = useRef<number | null>(null);

  const name   = court.owner_name  ?? p?.name;
  const age    = court.owner_age   ?? p?.age;
  const gender = court.owner_gender ?? p?.gender;
  const exp    = court.owner_experience ?? p?.experience;
  const mbti   = court.owner_mbti  ?? p?.mbti;
  const height = court.owner_height ?? p?.height;
  const bio    = court.court_intro  ?? court.owner_bio ?? p?.bio;

  const photos: string[] = (() => {
    if (court.owner_photos?.length) return court.owner_photos;
    if (court.owner_photo) return [court.owner_photo];
    if (court.tennis_photo_url) return [court.tennis_photo_url];
    if (p?.photo_urls?.length) return p.photo_urls;
    if (p?.photo_url) return [p.photo_url];
    return [];
  })();

  const tm = court.male_count ?? 0,   tf = court.female_count ?? 0;
  const cm = court.confirmed_male_slots ?? 0, cf = court.confirmed_female_slots ?? 0;

  const loadConfirmed = async (signal: { cancelled: boolean }) => {
    const { data: apps } = await supabase
      .from('applications')
      .select('applicant_id')
      .eq('court_id', court.id)
      .eq('status', 'accepted');

    if (signal.cancelled) return;

    const ids = (apps ?? []).map((a) => a.applicant_id);
    if (ids.length === 0) {
      setConfirmed([]);
      return;
    }

    const { data: profs } = await supabase
      .from('profiles')
      .select('user_id,name,photo_url,photo_urls,experience')
      .in('user_id', ids);

    if (!signal.cancelled) setConfirmed(profs ?? []);
  };

  useEffect(() => {
    const signal = { cancelled: false };
    loadConfirmed(signal);
    return () => { signal.cancelled = true; };
  // court.confirmed_male_slots / confirmed_female_slots 변화 시 재조회
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [court.id, court.confirmed_male_slots, court.confirmed_female_slots]);

  useEffect(() => {
    const channel = supabase
      .channel(`confirmed_dating_${court.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'applications',
        filter: `court_id=eq.${court.id}`,
      }, () => {
        const signal = { cancelled: false };
        loadConfirmed(signal);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [court.id]);

  const swipe = (e: React.TouchEvent, setCb: (i: number) => void, len: number, cur: number) => {
    if (tx.current === null) return;
    const d = tx.current - e.changedTouches[0].clientX;
    if (Math.abs(d) > 40 && len > 1) setCb(d > 0 ? (cur + 1) % len : (cur - 1 + len) % len);
    tx.current = null;
  };

  const genderClr = gender === '남성' ? '#60A5FA' : gender === '여성' ? PINK : MUTED;

  const infoGrid = [
    mbti   && { label: 'MBTI',  value: mbti },
    height && { label: '키',    value: `${height}cm` },
    age    && { label: '나이',  value: `${age}세` },
    gender && { label: '성별',  value: gender },
    exp    && { label: '구력',  value: exp },
  ].filter(Boolean) as { label: string; value: string }[];

  const PinkBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '17px', borderRadius: 20, border: 'none',
        background: `linear-gradient(135deg,${PINK},${PINK2})`,
        color: WHITE, fontWeight: 800, fontSize: 16,
        cursor: 'pointer', boxShadow: '0 8px 22px rgba(255,126,138,0.38)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
      onPointerDown={(e) => (e.currentTarget.style.opacity = '0.88')}
      onPointerUp={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: PAGE, borderRadius: '28px 28px 0 0', height: '94dvh', maxHeight: '94dvh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
      >
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,126,138,0.18)' }} />
        </div>

        {/* ── Scrollable area ── */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', paddingBottom: onApply ? 'calc(env(safe-area-inset-bottom, 16px) + 140px)' : 24 }}>

        {/* ── Image slide ── */}
        <div
          style={{ position: 'relative', margin: '4px 14px 0', borderRadius: 20, overflow: 'hidden' }}
          onTouchStart={(e) => { tx.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => swipe(e, setPidx, photos.length, pidx)}
        >
          {photos.length > 0 ? (
            <>
              <div style={{ width: '100%', aspectRatio: '4/5', overflow: 'hidden', borderRadius: 20 }}>
                <img
                  src={photos[pidx]} alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block', cursor: 'zoom-in' }}
                  draggable={false}
                  onClick={() => { setLbIdx(pidx); setLbOpen(true); }}
                />
              </div>
              {/* dark gradient */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: 'linear-gradient(to bottom,transparent 48%,rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />
              {/* name overlay */}
              <div style={{ position: 'absolute', bottom: 14, left: 16, zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ fontWeight: 800, fontSize: 22, color: WHITE, letterSpacing: '-0.03em', textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>{name}</span>
                  {age    && <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{age}세</span>}
                  {gender && <span style={{ fontSize: 12, fontWeight: 700, color: genderClr, background: 'rgba(255,255,255,0.16)', borderRadius: 99, padding: '1px 8px', backdropFilter: 'blur(4px)' }}>{gender}</span>}
                  {closed && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(239,68,68,0.85)', color: WHITE }}>마감</span>}
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                  {badge(court) && <span style={{ background: `linear-gradient(135deg,${PINK},${PINK2})`, color: WHITE, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{badge(court)}</span>}
                  {exp          && <span style={{ background: 'rgba(255,255,255,0.18)', color: WHITE, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.22)' }}>{exp}</span>}
                </div>
              </div>
              {/* close button */}
              <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X style={{ width: 16, height: 16, color: WHITE }} />
              </button>
              {/* arrows */}
              {photos.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setPidx((i) => (i - 1 + photos.length) % photos.length); }} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 3 }}>
                    <ChevronLeft style={{ width: 16, height: 16, color: WHITE }} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setPidx((i) => (i + 1) % photos.length); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 3 }}>
                    <ChevronRight style={{ width: 16, height: 16, color: WHITE }} />
                  </button>
                  {/* dots */}
                  <div style={{ position: 'absolute', bottom: 50, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, zIndex: 3 }}>
                    {photos.map((_, i) => (
                      <button key={i} onClick={(e) => { e.stopPropagation(); setPidx(i); }} style={{ width: i === pidx ? 18 : 5, height: 5, borderRadius: 3, background: i === pidx ? WHITE : 'rgba(255,255,255,0.42)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.2s' }} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ width: '100%', aspectRatio: '4/5', borderRadius: 20, background: `linear-gradient(135deg,${PINK},${PINK2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: WHITE, fontSize: 64, fontWeight: 700, opacity: 0.45 }}>{name?.charAt(0) ?? '?'}</span>
            </div>
          )}
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', margin: '14px 14px 0', background: WHITE, borderRadius: 14, padding: 4, border: '1px solid rgba(255,126,138,0.1)', gap: 4 }}>
          {(['모임 정보', '사람 정보'] as const).map((label, idx) => (
            <button
              key={idx}
              onClick={() => setTab(idx as 0 | 1)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 11, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.18s',
                background: tab === idx ? `linear-gradient(135deg,${PINK},${PINK2})` : 'transparent',
                color: tab === idx ? WHITE : MUTED,
                boxShadow: tab === idx ? '0 4px 12px rgba(255,126,138,0.3)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px 14px 0' }}>

          {/* ───── Tab 0: 모임 정보 ───── */}
          {tab === 0 && (
            <>
              {/* 코트 정보 */}
              <Card style={{ marginBottom: 10 }}>
                <SectionHead label="코트 정보" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {court.court_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: ROSE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MapPin style={{ width: 14, height: 14, color: PINK }} />
                      </div>
                      <span style={{ fontSize: 14, color: DARK, fontWeight: 600 }}>{court.court_name}</span>
                    </div>
                  )}
                  {court.date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: ROSE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Calendar style={{ width: 14, height: 14, color: PINK }} />
                      </div>
                      <span style={{ fontSize: 14, color: DARK, fontWeight: 600 }}>{fmtDate(court.date)}</span>
                    </div>
                  )}
                  {court.start_time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: ROSE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Clock style={{ width: 14, height: 14, color: PINK }} />
                      </div>
                      <span style={{ fontSize: 14, color: DARK, fontWeight: 600 }}>{court.start_time}{court.end_time ? ` – ${court.end_time}` : ''}</span>
                    </div>
                  )}
                </div>
                {cost(court) && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,126,138,0.1)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: ROSE, border: '1px solid rgba(255,126,138,0.22)', color: PINK, borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                      💳 {cost(court)}
                    </span>
                  </div>
                )}
              </Card>

              {/* 모집 현황 */}
              {(tm > 0 || tf > 0) && (
                <Card style={{ marginBottom: 10 }}>
                  <SectionHead label="모집 현황" />
                  {closed ? (
                    <div style={{ background: ROSE, borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: PINK }}>모집이 마감되었습니다</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {tm > 0 && (() => { const rm = Math.max(0, tm - cm); return (
                        <div style={{ flex: 1, background: rm <= 0 ? 'rgba(239,68,68,0.04)' : 'rgba(96,165,250,0.06)', border: `1px solid ${rm <= 0 ? 'rgba(239,68,68,0.18)' : 'rgba(96,165,250,0.18)'}`, borderRadius: 14, padding: '12px 14px' }}>
                          <div style={{ fontSize: 11, color: '#60A5FA', fontWeight: 600, marginBottom: 4 }}>남성</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                            <span style={{ fontWeight: 800, fontSize: 22, color: '#60A5FA' }}>{cm}</span>
                            <span style={{ fontSize: 12, color: MUTED }}>/ {tm}명</span>
                          </div>
                          <div style={{ fontSize: 11, color: rm <= 0 ? '#EF4444' : '#60A5FA', fontWeight: 700, marginTop: 2 }}>{rm <= 0 ? '마감' : `${rm}명 남음`}</div>
                        </div>
                      ); })()}
                      {tf > 0 && (() => { const rf = Math.max(0, tf - cf); return (
                        <div style={{ flex: 1, background: rf <= 0 ? 'rgba(239,68,68,0.04)' : 'rgba(255,126,138,0.06)', border: `1px solid ${rf <= 0 ? 'rgba(239,68,68,0.18)' : 'rgba(255,126,138,0.18)'}`, borderRadius: 14, padding: '12px 14px' }}>
                          <div style={{ fontSize: 11, color: PINK, fontWeight: 600, marginBottom: 4 }}>여성</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                            <span style={{ fontWeight: 800, fontSize: 22, color: PINK }}>{cf}</span>
                            <span style={{ fontSize: 12, color: MUTED }}>/ {tf}명</span>
                          </div>
                          <div style={{ fontSize: 11, color: rf <= 0 ? '#EF4444' : PINK, fontWeight: 700, marginTop: 2 }}>{rf <= 0 ? '마감' : `${rf}명 남음`}</div>
                        </div>
                      ); })()}
                    </div>
                  )}
                </Card>
              )}

              {/* 소유자 버튼 — fixed CTA로 이동됨 */}
            </>
          )}

          {/* ───── Tab 1: 사람 정보 ───── */}
          {tab === 1 && (
            <>
              {/* 호스트 */}
              {p && (
                <Card style={{ marginBottom: 10 }}>
                  <SectionHead label="호스트" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: ROSE, borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(255,126,138,0.11)' }}>
                    <Avatar src={p.photo_urls?.[0] ?? p.photo_url} name={p.name} size={52} ring={`2.5px solid ${PINK}`} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: DARK }}>{p.name}</span>
                        <span style={{ background: `linear-gradient(135deg,${PINK},${PINK2})`, color: WHITE, borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>호스트</span>
                      </div>
                      {p.experience && <div style={{ fontSize: 12, color: MUTED }}>구력 {p.experience}</div>}
                    </div>
                  </div>
                </Card>
              )}

              {/* 프로필 그리드 */}
              {infoGrid.length > 0 && (
                <Card style={{ marginBottom: 10 }}>
                  <SectionHead label="프로필 정보" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {infoGrid.map((item) => (
                      <div key={item.label} style={{ background: ROSE, borderRadius: 14, padding: '12px 8px', textAlign: 'center', border: '1px solid rgba(255,126,138,0.09)' }}>
                        <div style={{ fontSize: 10, color: MUTED, fontWeight: 500, marginBottom: 5, letterSpacing: '0.03em' }}>{item.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: DARK, letterSpacing: '-0.02em' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 자기소개 */}
              {bio && (
                <Card style={{ marginBottom: 16 }}>
                  <SectionHead label="자기소개" />
                  <p style={{ margin: 0, fontSize: 14, color: '#4B5563', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{bio}</p>
                </Card>
              )}
            </>
          )}
        </div>
        {/* ── end scrollable area ── */}
        </div>

      </div>

      {/* ── Fixed CTA — BottomNav(64px) + safe-area 위에 고정 ── */}
      {onApply && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 16px) + 64px)',
          left: 0,
          right: 0,
          zIndex: 10000,
          padding: '12px 16px 16px',
          background: PAGE,
          borderTop: '1px solid rgba(234,153,166,0.18)',
          boxShadow: '0 -4px 20px rgba(234,153,166,0.12)',
        }}>
          {closed ? (
            <div style={{ width: '100%', padding: '15px', borderRadius: 18, textAlign: 'center', background: '#FDF2F4', border: '1px solid rgba(234,153,166,0.2)' }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: MUTED }}>이미 마감된 모임이에요</span>
            </div>
          ) : (
            <PinkBtn onClick={() => { onClose(); onApply!(); }}>
              <Heart style={{ width: 17, height: 17, fill: WHITE, strokeWidth: 0 }} />
              이 만남, 이어가볼까요?
            </PinkBtn>
          )}
        </div>
      )}

      {lbOpen && <Lightbox photos={photos} index={lbIdx} onClose={() => setLbOpen(false)} onChange={setLbIdx} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Home card
───────────────────────────────────────────────────────── */
interface DatingCourtCardProps {
  court: Court;
  isOwner?: boolean;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function DatingCourtCard({ court, isOwner, onApply, onEdit, onDelete }: DatingCourtCardProps) {
  const p = court.profile;
  const closed = isClosed(court);
  const [detailOpen, setDetailOpen] = useState(false);
  const [lbOpen, setLbOpen]   = useState(false);
  const [lbIdx, setLbIdx]     = useState(0);
  const [pidx, setPidx]       = useState(0);
  const tx = useRef<number | null>(null);

  const name   = court.owner_name  ?? p?.name;
  const gender = court.owner_gender ?? p?.gender;
  const exp    = court.owner_experience ?? p?.experience;

  const photos: string[] = (() => {
    if (court.owner_photos?.length) return court.owner_photos;
    if (court.owner_photo) return [court.owner_photo];
    if (court.tennis_photo_url) return [court.tennis_photo_url];
    if (p?.photo_urls?.length) return p.photo_urls;
    if (p?.photo_url) return [p.photo_url];
    return [];
  })();

  const tm = court.male_count ?? 0,   tf = court.female_count ?? 0;
  const cm = court.confirmed_male_slots ?? 0, cf = court.confirmed_female_slots ?? 0;
  const rmM = Math.max(0, tm - cm), rmF = Math.max(0, tf - cf);
  const showSlots = tm > 0 || tf > 0;
  const genderClr = gender === '남성' ? '#60A5FA' : gender === '여성' ? PINK : MUTED;

  const openDetail = () => setDetailOpen(true);

  return (
    <>
      {/* ── card ── */}
      <div
        onClick={openDetail}
        style={{
          background: WHITE, borderRadius: 24, overflow: 'hidden', cursor: 'pointer',
          boxShadow: '0 4px 22px rgba(255,126,138,0.11), 0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(255,126,138,0.1)',
        }}
      >
        {/* owner actions */}
        {isOwner && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '11px 13px 0' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,168,76,0.09)', border: '1px solid rgba(201,168,76,0.28)', cursor: 'pointer' }}
            >
              <Pencil style={{ width: 12, height: 12, color: GOLD }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', cursor: 'pointer' }}
            >
              <Trash2 style={{ width: 12, height: 12, color: '#F87171' }} />
            </button>
          </div>
        )}

        {/* ── Main photo ── */}
        <div
          style={{ position: 'relative', margin: isOwner ? '8px 12px 0' : '12px 12px 0', borderRadius: 18, overflow: 'hidden' }}
          onTouchStart={(e) => { tx.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (tx.current === null) return;
            const d = tx.current - e.changedTouches[0].clientX;
            if (Math.abs(d) > 40 && photos.length > 1) {
              e.stopPropagation();
              setPidx(d > 0 ? (pidx + 1) % photos.length : (pidx - 1 + photos.length) % photos.length);
            }
            tx.current = null;
          }}
        >
          {photos.length > 0 ? (
            <>
              {/* photo */}
              <div style={{ width: '100%', aspectRatio: '3/4', overflow: 'hidden', borderRadius: 18 }}>
                <img
                  src={photos[pidx]} alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                  draggable={false}
                  onClick={(e) => { e.stopPropagation(); setLbIdx(pidx); setLbOpen(true); }}
                />
              </div>

              {/* gradient */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'linear-gradient(to bottom,transparent 42%,rgba(0,0,0,0.68) 100%)', pointerEvents: 'none' }} />

              {/* name & badges */}
              <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 7 }}>
                  <span style={{ fontWeight: 800, fontSize: 20, color: WHITE, letterSpacing: '-0.03em', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>{name}</span>
                  {gender && <span style={{ fontSize: 12, fontWeight: 700, color: genderClr, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '1px 7px', backdropFilter: 'blur(4px)' }}>{gender}</span>}
                  {closed && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(239,68,68,0.85)', color: WHITE }}>마감</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {badge(court) && <span style={{ background: `linear-gradient(135deg,${PINK},${PINK2})`, color: WHITE, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{badge(court)}</span>}
                  {exp          && <span style={{ background: 'rgba(255,255,255,0.18)', color: WHITE, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}>{exp}</span>}
                </div>
              </div>

              {/* photo count badge */}
              {photos.length > 1 && (
                <div style={{ position: 'absolute', top: 11, right: 11, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(6px)', borderRadius: 99, padding: '3px 8px', fontSize: 11, color: WHITE, fontWeight: 600, zIndex: 3 }}>
                  {pidx + 1} / {photos.length}
                </div>
              )}
            </>
          ) : (
            <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: 18, background: `linear-gradient(135deg,${PINK},${PINK2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: WHITE, fontSize: 56, fontWeight: 700, opacity: 0.42 }}>{name?.charAt(0) ?? '?'}</span>
            </div>
          )}
        </div>

        {/* ── Info strip ── */}
        <div style={{ padding: '12px 14px 14px' }}>

          {/* date / time row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            {court.court_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <MapPin style={{ width: 11, height: 11, color: PINK }} />
                <span style={{ fontSize: 12, color: '#6B7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{court.court_name}</span>
              </div>
            )}
            {court.date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar style={{ width: 11, height: 11, color: PINK }} />
                <span style={{ fontSize: 12, color: '#6B7280' }}>{fmtDate(court.date)}</span>
              </div>
            )}
            {court.start_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock style={{ width: 11, height: 11, color: PINK }} />
                <span style={{ fontSize: 12, color: '#6B7280' }}>{court.start_time}{court.end_time ? ` – ${court.end_time}` : ''}</span>
              </div>
            )}
          </div>

          {/* slots + cost row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {showSlots && !closed && (
              <>
                {tm > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.16)', borderRadius: 99, padding: '3px 9px', fontSize: 11, color: '#60A5FA', fontWeight: 600 }}>
                    남 {rmM <= 0 ? '마감' : `${rmM}명`}
                  </span>
                )}
                {tf > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: `rgba(255,126,138,0.08)`, border: `1px solid rgba(255,126,138,0.16)`, borderRadius: 99, padding: '3px 9px', fontSize: 11, color: PINK, fontWeight: 600 }}>
                    여 {rmF <= 0 ? '마감' : `${rmF}명`}
                  </span>
                )}
              </>
            )}
            {closed && (
              <span style={{ background: ROSE, border: '1px solid rgba(255,126,138,0.2)', borderRadius: 99, padding: '3px 10px', fontSize: 11, color: PINK, fontWeight: 700 }}>모집 마감</span>
            )}
            {cost(court) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 99, padding: '3px 9px', fontSize: 11, color: GOLD, fontWeight: 600 }}>
                {cost(court)}
              </span>
            )}
          </div>

          {/* CTA row */}
          <div style={{ display: 'flex', gap: 8 }}>
            {/* 자세히 보기 */}
            <button
              onClick={(e) => { e.stopPropagation(); openDetail(); }}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 14, border: `1.5px solid rgba(255,126,138,0.22)`,
                background: ROSE, color: PINK, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              자세히 보기
              <ChevronDown style={{ width: 13, height: 13 }} />
            </button>

            {/* 신청 버튼 */}
            {onApply && (
              closed ? (
                <div style={{ flex: 1.6, padding: '12px', borderRadius: 14, textAlign: 'center', background: '#F3F4F6', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: MUTED }}>마감</span>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onApply(); }}
                  style={{
                    flex: 1.6, padding: '12px 0', borderRadius: 14, border: 'none',
                    background: `linear-gradient(135deg,${PINK},${PINK2})`,
                    color: WHITE, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                    boxShadow: '0 5px 16px rgba(255,126,138,0.33)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onPointerDown={(e) => (e.currentTarget.style.opacity = '0.88')}
                  onPointerUp={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <Heart style={{ width: 14, height: 14, fill: WHITE, strokeWidth: 0 }} />
                  이 만남, 이어가볼까요?
                </button>
              )
            )}
          </div>
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

      {lbOpen && <Lightbox photos={photos} index={lbIdx} onClose={() => setLbOpen(false)} onChange={setLbIdx} />}
    </>
  );
}
