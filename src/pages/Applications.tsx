import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Application, Profile } from '../types';
import BottomNav from '../components/BottomNav';
import { X, ChevronLeft, ChevronRight, MapPin, Calendar } from 'lucide-react';

type PurposeTab = 'tennis' | 'dating';
type DirectionTab = 'received' | 'sent';

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
          {profile.name?.charAt(0) || '?'}
        </div>
        <p className="text-sm mt-3 font-light" style={{ color: 'rgba(183,110,121,0.7)' }}>사진이 없습니다</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full select-none"
      style={{ height: '55vw', maxHeight: '260px' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        key={idx}
        src={photos[idx]}
        alt={profile.name}
        className="w-full h-full"
        style={{ objectFit: 'cover', objectPosition: 'center top' }}
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
          {profile.name?.charAt(0) || '?'}
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
  const [page, setPage] = useState<1 | 2>(1);

  const photos: string[] = applicant.photo_urls?.length
    ? applicant.photo_urls
    : applicant.photo_url
    ? [applicant.photo_url]
    : [];
  const [photoIdx, setPhotoIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        if (page === 1) setPage(2);
        else if (photos.length > 1) setPhotoIdx((i) => (i + 1) % photos.length);
      } else {
        if (page === 2) setPage(1);
        else if (photos.length > 1) setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
      }
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(30,10,15,0.78)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md relative flex flex-col"
        style={{
          height: '96dvh',
          maxHeight: '96dvh',
          borderRadius: '28px 28px 0 0',
          overflow: 'hidden',
          background: page === 1 ? '#000' : 'linear-gradient(180deg, #FFF8F6 0%, #FFF4F6 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── 공통 상단 탭 바 — 핑크톤 ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4"
          style={{
            paddingTop: '14px',
            paddingBottom: '12px',
            background: 'rgba(255,248,246,0.98)',
            backdropFilter: 'blur(14px)',
            borderBottom: '1.5px solid rgba(201,99,122,0.12)',
            position: 'relative',
            zIndex: 30,
          }}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(201,99,122,0.09)', border: '1px solid rgba(201,99,122,0.18)' }}
          >
            <X className="w-4 h-4" style={{ color: '#C9637A' }} />
          </button>

          {/* 탭 버튼 — 중앙 */}
          <div className="flex gap-0 rounded-2xl p-1" style={{ background: 'rgba(201,99,122,0.07)', border: '1px solid rgba(201,99,122,0.14)' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setPage(1); }}
              className="rounded-xl transition-all duration-200"
              style={{
                padding: '7px 22px',
                fontSize: '13px',
                fontWeight: 700,
                color: page === 1 ? '#fff' : 'rgba(201,99,122,0.45)',
                background: page === 1 ? 'linear-gradient(135deg,#C9637A,#D4849A)' : 'transparent',
                boxShadow: page === 1 ? '0 2px 12px rgba(201,99,122,0.35)' : 'none',
                letterSpacing: '0.03em',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              사진
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setPage(2); }}
              className="rounded-xl transition-all duration-200"
              style={{
                padding: '7px 22px',
                fontSize: '13px',
                fontWeight: 700,
                color: page === 2 ? '#C9637A' : 'rgba(201,99,122,0.45)',
                background: page === 2 ? '#fff' : 'transparent',
                boxShadow: page === 2 ? '0 2px 10px rgba(201,99,122,0.15)' : 'none',
                letterSpacing: '0.03em',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              프로필
            </button>
          </div>

          {/* 이름 / 사진 카운트 */}
          <div className="w-8 flex items-center justify-end">
            {page === 1 && photos.length > 1 && (
              <span className="text-xs font-semibold" style={{ color: '#C9637A' }}>
                {photoIdx + 1}/{photos.length}
              </span>
            )}
          </div>
        </div>

        {/* ── 사진 탭 ── */}
        {page === 1 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 relative overflow-hidden">
              {photos.length === 0 ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center"
                  style={{ background: 'linear-gradient(180deg, #2D1218 0%, #1A0A10 100%)' }}
                >
                  <div
                    className="w-28 h-28 rounded-full flex items-center justify-center font-bold"
                    style={{ fontSize: '3.5rem', background: 'rgba(201,99,122,0.15)', color: '#D4849A' }}
                  >
                    {applicant.name?.charAt(0) || '?'}
                  </div>
                  <p className="text-sm mt-4 font-light" style={{ color: 'rgba(249,168,184,0.6)' }}>사진이 없습니다</p>
                </div>
              ) : (
                <>
                  <img
                    key={photoIdx}
                    src={photos[photoIdx]}
                    alt={applicant.name}
                    className="w-full h-full"
                    style={{ objectFit: 'cover', objectPosition: 'center top' }}
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => (i - 1 + photos.length) % photos.length); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-10"
                        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
                      >
                        <ChevronLeft className="w-5 h-5 text-white" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => (i + 1) % photos.length); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-10"
                        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
                      >
                        <ChevronRight className="w-5 h-5 text-white" />
                      </button>
                    </>
                  )}
                </>
              )}
              <div
                className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-20 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)' }}
              >
                <div className="flex items-end gap-2.5">
                  <span className="text-white font-semibold tracking-wide" style={{ fontSize: '1.85rem' }}>
                    {applicant.name}
                  </span>
                  {applicant.age && (
                    <span className="text-white/80 text-xl font-light mb-0.5">{applicant.age}세</span>
                  )}
                  {(applicant.gender === 'male' || applicant.gender === '남성' || applicant.gender === 'female' || applicant.gender === '여성') && (
                    <span className="text-xl font-bold mb-0.5" style={{ color: isMale ? '#93C5FD' : '#FDA4AF' }}>
                      {isMale ? '♂' : '♀'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 안내 문구 */}
            <div
              className="flex-shrink-0 px-5 py-3 flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,248,246,0.98)', borderTop: '1px solid rgba(201,99,122,0.08)' }}
            >
              <span style={{ fontSize: '11px', color: 'rgba(201,99,122,0.5)', fontWeight: 500, textAlign: 'center', letterSpacing: '0.01em' }}>
                프로필에서 MBTI · 키 · 분위기를 살펴보고 편하게 말을 걸어보세요
              </span>
            </div>
          </div>
        )}


        {/* ── 정보 탭 ── */}
        {page === 2 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* 프로필 헤더 */}
            <div className="flex-shrink-0 px-5 pt-4 pb-4" style={{ borderBottom: '1px solid rgba(201,99,122,0.1)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
                  style={{ border: '2px solid rgba(201,99,122,0.25)' }}
                >
                  {photos.length > 0 ? (
                    <img
                      src={photos[0]}
                      alt={applicant.name}
                      className="w-full h-full"
                      style={{ objectFit: 'cover', objectPosition: 'center top' }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center font-bold"
                      style={{ background: 'rgba(201,99,122,0.1)', color: '#C9637A', fontSize: '1.4rem' }}
                    >
                      {applicant.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ fontSize: '1.15rem', color: '#1a1a1a' }}>{applicant.name}</span>
                    {applicant.age && (
                      <span className="font-medium" style={{ color: '#9CA3AF' }}>{applicant.age}세</span>
                    )}
                    {(applicant.gender === 'male' || applicant.gender === '남성' || applicant.gender === 'female' || applicant.gender === '여성') && (
                      <span style={{ color: isMale ? '#93C5FD' : '#F9A8B8', fontWeight: 700 }}>
                        {isMale ? '♂' : '♀'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {applicant.experience && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#9A7A2A' }}>
                        구력 {applicant.experience}
                      </span>
                    )}
                    {applicant.mbti && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(201,99,122,0.08)', border: '1px solid rgba(201,99,122,0.22)', color: '#C9637A' }}>
                        {applicant.mbti}
                      </span>
                    )}
                    {applicant.height && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(212,132,154,0.08)', border: '1px solid rgba(212,132,154,0.22)', color: '#A05570' }}>
                        {applicant.height}cm
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 스크롤 콘텐츠 */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3" style={{ paddingBottom: app.status === 'pending' ? 180 : 24 }}>
              {errorMsg && (
                <div className="px-4 py-3 rounded-2xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#DC2626' }}>
                  {errorMsg}
                </div>
              )}
              {app.message && (
                <div className="px-4 py-3.5 rounded-2xl" style={{ background: 'rgba(201,99,122,0.05)', border: '1px solid rgba(201,99,122,0.14)' }}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#C9637A' }}>첫 인사</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#3a2228' }}>{app.message}</p>
                </div>
              )}
              {applicant.bio && (
                <div className="px-4 py-3.5 rounded-2xl" style={{ background: 'rgba(212,132,154,0.05)', border: '1px solid rgba(212,132,154,0.12)' }}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#A05570' }}>자기소개</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#4A3040' }}>{applicant.bio}</p>
                </div>
              )}
              {app.court && (
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
              )}
              {app.status !== 'pending' && (
                <div className="text-center py-3">
                  {app.status === 'accepted' ? (
                    <span className="font-semibold" style={{ color: '#B83050' }}>매칭 확정됨</span>
                  ) : (
                    <span className="font-semibold" style={{ color: '#9CA3AF' }}>거절됨</span>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 정보 탭 — fixed CTA */}
        {page === 2 && app.status === 'pending' && (
          <div
            style={{
              position: 'fixed',
              bottom: 'var(--bottom-nav-height)',
              left: 0,
              right: 0,
              zIndex: 10000,
              padding: '12px 20px 16px',
              background: 'rgba(255,248,246,0.98)',
              backdropFilter: 'blur(12px)',
              borderTop: '1px solid rgba(201,99,122,0.12)',
              boxShadow: '0 -4px 20px rgba(201,99,122,0.08)',
              display: 'flex',
              gap: '10px',
            }}
          >
            <button
              onClick={() => onReject(app)}
              disabled={processing}
              className="flex-1 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: 'rgba(201,99,122,0.08)',
                color: '#A05570',
                border: '1.5px solid rgba(201,99,122,0.2)',
                minHeight: '52px',
              }}
            >
              {processing ? '...' : '거절하기'}
            </button>
            <button
              onClick={() => onAccept(app)}
              disabled={processing}
              className="flex-1 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #C9637A 0%, #D4849A 100%)',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(201,99,122,0.3)',
                minHeight: '52px',
                border: 'none',
              }}
            >
              {processing ? '처리 중...' : '수락하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicantModal({ app, onClose, onAccept, onReject, processing, errorMsg }: ApplicantModalProps) {
  const applicant = app.applicant!;
  const [page, setPage] = useState<1 | 2>(1);

  const photos: string[] = applicant.tennis_photo_urls?.length
    ? applicant.tennis_photo_urls
    : applicant.tennis_photo_url
    ? [applicant.tennis_photo_url]
    : applicant.photo_urls?.length
    ? applicant.photo_urls
    : applicant.photo_url
    ? [applicant.photo_url]
    : [];
  const [photoIdx, setPhotoIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && page === 1) setPage(2);
      else if (diff < 0 && page === 2) setPage(1);
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md relative flex flex-col"
        style={{
          height: '96dvh',
          maxHeight: '96dvh',
          borderRadius: '28px 28px 0 0',
          background: page === 1 ? '#000' : '#0f1c14',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── 상단 탭 바 — 딥그린톤 ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4"
          style={{
            paddingTop: '14px',
            paddingBottom: '12px',
            background: 'rgba(13,31,20,0.97)',
            backdropFilter: 'blur(14px)',
            borderBottom: '1.5px solid rgba(108,191,108,0.15)',
            position: 'relative',
            zIndex: 30,
          }}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(108,191,108,0.12)', border: '1px solid rgba(108,191,108,0.25)' }}
          >
            <X className="w-4 h-4" style={{ color: '#6CBF6C' }} />
          </button>

          {/* 탭 버튼 — 중앙 */}
          <div className="flex gap-0 rounded-2xl p-1" style={{ background: 'rgba(26,92,53,0.25)', border: '1px solid rgba(108,191,108,0.2)' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setPage(1); }}
              className="rounded-xl transition-all duration-200"
              style={{
                padding: '7px 22px',
                fontSize: '13px',
                fontWeight: 700,
                color: page === 1 ? '#fff' : 'rgba(108,191,108,0.45)',
                background: page === 1 ? 'linear-gradient(135deg,#1A5C35,#2D7A4A)' : 'transparent',
                boxShadow: page === 1 ? '0 2px 12px rgba(26,92,53,0.5)' : 'none',
                letterSpacing: '0.03em',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              사진
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setPage(2); }}
              className="rounded-xl transition-all duration-200"
              style={{
                padding: '7px 22px',
                fontSize: '13px',
                fontWeight: 700,
                color: page === 2 ? '#6CBF6C' : 'rgba(108,191,108,0.45)',
                background: page === 2 ? 'rgba(26,92,53,0.5)' : 'transparent',
                boxShadow: page === 2 ? '0 2px 10px rgba(26,92,53,0.3)' : 'none',
                letterSpacing: '0.03em',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              플레이
            </button>
          </div>

          {/* 사진 카운트 */}
          <div className="w-8 flex items-center justify-end">
            {page === 1 && photos.length > 1 && (
              <span className="text-xs font-semibold" style={{ color: 'rgba(108,191,108,0.7)' }}>
                {photoIdx + 1}/{photos.length}
              </span>
            )}
          </div>
        </div>

        {/* ── 사진 탭 ── */}
        {page === 1 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 relative overflow-hidden">
              {photos.length === 0 ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center"
                  style={{ background: 'linear-gradient(180deg, #0A1F14 0%, #0d1a10 100%)' }}
                >
                  <div
                    className="w-28 h-28 rounded-full flex items-center justify-center font-bold"
                    style={{ fontSize: '3.5rem', background: 'rgba(26,92,53,0.3)', color: '#6CBF6C', border: '2px solid rgba(108,191,108,0.3)' }}
                  >
                    {applicant.name?.charAt(0) || '?'}
                  </div>
                  <p className="text-sm mt-4 font-light" style={{ color: 'rgba(108,191,108,0.5)' }}>사진이 없습니다</p>
                </div>
              ) : (
                <>
                  <img
                    key={photoIdx}
                    src={photos[photoIdx]}
                    alt={applicant.name}
                    className="w-full h-full"
                    style={{ objectFit: 'cover', objectPosition: 'center top' }}
                  />
                  {photos.length > 1 && (
                    <>
                      <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 z-10">
                        {photos.map((_, i) => (
                          <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
                            className="rounded-full transition-all duration-300"
                            style={{
                              width: i === photoIdx ? '20px' : '7px',
                              height: '7px',
                              background: i === photoIdx ? '#6CBF6C' : 'rgba(255,255,255,0.35)',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => (i - 1 + photos.length) % photos.length); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-10"
                        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
                      >
                        <ChevronLeft className="w-5 h-5 text-white" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => (i + 1) % photos.length); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-10"
                        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
                      >
                        <ChevronRight className="w-5 h-5 text-white" />
                      </button>
                    </>
                  )}
                </>
              )}
              <div
                className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-20 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)' }}
              >
                <div className="flex items-end gap-2.5 mb-2">
                  <span className="text-white font-semibold tracking-wide" style={{ fontSize: '1.85rem' }}>
                    {applicant.name}
                  </span>
                  {applicant.age && (
                    <span className="text-white/80 text-xl font-light mb-0.5">{applicant.age}세</span>
                  )}
                  {(applicant.gender === 'male' || applicant.gender === '남성' || applicant.gender === 'female' || applicant.gender === '여성') && (
                    <span className="text-xl font-bold mb-0.5" style={{ color: (applicant.gender === 'male' || applicant.gender === '남성') ? '#93C5FD' : '#FDA4AF' }}>
                      {(applicant.gender === 'male' || applicant.gender === '남성') ? '♂' : '♀'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {applicant.experience && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(201,168,76,0.25)', border: '1px solid rgba(201,168,76,0.5)', color: '#C9A84C' }}>
                      구력 {applicant.experience}
                    </span>
                  )}
                  {applicant.tennis_style && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(108,191,108,0.2)', border: '1px solid rgba(108,191,108,0.35)', color: '#6CBF6C' }}>
                      {applicant.tennis_style}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 안내 문구 */}
            <div
              className="flex-shrink-0 px-5 py-3 flex items-center justify-center"
              style={{ background: 'rgba(13,31,20,0.97)', borderTop: '1px solid rgba(108,191,108,0.1)' }}
            >
              <span style={{ fontSize: '11px', color: 'rgba(108,191,108,0.5)', fontWeight: 500, textAlign: 'center' }}>
                플레이 탭에서 구력 · 스타일을 확인하고 파트너로 맞는지 살펴보세요
              </span>
            </div>
          </div>
        )}

        {/* ── 정보 탭 ── */}
        {page === 2 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* 프로필 헤더 */}
            <div className="flex-shrink-0 px-5 pt-4 pb-4" style={{ borderBottom: '1px solid rgba(108,191,108,0.12)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
                  style={{ border: '2px solid rgba(108,191,108,0.3)' }}
                >
                  {photos.length > 0 ? (
                    <img
                      src={photos[0]}
                      alt={applicant.name}
                      className="w-full h-full"
                      style={{ objectFit: 'cover', objectPosition: 'center top' }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center font-bold"
                      style={{ background: 'rgba(26,92,53,0.3)', color: '#6CBF6C', fontSize: '1.4rem' }}
                    >
                      {applicant.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white" style={{ fontSize: '1.15rem' }}>{applicant.name}</span>
                    {applicant.age && (
                      <span className="font-medium text-white/60">{applicant.age}세</span>
                    )}
                    {(applicant.gender === 'male' || applicant.gender === '남성' || applicant.gender === 'female' || applicant.gender === '여성') && (
                      <span style={{ color: (applicant.gender === 'male' || applicant.gender === '남성') ? '#93C5FD' : '#FDA4AF', fontWeight: 700 }}>
                        {(applicant.gender === 'male' || applicant.gender === '남성') ? '♂' : '♀'}
                      </span>
                    )}
                  </div>
                  {app.court && (
                    <p className="text-xs mt-1" style={{ color: 'rgba(108,191,108,0.55)' }}>{app.court.court_name}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3" style={{ paddingBottom: app.status === 'pending' ? 180 : 24 }}>
              {errorMsg && (
                <div className="px-4 py-3 rounded-2xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }}>
                  {errorMsg}
                </div>
              )}
              {app.message && (
                <div className="px-4 py-3.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#C9A84C' }}>신청 메시지</p>
                  <p className="text-sm text-white/75 leading-relaxed">{app.message}</p>
                </div>
              )}
              {(applicant.experience || applicant.tennis_style) && (
                <div className="px-4 py-3.5 rounded-2xl" style={{ background: 'rgba(108,191,108,0.07)', border: '1px solid rgba(108,191,108,0.15)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#6CBF6C' }}>테니스 정보</p>
                  <div className="flex flex-col gap-1.5">
                    {applicant.experience && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 w-14 flex-shrink-0">구력</span>
                        <span className="text-sm text-white/85 font-medium">{applicant.experience}</span>
                      </div>
                    )}
                    {applicant.tennis_style && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 w-14 flex-shrink-0">스타일</span>
                        <span className="text-sm text-white/85 font-medium">{applicant.tennis_style}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {applicant.bio && (
                <div className="px-4 py-3.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>자기소개</p>
                  <p className="text-sm text-white/75 leading-relaxed">{applicant.bio}</p>
                </div>
              )}
              {app.court && (
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
              )}
              {app.status !== 'pending' && (
                <div className="text-center py-3">
                  {app.status === 'accepted' ? (
                    <span className="font-semibold" style={{ color: '#C9A84C' }}>매칭 확정됨</span>
                  ) : (
                    <span className="text-white/40 font-semibold">거절됨</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fixed CTA — 테니스 신청 수락/거절 (정보 탭에서만 노출) */}
      {app.status === 'pending' && page === 2 && (
        <div
          style={{
            position: 'fixed',
            bottom: 'var(--bottom-nav-height)',
            left: 0,
            right: 0,
            zIndex: 10000,
            padding: '12px 20px 16px',
            background: '#0f1c14',
            borderTop: '1px solid rgba(108,191,108,0.12)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
            display: 'flex',
            gap: '10px',
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
  );
}

export default function Applications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purposeTab, setPurposeTab] = useState<PurposeTab>('tennis');
  const [directionTab, setDirectionTab] = useState<DirectionTab>('received');
  const [receivedApps, setReceivedApps] = useState<Application[]>([]);
  const [sentApps, setSentApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [rejectionDetailApp, setRejectionDetailApp] = useState<Application | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: receivedRaw }, { data: sentRaw }] = await Promise.all([
        supabase
          .from('applications')
          .select(`*, court:court_id (*)`)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('applications')
          .select(`*, court:court_id (*)`)
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      const receivedList = receivedRaw || [];
      const sentList = sentRaw || [];

      const applicantIds = [...new Set(receivedList.map((a) => a.applicant_id).filter(Boolean))];
      const ownerIds = [...new Set(sentList.map((a) => a.owner_id).filter(Boolean))];
      const allProfileIds = [...new Set([...applicantIds, ...ownerIds])];

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
        owner: profileMap[a.owner_id] ?? null,
      }));

      setReceivedApps(received);
      setSentApps(sent);
    } catch (err) {
      console.error('신청 목록 가져오기 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchApplications();

    const channel = supabase
      .channel('applications_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchApplications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApplications]);

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

    // ── Step 1: 항상 새 채팅방 생성 ─────────────────────────
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        user1_id: hostId,
        user2_id: applicantId,
        purpose: app.purpose ?? 'tennis',
        court_id: courtId,
        is_group: false,
        confirmed_user_ids: [],
      })
      .select('id')
      .maybeSingle();

    if (chatError) {
      console.error('[1v1] chats INSERT 실패:', chatError);
      return { error: `채팅방 생성 실패: ${chatError.message}` };
    }
    if (!newChat) {
      return { error: '채팅방 생성 실패: 반환 데이터 없음 (RLS 확인 필요)' };
    }

    const chatId = newChat.id;

    // ── Step 3: 참여자 등록 (SECURITY DEFINER RPC — RLS 재귀 회피) ──
    const { error: rpcErr } = await supabase.rpc('accept_1v1_chat', {
      p_chat_id: chatId,
      p_host_id: hostId,
      p_applicant_id: applicantId,
    });

    if (rpcErr) {
      console.error('[1v1] 참여자 등록 실패:', rpcErr);
    }

    await supabase
      .from('chats')
      .update({ confirmed_user_ids: [] })
      .eq('id', chatId);

    await supabase
      .from('chat_participants')
      .update({ is_confirmed: false })
      .eq('chat_id', chatId);

    // ── Step 4: 코트 마감 처리 ──────────────────────────────
    await supabase.from('courts').update({ status: 'closed' }).eq('id', courtId);

    return { chatId, isNew: true };
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
        .update({ status: 'accepted' })
        .eq('id', app.id);

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

      setReceivedApps((prev) => prev.filter((a) => a.id !== app.id));
      setSelectedApp(null);

      setTimeout(() => navigate(`/chat/${targetChatId}`), 100);
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
    if (!rejectTarget || rejectSubmitting) return;
    setRejectSubmitting(true);

    try {
      const app = rejectTarget;
      const reason = rejectReason.trim();

      await supabase.from('applications').update({
        status: 'rejected',
        rejection_reason: reason || null,
      }).eq('id', app.id);

      setReceivedApps((prev) => prev.filter((a) => a.id !== app.id));
      setRejectTarget(null);
      setRejectReason('');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteSubmitting) return;
    setDeleteSubmitting(true);
    try {
      await supabase.from('applications').delete().eq('id', deleteTarget.id);
      const isOwner = deleteTarget.owner_id === user?.id;
      if (isOwner) {
        setReceivedApps((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      } else {
        setSentApps((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      }
      setDeleteTarget(null);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const filteredReceived = receivedApps.filter((a) => a.purpose === purposeTab && a.status === 'pending');
  const filteredSent = sentApps.filter((a) => a.purpose === purposeTab);
  const pendingReceivedCount = filteredReceived.length;

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
        : applicant?.photo_urls?.length
        ? applicant.photo_urls
        : applicant?.photo_url
        ? [applicant.photo_url]
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
                <span className="text-3xl font-bold text-gray-500">{applicant?.name?.charAt(0) || '?'}</span>
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

  const renderSentCard = (app: Application) => {
    const host = app.owner;
    const isTennisApp = app.purpose === 'tennis';
    const hostPhoto = isTennisApp
      ? host?.tennis_photo_url || host?.photo_url
      : host?.photo_url;
    const hasRejectionReason = app.status === 'rejected' && !!app.rejection_reason;

    return (
      <div
        key={app.id}
        className="overflow-hidden"
        style={{
          borderRadius: '18px',
          background: isDatingCard ? 'linear-gradient(160deg, #FFF9F6 0%, #FFF5F0 100%)' : '#fff',
          border: hasRejectionReason
            ? '1.5px solid rgba(239,68,68,0.3)'
            : isDatingCard ? '1px solid rgba(183,110,121,0.15)' : '1px solid #EBEBEB',
          boxShadow: hasRejectionReason
            ? '0 2px 14px rgba(239,68,68,0.1)'
            : isDatingCard ? '0 2px 12px rgba(183,110,121,0.08)' : '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
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
                <span className="text-3xl font-bold text-gray-500">{host?.name?.charAt(0) || 'U'}</span>
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
  const activeColor = isDating ? '#C9637A' : '#1B4332';
  const activeBg = isDating
    ? 'linear-gradient(180deg, #F43F5E 0%, #FECDD3 100%)'
    : 'linear-gradient(160deg, #0A1F14 0%, #1B4332 100%)';
  const pageBg = isDating
    ? 'linear-gradient(180deg, #FFF5F7 0%, #FFF0F3 100%)'
    : 'linear-gradient(180deg, #F0F7F2 0%, #EBF4EE 100%)';

  return (
    <div className="min-h-screen" style={{ background: pageBg, paddingBottom: 'var(--page-bottom-pad)' }}>
      <header className="sticky top-0 z-10" style={{ background: activeBg, boxShadow: '0 2px 20px rgba(0,0,0,0.25)' }}>
        <div className="px-5 pt-4 pb-3">
          <h1 className="text-xl font-bold text-white tracking-tight">신청 목록</h1>
        </div>

        <div className="px-4 pb-3 flex gap-2">
          {(['tennis', 'dating'] as PurposeTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setPurposeTab(tab)}
              className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200"
              style={purposeTab === tab
                ? { background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' }
                : { background: 'rgba(255,255,255,0.08)', color: isDating ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.5)', border: `1.5px solid ${isDating ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}` }
              }
            >
              {tab === 'tennis' ? '🎾 테니스 신청' : '🥂 설레는 만남'}
            </button>
          ))}
        </div>

        <div className="flex" style={{ borderTop: isDating ? '1px solid rgba(183,110,121,0.2)' : '1px solid rgba(201,168,76,0.2)' }}>
          <button
            onClick={() => setDirectionTab('received')}
            className="flex-1 py-3 text-sm font-semibold transition-all duration-200 relative flex items-center justify-center gap-1.5"
            style={{ color: directionTab === 'received' ? '#fff' : isDating ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.45)' }}
          >
            받은 신청
            {pendingReceivedCount > 0 && (
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                style={{ background: '#C9A84C', color: '#fff' }}
              >
                {pendingReceivedCount}
              </span>
            )}
            {directionTab === 'received' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full" style={{ width: '40%', background: '#C9A84C' }} />
            )}
          </button>
          <button
            onClick={() => setDirectionTab('sent')}
            className="flex-1 py-3 text-sm font-semibold transition-all duration-200 relative"
            style={{ color: directionTab === 'sent' ? '#fff' : isDating ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.45)' }}
          >
            보낸 신청
            {directionTab === 'sent' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full" style={{ width: '40%', background: '#C9A84C' }} />
            )}
          </button>
        </div>
      </header>

      <div className="px-4 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: isDating ? 'rgba(201,99,122,0.4)' : 'rgba(45,106,79,0.4)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: isDating ? 'rgba(201,99,122,0.6)' : 'rgba(45,106,79,0.6)' }}>불러오는 중...</p>
          </div>
        ) : directionTab === 'received' ? (
          filteredReceived.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: isDating ? 'rgba(201,99,122,0.08)' : 'rgba(27,67,50,0.08)', border: `1.5px solid ${isDating ? 'rgba(201,99,122,0.2)' : 'rgba(27,67,50,0.2)'}` }}
              >
                {isDating ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C9637A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                <p className="font-semibold text-sm mb-1" style={{ color: isDating ? '#C9637A' : '#2D6A4F' }}>
                  {isDating ? '받은 만남 신청이 없어요' : '받은 테니스 신청이 없어요'}
                </p>
                <p className="text-xs" style={{ color: isDating ? 'rgba(201,99,122,0.55)' : 'rgba(45,106,79,0.55)' }}>
                  {isDating ? '코트 등록 후 인연을 기다려보세요!' : '코트 등록 후 파트너를 기다려보세요!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReceived.map((app) => renderReceivedCard(app))}
            </div>
          )
        ) : filteredSent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: isDating ? 'rgba(201,99,122,0.08)' : 'rgba(27,67,50,0.08)', border: `1.5px solid ${isDating ? 'rgba(201,99,122,0.2)' : 'rgba(27,67,50,0.2)'}` }}
            >
              {isDating ? (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C9637A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
              <p className="font-semibold text-sm mb-1" style={{ color: isDating ? '#C9637A' : '#2D6A4F' }}>
                {isDating ? '보낸 만남 신청이 없어요' : '보낸 테니스 신청이 없어요'}
              </p>
              <p className="text-xs" style={{ color: isDating ? 'rgba(201,99,122,0.55)' : 'rgba(45,106,79,0.55)' }}>
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

      <BottomNav active="applications" />

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
        const borderActive = isDatingReject ? '#C9637A' : '#2D6A4F';
        const borderIdle = isDatingReject ? 'rgba(201,99,122,0.2)' : 'rgba(26,92,53,0.18)';
        const shadowActive = isDatingReject ? 'rgba(201,99,122,0.12)' : 'rgba(26,92,53,0.1)';
        const hintColor = isDatingReject ? 'rgba(139,58,80,0.38)' : 'rgba(27,67,50,0.38)';
        const cancelBg = isDatingReject ? 'rgba(201,99,122,0.06)' : 'rgba(26,92,53,0.06)';
        const cancelColor = isDatingReject ? '#9E5068' : '#2D6A4F';
        const cancelBorder = isDatingReject ? 'rgba(201,99,122,0.18)' : 'rgba(26,92,53,0.16)';
        const btnGradient = isDatingReject
          ? 'linear-gradient(135deg, #C9637A 0%, #D4849A 100%)'
          : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)';
        const btnShadow = isDatingReject ? 'rgba(201,99,122,0.35)' : 'rgba(26,92,53,0.3)';
        const footerBg = isDatingReject ? 'rgba(255,250,252,0.97)' : 'rgba(248,253,250,0.97)';
        const footerBorder = isDatingReject ? 'rgba(201,99,122,0.12)' : 'rgba(26,92,53,0.12)';

        return (
          <div
            className="fixed inset-0 z-[9999] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={() => { setRejectTarget(null); setRejectReason(''); }}
          >
            <div
              className="w-full max-w-md rounded-t-3xl px-5 pt-5 shadow-2xl flex flex-col"
              style={{
                background: sheetBg,
                paddingBottom: 'calc(var(--page-bottom-pad) + 8px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
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
                <p className="text-xs text-center mt-2.5" style={{ color: hintColor }}>
                  {isDatingReject ? '사유를 입력해야 거절을 보낼 수 있어요' : '한 줄이라도 남겨주시면 상대방에게 큰 도움이 돼요'}
                </p>
              )}
            </div>

            <div
              style={{
                position: 'fixed',
                bottom: 'var(--bottom-nav-height)',
                left: 0,
                right: 0,
                zIndex: 10001,
                padding: '12px 20px 14px',
                background: footerBg,
                backdropFilter: 'blur(12px)',
                borderTop: `1px solid ${footerBorder}`,
                display: 'flex',
                gap: '10px',
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
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 28px)',
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
                  paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
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
    </div>
  );
}
