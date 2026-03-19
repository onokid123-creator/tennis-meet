import { useState, useEffect } from 'react';
import { Court, Profile } from '../types';
import { Pencil, Trash2, X, MapPin, Calendar, Clock, Users, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TennisCourtCardProps {
  court: Court;
  isOwner?: boolean;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const P  = '#1A5C35';
const P2 = '#2D7A4A';
const A  = '#6CBF6C';
const L  = '#E8F5EC';
const T  = '#0D1F14';
const M  = '#6B8070';
const G  = '#B8953A';
const BG = '#F4FAF6';
const WH = '#FFFFFF';

function courtStatus(court: Court): 'open' | 'closing-soon' | 'closed' {
  if (court.status === 'closed') return 'closed';
  const tm = court.male_count ?? 0;
  const tf = court.female_count ?? 0;
  const cm = court.confirmed_male_slots ?? 0;
  const cf = court.confirmed_female_slots ?? 0;
  if (tm > 0 || tf > 0) {
    if ((tm === 0 || cm >= tm) && (tf === 0 || cf >= tf)) return 'closed';
  }
  if (court.end_time && court.date) {
    const end = new Date(`${court.date}T${court.end_time}`);
    const soon = new Date(end.getTime() - 3600000);
    const now = new Date();
    if (now >= soon && now < end) return 'closing-soon';
  }
  return 'open';
}

function fmtFee(fee: number) {
  return fee === 0 ? '무료' : `${fee.toLocaleString()}원`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function Avatar({ src, name, size = 36, border }: { src?: string; name?: string; size?: number; border?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: `linear-gradient(135deg,${P},${A})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: border ?? `2px solid ${WH}`,
      boxShadow: '0 1px 6px rgba(26,92,53,0.18)',
    }}>
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        : <span style={{ color: WH, fontWeight: 700, fontSize: size * 0.4 }}>{name?.charAt(0) || 'T'}</span>
      }
    </div>
  );
}

function SectionHead({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      <div style={{ width: 3, height: 15, borderRadius: 2, background: `linear-gradient(180deg,${P},${A})` }} />
      <span style={{ fontWeight: 700, fontSize: 14, color: T }}>{label}</span>
    </div>
  );
}

function InfoCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: WH, borderRadius: 20, padding: '16px 18px',
      boxShadow: '0 2px 14px rgba(26,92,53,0.07)',
      border: `1px solid ${L}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

interface DetailProps {
  court: Court;
  isOwner?: boolean;
  onClose: () => void;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function DetailSheet({ court, isOwner, onClose, onApply, onEdit, onDelete }: DetailProps) {
  const profile = court.profile;
  const status = courtStatus(court);
  const isClosed = status === 'closed';
  const isClosingSoon = status === 'closing-soon';

  const [confirmedProfiles, setConfirmedProfiles] = useState<Profile[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);

  const photo = court.tennis_photo_url || profile?.tennis_photo_url || profile?.photo_url;

  const tm = court.male_count ?? 0;
  const tf = court.female_count ?? 0;
  const cm = court.confirmed_male_slots ?? 0;
  const cf = court.confirmed_female_slots ?? 0;
  const total = tm + tf;
  const confirmedCount = cm + cf;
  const remain = Math.max(0, total - confirmedCount);
  const rm = Math.max(0, tm - cm);
  const rf = Math.max(0, tf - cf);
  const hasSlotsInfo = total > 0;
  const fill = hasSlotsInfo ? confirmedCount / total : 0;

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingParticipants(true);
      const { data: apps } = await supabase
        .from('applications')
        .select('applicant_id')
        .eq('court_id', court.id)
        .eq('status', 'accepted');

      if (!mounted || !apps || apps.length === 0) {
        if (mounted) setLoadingParticipants(false);
        return;
      }

      const ids = apps.map((a) => a.applicant_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', ids);

      if (mounted) {
        setConfirmedProfiles(profiles ?? []);
        setLoadingParticipants(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [court.id]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: BG, borderRadius: '28px 28px 0 0', height: '94dvh', maxHeight: '94dvh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
      >
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(26,92,53,0.2)' }} />
        </div>

        {/* scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', paddingBottom: (onApply || isOwner) ? 160 : 24 }}>

          {/* photo */}
          {photo ? (
            <div style={{ position: 'relative', margin: '4px 14px 0', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: 20 }}>
                <img
                  src={photo}
                  alt={court.court_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                  draggable={false}
                />
              </div>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 20, background: 'linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.58) 100%)', pointerEvents: 'none' }} />

              {/* name overlay */}
              <div style={{ position: 'absolute', bottom: 14, left: 16, zIndex: 2 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 5 }}>
                  {isClosed && <span style={{ background: 'rgba(239,68,68,0.85)', color: WH, borderRadius: 99, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>마감</span>}
                  {isClosingSoon && !isClosed && <span style={{ background: 'rgba(245,158,11,0.85)', color: WH, borderRadius: 99, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>마감 임박</span>}
                  {court.format && <span style={{ background: `rgba(108,191,108,0.22)`, color: A, borderRadius: 99, padding: '2px 9px', fontSize: 10, fontWeight: 600, backdropFilter: 'blur(4px)', border: '1px solid rgba(108,191,108,0.3)' }}>{court.format}</span>}
                </div>
                <h1 style={{ margin: 0, fontWeight: 800, fontSize: 22, color: WH, letterSpacing: '-0.03em', lineHeight: 1.2, textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>
                  {court.court_name}
                </h1>
                {court.start_time && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                    <Clock style={{ width: 12, height: 12, color: 'rgba(255,255,255,0.8)' }} />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                      {court.start_time}{court.end_time ? ` – ${court.end_time}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* close btn */}
              <button
                onClick={onClose}
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X style={{ width: 16, height: 16, color: WH }} />
              </button>

            </div>
          ) : (
            <div style={{ position: 'relative', margin: '4px 14px 0' }}>
              <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 20, background: `linear-gradient(135deg,${P},${P2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: WH, fontSize: 52, fontWeight: 700, opacity: 0.35 }}>🎾</span>
              </div>
              <button
                onClick={onClose}
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'rgba(26,92,53,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X style={{ width: 16, height: 16, color: WH }} />
              </button>
            </div>
          )}

          <div style={{ padding: '14px 14px 0' }}>

            {/* 코트 기본 정보 */}
            <InfoCard style={{ marginBottom: 10 }}>
              <SectionHead label="코트 정보" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {court.court_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: L, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin style={{ width: 14, height: 14, color: P }} />
                    </div>
                    <span style={{ fontSize: 14, color: T, fontWeight: 600 }}>{court.court_name}</span>
                  </div>
                )}
                {court.date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: L, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Calendar style={{ width: 14, height: 14, color: P }} />
                    </div>
                    <span style={{ fontSize: 14, color: T, fontWeight: 600 }}>{fmtDateLong(court.date)}</span>
                  </div>
                )}
                {court.start_time && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: L, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Clock style={{ width: 14, height: 14, color: P }} />
                    </div>
                    <span style={{ fontSize: 14, color: T, fontWeight: 700 }}>{court.start_time}{court.end_time ? ` – ${court.end_time}` : ''}</span>
                  </div>
                )}
                {court.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: L, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin style={{ width: 14, height: 14, color: A }} />
                    </div>
                    <span style={{ fontSize: 13, color: M }}>{court.location}</span>
                  </div>
                )}
              </div>
              {court.court_fee != null && court.court_fee >= 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${L}` }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(184,149,58,0.1)', border: '1px solid rgba(184,149,58,0.28)', color: G, borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                    💳 매칭비 {fmtFee(court.court_fee)}
                  </span>
                </div>
              )}
            </InfoCard>

            {/* 모집 현황 */}
            {hasSlotsInfo && (
              <InfoCard style={{ marginBottom: 10 }}>
                <SectionHead label="모집 현황" />
                {isClosed ? (
                  <div style={{ background: '#FEE2E2', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#DC2626' }}>모집이 마감되었습니다</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontWeight: 900, fontSize: 34, color: P, letterSpacing: '-0.04em', lineHeight: 1 }}>{confirmedCount}</span>
                        <span style={{ fontSize: 15, color: M, fontWeight: 500 }}>/ {total}명</span>
                      </div>
                      {remain > 0 && (
                        <span style={{
                          background: remain <= 1 ? '#FEE2E2' : L,
                          color: remain <= 1 ? '#DC2626' : P,
                          border: `1.5px solid ${remain <= 1 ? '#FCA5A5' : 'rgba(108,191,108,0.5)'}`,
                          borderRadius: 99, padding: '5px 14px', fontSize: 13, fontWeight: 800,
                        }}>
                          {remain}명 남음
                        </span>
                      )}
                    </div>
                    <div style={{ height: 8, background: L, borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{
                        height: '100%', width: `${Math.min(fill * 100, 100)}%`, borderRadius: 99,
                        background: fill >= 0.8 ? 'linear-gradient(90deg,#EF4444,#F87171)' : `linear-gradient(90deg,${P},${A})`,
                        transition: 'width 0.4s',
                      }} />
                    </div>
                    {tm > 0 && tf > 0 && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          { label: '남성', confirmed: cm, total: tm, remain: rm, color: '#4A90D9', bg: 'rgba(74,144,217,0.07)', border: 'rgba(74,144,217,0.2)' },
                          { label: '여성', confirmed: cf, total: tf, remain: rf, color: '#E57A8A', bg: 'rgba(229,122,138,0.07)', border: 'rgba(229,122,138,0.2)' },
                        ].map((s) => (
                          <div key={s.label} style={{ flex: 1, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '12px 14px' }}>
                            <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                              <span style={{ fontWeight: 800, fontSize: 22, color: s.color }}>{s.confirmed}</span>
                              <span style={{ fontSize: 12, color: M }}>/ {s.total}명</span>
                            </div>
                            <div style={{ fontSize: 11, color: s.remain <= 0 ? '#DC2626' : s.color, fontWeight: 700, marginTop: 3 }}>
                              {s.remain <= 0 ? '마감' : `${s.remain}명 남음`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </InfoCard>
            )}

            {/* 호스트 */}
            {profile && (
              <InfoCard style={{ marginBottom: 10 }}>
                <SectionHead label="호스트" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG, borderRadius: 14, padding: '12px 14px', border: `1px solid ${L}` }}>
                  <Avatar src={profile.tennis_photo_url || profile.photo_url} name={profile.name} size={52} border={`2.5px solid ${A}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: T }}>{profile.name}</span>
                      <span style={{ background: `linear-gradient(135deg,${P},${P2})`, color: WH, borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>호스트</span>
                    </div>
                    {profile.experience && <div style={{ fontSize: 12, color: M }}>구력 {profile.experience}</div>}
                    {profile.tennis_style && <div style={{ fontSize: 11, color: A, fontWeight: 600, marginTop: 2 }}>{profile.tennis_style}</div>}
                  </div>
                </div>
              </InfoCard>
            )}

            {/* 확정 참여자 */}
            <InfoCard style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <div style={{ width: 3, height: 15, borderRadius: 2, background: `linear-gradient(180deg,${P},${A})` }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: T }}>확정 참여자</span>
                {!loadingParticipants && (
                  <span style={{ background: L, color: P, borderRadius: 99, padding: '1px 8px', fontSize: 11, fontWeight: 700, marginLeft: 2 }}>{confirmedProfiles.length}명</span>
                )}
              </div>
              {loadingParticipants ? (
                <div style={{ padding: '12px 0', textAlign: 'center' }}>
                  <span style={{ fontSize: 13, color: M }}>불러오는 중...</span>
                </div>
              ) : confirmedProfiles.length === 0 ? (
                <div style={{ background: BG, borderRadius: 12, padding: '14px', textAlign: 'center', border: `1px solid ${L}` }}>
                  <Users style={{ width: 20, height: 20, color: A, opacity: 0.45, margin: '0 auto 6px' }} />
                  <span style={{ fontSize: 13, color: M }}>아직 확정된 참여자가 없습니다</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {confirmedProfiles.map((p, idx) => (
                    <div key={p.user_id || idx} style={{ display: 'flex', alignItems: 'center', gap: 12, background: BG, borderRadius: 12, padding: '10px 12px', border: `1px solid ${L}` }}>
                      <Avatar src={p.tennis_photo_url || p.photo_url} name={p.name} size={42} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: T }}>{p.name}</span>
                        {p.experience && <div style={{ fontSize: 12, color: M, marginTop: 2 }}>구력 {p.experience}</div>}
                        {p.tennis_style && <div style={{ fontSize: 11, color: A, fontWeight: 600, marginTop: 2 }}>{p.tennis_style}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </InfoCard>

            {/* 호스트 한마디 */}
            {(court.court_intro || court.description) && (
              <InfoCard style={{ marginBottom: 10 }}>
                <SectionHead label="호스트 한마디" />
                <p style={{ margin: 0, fontSize: 14, color: '#3D5244', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {court.court_intro || court.description}
                </p>
              </InfoCard>
            )}

            {/* 구력 조건 */}
            {court.experience_wanted && (
              <div style={{ background: L, borderRadius: 14, padding: '11px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 9, border: '1px solid rgba(108,191,108,0.35)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: A, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: P, fontWeight: 600 }}>구력 조건: {court.experience_wanted}</span>
              </div>
            )}

            {/* 소유자 액션 — fixed CTA로 이동됨 */}

          </div>
        </div>

      </div>

      {/* Fixed CTA — BottomNav(70px) + safe-area 위에 고정 */}
      {(onApply || isOwner) && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 70px)',
          left: 0,
          right: 0,
          zIndex: 10000,
          padding: '12px 16px 16px',
          background: BG,
          borderTop: `1px solid ${L}`,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
        }}>
          {isOwner ? (
            <div style={{ padding: '14px', borderRadius: 16, border: `1.5px solid ${L}`, background: WH, color: M, fontWeight: 500, fontSize: 13, textAlign: 'center' }}>
              내 코트 목록에서 수정/삭제할 수 있어요
            </div>
          ) : isClosed ? (
            <div style={{ padding: '16px', borderRadius: 18, textAlign: 'center', background: L, border: `1px solid rgba(107,128,112,0.2)` }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: M }}>이 코트는 모집이 마감되었어요</span>
            </div>
          ) : (
            <button
              onClick={() => { onClose(); onApply!(); }}
              style={{ width: '100%', padding: '18px', borderRadius: 18, border: 'none', background: `linear-gradient(135deg,${A},${P})`, color: WH, fontWeight: 800, fontSize: 16, letterSpacing: '0.02em', cursor: 'pointer', boxShadow: '0 6px 20px rgba(26,92,53,0.35)', display: 'block' }}
              onPointerDown={(e) => (e.currentTarget.style.opacity = '0.9')}
              onPointerUp={(e) => (e.currentTarget.style.opacity = '1')}
            >
              참여 신청하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TennisCourtCard({ court, isOwner, onApply, onEdit, onDelete }: TennisCourtCardProps) {
  const profile = court.profile;
  const status = courtStatus(court);
  const isClosed = status === 'closed';
  const isClosingSoon = status === 'closing-soon';
  const [detailOpen, setDetailOpen] = useState(false);

  const photo = court.tennis_photo_url || profile?.tennis_photo_url || profile?.photo_url;

  const hostName = profile?.name ?? court.court_name;
  const hostGender = profile?.gender;
  const hostExp = profile?.experience;
  const hostFormat = court.format ?? court.match_type;
  const genderClr = hostGender === '남성' ? '#4A90D9' : hostGender === '여성' ? '#E57A8A' : M;

  const tm = court.male_count ?? 0;
  const tf = court.female_count ?? 0;
  const cm = court.confirmed_male_slots ?? 0;
  const cf = court.confirmed_female_slots ?? 0;
  const total = tm + tf;
  const confirmedCount = cm + cf;
  const remain = Math.max(0, total - confirmedCount);
  const rm = Math.max(0, tm - cm);
  const rf = Math.max(0, tf - cf);
  const hasSlotsInfo = total > 0;
  const fill = hasSlotsInfo ? confirmedCount / total : 0;

  return (
    <>
      <div
        className="select-none"
        style={{ background: WH, borderRadius: 24, boxShadow: '0 4px 22px rgba(26,92,53,0.09), 0 1px 3px rgba(0,0,0,0.04)', border: `1px solid ${L}`, overflow: 'hidden', cursor: 'pointer' }}
        onClick={() => setDetailOpen(true)}
      >
        {/* owner actions */}
        {isOwner && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '11px 13px 0' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,92,53,0.09)', border: `1px solid ${L}`, cursor: 'pointer' }}
            >
              <Pencil style={{ width: 12, height: 12, color: P }} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', cursor: 'pointer' }}
            >
              <Trash2 style={{ width: 12, height: 12, color: '#F87171' }} />
            </button>
          </div>
        )}

        {/* main photo */}
        <div style={{ position: 'relative', margin: isOwner ? '8px 12px 0' : '12px 12px 0', borderRadius: 18, overflow: 'hidden' }}>
          {photo ? (
            <>
              <div style={{ width: '100%', aspectRatio: '3/4', overflow: 'hidden', borderRadius: 18 }}>
                <img
                  src={photo}
                  alt={court.court_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
                  draggable={false}
                />
              </div>

              {/* gradient */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'linear-gradient(to bottom,transparent 42%,rgba(0,0,0,0.7) 100%)', pointerEvents: 'none' }} />

              {/* host name + gender + format + exp overlay (설레는 만남 동일 구조) */}
              <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 7 }}>
                  <span style={{ fontWeight: 800, fontSize: 20, color: WH, letterSpacing: '-0.03em', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>{hostName}</span>
                  {hostGender && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: genderClr, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '1px 7px', backdropFilter: 'blur(4px)' }}>{hostGender}</span>
                  )}
                  {isClosed && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(239,68,68,0.85)', color: WH }}>마감</span>}
                  {isClosingSoon && !isClosed && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(245,158,11,0.85)', color: WH }}>마감 임박</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {hostFormat && (
                    <span style={{ background: `linear-gradient(135deg,${A},${P})`, color: WH, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{hostFormat}</span>
                  )}
                  {hostExp && (
                    <span style={{ background: 'rgba(255,255,255,0.18)', color: WH, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}>{hostExp}</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: 18, background: `linear-gradient(135deg,${P},${P2})`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ color: WH, fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', opacity: 0.9, textAlign: 'center', padding: '0 20px' }}>{court.court_name}</span>
            </div>
          )}
        </div>

        {/* info strip */}
        <div style={{ padding: '12px 14px 14px' }}>

          {/* meta row: 코트명 / 날짜 / 시간 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {court.court_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin style={{ width: 11, height: 11, color: A }} />
                <span style={{ fontSize: 12, color: M, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{court.court_name}</span>
              </div>
            )}
            {court.date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar style={{ width: 11, height: 11, color: A }} />
                <span style={{ fontSize: 12, color: M }}>{fmtDate(court.date)}</span>
              </div>
            )}
            {court.start_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock style={{ width: 11, height: 11, color: A }} />
                <span style={{ fontSize: 12, color: M }}>{court.start_time}{court.end_time ? ` – ${court.end_time}` : ''}</span>
              </div>
            )}
          </div>

          {/* 모집 현황 + 매칭비 — 정보형 표시 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            {/* 모집 인원 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {hasSlotsInfo && !isClosed && (
                <>
                  {tm > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(74,144,217,0.1)', border: '1px solid rgba(74,144,217,0.22)', borderRadius: 10, padding: '4px 10px', fontSize: 12, color: '#4A90D9', fontWeight: 700 }}>
                      남 {rm <= 0 ? <span style={{ color: '#EF4444', fontWeight: 700 }}>마감</span> : `${rm}명 모집 중`}
                    </span>
                  )}
                  {tf > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(229,122,138,0.1)', border: '1px solid rgba(229,122,138,0.22)', borderRadius: 10, padding: '4px 10px', fontSize: 12, color: '#E57A8A', fontWeight: 700 }}>
                      여 {rf <= 0 ? <span style={{ color: '#EF4444', fontWeight: 700 }}>마감</span> : `${rf}명 모집 중`}
                    </span>
                  )}
                  {total > 0 && tm === 0 && tf === 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: L, border: `1px solid rgba(108,191,108,0.25)`, borderRadius: 10, padding: '4px 10px', fontSize: 12, color: P, fontWeight: 700 }}>
                      <Users style={{ width: 11, height: 11 }} />
                      {remain}명 모집 중
                    </span>
                  )}
                </>
              )}
              {isClosed && (
                <span style={{ background: '#FEE2E2', border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 10, padding: '4px 10px', fontSize: 12, color: '#EF4444', fontWeight: 700 }}>모집 마감</span>
              )}
            </div>

            {/* 매칭비 */}
            {court.court_fee != null && court.court_fee >= 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: L, border: `1.5px solid rgba(108,191,108,0.3)`, color: P, borderRadius: 10, padding: '4px 10px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                매칭비 {fmtFee(court.court_fee)}
              </span>
            )}
          </div>

          {/* CTA row — 2 buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setDetailOpen(true); }}
              style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: `1.5px solid ${L}`, background: BG, color: P, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            >
              자세히 보기
              <ChevronRight style={{ width: 13, height: 13, color: A }} />
            </button>

            {onApply && (
              isClosed ? (
                <div style={{ flex: 1.6, padding: '12px', borderRadius: 14, textAlign: 'center', background: L, border: `1px solid rgba(107,128,112,0.18)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: M }}>마감</span>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onApply(); }}
                  style={{ flex: 1.6, padding: '12px 0', borderRadius: 14, border: 'none', background: `linear-gradient(135deg,${A},${P})`, color: WH, fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 5px 16px rgba(26,92,53,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onPointerDown={(e) => (e.currentTarget.style.opacity = '0.88')}
                  onPointerUp={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  참여 신청하기
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
    </>
  );
}
