import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourts } from '../contexts/CourtsContext';
import { supabase } from '../lib/supabase';
import { Court } from '../types';
import { Plus } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import TennisCourtCard from '../components/TennisCourtCard';
import BrandLogo from '../components/BrandLogo';
import SwipeCourtDeck from '../components/SwipeCourtDeck';
import { useVisualViewport } from '../hooks/useVisualViewport';

type Tab = 'others' | 'mine';
type CategoryTab = 'tennis' | 'dating';

function DatingProfileRequiredPopup({ onRegister, onClose }: { onRegister: () => void; onClose: () => void }) {
  const vpHeight = useVisualViewport();
  const maxH = Math.floor(vpHeight * 0.82);

  return (
    <div
      className="sheet-overlay z-50"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="sheet-container shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F0 100%)',
          maxHeight: `${maxH}px`,
          marginBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-body px-6 pt-6 pb-2">
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(183,110,121,0.3)' }} />
          <p className="text-lg font-bold mb-1" style={{ color: '#2D1820' }}>설레는 만남은 추가 정보가 필요해요!</p>
          <p className="text-xs mb-6" style={{ color: 'rgba(45,24,32,0.5)' }}>MBTI · 키 · 사진 3장을 등록하면 설레는 만남을 즐길 수 있어요</p>
        </div>
        <div className="px-6 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 52px)' }}>
          <button
            onClick={onRegister}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #B76E79 0%, #C9A84C 100%)' }}
          >
            프로필 등록하기
          </button>
        </div>
      </div>
    </div>
  );
}


export default function Home() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { refreshKey, triggerRefresh } = useCourts();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('home_active_tab');
    localStorage.removeItem('home_active_tab');
    return saved === 'mine' ? 'mine' : 'others';
  });
  const [categoryTab, setCategoryTab] = useState<CategoryTab>(() => {
    const saved = localStorage.getItem('home_category_tab');
    if (saved === 'tennis' || saved === 'dating') return saved;
    return profile?.purpose === 'dating' ? 'dating' : 'tennis';
  });
  const [showDatingProfilePopup, setShowDatingProfilePopup] = useState(false);
  const [applyTargetCourt, setApplyTargetCourt] = useState<Court | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccessPurpose, setApplySuccessPurpose] = useState<'tennis' | 'dating' | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const userRef = useRef(user);
  const profileRef = useRef(profile);
  const blockedIdsRef = useRef<string[]>([]);

  useEffect(() => {
    userRef.current = user;
    profileRef.current = profile;
  }, [user, profile]);

  useEffect(() => {
    blockedIdsRef.current = blockedUserIds;
  }, [blockedUserIds]);

  useEffect(() => {
    const saved = localStorage.getItem('home_category_tab');
    if (!saved && profile?.purpose) {
      setCategoryTab(profile.purpose as CategoryTab);
    }
  }, [profile?.purpose]);

  useEffect(() => {
    if (!user) return;
    const localBlockedRaw = localStorage.getItem('blocked_users');
    const localBlocked: string[] = localBlockedRaw ? JSON.parse(localBlockedRaw) : [];
    Promise.all([
      supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
      supabase.from('blocks').select('blocker_id').eq('blocked_id', user.id),
    ]).then(([byMe, byOthers]) => {
      const blockedByMe = (byMe.data ?? []).map((r) => r.blocked_id);
      const blockedByOthers = (byOthers.data ?? []).map((r) => r.blocker_id);
      const merged = Array.from(new Set([...localBlocked, ...blockedByMe, ...blockedByOthers]));
      setBlockedUserIds(merged);
    });
  }, [user]);

  const COURT_FIELDS = 'id,user_id,purpose,status,court_name,court_number,date,start_time,end_time,format,match_type,description,male_slots,female_slots,male_count,female_count,confirmed_male_slots,confirmed_female_slots,current_participants,capacity,cost,experience_wanted,court_fee,tennis_photo_url,owner_photo,owner_photos,owner_name,owner_age,owner_gender,owner_mbti,owner_height,owner_bio,owner_experience,court_intro,created_at';
  const PROFILE_FIELDS = 'user_id,name,photo_url,tennis_photo_url,experience,tennis_style,age,gender,purpose';

  const fetchCourts = useCallback(async (purpose: CategoryTab, tab: Tab) => {
    const currentUser = userRef.current;

    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(() => setLoading(false), 5000);

    try {
      let query = supabase
        .from('courts')
        .select(COURT_FIELDS)
        .eq('purpose', purpose)
        .order('created_at', { ascending: false });

      if (tab === 'mine') {
        query = query.eq('user_id', currentUser.id);
      } else {
        query = query.neq('status', 'closed');
      }

      const { data, error } = await query;

      if (error) {
        console.error('코트 가져오기 실패:', error);
        setCourts([]);
        return;
      }

      let result = data || [];

      if (result.length > 0) {
        const hostIds = Array.from(new Set(result.map((c) => c.user_id).filter(Boolean)));
        const { data: profilesData } = await supabase
          .from('profiles')
          .select(PROFILE_FIELDS)
          .in('user_id', hostIds);
        const profileMap: Record<string, unknown> = {};
        (profilesData ?? []).forEach((p) => { profileMap[p.user_id] = p; });
        result = result.map((c) => ({ ...c, profile: profileMap[c.user_id] ?? null }));
      }

      if (tab === 'others' && purpose === 'tennis') {
        const now = new Date();
        result = result.filter((c) => {
          if (!c.date || !c.start_time) return true;
          const startDateTime = new Date(`${c.date}T${c.start_time}`);
          return now < startDateTime;
        });
      }

      const currentBlocked = blockedIdsRef.current;
      if (tab === 'others' && currentBlocked.length > 0) {
        result = result.filter((c) => !currentBlocked.includes(c.user_id));
      }

      setCourts(result);
    } catch (err) {
      console.error('코트 가져오기 오류:', err);
      setCourts([]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  const fetchCourtsRef = useRef(fetchCourts);
  useEffect(() => { fetchCourtsRef.current = fetchCourts; }, [fetchCourts]);

  useEffect(() => {
    if (!user) return;
    fetchCourts(categoryTab, activeTab);
  }, [activeTab, categoryTab, user, fetchCourts]);

  useEffect(() => {
    if (!user) return;
    fetchCourtsRef.current(categoryTab, activeTab);
  }, [refreshKey]);

  useEffect(() => {
    if (!user) return;

    const channelName = `courts_home_${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, () => {
        fetchCourtsRef.current(categoryTab, activeTab);
      })
      .subscribe();

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchCourtsRef.current(categoryTab, activeTab);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, categoryTab, activeTab]);

  const handleCategoryTab = (tab: CategoryTab) => {
    if (tab === categoryTab) return;
    const userPurpose = profile?.purpose;

    if (tab === 'dating' && userPurpose === 'tennis') {
      if (!profile?.mbti && !profile?.height) {
        setShowDatingProfilePopup(true);
        return;
      }
    }

    if (tab === 'tennis' && userPurpose === 'dating') {
      if (!profile?.tennis_style) {
        navigate('/tennis-profile-setup');
        return;
      }
    }

    setCategoryTab(tab);
    setActiveTab('others');
    localStorage.setItem('home_category_tab', tab);
  };

  const openApplyPopup = (court: Court) => {
    setApplyTargetCourt(court);
    setApplyMessage('');
  };

  const handleApplySubmit = async () => {
    if (!user || !profile || !applyTargetCourt) return;
    if (applyLoading) return;

    const { data: existingApp } = await supabase
      .from('applications')
      .select('id, status')
      .eq('court_id', applyTargetCourt.id)
      .eq('applicant_id', user.id)
      .maybeSingle();

    if (existingApp) {
      if (existingApp.status === 'pending') {
        alert('이미 신청한 코트입니다. 호스트의 수락을 기다려주세요.');
      } else if (existingApp.status === 'accepted') {
        alert('이미 수락된 신청입니다. 채팅 탭을 확인해주세요.');
      } else {
        alert('이미 신청한 코트입니다.');
      }
      setApplyTargetCourt(null);
      return;
    }

    setApplyLoading(true);
    const { error } = await supabase.from('applications').insert({
      court_id: applyTargetCourt.id,
      owner_id: applyTargetCourt.user_id,
      host_id: applyTargetCourt.user_id,
      applicant_id: user.id,
      purpose: applyTargetCourt.purpose,
      status: 'pending',
      message: applyMessage.trim() || null,
    });
    setApplyLoading(false);

    if (error) {
      alert('신청에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    const successPurpose = applyTargetCourt.purpose;
    setApplyTargetCourt(null);
    setApplyMessage('');
    setApplySuccessPurpose(successPurpose);
  };

  const handleDelete = (courtId: string) => {
    setDeleteConfirmId(courtId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId || !user) return;
    setDeleteLoading(true);
    const { error } = await supabase.from('courts').delete().eq('id', deleteConfirmId).eq('user_id', user.id);
    setDeleteLoading(false);
    setDeleteConfirmId(null);
    if (!error) triggerRefresh();
  };

  const handleEdit = (court: Court) => {
    navigate('/create-court', { state: { editCourt: court } });
  };

  const isDating = categoryTab === 'dating';

  const headerBg = isDating
    ? 'linear-gradient(180deg, #F43F5E 0%, #FECDD3 100%)'
    : '#1B4332';

  const pageBg = isDating
    ? '#FFF1F2'
    : '#F0FDF4';

  const activeTabColor = isDating ? '#FB7185' : '#4ADE80';
  const accentGold = '#C9A84C';

  return (
    <div className="min-h-screen pb-20" style={{ background: pageBg }}>
      <header
        className="sticky top-0 z-10"
        style={{ background: headerBg, boxShadow: isDating ? '0 4px 24px rgba(251,113,133,0.3)' : '0 4px 24px rgba(26,74,58,0.3)' }}
      >
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <BrandLogo size="sm" light={true} />
          <button
            onClick={() => navigate('/create-court', { state: { purpose: categoryTab } })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm transition active:scale-95"
            style={{ background: accentGold, color: '#fff', boxShadow: '0 2px 8px rgba(201,168,76,0.4)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>코트 등록</span>
          </button>
        </div>

        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => handleCategoryTab('tennis')}
            className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200"
            style={categoryTab === 'tennis'
              ? { background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)' }
              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1.5px solid rgba(255,255,255,0.1)' }
            }
          >
            🎾 오직 테니스
          </button>
          <button
            onClick={() => handleCategoryTab('dating')}
            className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200"
            style={categoryTab === 'dating'
              ? { background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)' }
              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1.5px solid rgba(255,255,255,0.1)' }
            }
          >
            🥂 설레는 만남
          </button>
        </div>

        <div className="flex" style={{ borderTop: isDating ? '1px solid rgba(251,113,133,0.2)' : '1px solid rgba(201,168,76,0.2)' }}>
          <button
            onClick={() => setActiveTab('others')}
            className="flex-1 py-3 text-sm font-semibold transition-all duration-200 relative"
            style={{ color: activeTab === 'others' ? '#fff' : 'rgba(255,255,255,0.45)' }}
          >
            {categoryTab === 'tennis' ? '파트너 찾기' : '인연 찾기'}
            {activeTab === 'others' && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                style={{ width: '40%', background: activeTabColor }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className="flex-1 py-3 text-sm font-semibold transition-all duration-200 relative"
            style={{ color: activeTab === 'mine' ? '#fff' : 'rgba(255,255,255,0.45)' }}
          >
            내 코트
            {activeTab === 'mine' && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full"
                style={{ width: '40%', background: activeTabColor }}
              />
            )}
          </button>
        </div>
      </header>

      <div className={isDating ? 'px-4 py-4' : 'px-4 py-5'}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: isDating ? 'rgba(251,113,133,0.4)' : 'rgba(45,106,79,0.4)', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: isDating ? 'rgba(251,113,133,0.6)' : 'rgba(45,106,79,0.6)' }}>불러오는 중...</p>
          </div>
        ) : courts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            {isDating ? (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(251,113,133,0.1)', border: '1.5px solid rgba(251,113,133,0.25)' }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FB7185" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                </svg>
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(27,67,50,0.08)', border: '1.5px solid rgba(27,67,50,0.2)' }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12a15.3 15.3 0 0 0 4 4c1.9 1.3 4 2 6 2s4.1-.7 6-2a15.3 15.3 0 0 0 4-4"/>
                  <path d="M2 12a15.3 15.3 0 0 1 4-4 11.6 11.6 0 0 1 6-2 11.6 11.6 0 0 1 6 2 15.3 15.3 0 0 1 4 4"/>
                </svg>
              </div>
            )}
            <div className="text-center">
              <p className="font-semibold text-sm mb-1" style={{ color: isDating ? '#FB7185' : '#2D6A4F' }}>
                {isDating ? activeTab === 'others' ? '아직 인연이 없어요' : '아직 등록한 코트가 없어요' : activeTab === 'others' ? '아직 파트너가 없어요' : '아직 등록한 코트가 없어요'}
              </p>
              <p className="text-xs" style={{ color: isDating ? 'rgba(251,113,133,0.7)' : 'rgba(45,106,79,0.55)' }}>
                {isDating ? '첫 번째 설레는 만남을 열어보세요!' : '첫 코트를 등록해보세요!'}
              </p>
            </div>
          </div>
        ) : isDating ? (
          <SwipeCourtDeck
            courts={courts}
            onApply={(court) => openApplyPopup(court)}
            isOwnerMode={activeTab === 'mine'}
            onEdit={(court) => handleEdit(court)}
            onDelete={(court) => handleDelete(court.id)}
          />
        ) : (
          <div className="space-y-4">
            {courts.map((court) => (
              <TennisCourtCard
                key={court.id}
                court={court}
                isOwner={court.user_id === user?.id}
                onApply={activeTab === 'others' ? () => openApplyPopup(court) : undefined}
                onEdit={() => handleEdit(court)}
                onDelete={() => handleDelete(court.id)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav active="home" />

      {showDatingProfilePopup && (
        <DatingProfileRequiredPopup
          onRegister={() => { setShowDatingProfilePopup(false); navigate('/dating-profile-setup'); }}
          onClose={() => setShowDatingProfilePopup(false)}
        />
      )}


      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl shadow-2xl flex flex-col"
            style={{ background: '#fff', maxHeight: '80dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-2">
              <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-gray-200" />
              <p className="font-bold text-gray-900 text-base mb-1">게시글 삭제</p>
              <p className="text-sm text-gray-400">이 게시글을 삭제하시겠어요? 삭제 후에는 복구할 수 없습니다.</p>
            </div>
            <div
              className="flex gap-2 px-5 py-4"
              style={{
                borderTop: '1px solid rgba(0,0,0,0.06)',
                background: '#fff',
                paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 20px)',
              }}
            >
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-sm transition active:scale-95"
                style={{ background: '#F3F4F6', color: '#374151' }}
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-white transition active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
              >
                {deleteLoading ? '삭제 중...' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {applyTargetCourt && (() => {
        const isDatingApply = applyTargetCourt.purpose === 'dating';
        const sheetBg = isDatingApply ? 'linear-gradient(160deg, #FB7185 0%, #FECDD3 100%)' : '#1B4332';
        return (
          <div
            className="fixed inset-0 z-[9999] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setApplyTargetCourt(null)}
          >
            <div
              className="w-full max-w-md rounded-t-3xl shadow-xl flex flex-col"
              style={{ background: sheetBg, maxHeight: '90dvh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 pt-5 flex-1 overflow-y-auto">
                <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: isDatingApply ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)' }} />
                <p className="font-bold text-lg text-center mb-4 text-white">
                  {isDatingApply ? '🥂 설레는 첫 인사를 보내보세요' : '🎾 테니스 신청 메시지'}
                </p>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder={isDatingApply
                    ? '예) 안녕하세요 😊 코트에서 만나고 싶어요!'
                    : '예) 안녕하세요! 같이 테니스 치고 싶어요 💪'}
                  rows={4}
                  className="w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none transition"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: isDatingApply ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.2)',
                    fontSize: '16px',
                  }}
                />
              </div>
              <div
                className="px-5 py-4"
                style={{
                  background: sheetBg,
                  borderTop: isDatingApply ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.1)',
                  paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 20px)',
                }}
              >
                <button
                  onClick={handleApplySubmit}
                  disabled={applyLoading}
                  className="w-full py-4 rounded-2xl font-bold text-sm transition active:scale-95 disabled:opacity-60"
                  style={{ background: isDatingApply ? '#F43F5E' : accentGold, color: '#fff', boxShadow: isDatingApply ? '0 4px 12px rgba(244,63,94,0.35)' : '0 4px 12px rgba(201,168,76,0.35)' }}
                >
                  {applyLoading ? '신청 중...' : '신청하기'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {applySuccessPurpose && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={() => setApplySuccessPurpose(null)}
        >
          <div
            className="w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl px-7 py-8 flex flex-col items-center gap-4"
            style={
              applySuccessPurpose === 'dating'
                ? { background: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4EF 100%)', border: '1.5px solid rgba(224,92,138,0.25)' }
                : { background: 'linear-gradient(135deg, #F0FAF4 0%, #E8F5EC 100%)', border: '1.5px solid rgba(27,67,50,0.2)' }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={
                applySuccessPurpose === 'dating'
                  ? { background: 'linear-gradient(135deg, #F9A8C9 0%, #F472B6 100%)', boxShadow: '0 4px 20px rgba(244,114,182,0.4)' }
                  : { background: 'linear-gradient(135deg, #52B788 0%, #2D6A4F 100%)', boxShadow: '0 4px 20px rgba(45,106,79,0.4)' }
              }
            >
              {applySuccessPurpose === 'dating' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div className="text-center">
              <p className="text-lg font-bold mb-1" style={{ color: applySuccessPurpose === 'dating' ? '#7C2D5E' : '#1B4332' }}>
                {applySuccessPurpose === 'dating' ? '신청이 전해졌어요 :)' : '신청이 완료됐어요!'}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: applySuccessPurpose === 'dating' ? 'rgba(124,45,94,0.65)' : 'rgba(27,67,50,0.65)' }}>
                {applySuccessPurpose === 'dating'
                  ? '호스트가 수락하면 채팅방이 열려요 💕'
                  : '호스트가 수락하면 채팅방이 열려요 🎾'}
              </p>
            </div>
            <button
              onClick={() => setApplySuccessPurpose(null)}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white transition active:scale-95"
              style={
                applySuccessPurpose === 'dating'
                  ? { background: 'linear-gradient(135deg, #E05C8A 0%, #C9547A 100%)', boxShadow: '0 4px 16px rgba(224,92,138,0.4)' }
                  : { background: 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)', boxShadow: '0 4px 16px rgba(27,67,50,0.4)' }
              }
            >
              알겠어요!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
