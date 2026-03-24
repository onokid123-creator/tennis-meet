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

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  const activeChatId = (() => {
    const m = location.pathname.match(/^\/chat\/(.+)$/);
    return m ? m[1] : null;
  })();

  const fetchUnreadCounts = useCallback(async (currentChatId: string | null = null) => {
    if (!user) return;

    const { data: participantRows } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id);

    const chatIds = (participantRows ?? []).map((r) => r.chat_id);

    if (chatIds.length > 0) {
      const filteredIds = currentChatId
        ? chatIds.filter((id) => id !== currentChatId)
        : chatIds;
      if (filteredIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('chat_id', filteredIds)
          .eq('is_read', false)
          .neq('sender_id', user.id);
        setUnreadChats(count || 0);
      } else {
        setUnreadChats(0);
      }
    } else {
      setUnreadChats(0);
    }

    const { count: appsCount } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'pending')
      .eq('receiver_deleted', false);

    const { count: mealReceivedCount } = await supabase
      .from('meal_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .eq('receiver_deleted', false);

    const { count: mealResultCount } = await supabase
      .from('meal_proposals')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', user.id)
      .eq('sender_seen', false)
      .in('status', ['accepted', 'rejected']);

    setPendingApps((appsCount || 0) + (mealReceivedCount || 0) + (mealResultCount || 0));
  }, [user]);

  useEffect(() => {
    fetchUnreadCounts(activeChatId);
    const interval = setInterval(() => fetchUnreadCounts(activeChatId), 3000);
    return () => clearInterval(interval);
  }, [user, activeChatId, fetchUnreadCounts]);

  useEffect(() => {
    if (!user) return;
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
              fetchUnreadCounts(currentActiveChatId);
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
          const currentActiveChatId = locationRef.current.match(/^\/chat\/(.+)$/)?.[1] ?? null;
          fetchUnreadCounts(currentActiveChatId);
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
          const currentActiveChatId = locationRef.current.match(/^\/chat\/(.+)$/)?.[1] ?? null;
          fetchUnreadCounts(currentActiveChatId);
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
          const currentActiveChatId = locationRef.current.match(/^\/chat\/(.+)$/)?.[1] ?? null;
          fetchUnreadCounts(currentActiveChatId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(appsChannel);
      supabase.removeChannel(mealChannel);
    };
  }, [user, fetchUnreadCounts]);

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
              onClick={() => navigate(item.path)}
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
