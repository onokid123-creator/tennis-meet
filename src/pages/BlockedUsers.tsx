import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type BlockedUserItem = {
  id: string;
  blocked_id: string;
  created_at: string | null;
  profile: {
    user_id: string;
    name?: string | null;
    photo_url?: string | null;
    photo_urls?: string[] | string | null;
    dating_representative_photo_url?: string | null;
    deleted_at?: string | null;
  } | null;
};

const parsePhotoUrls = (value: string[] | string | null | undefined) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // Continue with fallback parsing.
  }

  return value
    .split(',')
    .map((item) => item.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
};

export default function BlockedUsers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<BlockedUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockTarget, setUnblockTarget] = useState<BlockedUserItem | null>(null);
  const [unblockSubmitting, setUnblockSubmitting] = useState(false);

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data: blockRows, error: blockError } = await supabase
          .from('blocks')
          .select('id,blocked_id,created_at')
          .eq('blocker_id', user.id)
          .order('created_at', { ascending: false });

        if (blockError) throw blockError;

        const blockedIds = (blockRows ?? []).map((row) => row.blocked_id);

        if (blockedIds.length === 0) {
          setItems([]);
          return;
        }

        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select(
            'user_id,name,photo_url,photo_urls,dating_representative_photo_url,deleted_at'
          )
          .in('user_id', blockedIds);

        if (profileError) throw profileError;

        const profileMap = Object.fromEntries(
          (profiles ?? []).map((profile) => [profile.user_id, profile])
        );

        setItems(
          (blockRows ?? []).map((row) => ({
            ...row,
            profile: profileMap[row.blocked_id] ?? null,
          }))
        );
      } catch (error) {
        console.error('[BlockedUsers] fetch failed:', error);
        alert('차단한 사람 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchBlockedUsers();
  }, [user]);

  const handleUnblockConfirm = async () => {
    if (!user || !unblockTarget || unblockSubmitting) return;

    setUnblockSubmitting(true);

    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', unblockTarget.blocked_id);

      if (error) throw error;

      const raw = localStorage.getItem('blocked_users');
      let localBlocked: string[] = [];

      try {
        localBlocked = raw ? JSON.parse(raw) : [];
      } catch {
        localBlocked = [];
      }

      localStorage.setItem(
        'blocked_users',
        JSON.stringify(
          localBlocked.filter((id) => id !== unblockTarget.blocked_id)
        )
      );

      setItems((prev) =>
        prev.filter((item) => item.blocked_id !== unblockTarget.blocked_id)
      );
      setUnblockTarget(null);
      alert('차단을 해제했습니다.');
    } catch (error) {
      console.error('[BlockedUsers] unblock failed:', error);
      alert('차단 해제에 실패했습니다.');
    } finally {
      setUnblockSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#F8F9F4',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4"
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid rgba(31,61,42,0.08)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-xl"
          style={{
            color: '#1B4332',
            background: 'rgba(31,61,42,0.06)',
          }}
          aria-label="뒤로가기"
        >
          ‹
        </button>

        <div>
          <h1 className="text-lg font-extrabold" style={{ color: '#10251B' }}>
            차단한 사람
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(16,37,27,0.5)' }}>
            내가 차단한 사용자를 관리할 수 있어요.
          </p>
        </div>
      </header>

      <main className="px-4 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{
                borderColor: 'rgba(45,106,79,0.35)',
                borderTopColor: 'transparent',
              }}
            />
            <p className="text-sm" style={{ color: 'rgba(31,61,42,0.55)' }}>
              차단 목록을 불러오는 중...
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4"
              style={{ background: 'rgba(45,106,79,0.08)' }}
            >
              ✓
            </div>
            <p className="font-bold text-base" style={{ color: '#1F3D2A' }}>
              차단한 사람이 없어요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const profile = item.profile;
              const photos = [
                profile?.dating_representative_photo_url,
                ...parsePhotoUrls(profile?.photo_urls),
                profile?.photo_url,
              ].filter(Boolean) as string[];

              const photo = Array.from(new Set(photos))[0];
              const unavailable = !profile || Boolean(profile.deleted_at);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl px-4 py-4"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(31,61,42,0.10)',
                    boxShadow: '0 6px 18px rgba(31,61,42,0.06)',
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ background: '#EEF3EF' }}
                  >
                    {photo && !unavailable ? (
                      <img
                        src={photo}
                        alt={profile?.name || '프로필'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">👤</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-base font-bold truncate"
                      style={{ color: '#10251B' }}
                    >
                      {unavailable
                        ? '이용할 수 없는 사용자'
                        : profile?.name || '이름 없음'}
                    </p>

                    {item.created_at && (
                      <p
                        className="text-xs mt-1"
                        style={{ color: 'rgba(16,37,27,0.48)' }}
                      >
                        {new Date(item.created_at).toLocaleDateString('ko-KR')} 차단
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setUnblockTarget(item)}
                    className="px-3 py-2 rounded-xl text-xs font-bold shrink-0 active:scale-95"
                    style={{
                      color: '#1B4332',
                      background: 'rgba(45,106,79,0.08)',
                      border: '1px solid rgba(45,106,79,0.18)',
                    }}
                  >
                    차단 해제
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {unblockTarget && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => {
            if (!unblockSubmitting) setUnblockTarget(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white px-5 py-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              className="text-xl font-extrabold text-center mb-3"
              style={{ color: '#10251B' }}
            >
              차단을 해제할까요?
            </h2>

            <p
              className="text-sm text-center leading-6 mb-5"
              style={{ color: 'rgba(16,37,27,0.62)' }}
            >
              차단을 해제하면 서로의 프로필이 다시 표시될 수 있습니다.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={unblockSubmitting}
                onClick={() => setUnblockTarget(null)}
                className="h-12 rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                취소
              </button>

              <button
                type="button"
                disabled={unblockSubmitting}
                onClick={handleUnblockConfirm}
                className="h-12 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: '#1B4332' }}
              >
                {unblockSubmitting ? '해제 중...' : '차단 해제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
