import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Application, Profile } from '../types';
import BottomNav from '../components/BottomNav';
import { X, ChevronLeft, ChevronRight, MapPin, Calendar, UtensilsCrossed } from 'lucide-react';
import { useVisualViewport } from '../hooks/useVisualViewport';

type PurposeTab = 'tennis' | 'dating';
type DirectionTab = 'received' | 'sent' | 'interest';
type InterestDirectionTab = 'received' | 'sent';

type InterestItemKind = 'court' | 'person';

type CourtInterestItem = {
  id: string;
  kind?: InterestItemKind;
  court_id?: string | null;
  user_id: string;
  host_id?: string | null;
  sender_id?: string | null;
  receiver_id?: string | null;
  status?: string | null;
  created_at: string;
  user?: Profile | null;
  owner?: Profile | null;
  court?: any | null;
};

function DefaultProfileAvatar({
  type = 'tennis',
  size = 96,
  radius = 999,
}: {
  type?: 'tennis' | 'dating' | 'blocked';
  size?: number;
  radius?: number;
}) {
  const isDating = type === 'dating';
  const isBlocked = type === 'blocked';

  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: isBlocked
          ? '#F3F4F6'
          : isDating
            ? 'linear-gradient(135deg, #FFF7F9 0%, #FCE7EC 100%)'
            : 'linear-gradient(135deg, #F7FAF8 0%, #E8F5EC 100%)',
        border: isBlocked
          ? '1px solid #E5E7EB'
          : isDating
            ? '1px solid rgba(201,84,122,0.18)'
            : '1px solid rgba(45,106,79,0.16)',
      }}
    >
      <svg
        width={size * 0.46}
        height={size * 0.46}
        viewBox="0 0 24 24"
        fill="none"
        stroke={isBlocked ? '#9CA3AF' : isDating ? '#2D6A4F' : '#2D6A4F'}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4" />
      </svg>
    </div>
  );
}


interface ApplicantModalProps {
  app: Application;
  onClose: () => void;
  onAccept: (app: Application) => Promise<void>;
  onReject: (app: Application) => void;
  processing: boolean;
  errorMsg: string | null;
}

function PhotoCarousel({ profile, dotColor }: { profile: Profile; dotColor: string }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const photos: string[] = profile.photo_urls?.length
    ? profile.photo_urls
    : profile.photo_url
    ? [profile.photo_url]
    : [];

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % photos.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40 && photos.length > 1) {
      if (diff > 0) setIdx((i) => (i + 1) % photos.length);
      else setIdx((i) => (i - 1 + photos.length) % photos.length);
    }
    touchStartX.current = null;
  };

  if (photos.length === 0) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center"
        style={{ height: '55vw', maxHeight: '260px', background: 'linear-gradient(180deg, #FDE8EC 0%, #F9C5CE 100%)' }}
      >
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center font-bold border-2"
          style={{ fontSize: '3rem', background: 'rgba(244,63,94,0.12)', borderColor: 'rgba(244,63,94,0.3)', color: '#F43F5E' }}
        >
          <DefaultProfileAvatar type="dating" size={96} />
        </div>
        <p className="text-sm mt-3 font-light" style={{ color: 'rgba(183,110,121,0.7)' }}>사진이 없습니다</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full select-none"
     style={{
  height: '34dvh',
  minHeight: '270px',
  maxHeight: '330px',
}}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        key={idx}
        src={photos[idx]}
        alt={profile.name}
        className="w-full h-full"
       style={{
  objectFit: 'cover',
  objectPosition: 'center 42%',
  background: '#F0F0F0',
}}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }}
      />
      {photos.length > 1 && (
        <>
          <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? '18px' : '6px',
                  height: '6px',
                  background: i === idx ? dotColor : 'rgba(255,255,255,0.5)',
                }}
              />
            ))}
          </div>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </>
      )}
      {photos.length > 1 && (
        <span className="absolute bottom-2 right-3 text-xs text-white/60">{idx + 1} / {photos.length}</span>
      )}
    </div>
  );
}

function ApplicantPhotoCarousel({ profile }: { profile: Profile }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const photos: string[] = profile.photo_urls?.length
    ? profile.photo_urls
    : profile.photo_url
    ? [profile.photo_url]
    : [];

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % photos.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40 && photos.length > 1) {
      if (diff > 0) setIdx((i) => (i + 1) % photos.length);
      else setIdx((i) => (i - 1 + photos.length) % photos.length);
    }
    touchStartX.current = null;
  };

  if (photos.length === 0) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center"
        style={{ height: '60vh', background: profile.name ? 'linear-gradient(180deg, #2D1820 0%, #0d2218 100%)' : 'linear-gradient(180deg, #1B4332 0%, #0d2218 100%)' }}
      >
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center text-white font-bold border-2 border-[#C9A84C]/50"
          style={{ fontSize: '3.5rem', background: 'rgba(201,168,76,0.15)' }}
        >
          <DefaultProfileAvatar type="dating" size={96} />
        </div>
        <p className="text-white/60 text-sm mt-4 font-light tracking-wide">사진이 없습니다</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full select-none"
      style={{ height: '62vh' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        key={idx}
        src={photos[idx]}
        alt={profile.name}
        className="w-full h-full"
        style={{ objectFit: 'cover', objectPosition: 'center top', background: '#111' }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 35%, transparent 65%)' }}
      />

      {photos.length > 1 && (
        <>
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 z-10">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? '20px' : '7px',
                  height: '7px',
                  background: i === idx ? '#C9A84C' : 'rgba(255,255,255,0.45)',
                }}
              />
            ))}
          </div>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </>
      )}

      <div className="absolute bottom-5 left-5 right-5 z-10">
        <div className="flex items-end gap-2 mb-2">
          <span className="text-white font-light tracking-wide" style={{ fontSize: '1.6rem', fontFamily: 'Georgia, serif' }}>
            {profile.name}
          </span>
          {profile.age && (
            <span className="text-white/80 text-lg mb-0.5 font-light">{profile.age}세</span>
          )}
          {(profile.gender === 'male' || profile.gender === '남성' || profile.gender === 'female' || profile.gender === '여성') && (
            <span
              className="text-lg font-bold mb-0.5"
              style={{ color: (profile.gender === 'male' || profile.gender === '남성') ? '#93C5FD' : '#FDA4AF' }}
            >
              {(profile.gender === 'male' || profile.gender === '남성') ? '♂' : '♀'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {profile.experience && (
            <span
              className="px-3 py-1 rounded-full text-xs font-medium tracking-wide"
              style={{ background: 'rgba(201,168,76,0.25)', border: '1px solid rgba(201,168,76,0.6)', color: '#C9A84C' }}
            >
              구력 {profile.experience}
            </span>
          )}
          {photos.length > 1 && (
            <span className="text-xs text-white/50 font-light">{idx + 1} / {photos.length}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function DatingApplicantModal({ app, onClose, onAccept, onReject, processing, errorMsg }: ApplicantModalProps) {
  const applicant = app.applicant!;
  const isMale = applicant.gender === 'male' || applicant.gender === '남성';
  const [photoLightbox, setPhotoLightbox] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const photos: string[] = applicant.photo_urls?.length
    ? applicant.photo_urls
    : applicant.photo_url
    ? [applicant.photo_url]
    : [];

  return (
    <>
      <div
        className="fixed inset-0 flex items-end justify-center"
        style={{ background: 'rgba(30,10,15,0.78)', backdropFilter: 'blur(6px)', zIndex: 10001 }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-md relative flex flex-col"
          style={{
            height: '96dvh',
            maxHeight: '96dvh',
            borderRadius: '28px 28px 0 0',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #FFF8F6 0%, #FFF4F6 100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 상단 바 */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-4"
            style={{
              paddingTop: '14px',
              paddingBottom: '12px',
              background: 'rgba(255,248,246,0.98)',
              backdropFilter: 'blur(14px)',
              borderBottom: '1.5px solid rgba(201,99,122,0.1)',
            }}
          >
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(201,99,122,0.09)', border: '1px solid rgba(201,99,122,0.18)' }}
            >
              <X className="w-4 h-4" style={{ color: '#2D6A4F' }} />
            </button>
            <span className="font-bold text-sm" style={{ color: '#2D6A4F', letterSpacing: '0.03em' }}>신청 프로필</span>
            <div className="w-8" />
          </div>

          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 16 }}>
      {/* [카드 1] 사진 */}
<div className="px-4 pt-4 pb-3">
  <div
    className="rounded-2xl overflow-hidden relative"
    style={{
      border: '1.5px solid rgba(201,99,122,0.14)',
      background: '#FFF8F6',
    }}
  >
    <PhotoCarousel profile={applicant} dotColor="#2D6A4F" />

    {photos.length > 0 && (
      <button
        onClick={() => {
          setLightboxIdx(0);
          setPhotoLightbox(true);
        }}
        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{
          background: 'rgba(0,0,0,0.45)',
          color: '#fff',
          backdropFilter: 'blur(4px)',
        }}
      >
        {photos.length > 1 ? `사진 ${photos.length}장 보기` : '사진 확인하기'}
      </button>
    )}
  </div>
</div>
            {/* [카드 2] 기본 정보 — 이름/나이/성별/MBTI/키/구력 */}
            <div className="px-4 pb-3">
              <div
                className="rounded-2xl px-4 py-4"
                style={{ background: '#fff', border: '1.5px solid rgba(27,67,50,0.12)', boxShadow: '0 2px 8px rgba(27,67,50,0.06)' }}
              >
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-bold" style={{ fontSize: '1.2rem', color: '#1a1a1a' }}>{applicant.name}</span>
                  {applicant.age && (
                    <span className="font-medium" style={{ color: '#888', fontSize: '0.95rem' }}>{applicant.age}세</span>
                  )}
                  {(applicant.gender === 'male' || applicant.gender === '남성' || applicant.gender === 'female' || applicant.gender === '여성') && (
                    <span className="font-bold" style={{ fontSize: '1rem', color: isMale ? '#93C5FD' : '#FDA4AF' }}>
                      {isMale ? '♂' : '♀'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {applicant.mbti && (
                    <div className="rounded-xl py-2.5 text-center" style={{ background: 'rgba(27,67,50,0.06)', border: '1px solid rgba(201,99,122,0.14)' }}>
                      <div className="text-xs font-medium mb-0.5" style={{ color: '#2D6A4F', opacity: 0.7 }}>MBTI</div>
                      <div className="font-bold text-sm" style={{ color: '#2D6A4F' }}>{applicant.mbti}</div>
                    </div>
                  )}
                  {applicant.height && (
                    <div className="rounded-xl py-2.5 text-center" style={{ background: 'rgba(212,132,154,0.06)', border: '1px solid rgba(212,132,154,0.14)' }}>
                      <div className="text-xs font-medium mb-0.5" style={{ color: '#A05570', opacity: 0.7 }}>키</div>
                      <div className="font-bold text-sm" style={{ color: '#A05570' }}>{applicant.height}cm</div>
                    </div>
                  )}
                  {applicant.experience && (
                    <div className="rounded-xl py-2.5 text-center" style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      <div className="text-xs font-medium mb-0.5" style={{ color: '#9A7A2A', opacity: 0.7 }}>구력</div>
                      <div className="font-bold text-sm" style={{ color: '#9A7A2A' }}>{applicant.experience}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          {/* [카드 3] 신청 메세지 */}
<div className="px-4 pb-3">
  <div
    className="px-4 py-4 rounded-2xl"
    style={{
      background: 'linear-gradient(135deg, rgba(27,67,50,0.08), rgba(255,255,255,0.9))',
      border: '1px solid rgba(201,99,122,0.18)',
    }}
  >
    <p className="text-xs font-bold mb-2" style={{ color: '#2D6A4F' }}>
      💌 신청 메세지
    </p>
    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#3a2228' }}>
      {app.message?.trim() || '작성된 신청 메세지가 없습니다.'}
    </p>
  </div>
</div>

            {/* [카드 4] 신청 코트 */}
            {app.court && (
              <div className="px-4 pb-3">
                <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.18)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
                    <span className="text-xs font-semibold" style={{ color: '#9A7A2A' }}>신청 코트</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#2D1820' }}>{app.court.court_name}</p>
                  {app.court.date && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3 h-3" style={{ color: '#C9A84C' }} />
                      <p className="text-xs" style={{ color: '#7C6030' }}>
                        {new Date(app.court.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                        {app.court.start_time && ` · ${app.court.start_time}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="px-4 pb-3">
                <div className="px-4 py-3 rounded-2xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#DC2626' }}>
                  {errorMsg}
                </div>
              </div>
            )}

            {app.status !== 'pending' && (
              <div className="text-center py-4">
                {app.status === 'accepted' ? (
                  <span className="font-semibold" style={{ color: '#B83050' }}>신청 수락됨</span>
                ) : (
                  <span className="font-semibold" style={{ color: '#9CA3AF' }}>거절됨</span>
                )}
              </div>
            )}
          </div>

          {/* 하단 고정 CTA */}
          {app.status === 'pending' && (
            <div
              className="flex-shrink-0 flex gap-3 px-4"
              style={{
                paddingTop: '12px',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
                background: 'rgba(255,248,246,0.98)',
                backdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(27,67,50,0.12)',
                boxShadow: '0 -4px 20px rgba(27,67,50,0.08)',
              }}
            >
              <button
                onClick={() => onReject(app)}
                disabled={processing}
                className="flex-1 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'rgba(27,67,50,0.08)', color: '#A05570', border: '1.5px solid rgba(27,67,50,0.2)', minHeight: '52px' }}
              >
                {processing ? '...' : '거절하기'}
              </button>
              <button
                onClick={() => onAccept(app)}
                disabled={processing}
                className="flex-1 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#2D6A4F,#D4849A)', color: '#fff', boxShadow: '0 4px 14px rgba(201,99,122,0.3)', minHeight: '52px', border: 'none' }}
              >
                {processing ? '처리 중...' : '수락하기'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 라이트박스 — 사진 전체 보기 */}
      {photoLightbox && photos.length > 0 && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)', zIndex: 10002 }}
          onClick={() => setPhotoLightbox(false)}
        >
          <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[lightboxIdx]}
              alt={applicant.name}
              className="w-full"
              style={{ maxHeight: '85dvh', objectFit: 'contain' }}
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIdx((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setLightboxIdx((i) => (i + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                  <span className="text-white/70 text-sm">{lightboxIdx + 1} / {photos.length}</span>
                </div>
              </>
            )}
            <button
              onClick={() => setPhotoLightbox(false)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ApplicantModal({ app, onClose, onAccept, onReject, processing, errorMsg }: ApplicantModalProps) {
  const applicant = app.applicant!;
  const isMale = applicant.gender === 'male' || applicant.gender === '남성';
  const [photoLightbox, setPhotoLightbox] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const photos: string[] = applicant.tennis_photo_urls?.length
  ? applicant.tennis_photo_urls
  : applicant.tennis_photo_url
  ? [applicant.tennis_photo_url]
  : [];
  return (
    <>
      <div
        className="fixed inset-0 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', zIndex: 10001 }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-md relative flex flex-col"
          style={{
            height: '96dvh',
            maxHeight: '96dvh',
            borderRadius: '28px 28px 0 0',
            background: '#0f1c14',  
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 상단 바 */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-4"
            style={{
              paddingTop: '14px',
              paddingBottom: '12px',
              background: 'rgba(13,31,20,0.97)',
              backdropFilter: 'blur(14px)',
              borderBottom: '1.5px solid rgba(108,191,108,0.13)',
            }}
          >
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(108,191,108,0.12)', border: '1px solid rgba(108,191,108,0.25)' }}
            >
              <X className="w-4 h-4" style={{ color: '#6CBF6C' }} />
            </button>
            <span className="font-bold text-sm" style={{ color: '#6CBF6C', letterSpacing: '0.03em' }}>신청 프로필</span>
            <div className="w-8" />
          </div>

          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 16 }}>
            {/* [카드 1] 사진 */}
            <div className="px-4 pt-4 pb-3">
              <div
                className="rounded-2xl overflow-hidden cursor-pointer relative"
                style={{
  height: '34dvh',
  minHeight: '270px',
  maxHeight: '330px',
  border: '1.5px solid rgba(108,191,108,0.16)',
}}
                onClick={() => photos.length > 0 && setPhotoLightbox(true)}
              >
                {photos.length > 0 ? (
                  <img
                    src={photos[0]}
                    alt={applicant.name}
                    className="w-full h-full"
                    style={{
  objectFit: 'cover',
 objectPosition: 'center 42%',
  background: '#F0F0F0',
}}
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center"
                    style={{ background: 'linear-gradient(180deg, #0A1F14 0%, #0d1a10 100%)' }}
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center font-bold"
                      style={{ fontSize: '2.8rem', background: 'rgba(26,92,53,0.3)', color: '#6CBF6C', border: '2px solid rgba(108,191,108,0.25)' }}
                    >
                      <DefaultProfileAvatar type="tennis" size={40} />
                    </div>
                  </div>
                )}
                {photos.length > 1 && (
                  <div
                    className="absolute bottom-2 right-3 px-2 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(4px)' }}
                  >
                    사진 {photos.length}장 보기
                  </div>
                )}
                {photos.length === 1 && (
                  <div
                    className="absolute bottom-2 right-3 px-2 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(0,0,0,0.35)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)' }}
                  >
                    사진 확인하기
                  </div>
                )}
              </div>
            </div>

            {/* [카드 2] 기본 정보 — 이름/나이/성별/구력 */}
            <div className="px-4 pb-3">
              <div
                className="rounded-2xl px-4 py-4"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(108,191,108,0.14)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
              >
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-bold text-white" style={{ fontSize: '1.2rem' }}>{applicant.name}</span>
                  {applicant.age && (
                    <span className="font-medium" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>{applicant.age}세</span>
                  )}
                  {(applicant.gender === 'male' || applicant.gender === '남성' || applicant.gender === 'female' || applicant.gender === '여성') && (
                    <span className="font-bold" style={{ fontSize: '1rem', color: isMale ? '#93C5FD' : '#FDA4AF' }}>
                      {isMale ? '♂' : '♀'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {applicant.experience && (
                    <div className="rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(201,168,76,0.14)', border: '1px solid rgba(201,168,76,0.3)' }}>
                      <div className="text-xs font-medium mb-0.5" style={{ color: 'rgba(201,168,76,0.7)' }}>구력</div>
                      <div className="font-bold text-sm" style={{ color: '#C9A84C' }}>{applicant.experience}</div>
                    </div>
                  )}
                  {applicant.tennis_style && (
                    <div className="rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(108,191,108,0.1)', border: '1px solid rgba(108,191,108,0.22)' }}>
                      <div className="text-xs font-medium mb-0.5" style={{ color: 'rgba(108,191,108,0.6)' }}>스타일</div>
                      <div className="font-bold text-sm" style={{ color: '#6CBF6C' }}>{applicant.tennis_style}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* [카드 3] 신청 메세지 */}
<div className="px-4 pb-3">
  <div
    className="px-4 py-4 rounded-2xl"
    style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(201,168,76,0.2)',
    }}
  >
    <p className="text-xs font-bold mb-2" style={{ color: '#C9A84C' }}>
      🎾 신청 메세지
    </p>
    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.82)' }}>
      {app.message?.trim() || '작성된 신청 메세지가 없습니다.'}
    </p>
  </div>
</div>

            {/* [카드 4] 신청 코트 */}
            {app.court && (
              <div className="px-4 pb-3">
                <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.22)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
                    <span className="text-xs font-semibold" style={{ color: '#C9A84C' }}>신청 코트</span>
                  </div>
                  <p className="text-sm font-medium text-white/90">{app.court.court_name}</p>
                  {app.court.date && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3 h-3 text-white/30" />
                      <p className="text-xs text-white/45">
                        {new Date(app.court.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                        {app.court.start_time && ` · ${app.court.start_time}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="px-4 pb-3">
                <div className="px-4 py-3 rounded-2xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  {errorMsg}
                </div>
              </div>
            )}

            {app.status !== 'pending' && (
              <div className="text-center py-4">
                {app.status === 'accepted' ? (
                  <span className="font-semibold" style={{ color: '#C9A84C' }}>신청 수락됨</span>
                ) : (
                  <span className="text-white/40 font-semibold">거절됨</span>
                )}
              </div>
            )}
          </div>

          {/* 하단 고정 CTA */}
          {app.status === 'pending' && (
            <div
              className="flex-shrink-0 flex gap-3 px-4"
              style={{
                paddingTop: '12px',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
                background: 'rgba(13,31,20,0.97)',
                backdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(108,191,108,0.12)',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
              }}
            >
              <button
                onClick={() => onReject(app)}
                disabled={processing}
                className="flex-1 rounded-2xl font-semibold text-sm tracking-wide transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)', minHeight: '52px' }}
              >
                {processing ? '...' : '거절하기'}
              </button>
              <button
                onClick={() => onAccept(app)}
                disabled={processing}
                className="flex-1 rounded-2xl font-semibold text-sm tracking-wide transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#1A5C35,#2D7A4A)', color: '#fff', boxShadow: '0 4px 14px rgba(26,92,53,0.4)', minHeight: '52px', border: 'none' }}
              >
                {processing ? '처리 중...' : '수락하기'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 라이트박스 — 사진 전체 보기 */}
      {photoLightbox && photos.length > 0 && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)', zIndex: 10002 }}
          onClick={() => setPhotoLightbox(false)}
        >
          <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[lightboxIdx]}
              alt={applicant.name}
              className="w-full"
              style={{ maxHeight: '85dvh', objectFit: 'contain' }}
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setLightboxIdx((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => setLightboxIdx((i) => (i + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                  <span className="text-white/70 text-sm">{lightboxIdx + 1} / {photos.length}</span>
                </div>
              </>
            )}
            <button
              onClick={() => setPhotoLightbox(false)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Applications() {
  const navigate = useNavigate();
  const { user, profile, getSafeUser } = useAuth();
  const vpHeight = useVisualViewport();
  const getInitialPurposeTab = (): PurposeTab => {
  const hasDatingProfile = !!profile?.mbti || !!profile?.height;
  const hasTennisProfile = !!profile?.tennis_style;

  if (hasDatingProfile && !hasTennisProfile) {
    return 'dating';
  }

  if (!hasDatingProfile && hasTennisProfile) {
    return 'tennis';
  }

  return 'tennis';
};

const [purposeTab, setPurposeTab] = useState<PurposeTab>(getInitialPurposeTab);
const [showDatingProfilePopup, setShowDatingProfilePopup] = useState(false);
const [showTennisProfilePopup, setShowTennisProfilePopup] = useState(false);
  const [directionTab, setDirectionTab] = useState<DirectionTab>('received');
  const [receivedApps, setReceivedApps] = useState<Application[]>([]);
  const [sentApps, setSentApps] = useState<Application[]>([]);
  const [interestApps, setInterestApps] = useState<CourtInterestItem[]>([]);
  const [sentInterestApps, setSentInterestApps] = useState<CourtInterestItem[]>([]);
  const [interestDirectionTab, setInterestDirectionTab] = useState<InterestDirectionTab>('received');
  const [deletingInterestId, setDeletingInterestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [interestPhotoProfile, setInterestPhotoProfile] = useState<Profile | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [rejectionDetailApp, setRejectionDetailApp] = useState<Application | null>(null);
  const [pendingMealProposals, setPendingMealProposals] = useState<Array<{ id: string; sender_id: string; receiver_id: string; sender_name?: string; receiver_name?: string; court_id: string | null; receiver_deleted?: boolean }>>([]);
  const [resultMealProposals, setResultMealProposals] = useState<Array<{ id: string; sender_id: string; receiver_id: string; receiver_name?: string; status: string; rejection_reason?: string | null }>>([]);
  const [mealRejectProposalId, setMealRejectProposalId] = useState<string | null>(null);
  const [mealRejectReason, setMealRejectReason] = useState('');
  const [mealRejectSubmitting, setMealRejectSubmitting] = useState(false);
  const [showMealRejectPopup, setShowMealRejectPopup] = useState(false);
  const [showMealAcceptPopup, setShowMealAcceptPopup] = useState(false);
  const [showPurchaseRequiredPopup, setShowPurchaseRequiredPopup] = useState(false);

  useEffect(() => {
    if (purposeTab !== 'dating' && directionTab === 'interest') {
      setDirectionTab('received');
    }
  }, [purposeTab, directionTab]);
const latestApplicationsRequestRef = useRef(0);
const latestMealRequestRef = useRef(0);
const applicationsCacheReadyRef = useRef(false);
const mealCacheReadyRef = useRef(false);

useEffect(() => {
  if (!user) return;

  try {
    const savedReceived = localStorage.getItem(`cached_received_apps_${user.id}`);
    const savedSent = localStorage.getItem(`cached_sent_apps_${user.id}`);
    const savedPendingMeal = localStorage.getItem(`cached_pending_meal_${user.id}`);
    const savedResultMeal = localStorage.getItem(`cached_result_meal_${user.id}`);

    if (savedReceived) {
      setReceivedApps(JSON.parse(savedReceived));
    }

    if (savedSent) {
      setSentApps(JSON.parse(savedSent));
    }

    if (savedPendingMeal) {
      setPendingMealProposals(JSON.parse(savedPendingMeal));
    }

    if (savedResultMeal) {
      setResultMealProposals(JSON.parse(savedResultMeal));
    }
  } catch {
    // 캐시가 깨져 있으면 무시
  } finally {
    applicationsCacheReadyRef.current = true;
    mealCacheReadyRef.current = true;
  }
}, [user]);  

useEffect(() => {
  if (!user || !applicationsCacheReadyRef.current) return;

  localStorage.setItem(`cached_received_apps_${user.id}`, JSON.stringify(receivedApps));
  localStorage.setItem(`cached_sent_apps_${user.id}`, JSON.stringify(sentApps));
}, [user, receivedApps, sentApps]);

useEffect(() => {
  if (!user || !mealCacheReadyRef.current) return;

  localStorage.setItem(`cached_pending_meal_${user.id}`, JSON.stringify(pendingMealProposals));
  localStorage.setItem(`cached_result_meal_${user.id}`, JSON.stringify(resultMealProposals));
}, [user, pendingMealProposals, resultMealProposals]);
const fetchMealProposals = useCallback(async () => {
const requestId = latestMealRequestRef.current + 1;
latestMealRequestRef.current = requestId;

let nextPendingMealProposals: typeof pendingMealProposals = [];
let nextResultMealProposals: typeof resultMealProposals = [];

    try {
      const currentUser = await getSafeUser();
      if (!currentUser) {
        console.warn('[Applications] meal proposals currentUser 없음');
        return;
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('meal_proposals_timeout')), 6000)
      );

      const [
        { data: pendingReceivedRaw },
        { data: pendingSentRaw },
        { data: resultRaw },
      ] = await Promise.race([
        Promise.all([
          supabase
            .from('meal_proposals')
            .select('id, sender_id, receiver_id, court_id, created_at')
            .eq('receiver_id', currentUser.id)
            .eq('status', 'pending')
            .eq('receiver_deleted', false)
            .order('created_at', { ascending: false }),
          supabase
            .from('meal_proposals')
            .select('id, sender_id, receiver_id, court_id, created_at')
            .eq('sender_id', currentUser.id)
            .eq('status', 'pending')
            .eq('sender_deleted', false)
            .order('created_at', { ascending: false }),
          supabase
            .from('meal_proposals')
            .select('id, sender_id, receiver_id, status, rejection_reason, created_at')
            .eq('sender_id', currentUser.id)
            .eq('sender_seen', false)
            .in('status', ['accepted', 'rejected'])
            .order('created_at', { ascending: false }),
        ]),
        timeoutPromise,
      ]);

      const pending = [
        ...(pendingReceivedRaw ?? []),
        ...(pendingSentRaw ?? []),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const results = resultRaw ?? [];

      const allUserIds = [...new Set([
        ...pending.map((p) => p.sender_id),
        ...pending.map((p) => p.receiver_id),
        ...results.map((p) => p.receiver_id),
      ])];

      let nameMap: Record<string, string> = {};
      if (allUserIds.length > 0) {
        const { data: profilesData } = await Promise.race([
          supabase
            .from('profiles')
            .select('user_id, name')
            .in('user_id', allUserIds),
          new Promise<{ data: null }>((resolve) =>
            setTimeout(() => resolve({ data: null }), 5000)
          ),
        ]);
        (profilesData ?? []).forEach((p) => { nameMap[p.user_id] = p.name; });
      }

      nextPendingMealProposals = pending.map((p) => ({
        id: p.id,
        sender_id: p.sender_id,
        receiver_id: p.receiver_id,
        court_id: p.court_id ?? null,
        sender_name: nameMap[p.sender_id],
        receiver_name: nameMap[p.receiver_id],
      }));

      nextResultMealProposals = results.map((p) => ({
        id: p.id,
        sender_id: p.sender_id,
        receiver_id: p.receiver_id,
        receiver_name: nameMap[p.receiver_id],
        status: p.status,
        rejection_reason: p.rejection_reason ?? null,
      }));

      if (latestMealRequestRef.current !== requestId) {
        return;
      }

      setPendingMealProposals(nextPendingMealProposals);
      setResultMealProposals(nextResultMealProposals);
    } catch (err) {
      console.error('[Applications] 식사 제안 목록 가져오기 실패:', {
        name: err instanceof Error ? err.name : undefined,
        message: err instanceof Error ? err.message : String(err),
        raw: err,
      });
    }
  }, [getSafeUser]);

  const handleMealProposalAccept = async (proposalId: string) => {
    await supabase.from('meal_proposals').update({ status: 'accepted', receiver_deleted: true }).eq('id', proposalId);
    setPendingMealProposals((prev) => prev.filter((p) => p.id !== proposalId));
    setShowMealAcceptPopup(true);
  };

  const handleDismissResultMeal = async (proposalId: string) => {
    await supabase.from('meal_proposals').update({ sender_seen: true }).eq('id', proposalId);
    setResultMealProposals((prev) => prev.filter((p) => p.id !== proposalId));
  };

  const handleDeletePendingMealProposal = async (proposalId: string) => {
    const proposal = pendingMealProposals.find((p) => p.id === proposalId);
    if (!proposal) return;
    if (proposal.receiver_id === user?.id) {
      await supabase.from('meal_proposals').update({ receiver_deleted: true }).eq('id', proposalId);
    } else {
      await supabase.from('meal_proposals').update({ sender_deleted: true }).eq('id', proposalId);
    }
    setPendingMealProposals((prev) => prev.filter((p) => p.id !== proposalId));
  };

  const handleMealProposalReject = async () => {
    if (!mealRejectProposalId || !mealRejectReason.trim()) return;
    setMealRejectSubmitting(true);
    try {
      await supabase.from('meal_proposals').update({
        status: 'rejected',
        rejection_reason: mealRejectReason.trim(),
        receiver_deleted: true,
      }).eq('id', mealRejectProposalId);
      setPendingMealProposals((prev) => prev.filter((p) => p.id !== mealRejectProposalId));
      setShowMealRejectPopup(false);
      setMealRejectProposalId(null);
      setMealRejectReason('');
    } catch (e) {
      console.error(e);
    } finally {
      setMealRejectSubmitting(false);
    }
  };

  const fetchApplications = useCallback(async (options?: { silent?: boolean }) => {
const requestId = latestApplicationsRequestRef.current + 1;
latestApplicationsRequestRef.current = requestId;

let nextReceivedApps: Application[] = [];
let nextSentApps: Application[] = [];
let nextInterestApps: CourtInterestItem[] = [];
let nextSentInterestApps: CourtInterestItem[] = [];
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);

    try {
      const currentUser = await getSafeUser();
      if (!currentUser) {
        console.warn('[Applications] currentUser 없음');
        return;
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('applications_timeout')), 6000)
      );

      const [
        { data: receivedRaw },
        { data: sentRaw },
        { data: interestsRaw },
        { data: sentInterestsRaw },
        { data: personInterestsRaw },
        { data: sentPersonInterestsRaw },
      ] = await Promise.race([
        Promise.all([
          supabase
            .from('applications')
            .select(`*, court:court_id (*)`)
            .eq('host_id', currentUser.id)
            .eq('receiver_deleted', false)
            .order('created_at', { ascending: false }),
          supabase
            .from('applications')
            .select(`*, court:court_id (*)`)
            .eq('applicant_id', currentUser.id)
            .eq('sender_deleted', false)
            .order('created_at', { ascending: false }),
          supabase
            .from('court_interests')
            .select(`*, court:court_id (*)`)
            .eq('host_id', currentUser.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('court_interests')
            .select(`*, court:court_id (*)`)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('dating_interests')
            .select('*')
            .eq('receiver_id', currentUser.id)
            .eq('receiver_deleted', false)
            .order('created_at', { ascending: false }),
          supabase
            .from('dating_interests')
            .select('*')
            .eq('sender_id', currentUser.id)
            .eq('sender_deleted', false)
            .order('created_at', { ascending: false }),
        ]),
        timeoutPromise,
      ]);

      const receivedList = receivedRaw || [];
      const sentList = sentRaw || [];
      const interestList = interestsRaw || [];
      const sentInterestList = sentInterestsRaw || [];
      const personInterestList = personInterestsRaw || [];
      const sentPersonInterestList = sentPersonInterestsRaw || [];

      const applicantIds = [...new Set(receivedList.map((a) => a.applicant_id).filter(Boolean))];
      const ownerIds = [...new Set(sentList.map((a) => a.host_id).filter(Boolean))];
      const interestUserIds = [...new Set(interestList.map((i) => i.user_id).filter(Boolean))];
      const sentInterestOwnerIds = [...new Set(sentInterestList.map((i) => i.host_id).filter(Boolean))];
      const personInterestSenderIds = [...new Set(personInterestList.map((i) => i.sender_id).filter(Boolean))];
      const sentPersonInterestReceiverIds = [...new Set(sentPersonInterestList.map((i) => i.receiver_id).filter(Boolean))];
      const allProfileIds = [...new Set([
        ...applicantIds,
        ...ownerIds,
        ...interestUserIds,
        ...sentInterestOwnerIds,
        ...personInterestSenderIds,
        ...sentPersonInterestReceiverIds,
      ])];

      let profileMap: Record<string, Profile> = {};
      if (allProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', allProfileIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p]));
        }
      }

      const received = receivedList.map((a) => ({
        ...a,
        applicant: profileMap[a.applicant_id] ?? null,
      }));

      const sent = sentList.map((a) => ({
        ...a,
        owner: profileMap[a.host_id] ?? null,
      }));

      const interests = interestList.map((i) => ({
        ...i,
        kind: 'court' as InterestItemKind,
        user: profileMap[i.user_id] ?? null,
      }));

      const sentInterests = sentInterestList.map((i) => ({
        ...i,
        kind: 'court' as InterestItemKind,
        owner: profileMap[i.host_id] ?? null,
        user: profileMap[i.host_id] ?? null,
      }));

      const personInterests = personInterestList.map((i) => ({
        ...i,
        kind: 'person' as InterestItemKind,
        court_id: null,
        user_id: i.sender_id,
        host_id: i.receiver_id,
        user: profileMap[i.sender_id] ?? null,
        owner: profileMap[i.receiver_id] ?? null,
        court: null,
      }));

      const sentPersonInterests = sentPersonInterestList.map((i) => ({
        ...i,
        kind: 'person' as InterestItemKind,
        court_id: null,
        user_id: i.receiver_id,
        host_id: i.sender_id,
        user: profileMap[i.receiver_id] ?? null,
        owner: profileMap[i.receiver_id] ?? null,
        court: null,
      }));

      const sortByCreatedDesc = (a: CourtInterestItem, b: CourtInterestItem) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

     nextReceivedApps = received;
nextSentApps = sent;
nextInterestApps = [...personInterests, ...interests].sort(sortByCreatedDesc);
nextSentInterestApps = [...sentPersonInterests, ...sentInterests].sort(sortByCreatedDesc);

if (latestApplicationsRequestRef.current !== requestId) {
  return;
}

setReceivedApps(nextReceivedApps);
setSentApps(nextSentApps);
setInterestApps(nextInterestApps);
setSentInterestApps(nextSentInterestApps);
    } catch (err) {
      console.error('신청 목록 가져오기 실패:', {
        name: err instanceof Error ? err.name : undefined,
        message: err instanceof Error ? err.message : String(err),
        raw: err,
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [getSafeUser]);

  useEffect(() => {
  fetchApplications();
  fetchMealProposals();

  // iOS foreground 복귀 직후에는 Supabase 요청이 timeout 나기 쉬워 auth-resynced 즉시 재조회는 비활성화한다.
  // 초기 진입/realtime 변경/사용자 직접 진입 시 fetch만 사용한다.
  const handleResumed = () => {};

  const channel = supabase
    .channel('applications_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
      fetchApplications();
      fetchMealProposals();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'court_interests' }, () => {
      fetchApplications();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dating_interests' }, () => {
      fetchApplications();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
    // window.removeEventListener('auth-resynced', handleResumed);
  };
}, [fetchApplications, fetchMealProposals]);

  const isGroupFormat = (format: string): boolean => {
    return ['복식', '혼복', '남복', '여복'].some((f) => format.includes(f));
  };

  const getCapacity = (format: string): number => {
    return isGroupFormat(format) ? 4 : 2;
  };

  const handleAcceptGroupChat = async (
    app: Application
  ): Promise<{ chatId: string; isNew: boolean; error?: never } | { chatId?: never; isNew?: never; error: string }> => {
    const courtId = app.court_id;
    const applicantId = app.applicant_id;
    const hostId = user!.id;
    const purpose = app.purpose ?? 'tennis';

    const { data: rpcData, error: rpcErr } = await supabase.rpc('accept_group_chat', {
      p_court_id: courtId,
      p_host_id: hostId,
      p_applicant_id: applicantId,
      p_purpose: purpose,
    });

    if (rpcErr || !rpcData) {
      return { error: `단체방 처리 실패: ${rpcErr?.message ?? '반환 데이터 없음'}` };
    }

    const result = rpcData as { chat_id: string; is_new: boolean };
    const chatId = result.chat_id;
    const isNew = result.is_new;

    const { count: participantCount } = await supabase
      .from('chat_participants')
      .select('id', { count: 'exact', head: true })
      .eq('chat_id', chatId);

    const capacity = getCapacity(app.court?.format || '');
    if ((participantCount ?? 0) >= capacity) {
      await supabase.from('courts').update({ status: 'closed' }).eq('id', courtId);
    }

    return { chatId, isNew };
  };

  const handleAccept1v1Chat = async (
    app: Application
  ): Promise<{ chatId: string; isNew: boolean; error?: never } | { chatId?: never; isNew?: never; error: string }> => {
    const hostId = user!.id;
    const applicantId = app.applicant_id;
    const courtId = app.court_id;

    const { data: chatId, error: chatError } = await supabase.rpc('start_interest_1v1_chat', {
      p_host_id: hostId,
      p_interest_user_id: applicantId,
      p_court_id: courtId,
      p_purpose: app.purpose ?? 'tennis',
    });

    if (chatError || !chatId) {
      console.error('[1v1] start_interest_1v1_chat 실패:', chatError);
      return { error: `채팅방 생성 실패: ${chatError?.message ?? '반환 데이터 없음'}` };
    }

    // 수락 시점에는 채팅방만 생성한다.
    // 실제 모집마감/인원 확정은 채팅방에서 호스트가 매칭확정 버튼을 눌렀을 때 처리한다.
    return { chatId, isNew: true };
  };

  const handleStartInterestChat = async (item: CourtInterestItem) => {
    if (processingId) return;

    setProcessingId(item.id);
    setAcceptError(null);

    try {
      if (!user?.id || !item.user_id || !item.court_id) {
        alert('채팅을 시작할 수 없습니다. 필수 정보가 부족합니다.');
        return;
      }

      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('gender, is_subscribed, free_meeting_count, ticket_count')
        .eq('user_id', user.id)
        .maybeSingle();

      const isMale = hostProfile?.gender === '남성' || hostProfile?.gender === 'male';
      const isSubscribed = !!hostProfile?.is_subscribed;
      const freeCount = hostProfile?.free_meeting_count ?? 0;
      const ticketCount = hostProfile?.ticket_count ?? 0;

      let shouldUseFreeMeeting = false;
      let shouldUseTicket = false;

      if (isMale && !isSubscribed) {
        if (freeCount < 3) {
          shouldUseFreeMeeting = true;
        } else if (ticketCount > 0) {
          shouldUseTicket = true;
        } else {
          setShowPurchaseRequiredPopup(true);
          return;
        }
      }

      const { data: chatId, error: chatError } = await supabase.rpc('start_interest_1v1_chat', {
        p_host_id: user.id,
        p_interest_user_id: item.user_id,
        p_court_id: item.court_id,
        p_purpose: item.court?.purpose ?? 'dating',
      });

      if (chatError || !chatId) {
        console.error('[InterestChat] start_interest_1v1_chat failed:', chatError);
        alert('채팅방 생성에 실패했습니다.');
        return;
      }

      if (shouldUseFreeMeeting) {
        await supabase
          .from('profiles')
          .update({ free_meeting_count: freeCount + 1 })
          .eq('user_id', user.id);
      } else if (shouldUseTicket) {
        await supabase
          .from('profiles')
          .update({ ticket_count: Math.max(0, ticketCount - 1) })
          .eq('user_id', user.id);
      }

      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: null,
        content: '관심 코트를 통해 채팅방이 열렸어요. 경기 전 가볍게 인사해보세요 🎾',
        is_read: false,
        type: 'system',
      });

      navigate(`/chat/${chatId}`, { replace: false });
    } catch (err) {
      console.error('[InterestChat] start failed:', err);
      alert('채팅 시작 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAccept = async (app: Application) => {
    if (processingId) return;
    setProcessingId(app.id);
    setAcceptError(null);

    try {
      if (!user?.id || !app.applicant_id || !app.court_id) {
        const missing = [
          !user?.id && 'user.id',
          !app.applicant_id && 'applicant_id',
          !app.court_id && 'court_id',
        ].filter(Boolean).join(', ');
        setAcceptError(`필수 정보 누락: ${missing}`);
        return;
      }

      await supabase
        .from('applications')
        .update({ status: 'accepted', receiver_deleted: true })
        .eq('id', app.id);
const { data: hostProfile } = await supabase
  .from('profiles')
  .select('name')
  .eq('user_id', user.id)
  .maybeSingle();

const { data: applicantProfile } = await supabase
  .from('profiles')
  .select('fcm_token')
  .eq('user_id', app.applicant_id)
  .maybeSingle();

if (applicantProfile?.fcm_token) {
  await supabase.functions.invoke('send-push', {
    body: {
      token: applicantProfile.fcm_token,
      title: hostProfile?.name || '호스트',
      body: '코트 신청이 수락됐어요! 채팅방에서 대화를 시작해보세요.',
      data: {
        type: 'application_accepted',
        courtId: app.court_id,
      },
    },
  });
}

      const courtFormat = app.court?.format || '';
      const courtPurpose = app.purpose ?? 'tennis';
      const useGroupChat = isGroupFormat(courtFormat);

      let targetChatId: string | null = null;
      let isNewChat = false;

      if (useGroupChat) {
        const groupResult = await handleAcceptGroupChat(app);
        if (groupResult.error) {
          setAcceptError(groupResult.error);
          return;
        }
        targetChatId = groupResult.chatId ?? null;
        isNewChat = groupResult.isNew ?? false;
      } else {
        const result = await handleAccept1v1Chat(app);
        if (result.error) {
          setAcceptError(result.error);
          return;
        }
        targetChatId = result.chatId ?? null;
        isNewChat = result.isNew ?? false;
      }

      const applicantName = app.applicant?.name ?? '참여자';
      if (useGroupChat && targetChatId) {
        const entryMsg =
          courtPurpose === 'dating'
            ? `${applicantName}님이 입장했어요 😊`
            : `${applicantName}님이 참여했어요 🎾`;
        await supabase.from('messages').insert({
          chat_id: targetChatId,
          sender_id: null,
          content: entryMsg,
          is_read: false,
          type: 'system',
        });
      } else if (!useGroupChat && isNewChat && targetChatId) {
        const welcomeMsg =
          courtPurpose === 'dating'
            ? '채팅방이 열렸어요. 경기 전 가볍게 인사해보세요 💕'
            : '채팅방이 열렸어요. 경기 전 가볍게 소통해보세요 🎾';
        await supabase.from('messages').insert({
          chat_id: targetChatId,
          sender_id: null,
          content: welcomeMsg,
          is_read: false,
          type: 'system',
        });
      }

      if (targetChatId) {
        await supabase
          .from('applications')
          .update({ chat_id: targetChatId })
          .eq('id', app.id);
      }

      setReceivedApps((prev) => prev.filter((a) => a.id !== app.id));
      setSelectedApp(null);

      navigate(`/chat/${targetChatId}`, { replace: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAcceptError(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (app: Application) => {
    setSelectedApp(null);
    setRejectReason('');
    setTimeout(() => setRejectTarget(app), 50);
  };

 const handleRejectConfirm = async () => {
  if (!rejectTarget || rejectSubmitting || !user) return;

  setRejectSubmitting(true);

  const app = rejectTarget;
  const reason = rejectReason.trim();

  try {
    const { error } = await supabase
      .from('applications')
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
        receiver_deleted: true,
      })
      .eq('id', app.id);

    if (error) {
      console.error('신청 거절 실패:', error);
      alert('거절 처리에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    setReceivedApps((prev) => prev.filter((a) => a.id !== app.id));
    setRejectTarget(null);
    setRejectReason('');

    Promise.all([
      supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('fcm_token')
        .eq('user_id', app.applicant_id)
        .maybeSingle(),
    ])
      .then(([hostRes, applicantRes]) => {
        const token = applicantRes.data?.fcm_token;
        if (!token) return;

        return supabase.functions.invoke('send-push', {
          body: {
            token,
            title: hostRes.data?.name || '호스트',
            body: reason
              ? `코트 신청이 거절됐어요. 사유: ${reason}`
              : '코트 신청이 거절됐어요.',
            data: {
              type: 'application_rejected',
              courtId: app.court_id,
            },
          },
        });
      })
      .catch((pushError) => {
        console.error('거절 푸시 발송 실패:', pushError);
      });
  } catch (err) {
    console.error('신청 거절 처리 오류:', err);
    alert('거절 처리 중 오류가 발생했습니다.');
  } finally {
    setRejectSubmitting(false);
  }
}; 

  const handleGoToAcceptedChat = (app: Application) => {
    if (!app.chat_id) return;
    supabase.from('applications').update({ applicant_notified: true }).eq('id', app.id).then(() => {});
    setSentApps((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, applicant_notified: true } : a))
    );
    navigate(`/chat/${app.chat_id}`);
  };

  const handleDismissAcceptedNotif = async (app: Application) => {
    await supabase
      .from('applications')
      .update({ applicant_notified: true, sender_deleted: true })
      .eq('id', app.id);
    setSentApps((prev) => prev.filter((a) => a.id !== app.id));
  };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteSubmitting || !user) return;

    const app = deleteTarget;
    setDeleteSubmitting(true);

    try {
      const updateData =
        app.host_id === user.id
          ? { receiver_deleted: true }
          : { sender_deleted: true };

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', app.id);

      if (error) {
        console.error('알림 삭제 실패:', error);
        alert('삭제에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      setReceivedApps((prev) => prev.filter((a) => a.id !== app.id));
      setSentApps((prev) => prev.filter((a) => a.id !== app.id));

      setDeleteTarget(null);
      setSelectedApp(null);
      setRejectionDetailApp(null);
    } catch (err) {
      console.error('알림 삭제 오류:', err);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteSubmitting(false);
    }
  };
  const filteredReceived = receivedApps.filter((a) => a.purpose === purposeTab && a.status === 'pending');
  const filteredSent = sentApps.filter((a) => a.purpose === purposeTab);
  const mealProposalReceivedCount = purposeTab === 'dating' ? pendingMealProposals.filter((p) => p.receiver_id === user?.id).length : 0;
  const mealProposalResultCount = purposeTab === 'dating' ? resultMealProposals.length : 0;
  const acceptedNotifCount = filteredSent.filter((a) => a.status === 'accepted' && !a.applicant_notified && a.chat_id).length;
  const pendingReceivedCount = filteredReceived.length + mealProposalReceivedCount;
  const pendingSentCount = mealProposalResultCount + acceptedNotifCount;
const handlePurposeTabChange = (tab: PurposeTab) => {
  if (tab === 'dating') {
  if (!profile?.mbti && !profile?.height) {
      setShowDatingProfilePopup(true);
      return;
    }
  }

  if (tab === 'tennis') {
  if (!profile?.tennis_style) {
      setShowTennisProfilePopup(true);
      return;
    }
  }

  setPurposeTab(tab);
};
  const renderStatusBadge = (status: string) => {
    if (status === 'accepted') {
      return (
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.4)' }}
        >
          확정
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.22)' }}
        >
          거절됨
        </span>
      );
    }
    return (
      <span
        className="text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}
      >
        대기 중
      </span>
    );
  };
  const isDatingCard = purposeTab === 'dating';

  const renderReceivedCard = (app: Application) => {
    const applicant = app.applicant;
    const isTennisApp = app.purpose === 'tennis';
    const photos: string[] = isTennisApp
  ? applicant?.tennis_photo_urls?.length
    ? applicant.tennis_photo_urls
    : applicant?.tennis_photo_url
    ? [applicant.tennis_photo_url]
    : []
  : applicant?.photo_urls?.length
  ? applicant.photo_urls
  : applicant?.photo_url
  ? [applicant.photo_url]
  : [];

    return (
      <div
        key={app.id}
        className="overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        style={{
          borderRadius: '18px',
          background: isDatingCard ? 'linear-gradient(160deg, #FFF9F6 0%, #FFF5F0 100%)' : '#fff',
          border: isDatingCard ? '1px solid rgba(183,110,121,0.15)' : '1px solid #EBEBEB',
          boxShadow: isDatingCard ? '0 2px 12px rgba(183,110,121,0.08)' : '0 2px 12px rgba(0,0,0,0.06)',
        }}
        onClick={() => applicant && setSelectedApp(app)}
      >
        <div className="flex items-stretch gap-0">
          <div
            className="flex-shrink-0 relative overflow-hidden"
            style={{ width: '88px', minHeight: '100px' }}
          >
            {!applicant ? (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: '#D1D5DB' }}
              >
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            ) : photos.length > 0 ? (
              <img
                src={photos[0]}
                alt={applicant?.name}
                className="w-full h-full"
                style={{ objectFit: 'cover', objectPosition: 'center top', background: '#F0F0F0' }}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: '#F0F0F0' }}
              >
                <DefaultProfileAvatar type="tennis" size={72} />
              </div>
            )}
            {photos.length > 1 && (
              <div
                className="absolute bottom-1.5 right-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#C9A84C' }}
              >
                +{photos.length - 1}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 px-4 py-3">
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-base">{applicant?.name ?? '알 수 없음'}</span>
                {applicant?.age && (
                  <span className="text-sm text-gray-500">{applicant.age}세</span>
                )}
                {(applicant?.gender === 'male' || applicant?.gender === '남성' || applicant?.gender === 'female' || applicant?.gender === '여성') && (
                  <span
                    className="text-sm font-bold"
                    style={{ color: (applicant.gender === 'male' || applicant.gender === '남성') ? '#93C5FD' : '#FDA4AF' }}
                  >
                    {(applicant.gender === 'male' || applicant.gender === '남성') ? '♂' : '♀'}
                  </span>
                )}
              </div>
              {renderStatusBadge(app.status)}
            </div>

            {applicant?.experience && (
              <span
                className="inline-block text-xs px-2 py-0.5 rounded-full mb-2"
                style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}
              >
                구력 {applicant.experience}
              </span>
            )}

            {app.message && (
              <p className="text-xs text-gray-500 italic mb-1.5 truncate" style={{ maxWidth: '100%' }}>
                💬 "{app.message}"
              </p>
            )}

            {app.court && (
              <div
                className="mt-1 pt-2"
                style={{ borderTop: '1px solid #F0F0F0' }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MapPin className="w-3 h-3" style={{ color: '#C9A84C' }} />
                  <p className="text-xs text-gray-500 truncate">{app.court.court_name}</p>
                </div>
                {app.court.date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-white/30" />
                    <p className="text-xs text-gray-400">
                      {new Date(app.court.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                      {app.court.start_time && ` · ${app.court.start_time}`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex items-center justify-between py-2 px-3"
          style={{ borderTop: '1px solid #F0F0F0' }}
        >
          {app.status === 'pending' ? (
            <span className="text-xs font-medium" style={{ color: '#C9A84C' }}>탭하여 프로필 보기</span>
          ) : (
            <span />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(app); }}
            className="text-xs font-medium px-3 py-1 rounded-full transition active:scale-95"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.18)' }}
          >
            삭제
          </button>
        </div>
      </div>
    );
  };

  const handleDeleteSentInterest = async (item: CourtInterestItem) => {
    if (!user || !item.id || deletingInterestId === item.id) return;

    const ok = window.confirm(item.kind === 'person' ? '보낸 관심을 삭제하시겠어요?' : '보낸 관심 코트를 삭제하시겠어요?');
    if (!ok) return;

    setDeletingInterestId(item.id);

    try {
      const query = item.kind === 'person'
        ? supabase.from('dating_interests').delete().eq('id', item.id).eq('sender_id', user.id)
        : supabase.from('court_interests').delete().eq('id', item.id).eq('user_id', user.id);

      const { error } = await query;

      if (error) throw error;

      setSentInterestApps((prev) => prev.filter((app) => app.id !== item.id));
    } catch (error) {
      console.error('[Applications] delete sent interest failed:', error);
      alert('관심 삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setDeletingInterestId(null);
    }
  };

  const renderInterestCard = (item: CourtInterestItem) => {
    const member = item.user;
    const court = item.court;
    const isSentInterest = interestDirectionTab === 'sent';
    const photos: string[] = member?.tennis_photo_urls?.length
      ? member.tennis_photo_urls
      : member?.tennis_photo_url
      ? [member.tennis_photo_url]
      : member?.photo_urls?.length
      ? member.photo_urls
      : member?.photo_url
      ? [member.photo_url]
      : [];

    const interestedDate = item.created_at
      ? new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
      : '';

    if (item.kind === 'person') {
      const personPhotos: string[] = member?.photo_urls?.length
        ? member.photo_urls
        : member?.photo_url
        ? [member.photo_url]
        : [];

      return (
        <div
          key={item.id}
          className="rounded-3xl px-4 py-4"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(45,106,79,0.12)',
            boxShadow: '0 8px 24px rgba(27,67,50,0.08)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => member && setInterestPhotoProfile(member)}
              className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
              style={{ background: '#F3F4F6', border: '1px solid rgba(45,106,79,0.14)', padding: 0 }}
            >
              {personPhotos[0] ? (
                <img
                  src={personPhotos[0]}
                  alt={member?.name || 'profile'}
                  className="w-full h-full"
                  style={{ objectFit: 'cover', objectPosition: 'center top' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <DefaultProfileAvatar type="dating" size={44} />
                </div>
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-base font-bold truncate" style={{ color: '#10251B' }}>
                  {member?.name || '알 수 없음'}
                </span>

                {isSentInterest && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteSentInterest(item);
                    }}
                    disabled={deletingInterestId === item.id}
                    className="text-xs font-bold px-2.5 py-1 rounded-full active:opacity-80 disabled:opacity-60 flex-shrink-0"
                    style={{
                      color: '#DC2626',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.18)',
                    }}
                  >
                    {deletingInterestId === item.id ? '삭제 중' : '삭제'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: 'rgba(16,37,27,0.55)' }}>
                {member?.age && <span>{member.age}세</span>}
                {member?.height && <span>· {member.height}cm</span>}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {member?.experience && (
                  <span className="px-2 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(31,61,42,0.06)', color: '#3D6B4E' }}>
                    구력 {member.experience}
                  </span>
                )}
                {member?.mbti && (
                  <span className="px-2 py-1 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(31,61,42,0.06)', color: '#3D6B4E' }}>
                    MBTI {member.mbti}
                  </span>
                )}
              </div>

              <div className="text-xs" style={{ color: 'rgba(16,37,27,0.58)' }}>
                {isSentInterest ? '내가 관심을 보냈어요' : '나에게 관심을 보냈어요'}
                {interestedDate ? ` · ${interestedDate}` : ''}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className="rounded-3xl px-4 py-4"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(45,106,79,0.12)',
          boxShadow: '0 8px 24px rgba(27,67,50,0.08)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => member && setInterestPhotoProfile(member)}
            className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
            style={{ background: '#F3F4F6', border: '1px solid rgba(45,106,79,0.14)', padding: 0 }}
          >
            {photos[0] ? (
              <img
                src={photos[0]}
                alt={member?.name || 'profile'}
                className="w-full h-full"
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <DefaultProfileAvatar type="tennis" size={52} />
              </div>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-base font-bold truncate" style={{ color: '#10251B' }}>
                {member?.name || '알 수 없음'}
              </span>

              {isSentInterest && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteSentInterest(item);
                  }}
                  disabled={deletingInterestId === item.id}
                  className="text-xs font-bold px-2.5 py-1 rounded-full active:opacity-80 disabled:opacity-60 flex-shrink-0"
                  style={{
                    color: '#DC2626',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.18)',
                  }}
                >
                  {deletingInterestId === item.id ? '삭제 중' : '삭제'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'rgba(16,37,27,0.55)' }}>
              {member?.age && <span>{member.age}세</span>}
              {member?.gender && <span>· {member.gender}</span>}
              {member?.height && <span>· {member.height}cm</span>}
            </div>

            {(member?.tennis_career || member?.tennis_experience || member?.experience) && (
              <div className="mb-1.5">
                <span
                  className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold"
                  style={{ background: 'rgba(45,106,79,0.08)', color: '#2D6A4F' }}
                >
                  구력 {member?.tennis_career || member?.tennis_experience || member?.experience}
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          className="mt-3 rounded-2xl px-4 py-3"
          style={{ background: '#F3F7F1', border: '1px solid rgba(45,106,79,0.08)' }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: '#10251B' }}>
            {isSentInterest ? '이 코트에 관심 표시했어요' : '회원님 코트에 관심 표시했어요!'}
          </p>
          <p className="text-xs truncate" style={{ color: 'rgba(45,106,79,0.6)' }}>
            📍 {court?.court_name || '코트 정보 없음'}{interestedDate ? ` · ${interestedDate}` : ''}
          </p>
        </div>

        <div
          className="mt-3 rounded-2xl px-4 py-3"
          style={{
            background: '#FFF6DA',
            borderLeft: '4px solid #C9A84C',
            color: '#7A5A14',
          }}
        >
          <p className="text-xs font-bold mb-1">💡 안내</p>
          <p className="text-xs leading-relaxed">
            대표 사진 1장만 공개돼요.<br />
            채팅방 생성 시 더 많은 사진을 볼 수 있어요.
          </p>
        </div>

        {!isSentInterest && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                handleStartInterestChat(item);
              }}
              disabled={processingId === item.id}
              className="w-full py-3.5 rounded-xl text-sm font-bold active:opacity-80 disabled:opacity-60"
              style={{ background: '#1B4332', color: '#fff' }}
            >
              {processingId === item.id ? '여는 중...' : '먼저 채팅 보내기'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderSentCard = (app: Application) => {
    const host = app.owner;
    const isTennisApp = app.purpose === 'tennis';
   const hostPhoto = isTennisApp
  ? host?.tennis_photo_url
  : host?.photo_url;
    const hasRejectionReason = app.status === 'rejected' && !!app.rejection_reason;
    const hasAcceptedNotif = app.status === 'accepted' && !app.applicant_notified && !!app.chat_id;

    const acceptedNotifMsg = isTennisApp
      ? '호스트가 신청을 수락했어요! 이제 채팅방에서 이야기 나눠보세요 🎾'
      : '호스트가 신청을 수락했어요 :) 이제 채팅방에서 자연스럽게 이야기 나눠보세요 💕';

    return (
      <div
        key={app.id}
        className="overflow-hidden"
        style={{
          borderRadius: '18px',
          background: hasAcceptedNotif
            ? (isTennisApp ? 'linear-gradient(160deg, #F0FAF4 0%, #E8F5EC 100%)' : 'linear-gradient(160deg, #F0FAF4 0%, #E8F5EC 100%)')
            : !isTennisApp ? 'linear-gradient(160deg, #FFF9F6 0%, #FFF5F0 100%)' : '#fff',
          border: hasRejectionReason
            ? '1.5px solid rgba(239,68,68,0.3)'
            : hasAcceptedNotif
              ? (isTennisApp ? '1.5px solid rgba(27,67,50,0.25)' : '1.5px solid rgba(27,67,50,0.25)')
              : !isTennisApp ? '1px solid rgba(183,110,121,0.15)' : '1px solid #EBEBEB',
          boxShadow: hasRejectionReason
            ? '0 2px 14px rgba(239,68,68,0.1)'
            : hasAcceptedNotif
              ? (isTennisApp ? '0 2px 16px rgba(27,67,50,0.12)' : '0 2px 16px rgba(27,67,50,0.12)')
              : !isTennisApp ? '0 2px 12px rgba(183,110,121,0.08)' : '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {/* 수락 알림 배너 */}
        {hasAcceptedNotif && (
          <div
            className="px-4 py-3"
            style={{
              background: isTennisApp ? 'rgba(27,67,50,0.06)' : 'rgba(27,67,50,0.06)',
              borderBottom: isTennisApp ? '1px solid rgba(27,67,50,0.12)' : '1px solid rgba(27,67,50,0.12)',
            }}
          >
            <p className="text-xs font-medium mb-2.5" style={{ color: isTennisApp ? '#1B4332' : '#2D6A4F', lineHeight: 1.5 }}>
              {acceptedNotifMsg}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleGoToAcceptedChat(app)}
                className="flex-1 py-1.5 rounded-full text-xs font-bold transition active:scale-95"
                style={{
                  background: isTennisApp ? '#1B4332' : '#2D6A4F',
                  color: '#fff',
                }}
              >
                채팅방 가기
              </button>
              <button
                onClick={() => handleDismissAcceptedNotif(app)}
                className="flex-1 py-1.5 rounded-full text-xs font-semibold transition active:scale-95"
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  color: '#999',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                삭제
              </button>
            </div>
          </div>
        )}

        {/* 거절 사유 알림 배너 */}
        {hasRejectionReason && (
          <button
            onClick={() => setRejectionDetailApp(app)}
            className="w-full flex items-center justify-between px-4 py-2.5 transition active:opacity-80"
            style={{ background: 'rgba(239,68,68,0.07)', borderBottom: '1px solid rgba(239,68,68,0.12)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: '#DC2626' }}>거절 사유 도착</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: '#DC2626', color: '#fff' }}
              >
                확인
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" style={{ color: '#DC2626' }} />
          </button>
        )}

        <div className="flex items-stretch gap-0">
          <div
            className="flex-shrink-0 relative overflow-hidden"
            style={{ width: '88px', minHeight: '100px' }}
          >
            {hostPhoto ? (
              <img
                src={hostPhoto}
                alt={host?.name}
                className="w-full h-full"
                style={{ objectFit: 'cover', objectPosition: 'center top', background: '#F0F0F0' }}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: '#F0F0F0' }}
              >
                <DefaultProfileAvatar type="tennis" size={72} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 px-4 py-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-base">{host?.name}</span>
                {host?.age && (
                  <span className="text-sm text-gray-500">{host.age}세</span>
                )}
              </div>
              {renderStatusBadge(app.status)}
            </div>

            {app.court && (
              <div
                className="mb-2 pt-2"
                style={{ borderTop: '1px solid #F0F0F0' }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MapPin className="w-3 h-3" style={{ color: '#C9A84C' }} />
                  <p className="text-xs text-gray-500 truncate">{app.court.court_name}</p>
                </div>
                {app.court.date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-gray-300" />
                    <p className="text-xs text-gray-400">
                      {new Date(app.court.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                      {app.court.start_time && ` · ${app.court.start_time}`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex justify-end py-2 px-3"
          style={{ borderTop: '1px solid #F0F0F0' }}
        >
          <button
            onClick={() => setDeleteTarget(app)}
            className="text-xs font-medium px-3 py-1 rounded-full transition active:scale-95"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.18)' }}
          >
            삭제
          </button>
        </div>
      </div>
    );
  };

  const isDating = purposeTab === 'dating';
  const activeColor = '#1B4332';
  const activeBg = 'linear-gradient(160deg, #0A1F14 0%, #1B4332 100%)';
  const pageBg = 'linear-gradient(180deg, #F0F7F2 0%, #EBF4EE 100%)';

  return (
    <div
  className="pb-20 pt-[env(safe-area-inset-top)]"
  style={{ background: pageBg, minHeight: `${vpHeight}px` }}
>
      <header className="sticky top-0 z-10" style={{ background: activeBg, boxShadow: '0 2px 20px rgba(0,0,0,0.25)' }}>
        <div className="px-5 pt-4 pb-3">
          <h1 className="text-xl font-bold text-white tracking-tight">신청 목록</h1>
        </div>

        <div className="px-4 pb-3 flex gap-2">
          {(['tennis', 'dating'] as PurposeTab[]).map((tab) => (
            <button
              key={tab}
            onClick={() => handlePurposeTabChange(tab)}
              className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200"
              style={purposeTab === tab
                ? { background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' }
                : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1.5px solid rgba(255,255,255,0.1)' }
              }
            >
              {tab === 'tennis' ? '🎾 테니스 신청' : '🎾 테니스 메이트'}
            </button>
          ))}
        </div>

        <div className="flex" style={{ borderTop: '1px solid rgba(201,168,76,0.2)' }}>
          {[
            { key: 'received' as DirectionTab, label: '받은 신청', count: pendingReceivedCount },
            { key: 'sent' as DirectionTab, label: '보낸 신청', count: pendingSentCount },
            ...(purposeTab === 'dating'
              ? [{ key: 'interest' as DirectionTab, label: '관심', count: interestApps.length + sentInterestApps.length }]
              : []),
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDirectionTab(tab.key)}
              className="flex-1 py-3 text-sm font-semibold transition-all duration-200 relative flex items-center justify-center gap-1.5"
              style={{ color: directionTab === tab.key ? '#fff' : 'rgba(255,255,255,0.45)' }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                  style={{ background: '#C9A84C', color: '#fff' }}
                >
                  {tab.count}
                </span>
              )}
              {directionTab === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full" style={{ width: '40%', background: '#C9A84C' }} />
              )}
            </button>
          ))}
        </div>
      </header>

      {isDating && directionTab === 'received' && pendingMealProposals.some((p) => p.receiver_id === user?.id) && (
        <div className="px-4 pt-4 flex flex-col gap-2.5">
          {pendingMealProposals.filter((p) => p.receiver_id === user?.id).map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-2xl px-4 py-4 flex items-start gap-3"
              style={{ background: 'linear-gradient(135deg, #F0FAF4 0%, #E8F5EC 100%)', border: '1.5px solid rgba(45,106,79,0.22)', boxShadow: '0 2px 12px rgba(45,106,79,0.1)' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #74A88A 0%, #2D6A4F 100%)' }}
              >
                <UtensilsCrossed className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2.5">
                  <p className="text-sm font-semibold leading-snug" style={{ color: '#7C2D5E' }}>
                    <span style={{ color: '#2D6A4F' }}>{proposal.sender_name ?? '호스트'}</span>님이<br />경기 후 식사를 제안했어요 :)
                  </p>
                  <button
                    onClick={() => handleDeletePendingMealProposal(proposal.id)}
                    className="ml-2 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition active:scale-95"
                    style={{ background: 'rgba(0,0,0,0.06)' }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 14 14" stroke="#9CA3AF" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 2l10 10M12 2L2 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMealProposalAccept(proposal.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)', boxShadow: '0 2px 8px rgba(45,106,79,0.28)' }}
                  >
                    수락하기
                  </button>
                  <button
                    onClick={() => { setMealRejectProposalId(proposal.id); setShowMealRejectPopup(true); }}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition active:scale-95"
                    style={{ background: 'rgba(156,28,67,0.07)', color: '#9C1C43', border: '1px solid rgba(156,28,67,0.15)' }}
                  >
                    다음에요
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isDating && directionTab === 'sent' && (resultMealProposals.length > 0 || pendingMealProposals.some((p) => p.sender_id === user?.id)) && (
        <div className="px-4 pt-4 flex flex-col gap-2.5">
          {resultMealProposals.map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-2xl px-4 py-4 flex items-start gap-3"
              style={{
                background: proposal.status === 'accepted'
                  ? 'linear-gradient(135deg, #F0FAF4 0%, #E8F5EC 100%)'
                  : 'linear-gradient(135deg, #FFF5F5 0%, #FFF0F0 100%)',
                border: proposal.status === 'accepted'
                  ? '1.5px solid rgba(45,106,79,0.22)'
                  : '1.5px solid rgba(220,80,80,0.22)',
                boxShadow: proposal.status === 'accepted'
                  ? '0 2px 12px rgba(45,106,79,0.1)'
                  : '0 2px 8px rgba(220,80,80,0.08)',
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: proposal.status === 'accepted'
                    ? 'linear-gradient(135deg, #74A88A 0%, #2D6A4F 100%)'
                    : 'rgba(220,80,80,0.15)',
                }}
              >
                <UtensilsCrossed className="w-4 h-4" style={{ color: proposal.status === 'accepted' ? '#fff' : '#DC5050' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold leading-snug mb-1" style={{ color: proposal.status === 'accepted' ? '#7C2D5E' : '#7F1D1D' }}>
                    {proposal.status === 'accepted' ? (
                      <><span style={{ color: '#2D6A4F' }}>{proposal.receiver_name ?? '참여자'}</span>님이<br />경기 후 식사 제안을 수락했어요 :)</>
                    ) : (
                      <><span style={{ color: '#DC5050' }}>{proposal.receiver_name ?? '참여자'}</span>님이<br />식사 제안을 거절했어요</>
                    )}
                  </p>
                  <button
                    onClick={() => handleDismissResultMeal(proposal.id)}
                    className="ml-2 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition active:scale-95"
                    style={{ background: 'rgba(0,0,0,0.06)' }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 14 14" stroke="#9CA3AF" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 2l10 10M12 2L2 12" />
                    </svg>
                  </button>
                </div>
                {proposal.status === 'rejected' && proposal.rejection_reason && (
                  <p className="text-xs mt-1 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(220,80,80,0.07)', color: '#9B1C1C' }}>
                    "{proposal.rejection_reason}"
                  </p>
                )}
              </div>
            </div>
          ))}
          {pendingMealProposals.filter((p) => p.sender_id === user?.id).map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-2xl px-4 py-4 flex items-start gap-3"
              style={{ background: 'linear-gradient(135deg, #F0FAF4 0%, #E8F5EC 100%)', border: '1.5px solid rgba(45,106,79,0.16)', boxShadow: '0 2px 8px rgba(45,106,79,0.07)' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(45,106,79,0.12)' }}
              >
                <UtensilsCrossed className="w-4 h-4" style={{ color: '#2D6A4F' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold leading-snug" style={{ color: '#7C2D5E' }}>
                    <span style={{ color: '#2D6A4F' }}>{proposal.receiver_name ?? '참여자'}</span>님에게<br />경기 후 식사를 제안했어요
                  </p>
                  <button
                    onClick={() => handleDeletePendingMealProposal(proposal.id)}
                    className="ml-2 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition active:scale-95"
                    style={{ background: 'rgba(0,0,0,0.06)' }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 14 14" stroke="#9CA3AF" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 2l10 10M12 2L2 12" />
                    </svg>
                  </button>
                </div>
                <span
                  className="inline-block mt-2 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(45,106,79,0.1)', color: '#2D6A4F', border: '1px solid rgba(45,106,79,0.22)' }}
                >
                  답장 기다리는 중...
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-5">
        {loading && filteredReceived.length === 0 && filteredSent.length === 0 && interestApps.length === 0 && sentInterestApps.length === 0 && pendingMealProposals.length === 0 && resultMealProposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: isDating ? 'rgba(45,106,79,0.4)' : 'rgba(45,106,79,0.4)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: isDating ? 'rgba(45,106,79,0.6)' : 'rgba(45,106,79,0.6)' }}>불러오는 중...</p>
          </div>
        ) : directionTab === 'received' ? (
          filteredReceived.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: isDating ? 'rgba(27,67,50,0.08)' : 'rgba(27,67,50,0.08)', border: `1.5px solid ${isDating ? 'rgba(27,67,50,0.2)' : 'rgba(27,67,50,0.2)'}` }}
              >
                {isDating ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                ) : (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M2 12a15.3 15.3 0 0 0 4 4c1.9 1.3 4 2 6 2s4.1-.7 6-2a15.3 15.3 0 0 0 4-4"/>
                    <path d="M2 12a15.3 15.3 0 0 1 4-4 11.6 11.6 0 0 1 6-2 11.6 11.6 0 0 1 6 2 15.3 15.3 0 0 1 4 4"/>
                  </svg>
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm mb-1" style={{ color: isDating ? '#2D6A4F' : '#2D6A4F' }}>
                  {isDating ? '받은 만남 신청이 없어요' : '받은 테니스 신청이 없어요'}
                </p>
                <p className="text-xs" style={{ color: isDating ? 'rgba(45,106,79,0.55)' : 'rgba(45,106,79,0.55)' }}>
                  {isDating ? '코트 등록 후 인연을 기다려보세요!' : '코트 등록 후 파트너를 기다려보세요!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReceived.map((app) => renderReceivedCard(app))}
            </div>
          )
        ) : purposeTab === 'dating' && directionTab === 'interest' ? (
          <div className="space-y-3">
            <div
              className="grid grid-cols-2 gap-1 rounded-full p-1"
              style={{ background: '#fff', border: '1px solid rgba(45,106,79,0.12)' }}
            >
              {[
                { key: 'received' as InterestDirectionTab, label: '받은 관심', count: interestApps.length },
                { key: 'sent' as InterestDirectionTab, label: '보낸 관심', count: sentInterestApps.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setInterestDirectionTab(tab.key)}
                  className="rounded-full py-2 text-xs font-bold transition-all"
                  style={{
                    background: interestDirectionTab === tab.key ? '#1B4332' : 'transparent',
                    color: interestDirectionTab === tab.key ? '#fff' : '#2D6A4F',
                  }}
                >
                  {tab.label}{tab.count > 0 ? ` ${tab.count}` : ''}
                </button>
              ))}
            </div>

            {(interestDirectionTab === 'received' ? interestApps : sentInterestApps).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-5">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(45,106,79,0.08)', border: '1.5px solid rgba(45,106,79,0.2)' }}
                >
                  <span className="text-3xl">🎾</span>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm mb-1" style={{ color: '#2D6A4F' }}>
                    {interestDirectionTab === 'received' ? '받은 관심이 없어요' : '보낸 관심이 없어요'}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(45,106,79,0.55)' }}>
                    {interestDirectionTab === 'received' ? '회원이 관심을 보내면 여기에 표시됩니다.' : '내가 보낸 관심이 여기에 표시됩니다.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {(interestDirectionTab === 'received' ? interestApps : sentInterestApps).map((item) => renderInterestCard(item))}
              </div>
            )}
          </div>
        ) : filteredSent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: isDating ? 'rgba(27,67,50,0.08)' : 'rgba(27,67,50,0.08)', border: `1.5px solid ${isDating ? 'rgba(27,67,50,0.2)' : 'rgba(27,67,50,0.2)'}` }}
            >
              {isDating ? (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              ) : (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm mb-1" style={{ color: isDating ? '#2D6A4F' : '#2D6A4F' }}>
                {isDating ? '보낸 만남 신청이 없어요' : '보낸 테니스 신청이 없어요'}
              </p>
              <p className="text-xs" style={{ color: isDating ? 'rgba(45,106,79,0.55)' : 'rgba(45,106,79,0.55)' }}>
                {isDating ? '마음에 드는 분께 먼저 말을 걸어보세요!' : '파트너를 찾아 신청해보세요!'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSent.map((app) => renderSentCard(app))}
          </div>
        )}
      </div>
{showPurchaseRequiredPopup && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5">
    <div className="w-full max-w-sm rounded-3xl bg-white p-6">
      <div className="text-3xl mb-3">🎟️</div>

      <h2 className="text-lg font-bold mb-2" style={{ color: '#0F2118' }}>
        이용권이 필요해요
      </h2>

      <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(15,33,24,0.68)' }}>
        무료 채팅 횟수를 모두 사용했거나<br />
        보유한 이용권이 부족합니다.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowPurchaseRequiredPopup(false)}
          className="h-12 rounded-2xl font-semibold"
          style={{ background: '#F3F4F6', color: '#374151' }}
        >
          확인
        </button>

        <button
          onClick={() => {
            setShowPurchaseRequiredPopup(false);
            navigate('/profile?paywall=ticket');
          }}
          className="h-12 rounded-2xl text-white font-semibold"
          style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
        >
          이용권 구매
        </button>
      </div>
    </div>
  </div>
)}

{showDatingProfilePopup && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5">
    <div className="w-full max-w-sm rounded-3xl bg-white p-6">
      <div className="text-3xl mb-3">🥂</div>

      <h2
        className="text-lg font-bold mb-2"
        style={{ color: '#2D1820' }}
      >
        설레는 만남 프로필 등록
      </h2>

      <p
        className="text-sm leading-relaxed mb-5"
        style={{ color: 'rgba(45,24,32,0.68)' }}
      >
        설레는 만남에서는
        <br />
        얼굴이 나온 사진 등록이 필요해요.
      </p>

      <button
        onClick={() => {
          setShowDatingProfilePopup(false);
          navigate('/dating-profile-setup');
        }}
        className="w-full h-12 rounded-2xl text-white font-semibold"
        style={{
          background:
            'linear-gradient(135deg, #2D6A4F 0%, #E8A598 100%)',
        }}
      >
        프로필 등록하기
      </button>
    </div>
  </div>
)}

{showTennisProfilePopup && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5">
    <div className="w-full max-w-sm rounded-3xl bg-white p-6">
      <div className="text-3xl mb-3">🎾</div>

      <h2
        className="text-lg font-bold mb-2"
        style={{ color: '#0F2118' }}
      >
        오직테니스 프로필 등록
      </h2>

      <p
        className="text-sm leading-relaxed mb-5"
        style={{ color: 'rgba(15,33,24,0.68)' }}
      >
        오직테니스에서는
        <br />
        테니스 프로필 등록이 필요해요.
      </p>

      <button
        onClick={() => {
          setShowTennisProfilePopup(false);
          navigate('/tennis-profile-setup');
        }}
        className="w-full h-12 rounded-2xl text-white font-semibold"
        style={{
          background:
            'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
        }}
      >
        프로필 등록하기
      </button>
    </div>
  </div>
)}
      <BottomNav active="applications" />

      {interestPhotoProfile && (
        <div className="fixed inset-0 z-50 bg-black">
          <button
            type="button"
            onClick={() => setInterestPhotoProfile(null)}
            className="absolute top-12 right-5 z-20 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <ApplicantPhotoCarousel profile={interestPhotoProfile} />
        </div>
      )}

      {selectedApp && selectedApp.applicant && (
        selectedApp.purpose === 'dating' ? (
          <DatingApplicantModal
            app={selectedApp}
            onClose={() => { setSelectedApp(null); setAcceptError(null); }}
            onAccept={handleAccept}
            onReject={handleReject}
            processing={processingId === selectedApp.id}
            errorMsg={acceptError}
          />
        ) : (
          <ApplicantModal
            app={selectedApp}
            onClose={() => { setSelectedApp(null); setAcceptError(null); }}
            onAccept={handleAccept}
            onReject={handleReject}
            processing={processingId === selectedApp.id}
            errorMsg={acceptError}
          />
        )
      )}

      {rejectTarget && (() => {
        const isDatingReject = rejectTarget.purpose === 'dating';
        const hasReason = rejectReason.trim().length > 0;

        const sheetBg = isDatingReject
          ? 'linear-gradient(160deg, #FFF5F7 0%, #FFFBFC 100%)'
          : 'linear-gradient(160deg, #F0F7F2 0%, #FAFCFB 100%)';
        const handleColor = isDatingReject ? 'rgba(201,99,122,0.25)' : 'rgba(26,92,53,0.2)';
        const titleColor = isDatingReject ? '#8B3A50' : '#1B4332';
        const descColor = isDatingReject ? 'rgba(139,58,80,0.55)' : 'rgba(27,67,50,0.5)';
        const borderActive = isDatingReject ? '#2D6A4F' : '#2D6A4F';
        const borderIdle = isDatingReject ? 'rgba(27,67,50,0.2)' : 'rgba(26,92,53,0.18)';
        const shadowActive = isDatingReject ? 'rgba(27,67,50,0.12)' : 'rgba(26,92,53,0.1)';
        const hintColor = isDatingReject ? 'rgba(139,58,80,0.38)' : 'rgba(27,67,50,0.38)';
        const cancelBg = isDatingReject ? 'rgba(27,67,50,0.06)' : 'rgba(26,92,53,0.06)';
        const cancelColor = isDatingReject ? '#9E5068' : '#2D6A4F';
        const cancelBorder = isDatingReject ? 'rgba(201,99,122,0.18)' : 'rgba(26,92,53,0.16)';
        const btnGradient = isDatingReject
          ? 'linear-gradient(135deg, #2D6A4F 0%, #D4849A 100%)'
          : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)';
        const btnShadow = isDatingReject ? 'rgba(201,99,122,0.35)' : 'rgba(26,92,53,0.3)';
        const footerBg = isDatingReject ? 'rgba(255,250,252,0.97)' : 'rgba(248,253,250,0.97)';
        const footerBorder = isDatingReject ? 'rgba(27,67,50,0.12)' : 'rgba(26,92,53,0.12)';

        return (
          <div
            className="fixed inset-0 z-[9999] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={() => { setRejectTarget(null); setRejectReason(''); }}
          >
            <div
              className="w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
              style={{
                background: sheetBg,
                maxHeight: `${Math.floor(vpHeight * 0.85)}px`,
                paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 pt-5 flex-1 overflow-y-auto">
                <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: handleColor }} />

                <div className="flex items-center gap-2.5 mb-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: isDatingReject ? 'rgba(201,99,122,0.1)' : 'rgba(26,92,53,0.1)', border: `1px solid ${borderIdle}` }}
                  >
                    {isDatingReject ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={borderActive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={borderActive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12a15.3 15.3 0 0 0 4 4c1.9 1.3 4 2 6 2s4.1-.7 6-2a15.3 15.3 0 0 0 4-4" />
                        <path d="M2 12a15.3 15.3 0 0 1 4-4 11.6 11.6 0 0 1 6-2 11.6 11.6 0 0 1 6 2 15.3 15.3 0 0 1 4 4" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: titleColor }}>
                      {isDatingReject ? '이번엔 인연이 아닌 것 같아요' : '이번 파트너십은 어렵겠어요'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: descColor }}>
                      {isDatingReject ? '부드럽게 사유를 전달해주세요' : '간단한 이유를 남겨주시면 좋아요'}
                    </p>
                  </div>
                </div>

                <div className="h-px my-4" style={{ background: isDatingReject ? 'rgba(201,99,122,0.1)' : 'rgba(26,92,53,0.1)' }} />

                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={isDatingReject
                    ? '예) 일정이 맞지 않아서요, 다음에 또 좋은 인연이 생기길 바랍니다 :)'
                    : '예) 구력 차이가 조금 있어서요, 좋은 파트너 만나시길 바랍니다!'}
                  rows={4}
                  autoFocus
                  className="w-full rounded-2xl px-4 py-3.5 text-sm resize-none focus:outline-none"
                  style={{
                    background: '#fff',
                    border: `1.5px solid ${hasReason ? borderActive : borderIdle}`,
                    color: '#1a1a1a',
                    lineHeight: 1.7,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxShadow: hasReason ? `0 0 0 3px ${shadowActive}` : 'none',
                    fontSize: '14px',
                  }}
                />
                {!hasReason && (
                  <p className="text-xs text-center mt-2.5 mb-1" style={{ color: hintColor }}>
                    {isDatingReject ? '사유를 입력해야 거절을 보낼 수 있어요' : '한 줄이라도 남겨주시면 상대방에게 큰 도움이 돼요'}
                  </p>
                )}
              </div>

              <div
                className="flex-shrink-0 flex gap-2.5 px-5 py-3"
                style={{
                  background: footerBg,
                  backdropFilter: 'blur(12px)',
                  borderTop: `1px solid ${footerBorder}`,
                }}
              >
                <button
                  onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                  className="flex-1 rounded-2xl font-semibold text-sm transition active:scale-95"
                  style={{ background: cancelBg, color: cancelColor, minHeight: '50px', border: `1px solid ${cancelBorder}` }}
                >
                  취소
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={rejectSubmitting || !hasReason}
                  className="flex-1 rounded-2xl font-semibold text-sm text-white transition active:scale-95 disabled:opacity-40"
                  style={{ background: btnGradient, minHeight: '50px', border: 'none', boxShadow: hasReason ? `0 4px 14px ${btnShadow}` : 'none' }}
                >
                  {rejectSubmitting ? '처리 중...' : '거절 전달하기'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {rejectionDetailApp && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setRejectionDetailApp(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 shadow-2xl"
            style={{
              background: rejectionDetailApp.purpose === 'dating' ? '#FFF8F5' : '#F4FAF6',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 28px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-red-200" />
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: '#DC2626', flexShrink: 0 }}
              >
                X
              </span>
              <p className="font-bold text-gray-900 text-base">거절 사유</p>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {rejectionDetailApp.court?.court_name && `${rejectionDetailApp.court.court_name} · `}
              {rejectionDetailApp.purpose === 'dating' ? '설레는 만남' : '오직테니스'}
            </p>
            <div
              className="rounded-2xl px-4 py-4 mb-5"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}
            >
              <p className="text-sm leading-relaxed" style={{ color: '#1a1a1a' }}>
                {rejectionDetailApp.rejection_reason}
              </p>
            </div>
            <button
              onClick={() => setRejectionDetailApp(null)}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)' }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (() => {
        const isDatingDelete = deleteTarget.purpose === 'dating';
        return (
          <div
            className="fixed inset-0 z-[9999] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setDeleteTarget(null)}
          >
            <div
              className="w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
              style={{
                background: isDatingDelete ? '#FFF8F5' : '#fff',
                maxHeight: '80dvh',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 pt-5 pb-2">
                <div
                  className="w-10 h-1 rounded-full mx-auto mb-4"
                  style={{ background: isDatingDelete ? 'rgba(234,153,166,0.35)' : '#E5E7EB' }}
                />
                <p className="font-bold text-gray-900 text-base mb-1">이 알림을 삭제할까요?</p>
                <p className="text-sm" style={{ color: '#9CA3AF', lineHeight: 1.6 }}>
                  삭제 후에는 다시 확인할 수 없습니다.
                </p>
              </div>
              <div
                className="flex gap-2 px-5 py-4"
                style={{
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                  background: isDatingDelete ? '#FFF8F5' : '#fff',
                  paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 20px)',
                }}
              >
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-sm transition active:scale-95"
                  style={{
                    background: isDatingDelete ? 'rgba(234,153,166,0.1)' : '#F3F4F6',
                    color: isDatingDelete ? '#B76E79' : '#374151',
                    border: isDatingDelete ? '1px solid rgba(234,153,166,0.25)' : 'none',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteSubmitting}
                  className="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-white transition active:scale-95 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
                >
                  {deleteSubmitting ? '삭제 중...' : '삭제하기'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showMealAcceptPopup && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowMealAcceptPopup(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl px-7 py-8 flex flex-col items-center gap-4"
            style={{ background: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4EF 100%)', border: '1.5px solid rgba(45,106,79,0.22)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #74A88A 0%, #2D6A4F 100%)', boxShadow: '0 4px 20px rgba(244,114,182,0.4)' }}
            >
              <UtensilsCrossed className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold mb-1" style={{ color: '#7C2D5E' }}>경기 후 약속,</p>
              <p className="text-lg font-bold mb-2" style={{ color: '#2D6A4F' }}>미리 잡아봐요 :)</p>
              <p className="text-sm" style={{ color: 'rgba(124,45,94,0.65)' }}>수락이 전달됐어요. 경기 후 함께해요!</p>
            </div>
            <button
              onClick={() => setShowMealAcceptPopup(false)}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)', boxShadow: '0 4px 16px rgba(224,92,138,0.4)' }}
            >
              좋아요!
            </button>
          </div>
        </div>
      )}

      {showMealRejectPopup && mealRejectProposalId && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => { setShowMealRejectPopup(false); setMealRejectProposalId(null); setMealRejectReason(''); }}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl shadow-2xl flex flex-col"
            style={{
              background: 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)',
              maxHeight: `${Math.floor(vpHeight * 0.80)}px`,
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(201,168,76,0.3)' }} />
              <h2 className="text-base font-bold text-gray-900 mb-1 text-center">식사 제안 거절</h2>
              <p className="text-xs text-gray-400 text-center mb-4">거절 이유를 직접 입력해주세요</p>
              <textarea
                value={mealRejectReason}
                onChange={(e) => setMealRejectReason(e.target.value)}
                placeholder="거절 이유를 입력해주세요"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-amber-400"
                rows={3}
              />
            </div>
            <div className="flex gap-3 px-6 py-3 flex-shrink-0 border-t border-gray-100">
              <button
                onClick={() => { setShowMealRejectPopup(false); setMealRejectProposalId(null); setMealRejectReason(''); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                취소
              </button>
              <button
                onClick={handleMealProposalReject}
                disabled={!mealRejectReason.trim() || mealRejectSubmitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #D4896A 100%)' }}
              >
                {mealRejectSubmitting ? '처리 중...' : '거절하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
