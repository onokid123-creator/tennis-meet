import { useState } from 'react';
import { Court } from '../types';
import { Pencil, Trash2, X } from 'lucide-react';

interface TennisCourtCardProps {
  court: Court;
  isOwner?: boolean;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function getCourtStatus(court: Court): 'open' | 'closing-soon' | 'closed' {
  const maleSlots = court.male_slots ?? 0;
  const femaleSlots = court.female_slots ?? 0;
  const confirmedMale = court.confirmed_male_slots ?? 0;
  const confirmedFemale = court.confirmed_female_slots ?? 0;
  const totalMale = confirmedMale + maleSlots;
  const totalFemale = confirmedFemale + femaleSlots;

  const maleFullOrNone = totalMale === 0 || confirmedMale >= totalMale;
  const femaleFullOrNone = totalFemale === 0 || confirmedFemale >= totalFemale;
  const hasAnySlot = totalMale > 0 || totalFemale > 0;

  if (hasAnySlot && maleFullOrNone && femaleFullOrNone) return 'closed';

  const hadSlots = confirmedMale > 0 || confirmedFemale > 0;
  if (hadSlots && maleSlots <= 0 && femaleSlots <= 0) return 'closed';

  if (court.end_time && court.date) {
    const endDateTime = new Date(`${court.date}T${court.end_time}`);
    const oneHourBefore = new Date(endDateTime.getTime() - 60 * 60 * 1000);
    const now = new Date();
    if (now >= oneHourBefore && now < endDateTime) return 'closing-soon';
  }

  return 'open';
}

export default function TennisCourtCard({ court, isOwner, onApply, onEdit, onDelete }: TennisCourtCardProps) {
  const profile = court.profile;
  const status = getCourtStatus(court);
  const isClosed = status === 'closed';
  const isClosingSoon = status === 'closing-soon';
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const photoUrl = court.tennis_photo_url || profile?.photo_url;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const totalMale = (court.confirmed_male_slots ?? 0) + (court.male_slots ?? 0);
  const totalFemale = (court.confirmed_female_slots ?? 0) + (court.female_slots ?? 0);
  const confirmedMale = court.confirmed_male_slots ?? 0;
  const confirmedFemale = court.confirmed_female_slots ?? 0;
  const remainMale = court.male_slots ?? 0;
  const remainFemale = court.female_slots ?? 0;

  return (
    <div
      className="overflow-hidden"
      style={{
        borderRadius: '22px',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 4px 24px rgba(26,74,58,0.1), 0 1px 4px rgba(26,74,58,0.06)',
        border: '1px solid rgba(255,255,255,0.85)',
      }}
    >
      <div
        className="px-4 pt-3.5 pb-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(26,74,58,0.07)' }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {court.format && (
            <span
              className="font-bold rounded-full px-3 py-1 tracking-wide"
              style={{
                background: 'rgba(26,74,58,0.09)',
                color: '#1B5E42',
                fontSize: 11.5,
                border: '1.5px solid rgba(26,74,58,0.2)',
                letterSpacing: '0.03em',
              }}
            >
              {court.format}
            </span>
          )}
          {court.match_type && court.match_type !== court.format && (
            <span
              className="font-semibold rounded-full px-2.5 py-1"
              style={{ background: 'rgba(201,168,76,0.1)', color: '#A07828', fontSize: 11, border: '1px solid rgba(201,168,76,0.25)' }}
            >
              {court.match_type}
            </span>
          )}
          {isClosingSoon && !isClosed && (
            <span
              className="font-semibold rounded-full px-2.5 py-1"
              style={{ background: 'rgba(251,146,60,0.1)', color: '#D97706', fontSize: 11, border: '1px solid rgba(251,146,60,0.25)' }}
            >
              마감 임박
            </span>
          )}
          {isClosed && (
            <span
              className="font-bold rounded-full px-2.5 py-1 flex items-center gap-1"
              style={{ background: 'rgba(239,68,68,0.09)', color: '#DC2626', fontSize: 11, border: '1.5px solid rgba(239,68,68,0.22)' }}
            >
              🔒 마감
            </span>
          )}
        </div>
        {isOwner && (
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg transition active:scale-95" style={{ color: 'rgba(26,74,58,0.4)' }}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg transition active:scale-95" style={{ color: 'rgba(26,74,58,0.4)' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="px-4 pt-4 pb-4">
        <div className="flex items-start gap-3.5 mb-4">
          <button
            className="flex-shrink-0 relative"
            onClick={() => photoUrl && setSelectedImage(photoUrl)}
            disabled={!photoUrl}
          >
            <div
              className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{
                background: photoUrl ? 'transparent' : 'rgba(26,74,58,0.08)',
                border: '2px solid rgba(201,168,76,0.35)',
                boxShadow: '0 2px 8px rgba(26,74,58,0.12)',
              }}
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={profile?.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                  loading="eager"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <span style={{ color: '#1B5E42', fontWeight: 700, fontSize: 20 }}>{profile?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.95)', border: '1.5px solid rgba(201,168,76,0.45)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C7 2 3 6 3 11c0 3.5 2 6.5 5 8l1 3h6l1-3c3-1.5 5-4.5 5-8 0-5-4-9-9-9z"/>
                <line x1="9" y1="19" x2="15" y2="19"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
            </div>
          </button>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span style={{ fontWeight: 700, fontSize: 15.5, color: '#1A2E22', letterSpacing: '-0.01em' }}>{profile?.name}</span>
              {profile?.experience && (
                <span
                  className="font-semibold rounded-full px-2 py-0.5"
                  style={{ background: 'rgba(201,168,76,0.12)', color: '#A07828', fontSize: 11, border: '1px solid rgba(201,168,76,0.3)' }}
                >
                  {profile.experience}
                </span>
              )}
              {profile?.tennis_style && (
                <span
                  className="font-medium rounded-full px-2 py-0.5"
                  style={{ background: 'rgba(26,74,58,0.07)', color: '#1B5E42', fontSize: 11, border: '1px solid rgba(26,74,58,0.14)' }}
                >
                  {profile.tennis_style}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span style={{ fontWeight: 600, fontSize: 13.5, color: '#1A2E22' }} className="truncate">{court.court_name}</span>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl px-4 py-3 mb-4 flex flex-col gap-2"
          style={{ background: 'rgba(26,74,58,0.05)', border: '1px solid rgba(26,74,58,0.1)' }}
        >
          {court.date && (
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B5E42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span style={{ fontSize: 13, color: '#1A2E22', opacity: 0.75 }}>{formatDate(court.date)}</span>
            </div>
          )}
          {court.start_time && (
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B5E42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span style={{ fontSize: 13, color: '#1A2E22', opacity: 0.75 }}>
                {court.start_time}{court.end_time ? ` — ${court.end_time}` : ''}
              </span>
            </div>
          )}
        </div>

        {(totalMale > 0 || totalFemale > 0) && (
          <div className="mb-3">
            {isClosed ? (
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.18)' }}
              >
                <span style={{ fontSize: 15 }}>🔒</span>
                <span className="text-sm font-bold" style={{ color: '#DC2626', letterSpacing: '0.01em' }}>모집 마감</span>
                {court.court_fee != null && court.court_fee >= 0 && (
                  <span className="ml-auto text-xs font-semibold" style={{ color: '#A07828' }}>
                    1인 {court.court_fee.toLocaleString()}원
                  </span>
                )}
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl flex-wrap"
                style={{ background: 'rgba(26,74,58,0.05)', border: '1.5px solid rgba(26,74,58,0.12)' }}
              >
                <span style={{ fontSize: 14 }}>🎾</span>
                <span className="text-xs font-semibold" style={{ color: '#2D6A4F', opacity: 0.8 }}>구해요</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {totalMale > 0 && (
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: remainMale <= 0 ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.1)',
                        color: remainMale <= 0 ? '#DC2626' : '#1D4ED8',
                        border: `1.5px solid ${remainMale <= 0 ? 'rgba(239,68,68,0.22)' : 'rgba(59,130,246,0.25)'}`,
                      }}
                    >
                      {remainMale <= 0 ? '남 마감' : `남 ${remainMale}명`}
                    </span>
                  )}
                  {totalFemale > 0 && (
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: remainFemale <= 0 ? 'rgba(239,68,68,0.08)' : 'rgba(236,72,153,0.09)',
                        color: remainFemale <= 0 ? '#DC2626' : '#BE185D',
                        border: `1.5px solid ${remainFemale <= 0 ? 'rgba(239,68,68,0.22)' : 'rgba(236,72,153,0.22)'}`,
                      }}
                    >
                      {remainFemale <= 0 ? '여 마감' : `여 ${remainFemale}명`}
                    </span>
                  )}
                </div>
                {court.court_fee != null && court.court_fee >= 0 && (
                  <span
                    className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(201,168,76,0.1)', color: '#A07828', border: '1px solid rgba(201,168,76,0.25)' }}
                  >
                    1인 {court.court_fee.toLocaleString()}원
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {court.description && (
          <div
            className="mb-4 px-3.5 py-2.5 rounded-2xl"
            style={{ background: 'rgba(201,168,76,0.06)', borderLeft: '2.5px solid rgba(201,168,76,0.4)' }}
          >
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(160,120,40,0.9)', lineHeight: 1.6, margin: 0 }}>
              "{court.description}"
            </p>
          </div>
        )}

        {onApply && (
          isClosed ? (
            <div
              className="w-full py-3 rounded-2xl font-medium text-center"
              style={{ background: 'rgba(26,74,58,0.04)', color: 'rgba(26,74,58,0.3)', fontSize: 14, border: '1px solid rgba(26,74,58,0.08)' }}
            >
              마감된 모임이에요
            </div>
          ) : (
            <button
              onClick={onApply}
              className="w-full py-3.5 rounded-2xl font-bold transition active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #1B5E42 0%, #237351 100%)',
                color: '#fff',
                fontSize: 14,
                boxShadow: '0 4px 16px rgba(26,74,58,0.25)',
                letterSpacing: '0.02em',
              }}
            >
              채팅 보내봐요
            </button>
          )
        )}
      </div>

      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0,
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.95)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <img
            src={selectedImage}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'absolute', top: '20px', right: '20px',
              background: 'white', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X className="w-4 h-4 text-gray-800" />
          </button>
        </div>
      )}
    </div>
  );
}
