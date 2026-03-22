import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Chat, CourtGroupChat, Profile } from '../types';
import BottomNav from '../components/BottomNav';

function buildGroupTitle(names: string[], maxVisible = 3): string {
  if (names.length === 0) return '단체방';
  if (names.length <= maxVisible) return names.join(', ');
  const visible = names.slice(0, maxVisible).join(', ');
  return `${visible} 외 ${names.length - maxVisible}명`;
}

type TabType = 'tennis' | 'dating';

function formatTime(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

export default function Chats() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [groupChats, setGroupChats] = useState<CourtGroupChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('tennis');
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchChats = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const timeoutId = setTimeout(() => setLoading(false), 8000);

    try {
      const localBlockedRaw = localStorage.getItem('blocked_users');
      const localBlocked: string[] = localBlockedRaw ? JSON.parse(localBlockedRaw) : [];
      const { data: dbBlockedData } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id);
      const blockedByMe = (dbBlockedData ?? []).map((r: { blocked_id: string }) => r.blocked_id);
      const currentBlockedIds = Array.from(new Set([...localBlocked, ...blockedByMe]));
      setBlockedIds(currentBlockedIds);
      // ── 1:1 and group chats via chat_participants ──
      const { data: participantRows } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      const participantChatIds = (participantRows ?? []).map((r) => r.chat_id);

      const allDirectChatIds = [...participantChatIds];

      const buildChatRow = async (chat: Record<string, unknown>) => {
        const isGroup = !!chat.is_group;
        const opponentId = !isGroup
          ? (chat.user1_id === user.id ? chat.user2_id as string : chat.user1_id as string)
          : null;

        const [lastMsgResult, unreadResult] = await Promise.all([
          supabase
            .from('messages')
            .select('id, content, created_at, sender_id, type')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('is_read', false)
            .neq('sender_id', user.id),
        ]);

        let groupTitle: string | undefined;
        let groupParticipantPhotos: Array<{ user_id: string; name: string; photo_url?: string; tennis_photo_url?: string }> | undefined;
        if (chat.is_group) {
          const { data: partRows } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chat.id);
          const partIds = (partRows ?? []).map((r: { user_id: string }) => r.user_id);
          if (partIds.length > 0) {
            const { data: partProfs } = await supabase
              .from('profiles')
              .select('user_id, name, photo_url, tennis_photo_url')
              .in('user_id', partIds);
            const others = (partProfs ?? []).filter((p: { user_id: string }) => p.user_id !== user.id);
            const names = (others as Array<{ name: string }>).map((p) => p.name);
            if (names.length > 0) groupTitle = buildGroupTitle(names);
            groupParticipantPhotos = (partProfs ?? []).map((p: { user_id: string; name: string; photo_url?: string | null; tennis_photo_url?: string | null }) => ({
              user_id: p.user_id,
              name: p.name,
              photo_url: p.photo_url ?? undefined,
              tennis_photo_url: p.tennis_photo_url ?? undefined,
            }));
          }
        }

        return { chat, opponentId, lastMsg: lastMsgResult.data, unreadCount: unreadResult.count ?? 0, groupTitle, groupParticipantPhotos };
      };

      if (allDirectChatIds.length > 0) {
        const { data: chatsData } = await supabase
          .from('chats')
          .select('*')
          .in('id', allDirectChatIds)
          .order('created_at', { ascending: false });

        if (chatsData && chatsData.length > 0) {
          const allUserIds = Array.from(new Set(
            chatsData.flatMap((c) => [c.user1_id, c.user2_id]).filter(Boolean)
          ));

          const profileMap: Record<string, Profile> = {};
          if (allUserIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, user_id, name, age, gender, photo_url, tennis_photo_url, experience, purpose')
              .in('user_id', allUserIds);
            (profilesData ?? []).forEach((p) => { profileMap[p.user_id] = p as Profile; });
          }

          const allCourtIds = Array.from(new Set(chatsData.map((c) => c.court_id).filter(Boolean)));
          const courtNameMap: Record<string, string> = {};
          if (allCourtIds.length > 0) {
            const { data: courtsData } = await supabase
              .from('courts')
              .select('id, court_name')
              .in('id', allCourtIds);
            (courtsData ?? []).forEach((c: { id: string; court_name: string }) => { courtNameMap[c.id] = c.court_name; });
          }

          const chatRows = await Promise.all(chatsData.map((chat) => buildChatRow(chat)));

          const chatsWithMessages = chatRows.map(({ chat, opponentId, lastMsg, unreadCount, groupTitle, groupParticipantPhotos }) => {
            const opponentProfile = opponentId ? (profileMap[opponentId] ?? null) : null;
            return {
              ...chat,
              user1: !chat.is_group && (chat.user1_id as string) !== user.id ? opponentProfile : null,
              user2: !chat.is_group && chat.user2_id && (chat.user2_id as string) !== user.id ? opponentProfile : null,
              last_message: lastMsg || undefined,
              unread_count: unreadCount,
              group_title: groupTitle,
              group_participant_photos: groupParticipantPhotos,
              court_name: chat.court_id ? (courtNameMap[chat.court_id as string] ?? undefined) : undefined,
            };
          });

          chatsWithMessages.sort((a, b) => {
            const aTime = a.last_message?.created_at ?? (a as unknown as { created_at: string }).created_at;
            const bTime = b.last_message?.created_at ?? (b as unknown as { created_at: string }).created_at;
            return new Date(bTime as string).getTime() - new Date(aTime as string).getTime();
          });

          setChats(chatsWithMessages as unknown as Chat[]);
        } else {
          setChats([]);
        }
      } else {
        setChats([]);
      }

      // ── Group chats (tennis + dating) ──
      const { data: groupParticipantRows } = await supabase
        .from('court_group_chat_participants')
        .select('group_chat_id')
        .eq('user_id', user.id)
        .neq('status', 'rejected');

      const groupChatIds = (groupParticipantRows ?? []).map((r) => r.group_chat_id);

      if (groupChatIds.length > 0) {
        const { data: groupChatsData } = await supabase
          .from('court_group_chats')
          .select('*, court:court_id (*), host:host_id (*)')
          .in('id', groupChatIds)
          .order('created_at', { ascending: false });

        if (groupChatsData && groupChatsData.length > 0) {
          const groupChatsWithMessages = await Promise.all(
            groupChatsData.map(async (gc) => {
              const [lastMsgResult, unreadResult] = await Promise.all([
                supabase
                  .from('court_group_chat_messages')
                  .select('id, content, created_at, sender_id, type')
                  .eq('group_chat_id', gc.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle(),
                supabase
                  .from('court_group_chat_messages')
                  .select('id', { count: 'exact', head: true })
                  .eq('group_chat_id', gc.id)
                  .eq('is_read', false)
                  .neq('sender_id', user.id),
              ]);
              return {
                ...gc,
                last_message: lastMsgResult.data || undefined,
                unread_count: unreadResult.count || 0,
              };
            })
          );
          setGroupChats(groupChatsWithMessages);
        } else {
          setGroupChats([]);
        }
      } else {
        setGroupChats([]);
      }
    } catch (err) {
      console.error('[Chats] fetchChats error:', err);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if ((location.state as { leftChat?: boolean })?.leftChat) {
      showToast('채팅방에서 퇴장했습니다.');
      window.history.replaceState({}, '');
    }
    fetchChats();
  }, [location.pathname, location.state]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchChats();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const debouncedFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchChats(), 400);
    };

    const channel = supabase
      .channel(`chats_list_${user?.id ?? 'anon'}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, debouncedFetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, debouncedFetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, debouncedFetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_participants' }, debouncedFetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_participants' }, debouncedFetch)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_participants' }, debouncedFetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'court_group_chat_messages' }, debouncedFetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'court_group_chat_participants' }, debouncedFetch)
      .subscribe();

    const kickChannel = supabase
      .channel(`global_kick_${user?.id ?? 'anon'}`)
      .on('broadcast', { event: 'kick_user' }, (payload) => {
        const { kicked_user_id } = payload.payload as { kicked_user_id: string };
        if (kicked_user_id === user?.id) {
          debouncedFetch();
        }
      })
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
      supabase.removeChannel(kickChannel);
    };
  }, [fetchChats]);

  const getOtherUser = (chat: Chat): Profile | null => {
    if (chat.user1_id === user!.id) return chat.user2 ?? null;
    return chat.user1 ?? null;
  };

  // ── Strict purpose-based filtering ──────────────────────────
  const tennisGroupChats = groupChats.filter((gc) => gc.purpose === 'tennis' || !gc.purpose);
  const datingGroupChats = groupChats.filter((gc) => gc.purpose === 'dating');
  const tennisDirectChats = chats.filter((c) => c.purpose === 'tennis');
  const datingDirectChats = chats.filter((c) => c.purpose === 'dating');

  const hasTennisChats = tennisGroupChats.length > 0 || tennisDirectChats.length > 0;
  const hasDatingChats = datingGroupChats.length > 0 || datingDirectChats.length > 0;

  const totalTennisUnread =
    [...tennisGroupChats, ...tennisDirectChats].reduce((s, c) => s + (c.unread_count ?? 0), 0);
  const totalDatingUnread =
    [...datingGroupChats, ...datingDirectChats].reduce((s, c) => s + (c.unread_count ?? 0), 0);

  const isDatingTab = activeTab === 'dating';

  return (
    <div
      className="min-h-screen relative"
      style={{
        paddingBottom: 'var(--page-bottom-pad)',
        background: isDatingTab
          ? 'linear-gradient(160deg, #FFF4F7 0%, #FFF8F2 50%, #FFF5EC 100%)'
          : '#F0F4F1',
      }}
    >
      {isDatingTab && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 15% 15%, rgba(255,182,193,0.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 85%, rgba(255,218,185,0.14) 0%, transparent 55%)',
            zIndex: 0,
          }}
        />
      )}

      {!isDatingTab && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(45,106,79,0.035) 39px, rgba(45,106,79,0.035) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(45,106,79,0.035) 39px, rgba(45,106,79,0.035) 40px)',
            zIndex: 0,
          }}
        />
      )}

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-3 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      <header
        className="px-5 pt-5 pb-0 sticky top-0 z-10"
        style={{
          background: isDatingTab ? 'rgba(255,248,244,0.95)' : 'rgba(240,244,241,0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: isDatingTab
            ? '1px solid rgba(201,100,120,0.12)'
            : '1px solid rgba(45,106,79,0.12)',
        }}
      >
        <h1
          className="text-2xl mb-4"
          style={{
            color: isDatingTab ? '#2D1820' : '#0F2118',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 400,
            letterSpacing: '0.01em',
          }}
        >
          채팅
        </h1>

        <div className="flex gap-0">
          {([
            { key: 'tennis' as const, label: '테니스 모임', icon: '🎾', unread: totalTennisUnread },
            { key: 'dating' as const, label: '설레는 만남', icon: '🥂', unread: totalDatingUnread },
          ]).map((tab) => {
            const isActive = activeTab === tab.key;
            const accent = tab.key === 'dating' ? '#C9547A' : '#2D6A4F';
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 pb-3 pt-1.5 flex items-center justify-center gap-1.5 transition-all"
                style={{ borderBottom: isActive ? `2.5px solid ${accent}` : '2.5px solid transparent' }}
              >
                <span style={{ fontSize: '15px' }}>{tab.icon}</span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: isActive ? accent : 'rgba(0,0,0,0.33)' }}
                >
                  {tab.label}
                </span>
                {tab.unread > 0 && (
                  <span
                    className="min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold text-white flex items-center justify-center leading-none"
                    style={{ background: tab.key === 'dating' ? '#C9547A' : '#E05555' }}
                  >
                    {tab.unread > 9 ? '9+' : tab.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="px-4 py-4 relative z-[1]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
              style={{
                borderColor: isDatingTab ? 'rgba(201,84,122,0.4)' : 'rgba(45,106,79,0.4)',
                borderTopColor: 'transparent',
              }}
            />
            <p className="text-xs" style={{ color: isDatingTab ? 'rgba(139,48,96,0.5)' : 'rgba(27,67,50,0.5)' }}>
              채팅방 불러오는 중...
            </p>
          </div>
        ) : activeTab === 'tennis' ? (
          !hasTennisChats ? (
            <TennisEmptyState />
          ) : (
            <div className="space-y-2">
              {tennisGroupChats.map((gc) => (
                <TennisGroupChatRow
                  key={gc.id}
                  gc={gc}
                  blockedIds={blockedIds}
                  onPress={() => navigate(`/group-chat/${gc.id}`)}
                />
              ))}
              {tennisDirectChats.map((chat) => {
                const other = getOtherUser(chat);
                const extended = chat as Chat & { group_title?: string; group_participant_photos?: Array<{ user_id: string; name: string; photo_url?: string; tennis_photo_url?: string }>; court_name?: string };
                return (
                  <TennisChatRow
                    key={chat.id}
                    chat={chat}
                    otherUser={other}
                    groupTitle={extended.group_title}
                    groupParticipantPhotos={extended.group_participant_photos}
                    courtName={extended.court_name}
                    blockedIds={blockedIds}
                    onPress={() => navigate(`/chat/${chat.id}`)}
                  />
                );
              })}
            </div>
          )
        ) : !hasDatingChats ? (
          <DatingEmptyState />
        ) : (
          <div className="space-y-2.5">
            {datingGroupChats.map((gc) => (
              <DatingGroupChatRow
                key={gc.id}
                gc={gc}
                blockedIds={blockedIds}
                onPress={() => navigate(`/group-chat/${gc.id}`)}
              />
            ))}
            {datingDirectChats.map((chat) => {
              const other = getOtherUser(chat);
              const extended = chat as Chat & { group_title?: string; group_participant_photos?: Array<{ user_id: string; name: string; photo_url?: string }>; court_name?: string };
              return (
                <DatingChatRow
                  key={chat.id}
                  chat={chat}
                  otherUser={other}
                  groupTitle={extended.group_title}
                  groupParticipantPhotos={extended.group_participant_photos}
                  courtName={extended.court_name}
                  blockedIds={blockedIds}
                  onPress={() => navigate(`/chat/${chat.id}`)}
                />
              );
            })}
          </div>
        )}
      </div>

      <BottomNav active="chats" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty States
// ─────────────────────────────────────────────────────────────

function TennisEmptyState() {
  return (
    <div className="text-center py-20">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4"
        style={{ background: 'rgba(45,106,79,0.08)' }}
      >
        🎾
      </div>
      <p className="font-semibold text-sm mb-1" style={{ color: '#1B4332' }}>
        참여 중인 테니스 모임이 없어요
      </p>
      <p className="text-xs" style={{ color: 'rgba(27,67,50,0.5)' }}>
        홈에서 코트를 찾아 신청해보세요!
      </p>
    </div>
  );
}

function DatingEmptyState() {
  return (
    <div className="text-center py-20">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5 relative"
        style={{
          background:
            'linear-gradient(135deg, rgba(201,84,122,0.08) 0%, rgba(201,168,76,0.08) 100%)',
        }}
      >
        <span style={{ fontSize: '2.6rem' }}>🥂</span>
      </div>
      <p className="font-semibold text-sm mb-1.5" style={{ color: '#8B3060' }}>
        진행 중인 설레는 만남이 없어요
      </p>
      <p className="text-xs leading-relaxed" style={{ color: 'rgba(139,48,96,0.5)' }}>
        홈에서 마음에 드는 분께
        <br />
        신청해보세요!
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tennis Chat Rows
// ─────────────────────────────────────────────────────────────

function TennisGroupChatRow({ gc, blockedIds = [], onPress }: { gc: CourtGroupChat; blockedIds?: string[]; onPress: () => void }) {
  const host = gc.host as Profile | undefined;
  const hasUnread = (gc.unread_count ?? 0) > 0;
  const courtName = (gc.court as { court_name?: string } | undefined)?.court_name;
  const isHostBlocked = host ? blockedIds.includes(host.user_id ?? '') : false;
  const hostPhoto = isHostBlocked ? undefined : (host?.tennis_photo_url || host?.photo_url);
  const rawHostName = host?.name ?? '테니스 모임';
  const maskedHostName = isHostBlocked ? '알 수 없음' : rawHostName;
  const displayTitle = courtName ?? maskedHostName;

  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl transition active:scale-[0.98] text-left"
      style={{
        background: '#fff',
        border: '1px solid rgba(45,106,79,0.1)',
        boxShadow: '0 1px 6px rgba(27,67,50,0.06)',
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-xl"
        style={{ background: isHostBlocked ? '#E5E7EB' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}
      >
        {isHostBlocked ? (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : hostPhoto ? (
          <img src={hostPhoto} alt={host!.name} className="w-full h-full object-cover" />
        ) : (
          <span>{host?.name?.charAt(0) ?? '🎾'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-sm truncate ${hasUnread ? 'font-bold' : 'font-semibold'}`}
              style={{ color: '#0F2118' }}
            >
              {displayTitle}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
              style={{ background: 'rgba(45,106,79,0.1)', color: '#2D6A4F' }}
            >
              그룹
            </span>
          </div>
          <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: 'rgba(0,0,0,0.33)' }}>
            {formatTime(gc.last_message?.created_at)}
          </span>
        </div>
        {host?.name && courtName && (
          <p className="text-xs mb-0.5 truncate" style={{ color: 'rgba(27,67,50,0.5)' }}>
            {maskedHostName}
          </p>
        )}
        <div className="flex items-center justify-between">
          <p
            className={`text-sm truncate ${hasUnread ? 'font-semibold' : ''}`}
            style={{ color: hasUnread ? '#0F2118' : 'rgba(0,0,0,0.48)' }}
          >
            {gc.last_message?.content ?? '메시지가 없습니다.'}
          </p>
          {hasUnread && (
            <span
              className="ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white flex items-center justify-center"
              style={{ background: '#E05555' }}
            >
              {gc.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function GroupAvatarGrid({
  participants,
  accentBg,
  borderColor,
  isTennis = false,
  blockedIds = [],
}: {
  participants: Array<{ user_id: string; name: string; photo_url?: string; tennis_photo_url?: string; _blocked?: boolean }>;
  accentBg: string;
  borderColor: string;
  isTennis?: boolean;
  blockedIds?: string[];
}) {
  const slots = participants.slice(0, 4);
  const count = slots.length;
  const getPhoto = (p: { photo_url?: string; tennis_photo_url?: string; _blocked?: boolean }) => {
    if (p._blocked) return undefined;
    return isTennis ? (p.tennis_photo_url || p.photo_url) : p.photo_url;
  };
  const isBlocked = (p: { user_id: string; _blocked?: boolean }) => p._blocked || blockedIds.includes(p.user_id);

  if (count === 0) {
    return (
      <div
        className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-bold text-xl"
        style={{ background: accentBg }}
      >
        <span>👥</span>
      </div>
    );
  }

  if (count === 1) {
    const p = slots[0];
    const photo = getPhoto(p);
    const blocked = isBlocked(p);
    return (
      <div
        className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-xl"
        style={{ background: blocked ? '#E5E7EB' : accentBg }}
      >
        {blocked ? (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : photo ? (
          <img src={photo} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <span>{p.name?.charAt(0) ?? '?'}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden grid flex-shrink-0"
      style={{ display: 'grid', gridTemplateColumns: count <= 2 ? '1fr 1fr' : '1fr 1fr', gridTemplateRows: count <= 2 ? '1fr' : '1fr 1fr', gap: '1.5px', background: borderColor }}
    >
      {slots.map((p) => {
        const photo = getPhoto(p);
        const blocked = isBlocked(p);
        return (
          <div
            key={p.user_id}
            className="flex items-center justify-center text-white font-bold overflow-hidden"
            style={{ background: blocked ? '#E5E7EB' : accentBg, fontSize: count >= 4 ? '9px' : '11px' }}
          >
            {blocked ? (
              <svg style={{ width: count >= 4 ? 10 : 13, height: count >= 4 ? 10 : 13 }} fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            ) : photo ? (
              <img src={photo} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <span>{p.name?.charAt(0) ?? '?'}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TennisChatRow({
  chat,
  otherUser,
  groupTitle,
  groupParticipantPhotos,
  courtName,
  blockedIds = [],
  onPress,
}: {
  chat: Chat;
  otherUser: Profile | null;
  groupTitle?: string;
  groupParticipantPhotos?: Array<{ user_id: string; name: string; photo_url?: string; tennis_photo_url?: string }>;
  courtName?: string;
  blockedIds?: string[];
  onPress: () => void;
}) {
  const hasUnread = (chat.unread_count ?? 0) > 0;
  const isGroup = !!chat.is_group;
  const isOtherBlocked = otherUser ? blockedIds.includes(otherUser.user_id) : false;
  const maskedName = isOtherBlocked ? '알 수 없음' : (otherUser?.name ?? (isGroup ? '테니스 그룹' : '알 수 없음'));
  const maskedGroupTitle = isGroup && groupTitle
    ? groupTitle.split(', ').map((n) => {
        const match = groupParticipantPhotos?.find((p) => p.name === n);
        return match && blockedIds.includes(match.user_id) ? '알 수 없음' : n;
      }).join(', ')
    : groupTitle;
  const displayName = maskedGroupTitle ?? maskedName;
  const avatarInitial = isOtherBlocked ? '?' : (otherUser?.name?.charAt(0) ?? '?');
  const tennisPhoto = isOtherBlocked ? undefined : (otherUser?.tennis_photo_url || otherUser?.photo_url);

  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl transition active:scale-[0.98] text-left"
      style={{
        background: '#fff',
        border: '1px solid rgba(45,106,79,0.1)',
        boxShadow: '0 1px 6px rgba(27,67,50,0.06)',
      }}
    >
      {isGroup && groupParticipantPhotos && groupParticipantPhotos.length > 0 ? (
        <GroupAvatarGrid
          participants={groupParticipantPhotos.map((p) => blockedIds.includes(p.user_id) ? { ...p, photo_url: undefined, tennis_photo_url: undefined, _blocked: true } : p)}
          accentBg="linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)"
          borderColor="rgba(45,106,79,0.15)"
          isTennis={true}
          blockedIds={blockedIds}
        />
      ) : (
      <div
        className="w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-xl"
        style={{ background: isOtherBlocked ? '#E5E7EB' : (!otherUser && !isGroup ? '#D1D5DB' : 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)') }}
      >
        {isOtherBlocked ? (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : !otherUser && !isGroup ? (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : tennisPhoto && !isGroup ? (
          <img src={tennisPhoto} alt={otherUser!.name} className="w-full h-full object-cover" />
        ) : (
          <span className={isGroup ? 'text-base' : ''}>{isGroup ? '🎾' : avatarInitial}</span>
        )}
      </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-sm truncate ${hasUnread ? 'font-bold' : 'font-semibold'}`}
              style={{ color: '#0F2118' }}
            >
              {displayName}{courtName ? <span style={{ color: '#1B4332', fontWeight: 400 }}> · {courtName}</span> : null}
            </span>
            {isGroup && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                style={{ background: 'rgba(45,106,79,0.1)', color: '#2D6A4F' }}
              >
                그룹
              </span>
            )}
          </div>
          <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: 'rgba(0,0,0,0.33)' }}>
            {formatTime(chat.last_message?.created_at)}
          </span>
        </div>
        {!isGroup && !isOtherBlocked && otherUser?.experience && (
          <p className="text-xs mb-0.5" style={{ color: 'rgba(27,67,50,0.5)' }}>
            구력 {otherUser.experience}
          </p>
        )}
        <div className="flex items-center justify-between">
          <p
            className={`text-sm truncate ${hasUnread ? 'font-semibold' : ''}`}
            style={{ color: hasUnread ? '#0F2118' : 'rgba(0,0,0,0.48)' }}
          >
            {chat.last_message?.content ?? '메시지가 없습니다.'}
          </p>
          {hasUnread && (
            <span
              className="ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white flex items-center justify-center"
              style={{ background: '#E05555' }}
            >
              {chat.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Dating Chat Rows
// ─────────────────────────────────────────────────────────────

function DatingGroupChatRow({ gc, blockedIds = [], onPress }: { gc: CourtGroupChat; blockedIds?: string[]; onPress: () => void }) {
  const host = gc.host as Profile | undefined;
  const hasUnread = (gc.unread_count ?? 0) > 0;
  const courtName = (gc.court as { court_name?: string } | undefined)?.court_name;
  const isHostBlocked = host ? blockedIds.includes(host.user_id ?? '') : false;
  const rawHostName = host?.name ?? '설레는 만남';
  const maskedHostName = isHostBlocked ? '알 수 없음' : rawHostName;
  const displayTitle = courtName ?? maskedHostName;

  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 p-4 rounded-3xl transition active:scale-[0.98] text-left relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)',
        border: '1px solid rgba(201,84,122,0.18)',
        boxShadow: '0 2px 12px rgba(201,84,122,0.09)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 85% 40%, rgba(255,190,210,0.14) 0%, transparent 60%)',
        }}
      />

      <div className="relative flex-shrink-0">
        <div
          className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-xl"
          style={{ background: isHostBlocked ? '#E5E7EB' : 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)' }}
        >
          {isHostBlocked ? (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : host?.photo_url ? (
            <img src={host.photo_url} alt={host.name} className="w-full h-full object-cover" />
          ) : (
            <span>{host?.name?.charAt(0) ?? '🥂'}</span>
          )}
        </div>
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
          style={{
            background: 'linear-gradient(135deg, #C9A84C 0%, #E8A598 100%)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        >
          🥂
        </div>
      </div>

      <div className="flex-1 min-w-0 relative z-[1]">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-sm truncate ${hasUnread ? 'font-bold' : 'font-semibold'}`}
              style={{ color: '#2D1820' }}
            >
              {displayTitle}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
              style={{ background: 'rgba(201,84,122,0.1)', color: '#C9547A' }}
            >
              그룹
            </span>
          </div>
          <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: 'rgba(139,48,96,0.4)' }}>
            {formatTime(gc.last_message?.created_at)}
          </span>
        </div>
        {host?.name && courtName && (
          <p className="text-xs mb-0.5 truncate" style={{ color: 'rgba(139,48,96,0.45)' }}>
            {maskedHostName}
          </p>
        )}
        <div className="flex items-center justify-between">
          <p
            className={`text-sm truncate ${hasUnread ? 'font-semibold' : ''}`}
            style={{ color: hasUnread ? '#2D1820' : 'rgba(139,48,96,0.5)' }}
          >
            {gc.last_message?.content ?? '메시지가 없습니다.'}
          </p>
          {hasUnread && (
            <span
              className="ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white flex items-center justify-center"
              style={{ background: '#C9547A' }}
            >
              {gc.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function DatingChatRow({
  chat,
  otherUser,
  groupTitle,
  groupParticipantPhotos,
  courtName,
  blockedIds = [],
  onPress,
}: {
  chat: Chat;
  otherUser: Profile | null;
  groupTitle?: string;
  groupParticipantPhotos?: Array<{ user_id: string; name: string; photo_url?: string }>;
  courtName?: string;
  blockedIds?: string[];
  onPress: () => void;
}) {
  const hasUnread = (chat.unread_count ?? 0) > 0;
  const isGroup = !!chat.is_group;
  const isOtherBlocked = otherUser ? blockedIds.includes(otherUser.user_id) : false;
  const maskedName = isOtherBlocked ? '알 수 없음' : (otherUser?.name ?? (isGroup ? '설레는 만남 그룹' : '알 수 없음'));
  const maskedGroupTitle = isGroup && groupTitle
    ? groupTitle.split(', ').map((n) => {
        const match = groupParticipantPhotos?.find((p) => p.name === n);
        return match && blockedIds.includes(match.user_id) ? '알 수 없음' : n;
      }).join(', ')
    : groupTitle;
  const displayName = maskedGroupTitle ?? maskedName;

  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 p-4 rounded-3xl transition active:scale-[0.98] text-left relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 100%)',
        border: '1px solid rgba(201,84,122,0.18)',
        boxShadow: '0 2px 12px rgba(201,84,122,0.09)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 85% 40%, rgba(255,190,210,0.14) 0%, transparent 60%)',
        }}
      />

      <div className="relative flex-shrink-0">
        {isGroup && groupParticipantPhotos && groupParticipantPhotos.length > 0 ? (
          <GroupAvatarGrid
            participants={groupParticipantPhotos.map((p) => blockedIds.includes(p.user_id) ? { ...p, photo_url: undefined, _blocked: true } : p)}
            accentBg="linear-gradient(135deg, #8B2252 0%, #C9547A 100%)"
            borderColor="rgba(201,84,122,0.15)"
            blockedIds={blockedIds}
          />
        ) : (
        <div
          className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-white font-bold text-xl"
          style={{ background: isOtherBlocked ? '#E5E7EB' : (!otherUser && !isGroup ? '#D1D5DB' : 'linear-gradient(135deg, #8B2252 0%, #C9547A 100%)') }}
        >
          {isOtherBlocked ? (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : !otherUser && !isGroup ? (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : otherUser?.photo_url && !isGroup ? (
            <img src={otherUser.photo_url} alt={otherUser.name} className="w-full h-full object-cover" />
          ) : (
            <span>{isGroup ? '🥂' : (otherUser?.name?.charAt(0) ?? '?')}</span>
          )}
        </div>
        )}
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
          style={{
            background: 'linear-gradient(135deg, #C9A84C 0%, #E8A598 100%)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        >
          {isGroup ? '🥂' : '🎾'}
        </div>
      </div>

      <div className="flex-1 min-w-0 relative z-[1]">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-sm truncate ${hasUnread ? 'font-bold' : 'font-semibold'}`}
              style={{ color: '#2D1820' }}
            >
              {displayName}{courtName ? <span style={{ color: '#C9A84C', fontWeight: 400 }}> · {courtName}</span> : null}
            </span>
            {!isGroup && !isOtherBlocked && otherUser?.age && (
              <span className="text-xs flex-shrink-0 font-medium" style={{ color: 'rgba(139,48,96,0.55)' }}>
                {otherUser.age}세
              </span>
            )}
            {isGroup && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium"
                style={{ background: 'rgba(201,84,122,0.1)', color: '#C9547A' }}
              >
                그룹
              </span>
            )}
          </div>
          <span className="text-[11px] flex-shrink-0 ml-2" style={{ color: 'rgba(139,48,96,0.4)' }}>
            {formatTime(chat.last_message?.created_at)}
          </span>
        </div>
        {!isGroup && !isOtherBlocked && otherUser?.experience && (
          <p className="text-xs mb-0.5 font-medium" style={{ color: 'rgba(139,48,96,0.48)' }}>
            🎾 구력 {otherUser.experience}
          </p>
        )}
        <div className="flex items-center justify-between">
          <p
            className={`text-sm truncate ${hasUnread ? 'font-semibold' : ''}`}
            style={{ color: hasUnread ? '#2D1820' : 'rgba(139,48,96,0.5)' }}
          >
            {chat.last_message?.content ?? '메시지가 없습니다.'}
          </p>
          {hasUnread && (
            <span
              className="ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white flex items-center justify-center"
              style={{ background: '#C9547A' }}
            >
              {chat.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
