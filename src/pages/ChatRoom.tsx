import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Message, Profile } from '../types';
import { ArrowLeft, Send, LogOut, X, ChevronLeft, ChevronRight, Users, MoreVertical } from 'lucide-react';

interface AfterProposalPayload {
  status: 'pending' | 'accepted' | 'declined';
}

interface PresencePayload {
  user_id: string;
  typing: boolean;
  online_at: string;
}

function TennisProfilePopup({
  profile,
  onClose,
  onBlock,
  onReport,
  isBlocked,
  onUnblock,
}: {
  profile: Profile;
  onClose: () => void;
  onBlock: () => void;
  onReport: () => void;
  isBlocked: boolean;ㅁ
  onUnblock: () => void;
}) {
  const photo = profile.tennis_photo_url || profile.photo_url || null;
  const [lightbox, setLightbox] = useState(false);

  const genderLabel = profile.gender === 'male' || profile.gender === '남성' ? '남성' : profile.gender === 'female' || profile.gender === '여성' ? '여성' : profile.gender ?? '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {lightbox && photo && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(56,189,248,0.25)', border: '1px solid rgba(56,189,248,0.4)' }}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={photo} alt={profile.name} className="max-w-full max-h-full object-contain" />
        </div>
      )}

      <div
        className="w-full max-w-md rounded-t-3xl overflow-hidden shadow-2xl"
        style={{ background: '#F4FAF6', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 relative"
          style={{
            background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
            paddingTop: 20,
            paddingBottom: 24,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90"
            style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }}
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-1 mb-1" style={{ opacity: 0.85 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="4" stroke="#fff" strokeWidth="1.2" />
              <path d="M2 5 Q5 2 8 5 Q5 8 2 5Z" stroke="#fff" strokeWidth="1" fill="none" />
            </svg>
            <span style={{ color: '#fff', fontSize: 10, letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase' }}>Tennis Member</span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', textShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                {profile.name}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                {profile.age && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.45)' }}
                  >
                    {profile.age}세
                  </span>
                )}
                {genderLabel && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.45)' }}
                  >
                    {genderLabel}
                  </span>
                )}
              </div>
            </div>

            <div
              className="rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer"
              style={{
                width: 72,
                height: 72,
                border: '2.5px solid rgba(255,255,255,0.6)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => { if (photo) { e.stopPropagation(); setLightbox(true); } }}
            >
              {photo ? (
                <img src={photo} alt={profile.name} className="w-full h-full object-cover" style={{ objectPosition: 'center top' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <span style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 700 }}>{profile.name?.charAt(0) ?? '?'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ background: '#F4FAF6' }}>
          {photo && (
            <div
              className="mx-5 mt-5 rounded-2xl overflow-hidden cursor-pointer"
              style={{ aspectRatio: '4/3', border: '2px solid rgba(56,189,248,0.15)', boxShadow: '0 4px 16px rgba(56,189,248,0.1)' }}
              onClick={() => setLightbox(true)}
            >
              <img src={photo} alt={profile.name} className="w-full h-full object-cover" style={{ objectPosition: 'center top' }} />
            </div>
          )}

          <div className="mx-5 mt-4 grid grid-cols-3 gap-3">
            {profile.experience && (
              <div
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl"
                style={{ background: '#fff', border: '1.5px solid rgba(45,106,79,0.2)', boxShadow: '0 2px 8px rgba(45,106,79,0.07)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8">
                  <ellipse cx="12" cy="12" rx="10" ry="10" />
                  <path d="M2 12 Q12 4 22 12" />
                  <path d="M2 12 Q12 20 22 12" />
                </svg>
                <span style={{ color: '#2D6A4F', fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>구력</span>
                <span style={{ color: '#1B4332', fontSize: 12, fontWeight: 800 }}>{profile.experience}</span>
              </div>
            )}
            {profile.tennis_style && (
              <div
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl"
                style={{ background: '#fff', border: '1.5px solid rgba(45,106,79,0.2)', boxShadow: '0 2px 8px rgba(45,106,79,0.07)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8">
                  <path d="M5.5 19L19 5.5" strokeLinecap="round" />
                  <path d="M4 7a3 3 0 006 0 3 3 0 00-6 0z" />
                  <path d="M14 17a3 3 0 006 0 3 3 0 00-6 0z" />
                  <circle cx="8" cy="20" r="1.5" fill="#2D6A4F" />
                </svg>
                <span style={{ color: '#2D6A4F', fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>스타일</span>
                <span style={{ color: '#1B4332', fontSize: 11, fontWeight: 800, textAlign: 'center', lineHeight: 1.3 }}>{profile.tennis_style}</span>
              </div>
            )}
            {profile.height && (
              <div
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl"
                style={{ background: '#fff', border: '1.5px solid rgba(45,106,79,0.2)', boxShadow: '0 2px 8px rgba(45,106,79,0.07)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8">
                  <path d="M12 3v18M8 6h8M8 12h8M8 18h8" strokeLinecap="round" />
                </svg>
                <span style={{ color: '#2D6A4F', fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>키</span>
                <span style={{ color: '#1B4332', fontSize: 12, fontWeight: 800 }}>{profile.height}cm</span>
              </div>
            )}
          </div>

          {profile.bio && (
            <div
              className="mx-5 mt-4 p-4 rounded-2xl"
              style={{ background: '#fff', border: '1.5px solid rgba(45,106,79,0.18)', boxShadow: '0 2px 8px rgba(45,106,79,0.06)' }}
            >
              <p style={{ color: '#2D6A4F', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                자기소개
              </p>
              <p style={{ color: '#1B4332', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' }}>
                "{profile.bio}"
              </p>
            </div>
          )}

          <div className="mx-5 mt-4 mb-5 flex gap-2.5">
            {isBlocked ? (
              <button
                onClick={() => { onClose(); onUnblock(); }}
                className="flex-1 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', color: '#fff' }}
              >
                차단 해제
              </button>
            ) : (
              <button
                onClick={() => { onClose(); onBlock(); }}
                className="flex-1 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1.5px solid rgba(239,68,68,0.2)' }}
              >
                차단하기
              </button>
            )}
            <button
              onClick={() => { onClose(); onReport(); }}
              className="flex-1 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
              style={{ background: 'rgba(249,115,22,0.08)', color: '#EA580C', border: '1.5px solid rgba(249,115,22,0.2)' }}
            >
              신고하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatingProfilePopup({
  profile,
  onClose,
  onBlock,
  onReport,
  isBlocked,
  onUnblock,
}: {
  profile: Profile;
  onClose: () => void;
  onBlock: () => void;
  onReport: () => void;
  isBlocked: boolean;
  onUnblock: () => void;
}) {
  const photos: string[] = [];
  if (profile.photo_url) photos.push(profile.photo_url);
  if (profile.photo_urls) {
    profile.photo_urls.forEach((u) => { if (u && !photos.includes(u)) photos.push(u); });
  }

  const [mainIdx, setMainIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const genderLabel = profile.gender === 'male' || profile.gender === '남성' ? '남성' : profile.gender === 'female' || profile.gender === '여성' ? '여성' : profile.gender ?? '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(30,10,18,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {fullscreen && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: '#0d0008' }}
          onClick={() => setFullscreen(false)}
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(183,110,121,0.3)', border: '1px solid rgba(183,110,121,0.5)' }}
          >
            <X className="w-5 h-5" style={{ color: '#FFB6C1' }} />
          </button>
          <img src={photos[mainIdx]} alt={profile.name} className="max-w-full max-h-full object-contain" />
        </div>
      )}

      <div
        className="w-full max-w-md rounded-t-3xl overflow-hidden shadow-2xl"
        style={{ background: '#FFF5F7', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 relative"
          style={{
            background: 'linear-gradient(135deg, #FDA4AF 0%, #FECDD3 100%)',
            paddingTop: 20,
            paddingBottom: 24,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90"
            style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.5)' }}
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-1 mb-1" style={{ opacity: 0.9 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1.5 L6.2 4 L9 4.3 L7 6.2 L7.5 9 L5 7.6 L2.5 9 L3 6.2 L1 4.3 L3.8 4 Z" fill="#fff" stroke="none" />
            </svg>
            <span style={{ color: '#fff', fontSize: 10, letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase' }}>Flirty Meeting</span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', textShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                {profile.name}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                {profile.age && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.5)' }}
                  >
                    {profile.age}세
                  </span>
                )}
                {genderLabel && (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.35)', color: '#fff', border: '1px solid rgba(255,255,255,0.5)' }}
                  >
                    {genderLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ background: '#FFF5F7' }}>
          <div
            className="relative mx-5 mt-5 rounded-2xl overflow-hidden cursor-pointer"
            style={{ aspectRatio: '4/3', border: '2px solid rgba(253,164,175,0.2)', boxShadow: '0 6px 24px rgba(253,164,175,0.15)' }}
            onClick={() => photos.length > 0 && setFullscreen(true)}
          >
            {photos.length > 0 ? (
              <img src={photos[mainIdx]} alt={profile.name} className="w-full h-full object-cover" style={{ objectPosition: 'center top' }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FDA4AF 0%, #FECDD3 100%)' }}>
                <span style={{ fontSize: '4rem', color: '#fff', fontWeight: 700 }}>{profile.name?.charAt(0) ?? '?'}</span>
              </div>
            )}

            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setMainIdx((i) => Math.max(0, i - 1)); }}
                  disabled={mainIdx === 0}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90"
                  style={{ background: 'rgba(253,164,175,0.7)', backdropFilter: 'blur(4px)' }}
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMainIdx((i) => Math.min(photos.length - 1, i + 1)); }}
                  disabled={mainIdx === photos.length - 1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90"
                  style={{ background: 'rgba(253,164,175,0.7)', backdropFilter: 'blur(4px)' }}
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </>
            )}

            {photos.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setMainIdx(i); }}
                    className="rounded-full transition-all"
                    style={{
                      width: i === mainIdx ? 20 : 6,
                      height: 6,
                      background: i === mainIdx ? '#FDA4AF' : 'rgba(255,255,255,0.7)',
                      boxShadow: i === mainIdx ? '0 0 6px rgba(253,164,175,0.7)' : 'none',
                    }}
                  />
                ))}
              </div>
            )}

            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(253,164,175,0.12) 0%, transparent 40%)' }}
            />
          </div>

          <div className="mx-5 mt-4 flex flex-col gap-2.5">
            {profile.experience && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: '#fff', border: '1.5px solid rgba(253,164,175,0.25)', boxShadow: '0 2px 8px rgba(253,164,175,0.08)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(253,164,175,0.15)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDA4AF" strokeWidth="2">
                    <ellipse cx="12" cy="12" rx="10" ry="10" />
                    <path d="M2 12 Q12 4 22 12" />
                    <path d="M2 12 Q12 20 22 12" />
                  </svg>
                </div>
                <div>
                  <p style={{ color: '#FDA4AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>테니스 구력</p>
                  <p style={{ color: '#9f1239', fontSize: 14, fontWeight: 700, marginTop: 1 }}>{profile.experience}</p>
                </div>
              </div>
            )}

            {profile.height && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: '#fff', border: '1.5px solid rgba(253,164,175,0.25)', boxShadow: '0 2px 8px rgba(253,164,175,0.08)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(253,164,175,0.15)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDA4AF" strokeWidth="2">
                    <path d="M12 3v18M8 6h8M8 12h8M8 18h8" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p style={{ color: '#FDA4AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>키</p>
                  <p style={{ color: '#9f1239', fontSize: 14, fontWeight: 700, marginTop: 1 }}>{profile.height}cm</p>
                </div>
              </div>
            )}

            {profile.mbti && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: '#fff', border: '1.5px solid rgba(253,164,175,0.25)', boxShadow: '0 2px 8px rgba(253,164,175,0.08)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(253,164,175,0.15)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDA4AF" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <div>
                  <p style={{ color: '#FDA4AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>MBTI</p>
                  <p style={{ color: '#9f1239', fontSize: 14, fontWeight: 700, marginTop: 1 }}>{profile.mbti}</p>
                </div>
              </div>
            )}
          </div>

          {profile.bio && (
            <div
              className="mx-5 mt-3 p-4 rounded-2xl"
              style={{ background: '#fff', border: '1.5px solid rgba(253,164,175,0.25)', boxShadow: '0 2px 8px rgba(253,164,175,0.06)' }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1.5 L6.2 4 L9 4.3 L7 6.2 L7.5 9 L5 7.6 L2.5 9 L3 6.2 L1 4.3 L3.8 4 Z" fill="#FDA4AF" />
                </svg>
                <p style={{ color: '#FDA4AF', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>자기소개</p>
              </div>
              <p style={{ color: '#9f1239', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' }}>
                "{profile.bio}"
              </p>
            </div>
          )}

          <div className="mx-5 mt-4 mb-5 flex gap-2.5">
            {isBlocked ? (
              <button
                onClick={() => { onClose(); onUnblock(); }}
                className="flex-1 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                style={{ background: '#FDA4AF', color: '#fff' }}
              >
                차단 해제
              </button>
            ) : (
              <button
                onClick={() => { onClose(); onBlock(); }}
                className="flex-1 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1.5px solid rgba(239,68,68,0.2)' }}
              >
                차단하기
              </button>
            )}
            <button
              onClick={() => { onClose(); onReport(); }}
              className="flex-1 py-3 rounded-2xl text-sm font-bold transition active:scale-95"
              style={{ background: 'rgba(249,115,22,0.08)', color: '#EA580C', border: '1.5px solid rgba(249,115,22,0.2)' }}
            >
              신고하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePopup({
  profile,
  onClose,
  isDating,
  onBlock,
  onReport,
  isBlocked,
  onUnblock,
}: {
  profile: Profile;
  onClose: () => void;
  isDating: boolean;
  onBlock: () => void;
  onReport: () => void;
  isBlocked: boolean;
  onUnblock: () => void;
}) {
  if (isDating) {
    return <DatingProfilePopup profile={profile} onClose={onClose} onBlock={onBlock} onReport={onReport} isBlocked={isBlocked} onUnblock={onUnblock} />;
  }
  return <TennisProfilePopup profile={profile} onClose={onClose} onBlock={onBlock} onReport={onReport} isBlocked={isBlocked} onUnblock={onUnblock} />;
}

export default function ChatRoom() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [chatPurpose, setChatPurpose] = useState<string | null>(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Array<{ user_id: string; name: string; photo_url: string | null; tennis_photo_url: string | null }>>([]);
  const [otherLastRead, setOtherLastRead] = useState<string | null>(null);
  const [participantLastReads, setParticipantLastReads] = useState<Record<string, string | null>>({});
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [matchConfirmed, setMatchConfirmed] = useState(false);
  const [hostBarDismissed, setHostBarDismissed] = useState(false);
  const [showDatingLeavePopup, setShowDatingLeavePopup] = useState(false);
  const [showLeaveRequestPopup, setShowLeaveRequestPopup] = useState(false);
  const [leaveRequestReason, setLeaveRequestReason] = useState('');
  const [leaveRequestSubmitting, setLeaveRequestSubmitting] = useState(false);
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [groupAvatars, setGroupAvatars] = useState<Array<{ user_id: string; name: string; photo_url?: string; tennis_photo_url?: string; is_confirmed?: boolean }>>([]);
  const [showParticipantMgmt, setShowParticipantMgmt] = useState(false);
  const [showConfirmPicker, setShowConfirmPicker] = useState(false);
  const [showCancelPicker, setShowCancelPicker] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [courtId, setCourtId] = useState<string | null>(null);
  const [courtName, setCourtName] = useState<string | null>(null);
  const [inAppToast, setInAppToast] = useState<{ name: string; content: string } | null>(null);
  const [simpleToast, setSimpleToast] = useState<string | null>(null);
  const [showBlockPopup, setShowBlockPopup] = useState(false);
  const [blockTargetUser, setBlockTargetUser] = useState<{ user_id: string; name: string } | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false);
  const [unblockTargetUser, setUnblockTargetUser] = useState<{ user_id: string; name: string } | null>(null);
  const [showGroupParticipants, setShowGroupParticipants] = useState(false);
  const [showConversationSheet, setShowConversationSheet] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [dotMenuTarget, setDotMenuTarget] = useState<{ user_id: string; name: string } | null>(null);
  const [showReportPopup, setShowReportPopup] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ user_id: string; name: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, Profile>>({});
  const [showKickConfirm, setShowKickConfirm] = useState(false);
  const [kickTargetUser, setKickTargetUser] = useState<{ user_id: string; name: string } | null>(null);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [showUnblockMessagePopup, setShowUnblockMessagePopup] = useState(false);
  const [unblockMessageTarget, setUnblockMessageTarget] = useState<{ user_id: string; name: string } | null>(null);
  const [confirmedParticipants, setConfirmedParticipants] = useState<Array<{ user_id: string; name: string; photo_url?: string; tennis_photo_url?: string }>>([]);
const pickerProcessingRef = useRef(false);

const closeAllPickers = () => {
  pickerProcessingRef.current = false;
  setShowConfirmPicker(false);
  setShowCancelPicker(false);
  setConfirmingId(null);
  setCancellingId(null);
};
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToastMsg = (msg: string) => {
    setSimpleToast(msg);
    setTimeout(() => setSimpleToast(null), 2500);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!user) return;
    const local: string[] = (() => { try { return JSON.parse(localStorage.getItem('blocked_users') ?? '[]'); } catch { return []; } })();
    supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id).then(({ data }) => {
      const db = (data ?? []).map((r) => r.blocked_id);
      setBlockedUserIds(Array.from(new Set([...local, ...db])));
    });
  }, [user]);

  const updateMyLastRead = useCallback(async () => {
    if (!chatId || !user) return;
    const now = new Date().toISOString();
    localStorage.setItem(`chat_last_read_${chatId}`, Date.now().toString());
    await supabase
      .from('chat_participants')
      .update({ last_read_at: now })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .eq('is_read', false)
      .neq('sender_id', user.id);
    supabase
      .channel(`broadcast_${chatId}`)
      .send({
        type: 'broadcast',
        event: 'read_update',
        payload: { user_id: user.id, last_read_at: now },
      })
      .catch(() => {});
  }, [chatId, user]);

  const refreshParticipantCount = useCallback(async () => {
    if (!chatId) return;
    const { data: parts, error } = await supabase
      .from('chat_participants')
      .select('user_id, is_confirmed, last_read_at')
      .eq('chat_id', chatId);
    if (error) {
      console.warn('[refreshParticipantCount] 에러:', error);
      return;
    }
    const partList = parts ?? [];
    setParticipantCount(partList.length);
    const newLastReads: Record<string, string | null> = {};
    partList.forEach((p) => { newLastReads[p.user_id] = (p as { user_id: string; last_read_at?: string | null }).last_read_at ?? null; });
    setParticipantLastReads(newLastReads);
    if (partList.length >= 1) {
      const ids = partList.map((p) => p.user_id);
      const confirmedMap: Record<string, boolean> = {};
      partList.forEach((p) => { confirmedMap[p.user_id] = p.is_confirmed ?? false; });
      const { data: groupProfs } = await supabase
        .from('profiles')
        .select('user_id, name, photo_url, tennis_photo_url')
        .in('user_id', ids);
      if (groupProfs) {
        setGroupAvatars(groupProfs.map((p) => ({
          user_id: p.user_id,
          name: p.name,
          photo_url: p.photo_url ?? undefined,
          tennis_photo_url: (p as { tennis_photo_url?: string | null }).tennis_photo_url ?? undefined,
          is_confirmed: confirmedMap[p.user_id] ?? false,
        })));
      }
    }
  }, [chatId]);

  const forceRefreshUntilPopulated = useCallback(async (attempt = 0) => {
    if (!chatId) return;
    const { data: parts } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId);
    const n = (parts ?? []).length;
    setParticipantCount(n);
    if (n === 0 && attempt < 6) {
      setTimeout(() => forceRefreshUntilPopulated(attempt + 1), 800);
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    localStorage.setItem(`chat_last_read_${chatId}`, Date.now().toString());
  }, [chatId]);

  useEffect(() => {
    if (!user || !chatId) return;
    (async () => {
      const [participantsRes, chatRes] = await Promise.all([
        supabase.from('chat_participants').select('user_id, is_confirmed, last_read_at, joined_at').eq('chat_id', chatId),
        supabase.from('chats').select('id, user1_id, user2_id, purpose, court_id, is_group, confirmed_user_ids').eq('id', chatId).maybeSingle(),
      ]);

      const participants = participantsRes.data ?? [];
      const chat = chatRes.data;
      const pCount = participants.length;
      const confirmedMap: Record<string, boolean> = {};
      participants.forEach((p) => { confirmedMap[p.user_id] = (p as { user_id: string; is_confirmed?: boolean }).is_confirmed ?? false; });
      const initLastReads: Record<string, string | null> = {};
      participants.forEach((p) => { initLastReads[p.user_id] = (p as { user_id: string; last_read_at?: string | null }).last_read_at ?? null; });
      setParticipantLastReads(initLastReads);

      if (chat?.purpose) setChatPurpose(chat.purpose);
      if (chat?.user1_id === user.id) setIsHost(true);
      if (chat?.court_id) {
        setCourtId(chat.court_id);
        supabase.from('courts').select('court_name').eq('id', chat.court_id).maybeSingle().then(({ data }) => {
          if (data?.court_name) setCourtName(data.court_name);
        });
      }
      const isGroup = !!chat?.is_group;
      if (isGroup) setIsGroupChat(true);

      setParticipantCount(pCount);

      if (pCount === 0) {
        forceRefreshUntilPopulated(0);
      }

      if (isGroup && participants.length >= 1) {
        const allIds = participants.map((p) => p.user_id);
        const { data: groupProfs } = await supabase
          .from('profiles')
          .select('user_id, name, photo_url, tennis_photo_url')
          .in('user_id', allIds);
        if (groupProfs) {
          setGroupAvatars(groupProfs.map((p) => ({
            user_id: p.user_id,
            name: p.name,
            photo_url: p.photo_url ?? undefined,
            tennis_photo_url: (p as { tennis_photo_url?: string | null }).tennis_photo_url ?? undefined,
            is_confirmed: confirmedMap[p.user_id] ?? false,
          })));
        }
      }

      const rawConfirmedIds: string[] = (chat as { confirmed_user_ids?: string[] | null } | null)?.confirmed_user_ids ?? [];
      const chatConfirmedIds = isGroup
        ? rawConfirmedIds
        : rawConfirmedIds.filter((id) => id !== user.id);
      if (chatConfirmedIds.length > 0) {
        const { data: confirmedProfs } = await supabase
          .from('profiles')
          .select('user_id, name, photo_url, tennis_photo_url')
          .in('user_id', chatConfirmedIds);
        if (confirmedProfs) {
          setConfirmedParticipants(confirmedProfs.map((p) => ({
            user_id: p.user_id,
            name: p.name,
            photo_url: (p as { photo_url?: string | null }).photo_url ?? undefined,
            tennis_photo_url: (p as { tennis_photo_url?: string | null }).tennis_photo_url ?? undefined,
          })));
        }
      } else {
        setConfirmedParticipants([]);
      }

      let opponentId: string | null = null;
      const oppFromParticipants = participants.find((p) => p.user_id !== user.id);
      if (oppFromParticipants) {
        opponentId = oppFromParticipants.user_id;
      } else if (chat) {
        opponentId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;
      }

      if (!opponentId && !isGroup) {
        const retryFetch = async (attempt = 0) => {
          const { data: retryParts } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chatId!);
          const opp = (retryParts ?? []).find((p) => p.user_id !== user.id);
          if (opp) {
            const { data: profData } = await supabase
              .from('profiles')
              .select('id, user_id, name, age, gender, photo_url, photo_urls, tennis_photo_url, experience, purpose, profile_completed, created_at, tennis_style, bio, mbti, height')
              .eq('user_id', opp.user_id)
              .maybeSingle();
            if (profData) setOtherUser(profData as Profile);
          } else if (attempt < 6) {
            setTimeout(() => retryFetch(attempt + 1), 800);
          }
        };
        retryFetch();
        return;
      }

      if (!opponentId) return;

      const [profRes, oppPartRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, user_id, name, age, gender, photo_url, photo_urls, tennis_photo_url, experience, purpose, profile_completed, created_at, tennis_style, bio, mbti, height')
          .eq('user_id', opponentId)
          .maybeSingle(),
        supabase
          .from('chat_participants')
          .select('last_read_at')
          .eq('chat_id', chatId)
          .eq('user_id', opponentId)
          .maybeSingle(),
      ]);

      if (profRes.data) setOtherUser(profRes.data as Profile);
      if (oppPartRes.data?.last_read_at) setOtherLastRead(oppPartRes.data.last_read_at);
    })();
  }, [user, chatId, forceRefreshUntilPopulated]);

  useEffect(() => {
    if (!chatId || !user) return;
    setLoading(true);
    const load = async (attempt = 0) => {
      const { data: myPartData } = await supabase
        .from('chat_participants')
        .select('joined_at')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .maybeSingle();
      const joinedAt = (myPartData as { joined_at?: string | null } | null)?.joined_at ?? null;

      let query = supabase
        .from('messages')
        .select('id, chat_id, sender_id, content, is_read, type, created_at, payload')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (joinedAt) query = query.gte('created_at', joinedAt);

      const { data, error } = await query;

      if (error) {
        console.error('[ChatRoom] messages load error:', error);
        if (attempt < 4) setTimeout(() => load(attempt + 1), 500 * (attempt + 1));
        else setLoading(false);
        return;
      }
      const msgs = (data ?? []) as Message[];
      setMessages(msgs);
      if (msgs.some((m) => m.type === 'system' && (
        m.content.includes('매칭이 확정됐어요') ||
        m.content.includes('매칭 확정됐어요') ||
        m.content.includes('라인업이 확정됐어요') ||
        m.content.includes('매칭 성공') ||
        m.content.includes('라인업 확정')
      ))) {
        setMatchConfirmed(true);
      }
      const senderIds = Array.from(new Set(msgs.map((m) => m.sender_id).filter((id): id is string => !!id)));
      if (senderIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, user_id, name, age, gender, photo_url, photo_urls, tennis_photo_url, experience, purpose, profile_completed, created_at, tennis_style, bio, mbti, height')
          .in('user_id', senderIds);
        if (profs) {
          const map: Record<string, Profile> = {};
          for (const p of profs) map[p.user_id] = p as Profile;
          setSenderProfiles(map);
        }
      }
      setLoading(false);
    };
    load();
  }, [chatId, user]);

  useEffect(() => { updateMyLastRead(); }, [updateMyLastRead, messages.length]);
  useEffect(() => { if (!loading && messages.length > 0) scrollToBottom('instant'); }, [loading]);
  useEffect(() => { if (messages.length > 0) scrollToBottom('smooth'); }, [messages.length]);

  useEffect(() => {
    if (!chatId || !user) return;

    const msgChannel = supabase
      .channel(`room_messages_${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id !== user.id && !msg.is_read) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', msg.id)
              .then(() => {});
            supabase
              .from('chat_participants')
              .update({ last_read_at: new Date().toISOString() })
              .eq('chat_id', chatId)
              .eq('user_id', user.id)
              .then(() => {});
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const matchingTemp = prev.find(
              (m) => m.id.startsWith('temp_') && m.sender_id === msg.sender_id && m.content === msg.content
            );
            if (matchingTemp) {
              return prev.map((m) => (m.id === matchingTemp.id ? msg : m));
            }
            if (msg.sender_id !== user.id && msg.type !== 'system') {
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
              const showToastWithProfile = (prof: Profile | null) => {
                const name = prof?.name ?? '';
                setInAppToast({ name, content: msg.content });
                toastTimeoutRef.current = setTimeout(() => setInAppToast(null), 3200);
              };
              setSenderProfiles((prev) => {
                if (msg.sender_id) {
                  const existing = prev[msg.sender_id];
                  if (existing) {
                    showToastWithProfile(existing);
                    return prev;
                  }
                  supabase
                    .from('profiles')
                    .select('id, user_id, name, age, gender, photo_url, photo_urls, tennis_photo_url, experience, purpose, profile_completed, created_at, tennis_style, bio, mbti, height')
                    .eq('user_id', msg.sender_id)
                    .maybeSingle()
                    .then(({ data }) => {
                      if (data) {
                        setSenderProfiles((p) => ({ ...p, [data.user_id]: data as Profile }));
                        showToastWithProfile(data as Profile);
                      }
                    });
                }
                return prev;
              });
            }
            return [...prev, msg];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...updated, _failed: false } : m)));
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn('[ChatRoom] msgChannel 재연결 시도:', status);
          supabase.removeChannel(msgChannel);
        }
      });

    const partChannel = supabase
      .channel(`room_participants_${chatId}_v3`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_participants', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const updated = payload.new as { user_id: string; last_read_at: string };
          if (updated.user_id !== user.id && updated.last_read_at) {
            setOtherLastRead(updated.last_read_at);
            setParticipantLastReads((prev) => ({ ...prev, [updated.user_id]: updated.last_read_at }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_participants', filter: `chat_id=eq.${chatId}` },
        () => refreshParticipantCount()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_participants', filter: `chat_id=eq.${chatId}` },
        () => refreshParticipantCount()
      )
      .subscribe();

    const broadcastChannel = supabase
      .channel(`broadcast_${chatId}`)
      .on('broadcast', { event: 'read_update' }, (payload) => {
        const { user_id, last_read_at } = payload.payload as { user_id: string; last_read_at: string };
        if (user_id !== user.id) {
          setOtherLastRead(last_read_at);
          setParticipantLastReads((prev) => ({ ...prev, [user_id]: last_read_at }));
        }
      })
      .on('broadcast', { event: 'kick_user' }, (payload) => {
        const { kicked_user_id } = payload.payload as { kicked_user_id: string };
        if (kicked_user_id === user.id) {
          navigate('/chats', { replace: true });
        } else {
          setGroupAvatars((prev) => prev.filter((av) => av.user_id !== kicked_user_id));
          setParticipantCount((prev) => prev !== null ? Math.max(0, prev - 1) : null);
          setParticipantLastReads((prev) => {
            const next = { ...prev };
            delete next[kicked_user_id];
            return next;
          });
        }
      })
      .subscribe();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        supabase
          .from('chat_participants')
          .select('user_id, last_read_at')
          .eq('chat_id', chatId)
          .then(({ data }) => {
            if (data) {
              const reads: Record<string, string | null> = {};
              data.forEach((p: { user_id: string; last_read_at?: string | null }) => {
                reads[p.user_id] = p.last_read_at ?? null;
              });
              setParticipantLastReads((prev) => ({ ...prev, ...reads }));
              const other = data.find((p: { user_id: string; last_read_at?: string | null }) => p.user_id !== user.id);
              if (other?.last_read_at) setOtherLastRead(other.last_read_at);
            }
          });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const presenceChannel = supabase.channel(`presence_${chatId}`, { config: { presence: { key: user.id } } });
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresencePayload>();
        const typingList = Object.entries(state)
          .filter(([key]) => key !== user.id)
          .flatMap(([, list]) => list)
          .filter((p) => p.typing === true);
        if (typingList.length === 0) {
          setTypingUsers([]);
          return;
        }
        const typingIds = typingList.map((p) => p.user_id);
        setTypingUsers((prev) => {
          const alreadyTracked = prev.map((u) => u.user_id);
          const missing = typingIds.filter((id) => !alreadyTracked.includes(id));
          if (missing.length === 0) {
            return prev.filter((u) => typingIds.includes(u.user_id));
          }
          Promise.all(
            missing.map((id) =>
              supabase.from('profiles').select('user_id, name, photo_url, tennis_photo_url').eq('user_id', id).maybeSingle()
            )
          ).then((results) => {
            setTypingUsers((current) => {
              const filtered = current.filter((u) => typingIds.includes(u.user_id));
              const newUsers = results
                .map((r) => r.data)
                .filter((d): d is NonNullable<typeof d> => !!d)
                .map((d) => ({ user_id: d.user_id, name: d.name ?? '알 수 없음', photo_url: d.photo_url ?? null, tennis_photo_url: (d as { tennis_photo_url?: string | null }).tennis_photo_url ?? null }));
              const merged = [...filtered];
              for (const nu of newUsers) {
                if (!merged.find((u) => u.user_id === nu.user_id)) merged.push(nu);
              }
              return merged;
            });
          });
          return prev.filter((u) => typingIds.includes(u.user_id));
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: user.id, typing: false, online_at: new Date().toISOString() });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(partChannel);
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [chatId, user, refreshParticipantCount, navigate]);

  const broadcastTyping = async (typing: boolean) => {
    if (!presenceChannelRef.current || !user) return;
    await presenceChannelRef.current.track({ user_id: user.id, typing, online_at: new Date().toISOString() });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 1500);
  };

  const sendMessage = async (content: string, type: string = 'user', extraPayload?: Record<string, unknown>) => {
    const trimmed = content.trim();
    if (!trimmed || !user || !chatId) return false;

    broadcastTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: user.id,
      content: trimmed,
      is_read: false,
      type,
      created_at: new Date().toISOString(),
      payload: extraPayload ?? null,
    } as Message;

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage('');

    const row: Record<string, unknown> = { chat_id: chatId, sender_id: user.id, content: trimmed, is_read: false, type };
    if (extraPayload) row.payload = extraPayload;

    const { data: inserted, error } = await supabase.from('messages').insert(row).select().maybeSingle();
    if (error) {
      console.error('메시지 전송 실패:', error.message);
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, _failed: true } : m));
      return false;
    }
    if (inserted) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (inserted as Message) : m)));
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage(newMessage);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const sendAfterProposal = () => {
    sendMessage('테니스 끝나고 근처에서 한잔 어때요? ☕', 'after_proposal', { status: 'pending' });
  };

  const handleAfterResponse = async (messageId: string, accept: boolean) => {
    await supabase.from('messages').update({ payload: { status: accept ? 'accepted' : 'declined' } }).eq('id', messageId);
    if (!accept) return;

    if (!user || !otherUser) return;
    const purpose = chatPurpose ?? 'tennis';
    const welcomeMsg = purpose === 'dating'
      ? '💌 설레는 만남 시작! 식사도 같이해요 🍽️'
      : '🎾 매칭됐어요! 코트에서 만나요!';

    const otherId = otherUser.user_id || otherUser.id;
    const { data: newChat, error: chatErr } = await supabase
      .from('chats')
      .insert({
        user1_id: user.id,
        user2_id: otherId,
        purpose,
        is_group: false,
      })
      .select('id')
      .maybeSingle();

    if (chatErr || !newChat) return;

    await supabase.rpc('accept_1v1_chat', {
      p_chat_id: newChat.id,
      p_host_id: user.id,
      p_applicant_id: otherId,
    });

    await supabase.from('messages').insert({
      chat_id: newChat.id,
      sender_id: user.id,
      content: welcomeMsg,
      is_read: false,
      type: 'system',
    });

    navigate(`/chat/${newChat.id}`, { replace: true });
  };

  const handleLeaveChat = () => {
    if (isGroupChat && !isHost) {
      setLeaveRequestReason('');
      setShowLeaveRequestPopup(true);
    } else {
      setShowDatingLeavePopup(true);
    }
  };

  const handleLeaveRequestSubmit = async () => {
    if (!chatId || !user || leaveRequestSubmitting) return;
    setLeaveRequestSubmitting(true);
    try {
      const { data: myProf } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle();
      const leaverName = myProf?.name ?? '누군가';
      const content = chatPurpose === 'dating'
        ? `💌 ${leaverName}님이 나가기를 요청했습니다`
        : `🎾 ${leaverName}님이 나가기를 요청했습니다`;
      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        content,
        is_read: false,
        type: 'leave_request',
        payload: { reason: leaveRequestReason.trim(), requester_id: user.id, status: 'pending' },
      });
    } catch (e) { console.error(e); }
    setLeaveRequestSubmitting(false);
    setShowLeaveRequestPopup(false);
  };

  const getOtherParticipantIds = (): string[] => {
    if (groupAvatars.length > 0) {
      return groupAvatars.filter((av) => av.user_id !== user?.id).map((av) => av.user_id);
    }
    if (otherUser) {
      const id = otherUser.user_id || otherUser.id;
      return id ? [id] : [];
    }
    return [];
  };

  const doLeaveAndCleanup = async () => {
    if (!chatId || !user) return;

    const { data: myProf } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', user.id)
      .maybeSingle();
    const leaverName = myProf?.name ?? '누군가';
    const leaveMsg = chatPurpose === 'dating'
      ? `💌 ${leaverName}님이 자리를 떠났습니다`
      : `🎾 ${leaverName}님이 코트를 떠났습니다`;

    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId)
      .eq('type', 'system')
      .eq('content', leaveMsg)
      .maybeSingle();

    if (!existing) {
      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        content: leaveMsg,
        is_read: false,
        type: 'system',
      });
    }

    await supabase.from('chat_participants').delete().eq('chat_id', chatId).eq('user_id', user.id);

    navigate('/chats', { replace: true });
  };

  const handleLeaveWithBlock = async () => {
    if (!chatId || !user) return;
    const targetIds = getOtherParticipantIds();
    if (targetIds.length > 0) {
      const upserts = targetIds.map((blocked_id) => ({ blocker_id: user.id, blocked_id }));
      await supabase.from('blocks').upsert(upserts, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true });
      const blockedRaw = localStorage.getItem('blocked_users');
      const blocked: string[] = blockedRaw ? JSON.parse(blockedRaw) : [];
      const updated = [...new Set([...blocked, ...targetIds])];
      localStorage.setItem('blocked_users', JSON.stringify(updated));
    }
    setShowDatingLeavePopup(false);
    await doLeaveAndCleanup();
  };

  const handleLeaveWithoutBlock = async () => {
    setShowDatingLeavePopup(false);
    await doLeaveAndCleanup();
  };

  const handleBlockUser = (targetUserId: string, targetName: string) => {
    setBlockTargetUser({ user_id: targetUserId, name: targetName });
    setShowBlockConfirm(true);
  };

  const openDotMenu = (targetUserId: string, targetName: string) => {
    setDotMenuTarget({ user_id: targetUserId, name: targetName });
    setShowDotMenu(true);
  };

  const handleReportUser = (targetUserId: string, targetName: string) => {
    setReportTarget({ user_id: targetUserId, name: targetName });
    setReportReason('');
    setShowDotMenu(false);
    setShowGroupParticipants(false);
    setShowReportPopup(true);
  };

  const handleReportSubmit = async () => {
    if (!reportTarget || !user || !reportReason.trim()) return;
    setReportSubmitting(true);
    try {
      await supabase.from('reports').insert({ reporter_id: user.id, reported_id: reportTarget.user_id, reason: reportReason.trim() });
    } catch (e) { console.error(e); }
    setReportSubmitting(false);
    setShowReportPopup(false);
    setReportTarget(null);
    setReportReason('');
  };

  const handleBlockConfirm = async () => {
    if (!blockTargetUser || !user) return;
    const targetId = blockTargetUser.user_id;
    try {
      await supabase.from('blocks').upsert({ blocker_id: user.id, blocked_id: targetId }, { onConflict: 'blocker_id,blocked_id' });
      const raw = localStorage.getItem('blocked_users');
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(targetId)) { arr.push(targetId); localStorage.setItem('blocked_users', JSON.stringify(arr)); }
      setBlockedUserIds((prev) => Array.from(new Set([...prev, targetId])));
    } catch (e) { console.error(e); }
    setShowBlockConfirm(false);
    setShowBlockPopup(false);
    setShowGroupParticipants(false);
    setBlockTargetUser(null);
  };

  const handleKickUser = (targetUserId: string, targetName: string) => {
    setKickTargetUser({ user_id: targetUserId, name: targetName });
    setShowKickConfirm(true);
  };

  const handleKickConfirm = async () => {
    if (!kickTargetUser || !user || !chatId) return;
    const targetId = kickTargetUser.user_id;
    const targetName = kickTargetUser.name;
    setKickingId(targetId);
    try {
      const kickMsg = chatPurpose === 'dating'
        ? `${targetName}님이 자리를 떠났습니다 💌`
        : `${targetName}님이 퇴장되었습니다 🎾`;

      if (courtId) {
        const { data: gcData } = await supabase
          .from('court_group_chats')
          .select('id')
          .eq('court_id', courtId)
          .maybeSingle();
        if (gcData?.id) {
          await supabase
            .from('court_group_chat_participants')
            .delete()
            .eq('group_chat_id', gcData.id)
            .eq('user_id', targetId);
        }
      }

      const { error: delError } = await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', targetId);

      if (!delError) {
        await supabase.from('messages').insert({
          chat_id: chatId,
          sender_id: user.id,
          content: kickMsg,
          is_read: false,
          type: 'system',
        });

        await supabase
          .channel(`broadcast_${chatId}`)
          .send({
            type: 'broadcast',
            event: 'kick_user',
            payload: { kicked_user_id: targetId },
          });

        supabase
          .channel(`global_kick_${targetId}`)
          .send({
            type: 'broadcast',
            event: 'kick_user',
            payload: { kicked_user_id: targetId },
          })
          .catch(() => {});

        setGroupAvatars((prev) => prev.filter((av) => av.user_id !== targetId));
        setParticipantCount((prev) => prev !== null ? Math.max(0, prev - 1) : null);
        setParticipantLastReads((prev) => {
          const next = { ...prev };
          delete next[targetId];
          return next;
        });
      }
    } catch (e) { console.error(e); }
    setKickingId(null);
    setShowKickConfirm(false);
    setKickTargetUser(null);
    setShowGroupParticipants(false);
    setShowParticipantMgmt(false);
  };

  const handleUnblockUser = (targetUserId: string, targetName: string) => {
    setUnblockTargetUser({ user_id: targetUserId, name: targetName });
    setShowUnblockConfirm(true);
  };

  const handleUnblockConfirm = async () => {
    if (!unblockTargetUser || !user) return;
    const targetId = unblockTargetUser.user_id;
    try {
      await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', targetId);
      const raw = localStorage.getItem('blocked_users');
      const arr: string[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem('blocked_users', JSON.stringify(arr.filter((id) => id !== targetId)));
      setBlockedUserIds((prev) => prev.filter((id) => id !== targetId));
    } catch (e) { console.error(e); }
    setShowUnblockConfirm(false);
    setUnblockTargetUser(null);
  };


 const handleMatchConfirm = () => {
  closeAllPickers();
  requestAnimationFrame(() => {
    pickerProcessingRef.current = false;
    setShowConfirmPicker(true);
  });
};

  const handleMatchConfirmDirect = async () => {
    if (otherUser && blockedUserIds.includes(otherUser.user_id || otherUser.id)) {
      showToastMsg('차단된 유저는 매칭 확정이 불가합니다.');
      return;
    }
    if (courtId && otherUser) {
      const [courtRes] = await Promise.all([
        supabase
          .from('courts')
          .select('male_slots, female_slots, confirmed_male_slots, confirmed_female_slots, status, current_participants, capacity')
          .eq('id', courtId)
          .maybeSingle(),
      ]);
      const courtData = courtRes.data as { male_slots?: number; female_slots?: number; confirmed_male_slots?: number; confirmed_female_slots?: number; status?: string; current_participants?: number; capacity?: number } | null;
      if (courtData) {
        const isMale = otherUser.gender === 'male' || otherUser.gender === '남성';
        const newConfirmedMale = isMale ? (courtData.confirmed_male_slots ?? 0) + 1 : (courtData.confirmed_male_slots ?? 0);
        const newConfirmedFemale = !isMale ? (courtData.confirmed_female_slots ?? 0) + 1 : (courtData.confirmed_female_slots ?? 0);
        const totalSlots = (courtData.male_slots ?? 0) + (courtData.female_slots ?? 0);
        const newTotalConfirmed = newConfirmedMale + newConfirmedFemale;
        const newCurrentParticipants = (courtData.current_participants ?? 0) + 1;
        const capacityVal = courtData.capacity ?? 0;
        const shouldClose = (totalSlots > 0 && newTotalConfirmed >= totalSlots) || (capacityVal > 0 && newCurrentParticipants >= capacityVal);
        await supabase.from('courts').update({
          confirmed_male_slots: newConfirmedMale,
          confirmed_female_slots: newConfirmedFemale,
          current_participants: newCurrentParticipants,
          ...(shouldClose ? { status: 'closed' } : {}),
        } as never).eq('id', courtId);
      }
    }
    if (otherUser) {
      const newConfirmedIds = [otherUser.user_id];
      await supabase.from('chats').update({ confirmed_user_ids: newConfirmedIds }).eq('id', chatId!);
      await supabase.from('chat_participants').update({ is_confirmed: true }).eq('chat_id', chatId!).eq('user_id', otherUser.user_id || otherUser.id);
      const { data: confirmedProfs } = await supabase
        .from('profiles')
        .select('user_id, name, photo_url, tennis_photo_url')
        .in('user_id', newConfirmedIds);
      if (confirmedProfs) {
        setConfirmedParticipants(confirmedProfs.map((p) => ({
          user_id: p.user_id,
          name: p.name,
          photo_url: (p as { photo_url?: string | null }).photo_url ?? undefined,
          tennis_photo_url: (p as { tennis_photo_url?: string | null }).tennis_photo_url ?? undefined,
        })));
      }
    }
    const msg =
      chatPurpose === 'dating'
        ? '💕 매칭 확정! 설레는 만남 기대해요 🥂'
        : '🎾 라인업 확정!';
    const ok = await sendMessage(msg, 'system');
    if (ok) setMatchConfirmed(true);
  };

 const handleMatchCancel = () => {
  closeAllPickers();
  requestAnimationFrame(() => {
    pickerProcessingRef.current = false;
    setShowCancelPicker(true);
  });
};

  const handleMatchCancelDirect = async () => {
    if (courtId && otherUser) {
      const courtRes = await supabase
        .from('courts')
        .select('male_slots, female_slots, confirmed_male_slots, confirmed_female_slots, status, current_participants')
        .eq('id', courtId)
        .maybeSingle();
      const courtData = courtRes.data as { male_slots?: number; female_slots?: number; confirmed_male_slots?: number; confirmed_female_slots?: number; status?: string; current_participants?: number } | null;
      if (courtData) {
        const isMale = otherUser.gender === 'male' || otherUser.gender === '남성';
        const newConfirmedMale = isMale ? Math.max(0, (courtData.confirmed_male_slots ?? 0) - 1) : (courtData.confirmed_male_slots ?? 0);
        const newConfirmedFemale = !isMale ? Math.max(0, (courtData.confirmed_female_slots ?? 0) - 1) : (courtData.confirmed_female_slots ?? 0);
        const newCurrentParticipants = Math.max(0, (courtData.current_participants ?? 0) - 1);
        const wasClosedNowOpen = courtData.status === 'closed';
        await supabase.from('courts').update({
          confirmed_male_slots: newConfirmedMale,
          confirmed_female_slots: newConfirmedFemale,
          current_participants: newCurrentParticipants,
          ...(wasClosedNowOpen ? { status: 'open' } : {}),
        } as never).eq('id', courtId);
      }
    }
    await supabase.from('chats').update({ confirmed_user_ids: [] }).eq('id', chatId!);
    if (otherUser) {
      const otherUserId = otherUser.user_id || otherUser.id;
      await supabase.from('chat_participants').update({ is_confirmed: false }).eq('chat_id', chatId!).eq('user_id', otherUserId);
      if (courtId) {
        await supabase
          .from('applications')
          .update({ status: 'pending' })
          .eq('court_id', courtId)
          .eq('applicant_id', otherUserId)
          .eq('status', 'accepted');
      }
    }
    setConfirmedParticipants([]);
    setMatchConfirmed(false);
  };

  const handleParticipantCancel = async (participantId: string, participantName: string) => {
    setCancellingId(participantId);
    try {
      if (courtId) {
        const [courtRes, participantProfRes] = await Promise.all([
          supabase
            .from('courts')
            .select('male_slots, female_slots, confirmed_male_slots, confirmed_female_slots, status, current_participants')
            .eq('id', courtId)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('gender')
            .eq('user_id', participantId)
            .maybeSingle(),
        ]);

        const courtData = courtRes.data as { male_slots?: number; female_slots?: number; confirmed_male_slots?: number; confirmed_female_slots?: number; status?: string; current_participants?: number } | null;
        const gender = participantProfRes.data?.gender;

        if (courtData) {
          const isMale = gender === 'male' || gender === '남성';
          const newConfirmedMale = isMale
            ? Math.max(0, (courtData.confirmed_male_slots ?? 0) - 1)
            : (courtData.confirmed_male_slots ?? 0);
          const newConfirmedFemale = !isMale
            ? Math.max(0, (courtData.confirmed_female_slots ?? 0) - 1)
            : (courtData.confirmed_female_slots ?? 0);

          const newCurrentParticipants = Math.max(0, (courtData.current_participants ?? 0) - 1);
          const wasClosedNowOpen = courtData.status === 'closed';

          await supabase
            .from('courts')
            .update({
              confirmed_male_slots: newConfirmedMale,
              confirmed_female_slots: newConfirmedFemale,
              current_participants: newCurrentParticipants,
              ...(wasClosedNowOpen ? { status: 'open' } : {}),
            } as never)
            .eq('id', courtId);
        }
      }

      await supabase
        .from('chat_participants')
        .update({ is_confirmed: false })
        .eq('chat_id', chatId!)
        .eq('user_id', participantId);

      if (courtId) {
        await supabase
          .from('applications')
          .update({ status: 'pending' })
          .eq('court_id', courtId)
          .eq('applicant_id', participantId)
          .eq('status', 'accepted');
      }

      setGroupAvatars((prev) =>
        prev.map((av) => av.user_id === participantId ? { ...av, is_confirmed: false } : av)
      );
      setConfirmedParticipants((prev) => {
        const next = prev.filter((p) => p.user_id !== participantId);
        supabase.from('chats').update({ confirmed_user_ids: next.map((p) => p.user_id) }).eq('id', chatId!).then(() => {});
        return next;
      });

      const cancelMsg =
        chatPurpose === 'dating'
          ? `😢 ${participantName}님의 매칭이 취소됐어요.`
          : `😢 ${participantName}님의 라인업 확정이 취소됐어요.`;
      await sendMessage(cancelMsg, 'system');
    } finally {
      setCancellingId(null);
    }
  };

  const handleParticipantConfirm = async (participantId: string, participantName: string) => {
    if (blockedUserIds.includes(participantId)) {
      showToastMsg('차단된 유저는 매칭 확정이 불가합니다.');
      return;
    }
    setConfirmingId(participantId);
    try {
      await supabase
        .from('chat_participants')
        .update({ is_confirmed: true })
        .eq('chat_id', chatId!)
        .eq('user_id', participantId);

      setGroupAvatars((prev) =>
        prev.map((av) => av.user_id === participantId ? { ...av, is_confirmed: true } : av)
      );
      setConfirmedParticipants((prev) => {
        if (prev.some((p) => p.user_id === participantId)) return prev;
        const av = groupAvatars.find((a) => a.user_id === participantId);
        if (av) {
          const next = [...prev, { user_id: av.user_id, name: av.name, photo_url: av.photo_url, tennis_photo_url: av.tennis_photo_url }];
          supabase.from('chats').update({ confirmed_user_ids: next.map((p) => p.user_id) }).eq('id', chatId!).then(() => {});
          return next;
        }
        return prev;
      });

      if (courtId) {
        const [courtRes, participantProfRes] = await Promise.all([
          supabase
            .from('courts')
            .select('male_slots, female_slots, confirmed_male_slots, confirmed_female_slots, status, current_participants, capacity')
            .eq('id', courtId)
            .maybeSingle(),
          supabase
            .from('profiles')
            .select('gender')
            .eq('user_id', participantId)
            .maybeSingle(),
        ]);

        const courtData = courtRes.data as { male_slots?: number; female_slots?: number; confirmed_male_slots?: number; confirmed_female_slots?: number; status?: string; current_participants?: number; capacity?: number } | null;
        const gender = participantProfRes.data?.gender;

        if (courtData) {
          const isMale = gender === 'male' || gender === '남성';
          const newConfirmedMale = isMale
            ? (courtData.confirmed_male_slots ?? 0) + 1
            : (courtData.confirmed_male_slots ?? 0);
          const newConfirmedFemale = !isMale
            ? (courtData.confirmed_female_slots ?? 0) + 1
            : (courtData.confirmed_female_slots ?? 0);

          const totalSlots = (courtData.male_slots ?? 0) + (courtData.female_slots ?? 0);
          const newTotalConfirmed = newConfirmedMale + newConfirmedFemale;
          const newCurrentParticipants = (courtData.current_participants ?? 0) + 1;
          const capacityVal = courtData.capacity ?? 0;
          const shouldClose = (totalSlots > 0 && newTotalConfirmed >= totalSlots) || (capacityVal > 0 && newCurrentParticipants >= capacityVal);

          await supabase
            .from('courts')
            .update({
              confirmed_male_slots: newConfirmedMale,
              confirmed_female_slots: newConfirmedFemale,
              current_participants: newCurrentParticipants,
              ...(shouldClose ? { status: 'closed' } : {}),
            } as never)
            .eq('id', courtId);
        }
      }

      const confirmMsg =
        chatPurpose === 'dating'
          ? `💕 매칭 확정! 설레는 만남 기대해요 🥂`
          : `🎾 라인업 확정!`;
      await sendMessage(confirmMsg, 'system');
    } finally {
      setConfirmingId(null);
    }
  };

  const is1v1MessageUnread = (msgCreatedAt: string): boolean => {
    if (!otherLastRead) return true;
    return new Date(msgCreatedAt) > new Date(otherLastRead);
  };

  const getGroupUnreadCount = (msgCreatedAt: string): number => {
    if (!isGroupChat || !user) return 0;
    const totalParticipants = Object.keys(participantLastReads).length;
    if (totalParticipants <= 1) return 0;
    const otherParticipantIds = Object.keys(participantLastReads).filter((id) => id !== user.id);
    const unreadCount = otherParticipantIds.filter((id) => {
      const lastRead = participantLastReads[id];
      if (!lastRead) return true;
      return new Date(msgCreatedAt) > new Date(lastRead);
    }).length;
    return unreadCount;
  };
  const isDating = chatPurpose === 'dating';
  const isDeletedUser = !isGroupChat && !otherUser;
  const isOpponentBlocked = otherUser ? blockedUserIds.includes(otherUser.user_id) : false;
  const opponentName = isOpponentBlocked ? '알 수 없음' : (otherUser?.name ?? '알 수 없음');
  const opponentInitial = (!isOpponentBlocked && otherUser?.name) ? otherUser.name.charAt(0).toUpperCase() : '?';

  const groupChatTitle = (() => {
    if (!isGroupChat || groupAvatars.length === 0) return null;
    const others = groupAvatars.filter((av) => av.user_id !== user?.id).map((av) =>
      blockedUserIds.includes(av.user_id) ? '알 수 없음' : av.name
    );
    if (others.length === 0) return '단체방';
    if (others.length <= 3) return others.join(', ');
    return `${others.slice(0, 3).join(', ')} 외 ${others.length - 3}명`;
  })();

  const avatarBg = isDating
    ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)'
    : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)';

  const OpponentAvatar = ({ size = 'sm', clickable = false }: { size?: 'sm' | 'md'; clickable?: boolean }) => {
    const dim = size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
    const text = size === 'md' ? 'text-sm' : 'text-xs';
    if (isDeletedUser) {
      return (
        <div
          className={`${dim} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden`}
          style={{ background: '#D1D5DB', boxShadow: '0 0 0 2px rgba(0,0,0,0.08)' }}
        >
          <svg className={size === 'md' ? 'w-5 h-5' : 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      );
    }
    return (
      <div
        className={`${dim} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden ${clickable ? 'cursor-pointer active:opacity-80' : ''}`}
        style={{ background: avatarBg, boxShadow: `0 0 0 2px ${isDating ? 'rgba(201,168,76,0.3)' : 'rgba(45,106,79,0.2)'}` }}
        onClick={clickable && otherUser ? () => setShowProfilePopup(true) : undefined}
      >
        {!isOpponentBlocked && (isDating ? otherUser?.photo_url : (otherUser?.tennis_photo_url || otherUser?.photo_url)) ? (
          <img src={isDating ? otherUser!.photo_url! : (otherUser!.tennis_photo_url || otherUser!.photo_url)!} alt={opponentName} className="w-full h-full object-cover" />
        ) : (
          <span className={text}>{opponentInitial}</span>
        )}
      </div>
    );
  };

  const bgStyle = isDating
    ? { background: 'linear-gradient(160deg, #FEF2F4 0%, #FFF5F0 50%, #FFF8F2 100%)' }
    : { background: '#F3FAF5' };

  const myBubbleStyle = isDating
    ? { background: 'linear-gradient(135deg, #C97A95 0%, #E2A8B8 100%)', color: '#fff' }
    : { background: 'linear-gradient(135deg, #2F5D50 0%, #4C7A6B 100%)', color: '#fff' };

  const otherBubbleStyle = isDating
    ? { background: '#FFF8FA', color: '#2D1820', border: '1px solid rgba(201,122,149,0.13)', boxShadow: '0 1px 3px rgba(183,110,121,0.06)' }
    : { background: '#FFFFFF', color: '#1a1a1a', border: '1px solid rgba(47,93,80,0.09)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

  const inputAreaStyle = isDating
    ? { background: '#FFF5F7', borderTop: '1px solid rgba(201,100,120,0.1)' }
    : { background: '#FAFCFA', borderTop: '1px solid rgba(47,93,80,0.1)' };

  const sendBtnStyle = isDating
    ? { background: 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' }
    : { background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' };

  const systemMsgStyle = isDating
    ? { background: 'rgba(255,210,225,0.4)', color: '#A0405E', border: '1px solid rgba(201,100,120,0.14)' }
    : { background: 'rgba(190,230,210,0.45)', color: '#2A5C40', border: '1px solid rgba(47,93,80,0.16)' };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden', ...bgStyle }}>
      {isDating && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 15% 15%, rgba(255,180,195,0.1) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(255,210,185,0.08) 0%, transparent 45%)`,
            zIndex: 0,
          }}
        />
      )}

      {!isDating && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(47,93,80,0.03) 39px, rgba(47,93,80,0.03) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(47,93,80,0.03) 39px, rgba(47,93,80,0.03) 40px)`,
            zIndex: 0,
          }}
        />
      )}

      {inAppToast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-xl"
          style={{
            background: isDating ? 'rgba(45,24,32,0.92)' : 'rgba(15,33,24,0.92)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${isDating ? 'rgba(201,84,122,0.35)' : 'rgba(201,168,76,0.3)'}`,
            maxWidth: 'calc(100vw - 2rem)',
            animation: 'slideDown 0.25s ease',
          }}
        >
          {(() => {
            const toastSender = Object.values(senderProfiles).find((p) => p.name === inAppToast.name);
            const toastPhoto = toastSender
              ? (isDating ? toastSender.photo_url : ((toastSender as Profile & { tennis_photo_url?: string | null }).tennis_photo_url || toastSender.photo_url))
              : null;
            return (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden"
                style={{ background: avatarBg }}
              >
                {toastPhoto
                  ? <img src={toastPhoto} alt="" className="w-full h-full object-cover" />
                  : <span>{inAppToast.name?.charAt(0) ?? '?'}</span>
                }
              </div>
            );
          })()}
          <div className="min-w-0">
            {inAppToast.name && (
              <p className="text-xs font-semibold leading-none mb-0.5" style={{ color: isDating ? '#E8A0BF' : '#C9A84C' }}>
                {inAppToast.name}
              </p>
            )}
            <p className="text-sm text-white/90 truncate" style={{ maxWidth: '220px' }}>
              {inAppToast.content}
            </p>
          </div>
        </div>
      )}

      <header
        className="px-3 flex items-center gap-2.5 sticky top-0 z-10 flex-shrink-0"
        style={{
          height: 60,
          background: isDating
            ? 'linear-gradient(135deg, #C06070 0%, #D9809A 100%)'
            : 'linear-gradient(135deg, #264D3A 0%, #376952 100%)',
          borderBottom: isDating
            ? '1px solid rgba(180,70,100,0.25)'
            : '1px solid rgba(38,77,58,0.3)',
          boxShadow: isDating
            ? '0 2px 14px rgba(180,80,110,0.2)'
            : '0 2px 14px rgba(38,77,58,0.22)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full active:bg-white/10 transition"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex-shrink-0">
          {isGroupChat && (participantCount ?? 0) >= 3 ? (
            <div className="relative cursor-pointer active:opacity-70" style={{ width: 40, height: 40 }} onClick={() => setShowConversationSheet(true)}>
              {groupAvatars.slice(0, 3).map((av, i) => {
                const avBlocked = blockedUserIds.includes(av.user_id);
                return (
                  <div
                    key={av.user_id}
                    className="absolute rounded-full overflow-hidden border-2 flex items-center justify-center text-white font-bold"
                    style={{
                      width: 24,
                      height: 24,
                      top: i === 2 ? 16 : 0,
                      left: i === 0 ? 0 : i === 1 ? 12 : 6,
                      zIndex: 3 - i,
                      background: avBlocked ? '#E5E7EB' : (isDating ? 'linear-gradient(135deg, #8B2252 0%, #B76E79 100%)' : 'linear-gradient(135deg, #004d20 0%, #006400 100%)'),
                      borderColor: isDating ? '#FFF5F8' : '#F0F8F4',
                      fontSize: 8,
                    }}
                  >
                    {avBlocked ? (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (isDating ? av.photo_url : (av.tennis_photo_url || av.photo_url))
                      ? <img src={(isDating ? av.photo_url : (av.tennis_photo_url || av.photo_url))!} alt={av.name} className="w-full h-full object-cover" />
                      : <span>{av.name?.charAt(0) ?? '?'}</span>}
                  </div>
                );
              })}
            </div>
          ) : (otherUser || isDeletedUser) ? (
            <OpponentAvatar size="md" clickable={!isDeletedUser} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
          )}
        </div>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={otherUser && !isGroupChat ? () => setShowProfilePopup(true) : undefined}
        >
          {otherUser || isGroupChat || isDeletedUser ? (
            <>
              <div className="flex items-center gap-1.5">
                <p
                  className="font-bold text-[15px] leading-tight truncate text-white"
                >
                  {isGroupChat ? (groupChatTitle ?? '단체방') : opponentName}
                  {!isGroupChat && !isDeletedUser && isDating && otherUser?.age ? (
                    <span className="font-normal text-xs ml-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {otherUser!.age}세
                    </span>
                  ) : null}
                </p>
                {isGroupChat && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 tracking-wide"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
                  >
                    GROUP
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {!isGroupChat && !isDating && !isOpponentBlocked && otherUser?.experience && (
                  <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    🎾 구력 {otherUser.experience}
                  </span>
                )}
                {!isGroupChat && isDating && !isOpponentBlocked && otherUser?.experience && (
                  <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    🎾 {otherUser.experience}
                  </span>
                )}
                {courtName && (
                  <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {courtName}
                  </span>
                )}
                <button
                  onClick={isGroupChat ? (e) => { e.stopPropagation(); setShowParticipantMgmt((v) => !v); } : undefined}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isGroupChat ? 'active:scale-95 transition' : ''}`}
                  style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}
                >
                  {participantCount === null ? '···' : participantCount === 0 ? '찾는 중...' : `${participantCount}명`}
                  {isGroupChat && <span className="ml-0.5 opacity-60">▾</span>}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="h-3.5 w-20 bg-white/20 rounded animate-pulse mb-1.5" />
              <div className="h-2.5 w-12 bg-white/10 rounded animate-pulse" />
            </>
          )}
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          {isGroupChat && (
            <button
              onClick={() => setShowGroupParticipants(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full transition active:scale-95"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <Users className="w-4 h-4" />
            </button>
          )}
          {!isGroupChat && otherUser && !isDeletedUser && (
            <button
              onClick={() => openDotMenu(otherUser.user_id || otherUser.id, otherUser.name)}
              className="w-8 h-8 flex items-center justify-center rounded-full transition active:scale-95"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleLeaveChat}
            className="w-8 h-8 flex items-center justify-center rounded-full transition active:scale-95"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            title="나가기"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {isHost && !hostBarDismissed && (
        <div
          className="px-3 py-2.5 flex-shrink-0 z-10 relative"
          style={{
            background: isDating
              ? 'rgba(255,245,250,0.98)'
              : 'rgba(240,247,242,0.98)',
            borderBottom: isDating ? '1px solid rgba(201,84,122,0.15)' : '1px solid rgba(45,106,79,0.15)',
          }}
        >
          <div className="flex gap-2">
            <button
              onClick={handleMatchConfirm}
              className="flex-1 py-2.5 rounded-2xl text-sm font-bold tracking-wide transition active:scale-95 text-white"
              style={{
                background: isDating
                  ? 'linear-gradient(135deg, #C9A84C 0%, #E07AA0 100%)'
                  : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                boxShadow: isDating
                  ? '0 2px 14px rgba(201,168,76,0.45)'
                  : '0 2px 14px rgba(27,67,50,0.35)',
                letterSpacing: '0.02em',
              }}
            >
              {isDating ? '💕 매칭 확정하기' : '🎾 라인업 확정하기'}
            </button>
            <button
              onClick={handleMatchCancel}
              className="px-4 py-2.5 rounded-2xl text-sm font-semibold transition active:scale-95 flex-shrink-0"
              style={{
                background: isDating ? 'rgba(255,220,230,0.9)' : 'rgba(220,240,228,0.9)',
                color: isDating ? '#9B2040' : '#1B4332',
                border: isDating ? '1px solid rgba(201,84,122,0.2)' : '1px solid rgba(45,106,79,0.2)',
              }}
            >
              {isDating ? '매칭 취소하기' : '라인업 취소하기'}
            </button>
          </div>
        </div>
      )}

      {showParticipantMgmt && isGroupChat && (
        <div
          className="flex-shrink-0 z-10 relative overflow-hidden"
          style={{
            background: isDating
              ? 'linear-gradient(135deg, rgba(255,245,250,0.98) 0%, rgba(255,250,255,0.98) 100%)'
              : 'linear-gradient(135deg, rgba(235,245,240,0.98) 0%, rgba(240,248,244,0.98) 100%)',
            borderBottom: isDating ? '1px solid rgba(201,84,122,0.14)' : '1px solid rgba(45,106,79,0.14)',
          }}
        >
          <div className="px-3 pt-2.5 pb-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: isDating ? 'rgba(139,48,96,0.45)' : 'rgba(27,67,50,0.45)' }}>
              참여자 명단
            </p>
          </div>
          <div className="px-3 pb-2.5 flex flex-col gap-1.5">
            {groupAvatars.map((av) => {
              const avDropBlocked = av.user_id !== user?.id && blockedUserIds.includes(av.user_id);
              const avDropName = avDropBlocked ? '알 수 없음' : av.name;
              const avDropPhoto = avDropBlocked ? null : (isDating ? av.photo_url : (av.tennis_photo_url || av.photo_url));
              return (
              <div key={av.user_id} className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-xs"
                  style={{ background: avDropBlocked ? '#E5E7EB' : (isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)') }}
                >
                  {avDropBlocked ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : avDropPhoto ? (
                    <img src={avDropPhoto} alt={avDropName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{avDropName?.charAt(0) ?? '?'}</span>
                  )}
                </div>
                <span className="flex-1 text-sm font-medium truncate" style={{ color: avDropBlocked ? '#9CA3AF' : (isDating ? '#2D1820' : '#0F2118') }}>
                  {avDropName}
                  {av.user_id === user?.id && (
                    <span className="ml-1 text-xs opacity-50">(나)</span>
                  )}
                </span>
                {isHost && av.user_id !== user?.id ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {av.is_confirmed && (
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                        style={{ background: isDating ? 'rgba(201,84,122,0.12)' : 'rgba(45,106,79,0.12)', color: isDating ? '#C9547A' : '#2D6A4F' }}
                      >
                        확정 {isDating ? '💕' : '🎾'}
                      </span>
                    )}
                    <button
                      onClick={() => handleKickUser(av.user_id, av.name)}
                      disabled={kickingId === av.user_id}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 flex-shrink-0"
                      style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      {kickingId === av.user_id ? '...' : '강퇴'}
                    </button>
                  </div>
                ) : av.is_confirmed ? (
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
                    style={{ background: isDating ? 'rgba(201,84,122,0.12)' : 'rgba(45,106,79,0.12)', color: isDating ? '#C9547A' : '#2D6A4F' }}
                  >
                    확정 {isDating ? '💕' : '🎾'}
                  </span>
                ) : null}
              </div>
              );
            })}
            {groupAvatars.length === 0 && (
              <p className="text-xs text-center py-1" style={{ color: isDating ? 'rgba(139,48,96,0.4)' : 'rgba(27,67,50,0.4)' }}>
                참여자가 없습니다.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 relative z-[1]" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: isDating ? 'rgba(201,84,122,0.4)' : 'rgba(27,67,50,0.4)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((msg, idx) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} className="flex justify-center py-2">
                    <span className="text-xs px-4 py-1.5 rounded-full font-medium" style={systemMsgStyle}>
                      {msg.content}
                    </span>
                  </div>
                );
              }

              if (msg.type === 'leave_request') {
                const payload = msg.payload as { reason: string; requester_id: string; status: string } | null;
                const reqStatus = payload?.status ?? 'pending';
                const requesterId = payload?.requester_id ?? '';
                const reason = payload?.reason ?? '';
                return (
                  <div key={msg.id} className="flex justify-center py-2">
                    <div className="max-w-[85%] rounded-2xl overflow-hidden" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div className="px-4 py-3 text-center">
                        <p className="text-xs font-semibold text-red-500 mb-1">나가기 요청</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{msg.content}</p>
                      </div>
                      {isHost && reqStatus === 'pending' && (
                        <div className="flex border-t border-red-100">
                          <button
                            onClick={async () => {
                              if (!chatId || !user) return;
                              await supabase.from('messages').update({ payload: { ...msg.payload, status: 'accepted' } }).eq('id', msg.id);
                              await supabase.from('chat_participants').delete().eq('chat_id', chatId).eq('user_id', requesterId);
                              navigate('/chats', { replace: true });
                            }}
                            className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-500"
                          >
                            나가기 수락
                          </button>
                        </div>
                      )}
                      {reqStatus === 'accepted' && (
                        <div className="px-4 py-2 text-xs text-center text-gray-400 border-t border-red-100">수락됨</div>
                      )}
                    </div>
                  </div>
                );
              }

              if (msg.type === 'after_proposal') {
                const payload = msg.payload as AfterProposalPayload | null;
                const status = payload?.status ?? 'pending';
                const isMe = msg.sender_id === user?.id;
                const showBadge = isMe && !isGroupChat && is1v1MessageUnread(msg.created_at);
                return (
                  <div key={msg.id} className={`flex flex-col py-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="max-w-[78%] rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid rgba(201,168,76,0.35)' }}>
                        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #FFF8EC 0%, #FFF0D4 100%)' }}>
                          <p className="text-sm font-medium leading-relaxed" style={{ color: '#8B6914' }}>{msg.content}</p>
                          <p className="text-xs mt-1" style={{ color: 'rgba(201,168,76,0.65)' }}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                        {!isMe && status === 'pending' && (
                          <div className="flex border-t border-[#C9A84C]/20">
                            <button onClick={() => handleAfterResponse(msg.id, true)} className="flex-1 py-2.5 text-sm font-semibold text-white transition" style={{ background: '#C9A84C' }}>수락</button>
                            <div className="w-px" style={{ background: 'rgba(201,168,76,0.2)' }} />
                            <button onClick={() => handleAfterResponse(msg.id, false)} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-white transition">다음에요</button>
                          </div>
                        )}
                        {status !== 'pending' && (
                          <div className="px-4 py-2 text-xs text-center font-semibold" style={{ background: 'rgba(255,255,255,0.8)', color: '#2D6A4F', borderTop: '1px solid rgba(201,168,76,0.2)' }}>
                            {status === 'accepted' ? '✓ 수락됨' : '다음 기회에'}
                          </div>
                        )}
                      </div>
                      {isMe && showBadge && (
                        <span className="text-xs font-bold mb-1 flex-shrink-0" style={{ color: '#C9A84C' }}>1</span>
                      )}
                    </div>
                  </div>
                );
              }

              if (msg.sender_id !== user?.id && msg.sender_id && blockedUserIds.includes(msg.sender_id)) {
                const blockedSenderId = msg.sender_id;
                return (
                  <div key={msg.id} className="flex items-start gap-2 py-[1px] pr-10">
                    <div className="w-9 flex-shrink-0 mt-0.5" style={{ minWidth: 36 }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E5E7EB' }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    <button
                      className="flex flex-col items-start focus:outline-none"
                      onClick={() => {
                        setUnblockMessageTarget({ user_id: blockedSenderId, name: '알 수 없음' });
                        setShowUnblockMessagePopup(true);
                      }}
                    >
                      <div
                        className="px-3 py-2 rounded-2xl rounded-tl-sm"
                        style={{ background: '#F3F4F6', color: '#9CA3AF', border: '1px solid rgba(0,0,0,0.07)' }}
                      >
                        <p className="text-[13px]">차단한 유저의 메시지입니다</p>
                      </div>
                    </button>
                  </div>
                );
              }

              const isMe = msg.sender_id === user?.id;
              const showBadge = isMe && !isGroupChat && is1v1MessageUnread(msg.created_at);
              const groupUnread = isGroupChat && !msg.id.startsWith('temp_') ? getGroupUnreadCount(msg.created_at) : 0;
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
              const isFailed = isMe && msg._failed === true;
              const isPending = isMe && msg.id.startsWith('temp_');
              const senderProf = msg.sender_id ? senderProfiles[msg.sender_id] : null;
              const senderPhoto = senderProf
                ? (isDating ? (senderProf.photo_urls?.[0] ?? senderProf.photo_url) : (senderProf.tennis_photo_url || senderProf.photo_url))
                : null;
              const senderName = senderProf
                ? ((senderProf as Profile & { tennis_name?: string }).tennis_name && !isDating
                    ? (senderProf as Profile & { tennis_name?: string }).tennis_name!
                    : senderProf.name)
                : null;
              const senderInitial = senderName ? senderName.charAt(0) : '?';
              const showSenderName = isGroupChat && !isMe && senderName;
              const prevSenderId = prevMsg?.sender_id;
              const isFirstInGroup = isGroupChat && !isMe && prevSenderId !== msg.sender_id;

              const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
              const isLastInSenderGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id || nextMsg.type === 'system';
              const showAvatar = !isMe && isLastInSenderGroup;
              const avatarAccent = isDating ? '#B76E79' : '#006400';

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 py-4">
                      <div className="flex-1 h-px" style={{ background: isDating ? 'rgba(183,110,121,0.15)' : 'rgba(45,106,79,0.15)' }} />
                      <span className="text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap" style={{ background: isDating ? 'rgba(255,220,230,0.55)' : 'rgba(200,230,215,0.6)', color: isDating ? '#9B4060' : '#2D6A4F', border: isDating ? '1px solid rgba(201,100,120,0.18)' : '1px solid rgba(45,106,79,0.2)' }}>
                        {formatDate(msg.created_at)}
                      </span>
                      <div className="flex-1 h-px" style={{ background: isDating ? 'rgba(183,110,121,0.15)' : 'rgba(45,106,79,0.15)' }} />
                    </div>
                  )}

                  {isMe ? (
                    <div className="flex justify-end items-end gap-1 py-[1px] pl-14">
                      <div className="flex flex-col items-end flex-shrink-0 gap-0.5 self-end pb-0.5">
                        {isFailed && (
                          <button
                            onClick={() => {
                              setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                              sendMessage(msg.content, msg.type);
                            }}
                            className="text-xs font-bold leading-none"
                            style={{ color: '#EF4444' }}
                            title="재전송"
                          >
                            !
                          </button>
                        )}
                        {!isFailed && isGroupChat && groupUnread > 0 && (
                          <span className="text-[11px] font-bold leading-none" style={{ color: isDating ? '#C9547A' : '#2D6A4F' }}>{groupUnread}</span>
                        )}
                        {!isFailed && !isGroupChat && showBadge && (
                          <span className="text-[11px] font-bold leading-none" style={{ color: isDating ? '#C9547A' : '#2D6A4F' }}>1</span>
                        )}
                        <span className="text-[10px] whitespace-nowrap" style={{ color: isDating ? 'rgba(100,40,70,0.5)' : 'rgba(27,67,50,0.5)' }}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      <div
                        className="px-3 py-2 rounded-2xl rounded-br-sm max-w-[68%]"
                        style={{ ...myBubbleStyle, opacity: isPending ? 0.65 : 1, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
                      >
                        <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 py-[1px] pr-10">
                      <div className="w-9 flex-shrink-0 mt-0.5" style={{ minWidth: 36 }}>
                        {showAvatar ? (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold overflow-hidden cursor-pointer active:opacity-80"
                            style={{ background: isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', boxShadow: `0 1px 4px rgba(0,0,0,0.15)` }}
                            onClick={senderProf ? () => {
                              setOtherUser(senderProf);
                              setShowProfilePopup(true);
                            } : undefined}
                          >
                            {senderPhoto ? (
                              <img src={senderPhoto} alt={senderName ?? ''} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm">{senderInitial}</span>
                            )}
                          </div>
                        ) : (
                          <div className="w-9 h-9" />
                        )}
                      </div>

                      <div className="flex flex-col items-start max-w-[68%]">
                        {isFirstInGroup && showSenderName && (
                          <span className="text-[12px] font-semibold mb-1" style={{ color: isDating ? '#8B2252' : '#1B4332' }}>
                            {senderName}
                          </span>
                        )}
                        <div className="flex items-end gap-1">
                          <div
                            className="px-3 py-2 rounded-2xl rounded-tl-sm"
                            style={otherBubbleStyle}
                          >
                            <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className="flex flex-col items-start flex-shrink-0 self-end pb-0.5 gap-0.5">
                            {isGroupChat && groupUnread > 0 && (
                              <span className="text-[11px] font-bold leading-none" style={{ color: isDating ? '#C9547A' : '#2D6A4F' }}>{groupUnread}</span>
                            )}
                            <span className="text-[10px] whitespace-nowrap" style={{ color: isDating ? 'rgba(100,40,70,0.5)' : 'rgba(27,67,50,0.5)' }}>
                              {formatTime(msg.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {typingUsers.map((tu) => {
              const tuPhoto = isDating ? tu.photo_url : (tu.tennis_photo_url || tu.photo_url);
              return (
                <div key={tu.user_id} className="flex items-start gap-2 py-[1px] pr-10">
                  <div className="w-9 flex-shrink-0 mt-0.5" style={{ minWidth: 36 }}>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
                      style={{ background: isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                    >
                      {tuPhoto ? (
                        <img src={tuPhoto} alt={tu.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm">{tu.name?.charAt(0) ?? '?'}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[12px] font-semibold mb-1" style={{ color: isDating ? '#8B2252' : '#1B4332' }}>{tu.name}</span>
                    <div className="rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5" style={otherBubbleStyle}>
                      <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: isDating ? '#C9547A' : '#2D6A4F' }} />
                      <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: isDating ? '#C9547A' : '#2D6A4F' }} />
                      <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: isDating ? '#C9547A' : '#2D6A4F' }} />
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="px-3 pt-3 flex-shrink-0 z-10 relative" style={{ ...inputAreaStyle, paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder={isDating ? '설레는 마음을 전해보세요...' : '메시지를 입력하세요...'}
            className="flex-1 min-w-0 px-4 py-2.5 rounded-full focus:outline-none transition"
            style={{
              fontSize: '16px',
              background: isDating ? 'rgba(255,228,235,0.35)' : '#fff',
              border: isDating ? '1px solid rgba(201,100,120,0.18)' : '1px solid rgba(47,93,80,0.14)',
              color: isDating ? '#2D1820' : '#0F2118',
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 min-w-[2.5rem] rounded-full flex items-center justify-center active:scale-95 transition disabled:opacity-35 flex-shrink-0"
            style={sendBtnStyle}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>

      {showLeaveRequestPopup && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9998 }}
          onClick={() => setShowLeaveRequestPopup(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 shadow-xl relative"
            style={{
              background: isDating ? '#FFF8F2' : '#F4F8F5',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
              zIndex: 9999,
              pointerEvents: 'auto',
              touchAction: 'manipulation',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: isDating ? 'rgba(201,84,122,0.35)' : 'rgba(27,67,50,0.3)' }} />
            <p className="font-bold text-gray-900 text-base mb-1">나가기 요청</p>
            <p className="text-xs text-gray-400 mb-4">나가기 사유를 입력해주세요. 호스트가 승인하면 나가집니다.</p>
            <textarea
              value={leaveRequestReason}
              onChange={(e) => setLeaveRequestReason(e.target.value)}
              placeholder="나가기 사유를 입력하세요..."
              rows={3}
              className="w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none mb-3"
              style={{
                background: '#fff',
                border: `1.5px solid ${isDating ? 'rgba(183,110,121,0.25)' : 'rgba(27,67,50,0.18)'}`,
                color: '#1a1a1a',
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowLeaveRequestPopup(false)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm transition active:scale-95"
                style={{ background: '#F3F4F6', color: '#374151', position: 'relative', pointerEvents: 'auto', touchAction: 'manipulation' }}
              >
                취소
              </button>
              <button
                onClick={handleLeaveRequestSubmit}
                disabled={leaveRequestSubmitting}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white transition active:scale-95 disabled:opacity-60"
                style={{ background: isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', position: 'relative', pointerEvents: 'auto', touchAction: 'manipulation' }}
              >
                {leaveRequestSubmitting ? '전송 중...' : '요청 보내기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDatingLeavePopup && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9998 }}
          onClick={() => setShowDatingLeavePopup(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-6 pt-6 pb-10 shadow-xl relative"
            style={{
              background: isDating ? '#FFF8F2' : '#F4F8F5',
              zIndex: 9999,
              pointerEvents: 'auto',
              touchAction: 'manipulation',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-5"
              style={{ background: isDating ? 'rgba(201,84,122,0.35)' : 'rgba(27,67,50,0.3)' }}
            />
            <p className="font-bold text-gray-900 text-base text-center mb-1">
              {isGroupChat ? '이 분들을 추천 목록에서 숨길까요?' : '이 분을 추천 목록에서 숨길까요?'}
            </p>
            <p className="text-xs text-gray-400 text-center mb-6 leading-relaxed">
              숨기기를 선택하면 {isDating ? '인연 찾기' : '코트 목록'} 탭에서<br />
              {isGroupChat ? '이 분들의 게시글이' : '이 분의 게시글이'} 보이지 않게 됩니다.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleLeaveWithBlock}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition active:scale-95"
                style={{
                  background: isDating
                    ? 'linear-gradient(135deg, #C9A84C 0%, #C9547A 100%)'
                    : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
                  position: 'relative',
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                }}
              >
                네, 숨기기
              </button>
              <button
                onClick={handleLeaveWithoutBlock}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm transition active:scale-95"
                style={{ background: '#F3F4F6', color: '#374151', position: 'relative', pointerEvents: 'auto', touchAction: 'manipulation' }}
              >
                아니요, 그냥 나갈게요
              </button>
            </div>
          </div>
        </div>
      )}

      {showProfilePopup && otherUser && (
        <ProfilePopup
          profile={otherUser}
          isDating={isDating}
          onClose={() => setShowProfilePopup(false)}
          onBlock={() => handleBlockUser(otherUser.user_id || otherUser.id, otherUser.name)}
          onReport={() => handleReportUser(otherUser.user_id || otherUser.id, otherUser.name)}
          isBlocked={blockedUserIds.includes(otherUser.user_id || otherUser.id)}
          onUnblock={() => handleUnblockUser(otherUser.user_id || otherUser.id, otherUser.name)}
        />
      )}

      {showConfirmPicker && isHost && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9998 }}
          onClick={closeAllPickers}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 shadow-xl relative"
            style={{
              background: isDating ? '#FFF8F2' : '#F4F8F5',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
              zIndex: 9999,
              pointerEvents: 'auto',
              touchAction: 'manipulation',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: isDating ? 'rgba(201,84,122,0.35)' : 'rgba(27,67,50,0.3)' }}
            />
            <p className="font-bold text-gray-900 text-base text-center mb-1">
              {isDating ? '매칭 확정할 참여자를 선택하세요' : '라인업 확정할 참여자를 선택하세요'}
            </p>
            <p className="text-xs text-gray-400 text-center mb-5">
              선택한 참여자에게 확정 배지가 부여됩니다
            </p>
            <div className="flex flex-col gap-2 mb-3">
              {isGroupChat ? groupAvatars.filter((av) => av.user_id !== user?.id).map((av) => {
                const avIsBlocked = blockedUserIds.includes(av.user_id);
                const handleConfirmRow = async () => {
                  if (avIsBlocked) { showToastMsg('차단된 유저는 확정이 불가합니다.'); return; }
                  if (pickerProcessingRef.current) return;
                  if (av.is_confirmed) return;
                  pickerProcessingRef.current = true;
                  setConfirmingId(av.user_id);
                  await handleParticipantConfirm(av.user_id, av.name);
                  closeAllPickers();
                };
                return (
                  <div
                    key={av.user_id}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl cursor-pointer active:opacity-80"
                    style={{
                      background: av.is_confirmed
                        ? (isDating ? 'rgba(201,84,122,0.08)' : 'rgba(45,106,79,0.08)')
                        : avIsBlocked ? 'rgba(0,0,0,0.04)' : '#fff',
                      border: av.is_confirmed
                        ? `1.5px solid ${isDating ? 'rgba(201,84,122,0.35)' : 'rgba(45,106,79,0.35)'}`
                        : avIsBlocked ? '1.5px solid rgba(0,0,0,0.1)' : '1.5px solid rgba(0,0,0,0.07)',
                      position: 'relative',
                      zIndex: 10000,
                      opacity: (!!confirmingId && confirmingId !== av.user_id) ? 0.6 : 1,
                      touchAction: 'manipulation',
                      pointerEvents: 'auto',
                    }}
                    onClick={handleConfirmRow}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: avIsBlocked ? '#E5E7EB' : (isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)') }}
                    >
                      {avIsBlocked ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (isDating ? av.photo_url : (av.tennis_photo_url || av.photo_url)) ? (
                        <img src={(isDating ? av.photo_url : (av.tennis_photo_url || av.photo_url))!} alt={av.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{av.name?.charAt(0) ?? '?'}</span>
                      )}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-left" style={{ color: avIsBlocked ? '#9CA3AF' : '#1a1a1a' }}>
                      {avIsBlocked ? '알 수 없음' : av.name}
                    </span>
                    {avIsBlocked ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: 'rgba(156,163,175,0.15)', color: '#9CA3AF', pointerEvents: 'none' }}>
                        차단됨
                      </span>
                    ) : av.is_confirmed ? (
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ background: isDating ? 'rgba(201,84,122,0.15)' : 'rgba(45,106,79,0.15)', color: isDating ? '#C9547A' : '#2D6A4F', pointerEvents: 'none' }}
                      >
                        확정
                      </span>
                    ) : (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 text-white"
                        style={{
                          background: confirmingId === av.user_id
                            ? 'rgba(0,0,0,0.25)'
                            : (isDating ? 'linear-gradient(135deg, #C9A84C 0%, #D4896A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)'),
                          pointerEvents: 'none',
                        }}
                      >
                        {confirmingId === av.user_id ? '처리 중...' : '확정'}
                      </span>
                    )}
                  </div>
                );
              }) : otherUser ? (() => {
                const avIsBlocked = blockedUserIds.includes(otherUser.user_id || otherUser.id);
                const avPhoto = isDating ? otherUser.photo_url : (otherUser.tennis_photo_url || otherUser.photo_url);
                const alreadyConfirmed = confirmedParticipants.some((p) => p.user_id === (otherUser.user_id || otherUser.id));
                const handleConfirmRow1v1 = async () => {
                  if (avIsBlocked) { showToastMsg('차단된 유저는 매칭 확정이 불가합니다.'); return; }
                  if (pickerProcessingRef.current) return;
                  if (alreadyConfirmed) return;
                  pickerProcessingRef.current = true;
                  await handleMatchConfirmDirect();
                  closeAllPickers();
                };
                return (
                  <div
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl cursor-pointer active:opacity-80"
                    style={{
                      background: alreadyConfirmed
                        ? (isDating ? 'rgba(201,84,122,0.08)' : 'rgba(45,106,79,0.08)')
                        : avIsBlocked ? 'rgba(0,0,0,0.04)' : '#fff',
                      border: alreadyConfirmed
                        ? `1.5px solid ${isDating ? 'rgba(201,84,122,0.35)' : 'rgba(45,106,79,0.35)'}`
                        : avIsBlocked ? '1.5px solid rgba(0,0,0,0.1)' : '1.5px solid rgba(0,0,0,0.07)',
                      position: 'relative',
                      zIndex: 10000,
                      touchAction: 'manipulation',
                      pointerEvents: 'auto',
                    }}
                    onClick={handleConfirmRow1v1}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: avIsBlocked ? '#E5E7EB' : (isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)') }}
                    >
                      {avIsBlocked ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : avPhoto ? (
                        <img src={avPhoto} alt={otherUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{otherUser.name?.charAt(0) ?? '?'}</span>
                      )}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-left" style={{ color: avIsBlocked ? '#9CA3AF' : '#1a1a1a' }}>
                      {avIsBlocked ? '알 수 없음' : otherUser.name}
                    </span>
                    {avIsBlocked ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: 'rgba(156,163,175,0.15)', color: '#9CA3AF', pointerEvents: 'none' }}>
                        차단됨
                      </span>
                    ) : alreadyConfirmed ? (
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ background: isDating ? 'rgba(201,84,122,0.15)' : 'rgba(45,106,79,0.15)', color: isDating ? '#C9547A' : '#2D6A4F', pointerEvents: 'none' }}
                      >
                        확정
                      </span>
                    ) : (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 text-white"
                        style={{ background: isDating ? 'linear-gradient(135deg, #C9A84C 0%, #D4896A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', pointerEvents: 'none' }}
                      >
                        확정
                      </span>
                    )}
                  </div>
                );
              })() : (
                <p className="text-sm text-center py-4" style={{ color: 'rgba(0,0,0,0.4)' }}>참여자가 없습니다.</p>
              )}
              {isGroupChat && groupAvatars.filter((av) => av.user_id !== user?.id).length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'rgba(0,0,0,0.4)' }}>참여자가 없습니다.</p>
              )}
            </div>
            <button
              type="button"
              onClick={closeAllPickers}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition active:scale-95"
              style={{ background: '#F3F4F6', color: '#374151' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {showCancelPicker && isHost && (
        <div
          className="fixed inset-0 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9998 }}
          onClick={closeAllPickers}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 shadow-xl relative"
            style={{
              background: isDating ? '#FFF8F2' : '#F4F8F5',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
              zIndex: 9999,
              pointerEvents: 'auto',
              touchAction: 'manipulation',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: isDating ? 'rgba(201,84,122,0.35)' : 'rgba(27,67,50,0.3)' }}
            />
            <p className="font-bold text-gray-900 text-base text-center mb-1">
              {isDating ? '매칭 취소할 참여자를 선택하세요' : '라인업 취소할 참여자를 선택하세요'}
            </p>
            <p className="text-xs text-gray-400 text-center mb-5">
              확정된 참여자만 취소할 수 있습니다
            </p>
            <div className="flex flex-col gap-2 mb-3">
              {(() => {
                const cancelList = isGroupChat
                  ? groupAvatars.filter((av) => av.user_id !== user?.id && av.is_confirmed)
                  : confirmedParticipants.filter((p) => p.user_id !== user?.id);
                if (cancelList.length === 0) {
                  return <p className="text-sm text-center py-4" style={{ color: 'rgba(0,0,0,0.4)' }}>확정된 참여자가 없습니다.</p>;
                }
                return cancelList.map((av) => {
                  const handleCancelRow = async () => {
                    if (pickerProcessingRef.current) return;
                    pickerProcessingRef.current = true;
                    setCancellingId(av.user_id);
                    if (isGroupChat) {
                      await handleParticipantCancel(av.user_id, av.name);
                    } else {
                      await handleMatchCancelDirect();
                    }
                    closeAllPickers();
                  };
                  return (
                    <div
                      key={av.user_id}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl cursor-pointer active:opacity-80"
                      style={{
                        background: '#fff',
                        border: '1.5px solid rgba(239,68,68,0.25)',
                        position: 'relative',
                        zIndex: 10000,
                        touchAction: 'manipulation',
                        pointerEvents: 'auto',
                      }}
                      onClick={handleCancelRow}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
                      >
                        {(isDating ? av.photo_url : ((av as { tennis_photo_url?: string }).tennis_photo_url || av.photo_url))
                          ? <img src={(isDating ? av.photo_url : ((av as { tennis_photo_url?: string }).tennis_photo_url || av.photo_url))!} alt={av.name} className="w-full h-full object-cover" />
                          : <span>{av.name?.charAt(0) ?? '?'}</span>}
                      </div>
                      <span className="flex-1 text-sm font-semibold text-left" style={{ color: '#1a1a1a' }}>
                        {av.name}
                      </span>
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 text-white"
                        style={{
                          background: cancellingId === av.user_id
                            ? 'rgba(0,0,0,0.25)'
                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          pointerEvents: 'none',
                        }}
                      >
                        {cancellingId === av.user_id ? '취소 중...' : '취소'}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
            <button
              type="button"
              onClick={closeAllPickers}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition active:scale-95"
              style={{ background: '#F3F4F6', color: '#374151' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {showDotMenu && dotMenuTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setShowDotMenu(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 shadow-xl"
            style={{
              background: isDating ? '#FFF8F2' : '#1B4332',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-5"
              style={{ background: isDating ? 'rgba(201,84,122,0.3)' : 'rgba(255,255,255,0.25)' }}
            />
            <button
              onClick={() => { setShowDotMenu(false); handleBlockUser(dotMenuTarget.user_id, dotMenuTarget.name); }}
              className="w-full py-4 text-left text-sm font-semibold px-2 rounded-xl active:opacity-70 transition"
              style={{ color: '#EF4444' }}
            >
              🚫 차단하기
            </button>
            <button
              onClick={() => handleReportUser(dotMenuTarget.user_id, dotMenuTarget.name)}
              className="w-full py-4 text-left text-sm font-semibold px-2 rounded-xl active:opacity-70 transition"
              style={{ color: '#F97316' }}
            >
              🚨 신고하기
            </button>
            <button
              onClick={() => setShowDotMenu(false)}
              className="w-full py-3.5 mt-1 rounded-2xl text-sm font-semibold transition active:scale-95"
              style={{ background: isDating ? '#F3F4F6' : 'rgba(255,255,255,0.12)', color: isDating ? '#374151' : 'rgba(255,255,255,0.7)' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {showReportPopup && reportTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowReportPopup(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl mx-6 p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-gray-900 mb-1 text-center">신고하기</h2>
            <p className="text-xs text-gray-400 text-center mb-4">{reportTarget.name}님을 신고합니다</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="신고 사유를 입력해주세요"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-orange-400 mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowReportPopup(false); setReportReason(''); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition"
                style={{ backgroundColor: '#1B4332' }}
              >
                취소
              </button>
              <button
                onClick={handleReportSubmit}
                disabled={!reportReason.trim() || reportSubmitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: '#F97316' }}
              >
                {reportSubmitting ? '제출 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBlockConfirm && blockTargetUser && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setShowBlockConfirm(false); setBlockTargetUser(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl mx-6 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-900 mb-2 text-center">이 유저를 차단하시겠어요?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">차단하면 해당 유저의 메시지가 보이지 않습니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowBlockConfirm(false); setBlockTargetUser(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition"
                style={{ backgroundColor: '#1B4332' }}
              >
                취소
              </button>
              <button
                onClick={handleBlockConfirm}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition"
                style={{ backgroundColor: '#EF4444' }}
              >
                차단하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnblockConfirm && unblockTargetUser && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div className="bg-white rounded-2xl shadow-xl mx-6 p-6 w-full max-w-sm">
            <h2 className="text-base font-bold text-gray-900 mb-2 text-center">차단을 해제하시겠어요?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">해제하면 {unblockTargetUser.name}님의 게시글이 다시 보입니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnblockConfirm(false); setUnblockTargetUser(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                취소
              </button>
              <button
                onClick={handleUnblockConfirm}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition"
                style={{ backgroundColor: '#1B4332' }}
              >
                해제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showKickConfirm && kickTargetUser && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div className="bg-white rounded-2xl shadow-xl mx-6 p-6 w-full max-w-sm">
            <h2 className="text-base font-bold text-gray-900 mb-2 text-center">이 참여자를 강퇴하시겠어요?</h2>
            <p className="text-sm text-gray-500 text-center mb-6">{kickTargetUser.name}님이 채팅방에서 퇴장됩니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowKickConfirm(false); setKickTargetUser(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                취소
              </button>
              <button
                onClick={handleKickConfirm}
                disabled={!!kickingId}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: '#EF4444' }}
              >
                {kickingId ? '처리 중...' : '강퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConversationSheet && isGroupChat && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowConversationSheet(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl shadow-2xl"
            style={{
              background: isDating ? 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)' : '#fff',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mt-4 mb-4"
              style={{ background: isDating ? 'rgba(201,84,122,0.35)' : 'rgba(27,67,50,0.3)' }}
            />
            <p className="font-bold text-sm text-center mb-3 px-5" style={{ color: isDating ? '#2D1820' : '#1B4332' }}>
              대화상대
            </p>
            <div className="flex flex-col gap-1 px-4 pb-2 max-h-72 overflow-y-auto">
              {groupAvatars.filter((av) => av.user_id !== user?.id).map((av) => {
                const isBlocked = blockedUserIds.includes(av.user_id);
                const displayName = isBlocked ? '알 수 없음' : av.name;
                const photo = isBlocked ? null : (isDating ? av.photo_url : (av.tennis_photo_url || av.photo_url));
                return (
                  <button
                    key={av.user_id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition active:opacity-70 focus:outline-none"
                    style={{ background: isDating ? 'rgba(201,84,122,0.05)' : 'rgba(45,106,79,0.05)' }}
                    onClick={() => {
                      if (isBlocked) {
                        setShowConversationSheet(false);
                        setUnblockTargetUser({ user_id: av.user_id, name: av.name });
                        setShowUnblockConfirm(true);
                        return;
                      }
                      const prof = senderProfiles[av.user_id];
                      if (prof) {
                        setOtherUser(prof);
                        setShowProfilePopup(true);
                        setShowConversationSheet(false);
                      } else {
                        supabase
                          .from('profiles')
                          .select('id, user_id, name, age, gender, photo_url, photo_urls, tennis_photo_url, experience, purpose, profile_completed, created_at, tennis_style, bio, mbti, height')
                          .eq('user_id', av.user_id)
                          .maybeSingle()
                          .then(({ data }) => {
                            if (data) {
                              setSenderProfiles((prev) => ({ ...prev, [data.user_id]: data as Profile }));
                              setOtherUser(data as Profile);
                              setShowProfilePopup(true);
                            }
                          });
                        setShowConversationSheet(false);
                      }
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: isBlocked ? '#E5E7EB' : (isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)') }}
                    >
                      {isBlocked ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : photo ? (
                        <img src={photo} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{displayName.charAt(0)}</span>
                      )}
                    </div>
                    <span
                      className="flex-1 text-sm font-semibold truncate"
                      style={{ color: isBlocked ? '#9CA3AF' : (isDating ? '#2D1820' : '#1B4332') }}
                    >
                      {displayName}
                    </span>
                  </button>
                );
              })}
              {groupAvatars.filter((av) => av.user_id !== user?.id).length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'rgba(0,0,0,0.4)' }}>참여자가 없습니다.</p>
              )}
            </div>
            <div className="px-4 pt-2">
              <button
                onClick={() => setShowConversationSheet(false)}
                className="w-full py-3 rounded-2xl font-semibold text-sm transition active:scale-95"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupParticipants && isGroupChat && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowGroupParticipants(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 shadow-2xl"
            style={{
              background: isDating ? 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)' : '#fff',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
              boxShadow: isDating ? '0 -8px 32px rgba(201,84,122,0.1)' : '0 -8px 32px rgba(27,67,50,0.08)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: isDating ? 'rgba(201,84,122,0.35)' : 'rgba(27,67,50,0.3)' }}
            />
            <p className="font-bold text-base text-center mb-4" style={{ color: isDating ? '#2D1820' : '#1B4332' }}>참가자 목록</p>
            <div className="flex flex-col gap-2 mb-4 max-h-80 overflow-y-auto">
              {groupAvatars.filter((av) => av.user_id !== user?.id).map((av) => {
                const isBlocked = blockedUserIds.includes(av.user_id);
                const displayName = isBlocked ? '알 수 없음' : av.name;
                const photo = isBlocked ? null : (isDating ? av.photo_url : (av.tennis_photo_url || av.photo_url));
                return (
                  <div
                    key={av.user_id}
                    className="rounded-2xl px-3.5 py-2.5 flex items-center gap-3"
                    style={{
                      background: isDating ? 'rgba(201,84,122,0.05)' : 'rgba(45,106,79,0.05)',
                      border: isDating ? '1px solid rgba(201,84,122,0.1)' : '1px solid rgba(45,106,79,0.1)',
                    }}
                  >
                    <button
                      className="flex-shrink-0 focus:outline-none"
                      onClick={() => {
                        if (isBlocked) return;
                        const prof = senderProfiles[av.user_id];
                        if (prof) { setOtherUser(prof); setShowGroupParticipants(false); setShowProfilePopup(true); }
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ background: isBlocked ? '#E5E7EB' : (isDating ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)') }}
                      >
                        {isBlocked ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : photo ? (
                          <img src={photo} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{displayName.charAt(0)}</span>
                        )}
                      </div>
                    </button>
                    <p className="flex-1 font-semibold text-sm truncate" style={{ color: isBlocked ? '#9CA3AF' : (isDating ? '#2D1820' : '#1B4332') }}>{displayName}</p>
                    {isHost ? (
                      <button
                        onClick={() => { setShowGroupParticipants(false); handleKickUser(av.user_id, displayName); }}
                        disabled={kickingId === av.user_id}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 flex-shrink-0"
                        style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        {kickingId === av.user_id ? '...' : '강퇴'}
                      </button>
                    ) : !isBlocked ? (
                      <button
                        onClick={() => { setShowGroupParticipants(false); openDotMenu(av.user_id, av.name); }}
                        className="p-2 rounded-lg active:opacity-60 transition flex-shrink-0"
                        style={{ color: '#9CA3AF' }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setShowGroupParticipants(false)}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition active:scale-95"
              style={{ background: isDating ? 'rgba(201,84,122,0.08)' : 'rgba(27,67,50,0.08)', color: isDating ? '#2D1820' : '#1B4332' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {showUnblockMessagePopup && unblockMessageTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => { setShowUnblockMessagePopup(false); setUnblockMessageTarget(null); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl px-6 py-7"
            style={{ background: isDating ? 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)' : '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#E5E7EB' }}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <p className="font-bold text-base text-center mb-2" style={{ color: isDating ? '#2D1820' : '#0F2118' }}>
              알 수 없음
            </p>
            <p className="text-sm text-center mb-6" style={{ color: 'rgba(0,0,0,0.45)' }}>
              차단한 유저입니다. 차단을 해제하면 메시지가 표시됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowUnblockMessagePopup(false); setUnblockMessageTarget(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500"
                style={{ background: '#F3F4F6' }}
              >
                닫기
              </button>
              <button
                onClick={async () => {
                  if (!unblockMessageTarget || !user) return;
                  const targetId = unblockMessageTarget.user_id;
                  await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', targetId);
                  const raw = localStorage.getItem('blocked_users');
                  const arr: string[] = raw ? JSON.parse(raw) : [];
                  localStorage.setItem('blocked_users', JSON.stringify(arr.filter((id) => id !== targetId)));
                  setBlockedUserIds((prev) => prev.filter((id) => id !== targetId));
                  setShowUnblockMessagePopup(false);
                  setUnblockMessageTarget(null);
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition active:scale-95"
                style={isDating
                  ? { background: 'transparent', color: '#C9A84C', border: '1.5px solid #C9A84C' }
                  : { background: '#1B4332', color: '#fff' }
                }
              >
                차단 해제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
