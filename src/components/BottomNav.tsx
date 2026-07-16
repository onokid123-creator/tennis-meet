import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Home, MessageCircle, FileText, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface BottomNavProps {
  active: 'home' | 'chats' | 'applications' | 'profile';
}

export default function BottomNav({ active }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unreadChats, setUnreadChats] = useState(0);
  const [pendingApps, setPendingApps] = useState(0);
  const locationRef = useRef(location.pathname);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  const activeChatId = (() => {
    const m = location.pathname.match(/^\/chat\/(.+)$/);
    return m ? m[1] : null;
  })();

  const fetchUnreadCounts = useCallback(async (currentChatId: string | null = null) => {
    if (!user) {
      setUnreadChats(0);
      setPendingApps(0);
      return;
    }

    const getCount = async (label: string, query: any) => {
      const { count, error } = await query;
      if (error) {
        console.error(`[BottomNav] ${label} count failed`, error);
        return 0;
      }
      return count || 0;
    };

    try {
      const { data: participantRows, error: participantError } = await supabase
        .from('chat_participants')
        .select('chat_id,last_read_at')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (participantError) {
        console.error('[BottomNav] chat participants failed', participantError);
        setUnreadChats(0);
      } else {
        const readMap = new Map<string, string | null>();

        (participantRows ?? []).forEach((row) => {
          if (row.chat_id) {
            readMap.set(row.chat_id, row.last_read_at ?? null);
          }
        });

        const chatIds = Array.from(readMap.keys()).filter((id) => id !== currentChatId);
        let unreadMessageCount = 0;

        if (chatIds.length > 0) {
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('id,chat_id,sender_id,created_at,type')
            .in('chat_id', chatIds)
            .neq('sender_id', user.id)
            .or('type.is.null,type.neq.system');

          if (messagesError) {
            console.error('[BottomNav] unread messages failed', messagesError);
          } else {
            (messages ?? []).forEach((msg) => {
              if (!msg.chat_id || !msg.created_at) return;

              const lastReadAt = readMap.get(msg.chat_id);

              if (!lastReadAt || new Date(msg.created_at) > new Date(lastReadAt)) {
                unreadMessageCount += 1;
              }
            });
          }
        }

        setUnreadChats(unreadMessageCount);
      }

      const appsCount = await getCount(
        'court applications',
        supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .eq('status', 'pending')
          .eq('receiver_deleted', false)
      );

      const datingPeopleCount = await getCount(
        'dating people applications',
        supabase
          .from('dating_people_applications')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .eq('receiver_deleted', false)
          .is('receiver_seen_at', null)
      );

      const datingInterestCount = await getCount(
        'dating interests',
        supabase
          .from('dating_interests')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'active')
          .eq('receiver_deleted', false)
          .is('receiver_seen_at', null)
      );

      const mealReceivedCount = await getCount(
        'meal received',
        supabase
          .from('meal_proposals')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'pending')
          .eq('receiver_deleted', false)
      );

      const mealResultCount = await getCount(
        'meal result',
        supabase
          .from('meal_proposals')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', user.id)
          .eq('sender_seen', false)
          .in('status', ['accepted', 'rejected'])
      );

      const acceptedNotifCount = await getCount(
        'accepted applications',
        supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('applicant_id', user.id)
          .eq('status', 'accepted')
          .eq('applicant_notified', false)
          .eq('sender_deleted', false)
          .not('chat_id', 'is', null)
      );

      const nextPendingApps =
        appsCount +
        datingPeopleCount +
        datingInterestCount +
        mealReceivedCount +
        mealResultCount +
        acceptedNotifCount;

      console.log('[BottomNav badge counts]', {
        userId: user.id,
        appsCount,
        datingPeopleCount,
        datingInterestCount,
        mealReceivedCount,
        mealResultCount,
        acceptedNotifCount,
        nextPendingApps,
      });

      setPendingApps(nextPendingApps);
    } catch (error) {
      console.error('[BottomNav] fetchUnreadCounts failed', error);
      setUnreadChats(0);
      setPendingApps(0);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCounts(activeChatId);

    // Realtime이 기본이고, interval은 모바일 WebView에서 realtime이 잠시 죽는 경우를 위한 fallback.
    const interval = setInterval(() => fetchUnreadCounts(activeChatId), 30000);

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCounts(activeChatId);
      }
    };

    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [user, activeChatId, fetchUnreadCounts]);

  useEffect(() => {
    if (!user) return;

    const scheduleFetchUnreadCounts = () => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      fetchDebounceRef.current = setTimeout(() => {
        const currentActiveChatId = locationRef.current.match(/^\/chat\/(.+)$/)?.[1] ?? null;
        fetchUnreadCounts(currentActiveChatId);
      }, 600);
    };

    const messagesChannel = supabase
      .channel(`bottomnav_messages_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as { sender_id: string; chat_id: string };
          if (msg.sender_id !== user.id) {
            const currentActiveChatId = locationRef.current.match(/^\/chat\/(.+)$/)?.[1] ?? null;
            if (msg.chat_id !== currentActiveChatId) {
              scheduleFetchUnreadCounts();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          scheduleFetchUnreadCounts();
        }
      )
      .subscribe();

    const appsChannel = supabase
      .channel(`bottomnav_applications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
        },
        () => {
          scheduleFetchUnreadCounts();
        }
      )
      .subscribe();

    const mealChannel = supabase
      .channel(`bottomnav_meal_proposals_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meal_proposals',
        },
        () => {
          scheduleFetchUnreadCounts();
        }
      )
      .subscribe();

    const datingChannel = supabase
      .channel(`bottomnav_dating_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dating_interests' }, () => {
        scheduleFetchUnreadCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dating_people_applications' }, () => {
        scheduleFetchUnreadCounts();
      })
      .subscribe();

    return () => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(appsChannel);
      supabase.removeChannel(mealChannel);
      supabase.removeChannel(datingChannel);
    };
  }, [user, fetchUnreadCounts]);

  useEffect(() => {
    const handleBottomNavRefresh = () => {
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);

      fetchDebounceRef.current = setTimeout(() => {
        const currentActiveChatId = locationRef.current.match(/^\/chat\/(.+)$/)?.[1] ?? null;
        fetchUnreadCounts(currentActiveChatId);
      }, 150);
    };

    window.addEventListener('tennismeet:bottomnav-refresh', handleBottomNavRefresh);

    return () => {
      window.removeEventListener('tennismeet:bottomnav-refresh', handleBottomNavRefresh);
    };
  }, [fetchUnreadCounts]);

  const navItems = [
    { id: 'home', label: '홈', icon: Home, path: '/home', badge: 0 },
    { id: 'chats', label: '채팅', icon: MessageCircle, path: '/chats', badge: unreadChats },
    { id: 'applications', label: '신청', icon: FileText, path: '/applications', badge: pendingApps },
    { id: 'profile', label: '프로필', icon: User, path: '/profile', badge: 0 },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 px-6"
      style={{
        background: '#F8F9F4',
        borderTop: '1px solid #E0E0E0',
        zIndex: 9999,
        paddingTop: 10,
        paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
        minHeight: 64,
        pointerEvents: 'auto',
      }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'chats') {
                  navigate(`/chats?refresh=${Date.now()}`);
                } else {
                  navigate(item.path);
                }
              }}
              className="flex flex-col items-center gap-1 relative"
            >
              <div className="relative">
                <Icon
                  className="w-6 h-6"
                  style={{ color: isActive ? '#2D6A4F' : '#AAAAAA' }}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className="text-xs"
                style={{
                  color: isActive ? '#2D6A4F' : '#AAAAAA',
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
