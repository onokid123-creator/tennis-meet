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

function ApplicantModal({ app, onClose, onAccept, onReject, processing, errorMsg }: ApplicantModalProps) {
  const applicant = app.applicant!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md relative flex flex-col"
        style={{
          maxHeight: '96vh',
          borderRadius: '24px 24px 0 0',
          background: '#0d2218',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0">
          <ApplicantPhotoCarousel profile={applicant} />
        </div>

        <div className="overflow-y-auto flex-1 px-5 pt-4" style={{ background: '#111c16', paddingBottom: app.status === 'pending' ? '0' : '16px' }}>
          {errorMsg && (
            <div
              className="mb-3 px-4 py-3 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}
            >
              {errorMsg}
            </div>
          )}

          {app.message && (
            <div
              className="mb-4 px-4 py-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <p className="text-xs font-semibold mb-1.5" style={{ color: '#C9A84C' }}>💬 신청 메시지</p>
              <p className="text-sm text-white/80 leading-relaxed">{app.message}</p>
            </div>
          )}

          {app.court && (
            <div
              className="mb-4 px-4 py-3 rounded-2xl"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5" style={{ color: '#C9A84C' }} />
                <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#C9A84C' }}>신청 코트</span>
              </div>
              <p className="text-white text-sm font-medium">{app.court.court_name}</p>
              {app.court.date && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3 h-3 text-white/40" />
                  <p className="text-xs text-white/50">
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

        {app.status === 'pending' && (
          <div
            className="flex-shrink-0 flex flex-col gap-3 px-5 py-4 sticky bottom-0"
            style={{ background: '#111c16', borderTop: '1px solid rgba(255,255,255,0.08)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
          >
            <button
              onClick={() => onAccept(app)}
              disabled={processing}
              className="w-full rounded-2xl font-semibold text-sm tracking-wide transition-all active:scale-95 disabled:opacity-60"
              style={{ background: '#C9A84C', color: '#fff', minHeight: '52px' }}
            >
              {processing ? '처리 중...' : '수락하기'}
            </button>
            <button
              onClick={() => onReject(app)}
              disabled={processing}
              className="w-full rounded-2xl font-semibold text-sm tracking-wide transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.15)', minHeight: '52px' }}
            >
              {processing ? '...' : '거절하기'}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition z-20"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
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

    // ── Step 1: Dedup — court_id + 유저쌍 기준으로 이미 생성된 채팅방 확인 ──
    const { data: existingChats } = await supabase
      .from('chats')
      .select('id, user1_id, user2_id')
      .eq('court_id', courtId)
      .eq('is_group', false);

    if (existingChats && existingChats.length > 0) {
      const match = existingChats.find((c) => {
        const ids = [c.user1_id, c.user2_id];
        return ids.includes(hostId) && ids.includes(applicantId);
      });
      if (match) {
        await supabase
          .from('chats')
          .update({ confirmed_user_ids: [] })
          .eq('id', match.id);
        await supabase
          .from('chat_participants')
          .update({ is_confirmed: false })
          .eq('chat_id', match.id);
        await supabase.rpc('accept_1v1_chat', {
          p_chat_id: match.id,
          p_host_id: hostId,
          p_applicant_id: applicantId,
        });
        return { chatId: match.id, isNew: true };
      }
    }

    // ── Step 2: 새 채팅방 생성 ──────────────────────────────
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        user1_id: hostId,
        user2_id: applicantId,
        purpose: app.purpose ?? 'tennis',
        court_id: courtId,
        is_group: false,
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
            ? `${applicantName}님이 입장했어요 💕`
            : `${applicantName}님이 입장했어요 🎾`;
        await supabase.from('court_group_chat_messages').insert({
          group_chat_id: targetChatId,
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

  const renderStatusBadge = (status: string, rejectionReason?: string | null) => {
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
          style={{ background: 'rgba(156,163,175,0.12)', color: '#9CA3AF', border: '1px solid rgba(156,163,175,0.25)' }}
        >
          {rejectionReason ? `거절됨 - ${rejectionReason}` : '거절됨'}
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
    const photos: string[] = applicant?.photo_urls?.length
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

    return (
      <div
        key={app.id}
        className="overflow-hidden"
        style={{
          borderRadius: '18px',
          background: isDatingCard ? 'linear-gradient(160deg, #FFF9F6 0%, #FFF5F0 100%)' : '#fff',
          border: isDatingCard ? '1px solid rgba(183,110,121,0.15)' : '1px solid #EBEBEB',
          boxShadow: isDatingCard ? '0 2px 12px rgba(183,110,121,0.08)' : '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-stretch gap-0">
          <div
            className="flex-shrink-0 relative overflow-hidden"
            style={{ width: '88px', minHeight: '100px' }}
          >
            {host?.photo_url ? (
              <img
                src={host.photo_url}
                alt={host.name}
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
              {renderStatusBadge(app.status, app.rejection_reason)}
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
  const activeColor = isDating ? '#B76E79' : '#1B4332';
  const activeBg = isDating
    ? 'linear-gradient(160deg, #2D1820 0%, #3D2030 100%)'
    : 'linear-gradient(160deg, #0A1F14 0%, #1B4332 100%)';
  const pageBg = isDating
    ? 'linear-gradient(180deg, #FFF8F5 0%, #FFF4F0 100%)'
    : 'linear-gradient(180deg, #F0F7F2 0%, #EBF4EE 100%)';

  return (
    <div className="min-h-screen pb-20" style={{ background: pageBg }}>
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
                ? { background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1.5px solid rgba(255,255,255,0.1)' }
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
            style={{ color: directionTab === 'received' ? '#fff' : 'rgba(255,255,255,0.45)' }}
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
            style={{ color: directionTab === 'sent' ? '#fff' : 'rgba(255,255,255,0.45)' }}
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
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: isDating ? 'rgba(183,110,121,0.4)' : 'rgba(45,106,79,0.4)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: isDating ? 'rgba(183,110,121,0.6)' : 'rgba(45,106,79,0.6)' }}>불러오는 중...</p>
          </div>
        ) : directionTab === 'received' ? (
          filteredReceived.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: isDating ? 'rgba(183,110,121,0.1)' : 'rgba(27,67,50,0.08)', border: `1.5px solid ${isDating ? 'rgba(183,110,121,0.25)' : 'rgba(27,67,50,0.2)'}` }}
              >
                {isDating ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B76E79" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                <p className="font-semibold text-sm mb-1" style={{ color: isDating ? '#B76E79' : '#2D6A4F' }}>
                  {isDating ? '받은 만남 신청이 없어요' : '받은 테니스 신청이 없어요'}
                </p>
                <p className="text-xs" style={{ color: isDating ? 'rgba(183,110,121,0.55)' : 'rgba(45,106,79,0.55)' }}>
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
              style={{ background: isDating ? 'rgba(183,110,121,0.1)' : 'rgba(27,67,50,0.08)', border: `1.5px solid ${isDating ? 'rgba(183,110,121,0.25)' : 'rgba(27,67,50,0.2)'}` }}
            >
              {isDating ? (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B76E79" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
              <p className="font-semibold text-sm mb-1" style={{ color: isDating ? '#B76E79' : '#2D6A4F' }}>
                {isDating ? '보낸 만남 신청이 없어요' : '보낸 테니스 신청이 없어요'}
              </p>
              <p className="text-xs" style={{ color: isDating ? 'rgba(183,110,121,0.55)' : 'rgba(45,106,79,0.55)' }}>
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
        <ApplicantModal
          app={selectedApp}
          onClose={() => { setSelectedApp(null); setAcceptError(null); }}
          onAccept={handleAccept}
          onReject={handleReject}
          processing={processingId === selectedApp.id}
          errorMsg={acceptError}
        />
      )}

      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setRejectTarget(null); setRejectReason(''); }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 shadow-2xl"
            style={{
              background: rejectTarget.purpose === 'dating' ? '#FFF8F5' : '#F4F8F5',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: rejectTarget.purpose === 'dating' ? 'rgba(183,110,121,0.3)' : 'rgba(27,67,50,0.25)' }}
            />
            <p className="font-bold text-gray-900 text-base mb-1">거절 사유 입력</p>
            <p className="text-xs text-gray-400 mb-4">
              {rejectTarget.purpose === 'dating'
                ? '입력하신 사유가 신청자에게 메시지로 전달됩니다. (선택사항)'
                : '입력하신 사유가 신청자에게 메시지로 전달됩니다. (선택사항)'}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력하세요..."
              rows={3}
              className="w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none"
              style={{
                background: '#fff',
                border: `1.5px solid ${rejectTarget.purpose === 'dating' ? 'rgba(183,110,121,0.25)' : 'rgba(27,67,50,0.18)'}`,
                color: '#1a1a1a',
                marginBottom: '12px',
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm transition active:scale-95"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                취소
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={rejectSubmitting}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white transition active:scale-95 disabled:opacity-60"
                style={{ background: rejectTarget.purpose === 'dating' ? 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
              >
                {rejectSubmitting ? '처리 중...' : '거절하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 shadow-2xl"
            style={{
              background: '#fff',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-gray-200" />
            <p className="font-bold text-gray-900 text-base mb-1">신청 삭제</p>
            <p className="text-sm text-gray-400 mb-5">
              이 신청을 삭제하시겠어요? 삭제 후에는 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm transition active:scale-95"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white transition active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
              >
                {deleteSubmitting ? '삭제 중...' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
