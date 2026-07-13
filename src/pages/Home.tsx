import { useEffect, useState, useCallback, useRef } from 'react';
import { purchaseProduct } from '../lib/billing';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourts } from '../contexts/CourtsContext';
import { supabase } from '../lib/supabase';
import { Court } from '../types';
import { Plus } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import BrandLogo from '../components/BrandLogo';
import SwipeCourtDeck from '../components/SwipeCourtDeck';
import TennisCourtCard from '../components/TennisCourtCard';
import { useVisualViewport } from '../hooks/useVisualViewport';
import PaywallLimitPopup from '../components/paywall/PaywallLimitPopup';
import TicketPackPopup from '../components/paywall/TicketPackPopup';
import SubscriptionPopup from '../components/paywall/SubscriptionPopup';
import DatingPeopleList from '../components/dating/DatingPeopleList';

type Tab = 'others' | 'mine';
type CategoryTab = 'tennis' | 'dating';
type DatingMode = 'court' | 'people';
type AgeFilter = 'all' | '20s' | '30s' | '40s' | '50s';
type GenderFilter = 'all' | 'male' | 'female';

const AGE_FILTERS: Array<{ key: AgeFilter; label: string }> = [
  { key: 'all', label: '전체' },
  { key: '20s', label: '20대' },
  { key: '30s', label: '30대' },
  { key: '40s', label: '40대' },
  { key: '50s', label: '50대 이상' },
];

const GENDER_FILTERS: Array<{ key: GenderFilter; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'male', label: '남성' },
  { key: 'female', label: '여성' },
];

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
          background: 'linear-gradient(135deg, #F0F4ED 0%, #F7FAF4 100%)',
          maxHeight: `${maxH}px`,
          marginBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-body px-6 pt-6 pb-2">
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(74,124,92,0.3)' }} />
          <p className="text-lg font-bold mb-1" style={{ color: '#234536' }}>설레는 만남은 추가 정보가 필요해요!</p>
          <p className="text-xs mb-6" style={{ color: 'rgba(35,69,54,0.55)' }}>MBTI · 키 · 사진 3장을 등록하면 설레는 만남을 즐길 수 있어요</p>
        </div>
        <div className="px-6 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 80px)' }}>
          <button
            onClick={onRegister}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #3D6B4E 0%, #5A8A6E 100%)' }}
          >
            프로필 등록하기
          </button>
        </div>
      </div>
    </div>
  );
}


const HOME_ACTIVITY_REGIONS = [
  '서울',
  '경기',
  '인천',
  '부산',
  '대구',
  '대전',
  '광주',
  '울산',
  '세종',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
];

export default function Home() {
const handlePurchase = async (productId: string) => {
  try {
    await purchaseProduct(productId);
    alert('결제 진행 중');
  } catch (e: any) {
    alert(e.message || '결제 실패');
  }
};
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { refreshKey, triggerRefresh } = useCourts();
const vpHeight = useVisualViewport();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('home_active_tab');
    localStorage.removeItem('home_active_tab');
    return saved === 'mine' ? 'mine' : 'others';
  });
 const [categoryTab, setCategoryTab] = useState<CategoryTab | null>(null);
  const [datingMode, setDatingMode] = useState<DatingMode>('court');
  const [selectedAgeFilters, setSelectedAgeFilters] = useState<AgeFilter[]>(['all']);
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<GenderFilter>('all');
  const [showDatingProfilePopup, setShowDatingProfilePopup] = useState(false);
  const [showHomeActivityRegionPopup, setShowHomeActivityRegionPopup] = useState(false);
  const [homeActivityRegionDraft, setHomeActivityRegionDraft] = useState('서울');
  const [homeActivityRegionSaving, setHomeActivityRegionSaving] = useState(false);
  const [homeActivityRegionLocal, setHomeActivityRegionLocal] = useState('');
  const [pendingDatingModeAfterRegion, setPendingDatingModeAfterRegion] = useState<DatingMode>('court');
const [showPaywallPopup, setShowPaywallPopup] = useState(false);
const [paywallStep, setPaywallStep] = useState<'first_limit' | 'ticket_pack' | 'subscription_intro' | 'out_of_tickets' | null>(null);
const [paywallKind, setPaywallKind] = useState<'court' | 'interest'>('court');
  const [applyTargetCourt, setApplyTargetCourt] = useState<Court | null>(null);
  const [interestedCourtIds, setInterestedCourtIds] = useState<Set<string>>(new Set());
  const [applyMessage, setApplyMessage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccessPurpose, setApplySuccessPurpose] = useState<'tennis' | 'dating' | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const userRef = useRef(user);
  const profileRef = useRef(profile);
  const blockedIdsRef = useRef<string[]>([]);
const latestCourtRequestKeyRef = useRef<string>('');
const lastCourtFetchRef = useRef<{ key: string; time: number }>({
  key: '',
  time: 0,
});

  useEffect(() => {
    userRef.current = user;
    profileRef.current = profile;
  }, [user, profile]);

  useEffect(() => {
    blockedIdsRef.current = blockedUserIds;
  }, [blockedUserIds]);

useEffect(() => {
  const saved = localStorage.getItem('home_category_tab');

  if (saved === 'tennis' || saved === 'dating') {
    setCategoryTab(saved);
  } else if (profile?.purpose) {
    setCategoryTab(profile.purpose);
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

  const COURT_FIELDS = 'id,user_id,purpose,status,court_name,court_number,date,start_time,end_time,format,match_type,description,male_slots,female_slots,male_count,female_count,confirmed_male_slots,confirmed_female_slots,current_participants,capacity,cost,experience_wanted,court_fee,tennis_photo_url,owner_photo,owner_photos,dating_photo_visibility,dating_representative_photo_url,owner_name,owner_age,owner_gender,owner_mbti,owner_height,owner_bio,owner_experience,court_intro,reservation_mode,created_at';
  const PROFILE_FIELDS = 'user_id,name,photo_url,photo_urls,dating_photo_visibility,dating_representative_photo_url,tennis_photo_url,experience,tennis_style,age,gender,purpose,mbti,height,activity_region';
const getCourtCacheKey = (purpose: CategoryTab, tab: Tab) => {
  return `cached_courts_${purpose}_${tab}`;
};

  const fetchCourts = useCallback(async (purpose: CategoryTab, tab: Tab) => {
    const currentUser = userRef.current;
const requestKey = getCourtCacheKey(purpose, tab);
latestCourtRequestKeyRef.current = requestKey;
const nowMs = Date.now();
const forceRefresh = localStorage.getItem('home_force_refresh') === '1';


if (forceRefresh) {
  localStorage.removeItem('home_force_refresh');
  localStorage.removeItem(requestKey);
}

lastCourtFetchRef.current = {
  key: requestKey,
  time: nowMs,
};

    if (!currentUser) {
      setLoading(false);
      return;
    }

    
    

    try {
      const now = new Date().toISOString();

let query = supabase
  .from('courts')
  .select(COURT_FIELDS)
  .eq('purpose', purpose)
  .eq('is_deleted', false)
  .neq('status', 'deleted')
  .or(`delete_at.is.null,delete_at.gt.${now}`)
  .order('created_at', { ascending: false });
      if (tab === 'mine') {
        query = query.eq('user_id', currentUser.id);
      }

      const { data, error } = await query;

if (error) {
  console.error('코트 가져오기 실패:', error);
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

      if (tab === 'others') {
        const now = new Date();
        result = result.filter((c) => {
          if (!c.date) return true;
          const hideAfter = new Date(`${c.date}T00:00:00`);
          hideAfter.setDate(hideAfter.getDate() + 1);
          return now < hideAfter;
        });
      }

      const currentBlocked = blockedIdsRef.current;
      if (tab === 'others' && currentBlocked.length > 0) {
        result = result.filter((c) => !currentBlocked.includes(c.user_id));
      }

      localStorage.setItem(requestKey, JSON.stringify(result));

if (latestCourtRequestKeyRef.current !== requestKey) {
  return;
}

setCourts(result);

    } catch (err) {
  console.error('코트 가져오기 오류:', err);
}finally {
      
      setLoading(false);
    }
}, []);

  const fetchCourtsRef = useRef(fetchCourts);
  useEffect(() => { fetchCourtsRef.current = fetchCourts; }, [fetchCourts]);

  useEffect(() => {
  if (!categoryTab) return;

  try {
    const saved = localStorage.getItem(getCourtCacheKey(categoryTab, activeTab));
    if (saved) {
      setCourts(JSON.parse(saved));
    } else {
      setCourts([]);
    }
  } catch {
    setCourts([]);
  }
}, [categoryTab, activeTab]);
useEffect(() => {
  if (!user || !categoryTab) return;
  fetchCourts(categoryTab, activeTab);
}, [activeTab, categoryTab, user, fetchCourts]);

useEffect(() => {
  if (!user || !categoryTab) return;
  fetchCourtsRef.current(categoryTab, activeTab);
}, [refreshKey, user, categoryTab, activeTab]);  

  useEffect(() => {
    if (!user) return;

    const channelName = `courts_home_${user.id}`;
    const channel = supabase
  .channel(channelName)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, () => {
    if (!categoryTab) return;
    fetchCourtsRef.current(categoryTab, activeTab);
  })
  .subscribe();

const handleVisibilityChange = () => {
  if (!document.hidden && categoryTab) {
    fetchCourtsRef.current(categoryTab, activeTab);
  }
};
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, categoryTab, activeTab]);
useEffect(() => {
  const handleAuthResynced = () => {
    if (categoryTab) {
      console.log('[Home] auth-resynced → fetchCourts 실행');
      fetchCourtsRef.current(categoryTab, activeTab);
    }
  };

  window.addEventListener('auth-resynced', handleAuthResynced);

  return () => {
    window.removeEventListener('auth-resynced', handleAuthResynced);
  };
}, [categoryTab, activeTab]);

  const hasDatingProfileForRegionGate = () => {
    const p = profile as any;
    return !!(
      p?.mbti ||
      p?.height ||
      p?.profile_completed ||
      p?.activity_region ||
      (Array.isArray(p?.photo_urls) && p.photo_urls.length > 0)
    );
  };

  const getCurrentActivityRegion = () => {
    const p = profile as any;
    return String(homeActivityRegionLocal || p?.activity_region || '').trim();
  };

  const getLatestActivityRegionForGate = async () => {
    const cached = getCurrentActivityRegion();
    if (cached) return cached;

    if (!user?.id) return '';

    const { data, error } = await supabase
      .from('profiles')
      .select('activity_region')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[Home] activity region recheck failed:', error);
      return '';
    }

    const latestRegion = String((data as any)?.activity_region || '').trim();
    if (latestRegion) {
      setHomeActivityRegionLocal(latestRegion);
    }

    return latestRegion;
  };


  const enterDatingTabAfterRegionCheck = (mode: DatingMode = 'court') => {
    setCourts([]);
    setCategoryTab('dating');
    localStorage.setItem('home_category_tab', 'dating');
    setActiveTab('others');
    setDatingMode(mode);
  };

  const handleHomeActivityRegionSave = async () => {
    if (!user?.id || !homeActivityRegionDraft) return;

    try {
      setHomeActivityRegionSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({ activity_region: homeActivityRegionDraft })
        .eq('user_id', user.id);

      if (error) throw error;

      setHomeActivityRegionLocal(homeActivityRegionDraft);
      setShowHomeActivityRegionPopup(false);

      window.setTimeout(() => {
        window.dispatchEvent(new Event('auth-resynced'));
      }, 50);

      enterDatingTabAfterRegionCheck(pendingDatingModeAfterRegion);
    } catch (error) {
      console.error('[Home] activity region save failed:', error);
      alert('활동 지역 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setHomeActivityRegionSaving(false);
    }
  };


  const handlePeopleButtonEntry = async () => {
    const latestRegion = await getLatestActivityRegionForGate();
    if (!latestRegion) {
      setPendingDatingModeAfterRegion('people');
      setHomeActivityRegionDraft('서울');
      setShowHomeActivityRegionPopup(true);
      return;
    }

    enterDatingTabAfterRegionCheck('people');
  };

  const handleCategoryTab = async (tab: CategoryTab) => {
    if (tab === 'dating') {
      if (!hasDatingProfileForRegionGate()) {
        setShowDatingProfilePopup(true);
        return;
      }

      const latestRegion = await getLatestActivityRegionForGate();
      if (!latestRegion) {
        setPendingDatingModeAfterRegion('court');
        setHomeActivityRegionDraft('서울');
        setShowHomeActivityRegionPopup(true);
        return;
      }
    }

    if (tab === categoryTab) return;
    const userPurpose = profile?.purpose;

    if (tab === 'tennis' && userPurpose === 'dating') {
      if (!profile?.tennis_style) {
        navigate('/tennis-profile-setup');
        return;
      }
    }

    setCourts([]);
    setCategoryTab(tab);
    setActiveTab('others');
    if (tab === 'dating') {
      setDatingMode('court');
    }
    localStorage.setItem('home_category_tab', tab);
  };

  useEffect(() => {
    if (!user) {
      setInterestedCourtIds(new Set());
      return;
    }

    const loadInterestedCourts = async () => {
      const { data, error } = await supabase
        .from('court_interests')
        .select('court_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('[InterestCourt] load failed:', error);
        return;
      }

      setInterestedCourtIds(new Set((data || []).map((row) => row.court_id)));
    };

    loadInterestedCourts();
  }, [user]);

  const openApplyPopup = (court: Court) => {
    setApplyTargetCourt(court);
    setApplyMessage('');
  };

  const handleInterestCourt = async (court: Court) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (court.user_id === user.id) {
      alert('내가 등록한 코트에는 관심 표시를 할 수 없습니다.');
      return;
    }

    if (interestedCourtIds.has(court.id)) {
      alert('이미 관심코트 등록되었어요');
      return;
    }

    const { data: latestProfile } = await supabase
      .from('profiles')
      .select('free_interest_count, interest_ticket_count, is_subscribed,activity_region')
      .eq('user_id', user.id)
      .single();

    const isSubscribed = !!latestProfile?.is_subscribed;
    const freeInterestCount = latestProfile?.free_interest_count ?? 0;
    const interestTicketCount = latestProfile?.interest_ticket_count ?? 0;

    let useFreeInterest = false;
    let useInterestTicket = false;

    if (!isSubscribed) {
      if (freeInterestCount < 3) {
        useFreeInterest = true;
      } else if (interestTicketCount > 0) {
        useInterestTicket = true;
      } else {
        setPaywallKind('interest');
        setShowPaywallPopup(true);
        setPaywallStep('first_limit');
        return;
      }
    }

    const { error } = await supabase
      .from('court_interests')
      .insert({
        court_id: court.id,
        user_id: user.id,
        host_id: court.user_id,
      });

    if (error) {
      if (error.code === '23505') {
        setInterestedCourtIds((prev) => new Set(prev).add(court.id));
        alert('이미 관심코트 등록되었어요');
      } else {
        console.error('[InterestCourt] insert failed:', error);
        alert('관심 등록에 실패했습니다. 다시 시도해주세요.');
      }
      return;
    }

    const [{ data: senderProfile }, { data: hostProfile }] = await Promise.all([
      supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('fcm_token')
        .eq('user_id', court.user_id)
        .maybeSingle(),
    ]);

    if (hostProfile?.fcm_token) {
      await supabase.functions.invoke('send-push', {
        body: {
          token: hostProfile.fcm_token,
          title: senderProfile?.name || 'Tennis Meet',
          body: '내 코트에 관심을 보냈어요.',
          data: {
            type: 'court_interest_received',
            courtId: court.id,
            senderId: user.id,
            purpose: court.purpose || 'tennis',
          },
        },
      });
    }

    if (!isSubscribed) {
      if (useFreeInterest) {
        await supabase
          .from('profiles')
          .update({ free_interest_count: freeInterestCount + 1 })
          .eq('user_id', user.id);
      } else if (useInterestTicket) {
        await supabase
          .from('profiles')
          .update({ interest_ticket_count: Math.max(0, interestTicketCount - 1) })
          .eq('user_id', user.id);
      }
    }

    setInterestedCourtIds((prev) => new Set(prev).add(court.id));
    alert('관심코트 등록되었어요');
  };

  const handleApplySubmit = async () => {
    if (!user || !profile || !applyTargetCourt) return;
    if (applyLoading) return;

    const isDatingApply =
      applyTargetCourt.purpose === 'dating' ||
      (applyTargetCourt.purpose as string) === '설레는 만남';

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

    let latestProfile: {
      free_meeting_count?: number | null;
      is_subscribed?: boolean | null;
      gender?: string | null;
      ticket_count?: number | null;
    } | null = null;

    let useFreeMeeting = false;
    let useTicket = false;

    if (isDatingApply) {
      const { data } = await supabase
        .from('profiles')
        .select('free_meeting_count, is_subscribed, gender, ticket_count,activity_region')
        .eq('user_id', user.id)
        .single();

      latestProfile = data;

      const isMale = latestProfile?.gender === '남성' || latestProfile?.gender === 'male';
      const isSubscribed = !!latestProfile?.is_subscribed;
      const freeCount = latestProfile?.free_meeting_count ?? 0;
      const ticketCount = latestProfile?.ticket_count ?? 0;

      if (isMale && !isSubscribed) {
        if (freeCount < 3) {
          useFreeMeeting = true;
        } else if (ticketCount > 0) {
          useTicket = true;
        } else {
          setApplyTargetCourt(null);
          setPaywallKind('court');
          setShowPaywallPopup(true);
          setPaywallStep('first_limit');
          return;
        }
      }
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

    if (isDatingApply && latestProfile?.gender && !latestProfile?.is_subscribed) {
      if (useFreeMeeting) {
        await supabase
          .from('profiles')
          .update({ free_meeting_count: (latestProfile.free_meeting_count ?? 0) + 1 })
          .eq('user_id', user.id);
      } else if (useTicket) {
        await supabase
          .from('profiles')
          .update({ ticket_count: Math.max(0, (latestProfile.ticket_count ?? 0) - 1) })
          .eq('user_id', user.id);
      }
    }
const { data: applicantProfile } = await supabase
  .from('profiles')
  .select('name')
  .eq('user_id', user.id)
  .maybeSingle();

const { data: hostProfile } = await supabase
  .from('profiles')
  .select('fcm_token')
  .eq('user_id', applyTargetCourt.user_id)
  .maybeSingle();

if (hostProfile?.fcm_token) {
  await supabase.functions.invoke('send-push', {
    body: {
      token: hostProfile.fcm_token,
      title: applicantProfile?.name || '누군가',
      body: '내 코트에 신청했어요.',
      data: {
  type: 'match',
  courtId: applyTargetCourt.id,
  purpose: applyTargetCourt.purpose || 'tennis',
},
    },
  });
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

    const deletingCourtId = deleteConfirmId;
    setDeleteLoading(true);

    try {
      const { data, error } = await supabase
        .from('courts')
        .update({
          status: 'deleted',
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', deletingCourtId)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!data?.id) {
        alert('코트를 삭제하지 못했습니다. 다시 시도해주세요.');
        return;
      }

      setCourts((prev) => prev.filter((court) => court.id !== deletingCourtId));

      if (categoryTab) {
        localStorage.removeItem(getCourtCacheKey(categoryTab, 'mine'));
        localStorage.removeItem(getCourtCacheKey(categoryTab, 'others'));
      }

      setDeleteConfirmId(null);
      triggerRefresh();
    } catch (error) {
      console.error('[Home] 코트 삭제 실패:', error);
      alert('코트 삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = (court: Court) => {
    const mode = court.reservation_mode === 'planning' ? 'planning' : 'confirmed';
    navigate(`/create-court?mode=${mode}`, { state: { editCourt: court } });
  };
const handleCreateCourt = (mode: 'confirmed' | 'planning') => {
  console.log('[Home] 코트 등록 버튼 클릭', mode);
  navigate(`/create-court?mode=${mode}`, { state: { purpose: categoryTab } });
};
if (!categoryTab) {
  return (
    <div className="min-h-screen bg-[#F8F9F4] flex items-center justify-center">
      <div className="text-gray-500">로딩 중...</div>
    </div>
  );
}
  const isDating = categoryTab === 'dating';

  const toggleAgeFilter = (filter: AgeFilter) => {
    setSelectedAgeFilters((prev) => {
      if (filter === 'all') return ['all'];

      const withoutAll = prev.filter((item) => item !== 'all');
      const next = withoutAll.includes(filter)
        ? withoutAll.filter((item) => item !== filter)
        : [...withoutAll, filter];

      return next.length === 0 ? ['all'] : next;
    });
  };

  const isAgeMatched = (age: number | null | undefined) => {
    if (selectedAgeFilters.includes('all')) return true;
    if (!age) return false;

    return selectedAgeFilters.some((filter) => {
      if (filter === '20s') return age >= 20 && age < 30;
      if (filter === '30s') return age >= 30 && age < 40;
      if (filter === '40s') return age >= 40 && age < 50;
      if (filter === '50s') return age >= 50;
      return true;
    });
  };

  const normalizeGender = (gender?: string | null) => {
    if (!gender) return '';
    if (gender === 'male' || gender === '남성' || gender === '남자') return 'male';
    if (gender === 'female' || gender === '여성' || gender === '여자') return 'female';
    return gender;
  };

  const isGenderMatched = (gender?: string | null) => {
    if (selectedGenderFilter === 'all') return true;
    return normalizeGender(gender) === selectedGenderFilter;
  };

  const purposeMatchedCourts = courts.filter((court) => court.purpose === categoryTab);

  const filteredCourts = activeTab === 'others' && isDating
    ? purposeMatchedCourts.filter((court) => isAgeMatched(court.owner_age) && isGenderMatched(court.owner_gender))
    : purposeMatchedCourts;

  const headerBg = isDating
    ? 'linear-gradient(180deg, #1F3D2A 0%, #3D6B4E 100%)'
    : '#1B4332';

  const pageBg = isDating
    ? '#FAFAFA'
    : '#F0FDF4';

  const activeTabColor = isDating ? '#1F3D2A' : '#4ADE80';
  const accentGold = '#C9A84C';

  return (
   <div
  className="pb-20"
  style={{ background: pageBg, minHeight: `${vpHeight}px` }}
>
   <header
  className="sticky top-0 z-[100] pt-[max(env(safe-area-inset-top),20px)]"
  style={{
    background: headerBg,
    boxShadow: isDating
      ? '0 4px 24px rgba(31,61,42,0.28)'
      : '0 4px 24px rgba(26,74,58,0.3)'
  }}
>
       
        <div className="px-5 pt-4 pb-3 flex flex-col gap-3">
          {!isDating ? (
            <div className="flex items-center justify-between gap-3">
              <BrandLogo size="sm" light={true} />
              <button
                type="button"
                onClick={() => handleCreateCourt('confirmed')}
                className="relative z-[101] flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition active:scale-95"
                style={{ background: accentGold, color: '#fff', boxShadow: '0 2px 8px rgba(201,168,76,0.4)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>코트 잡았어요</span>
              </button>
            </div>
          ) : (
            <>

      <style>{`
        textarea::placeholder {
          color: #6B7280 !important;
          opacity: 1 !important;
        }
      `}</style>
              <div className="flex items-center justify-between">
                <BrandLogo size="sm" light={true} />
              </div>
              <div className="relative z-[101] grid grid-cols-2 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => handleCreateCourt('confirmed')}
                  className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition active:scale-95"
                  style={{ background: accentGold, color: '#fff', boxShadow: '0 2px 8px rgba(201,168,76,0.35)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>코트 잡았어요</span>
                </button>
                <button
                  type="button"
                  onClick={handlePeopleButtonEntry}
                  className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition active:scale-95"
                  style={{ background: '#FFF3D6', color: '#9A5A12', border: '1.5px solid rgba(201,168,76,0.45)', boxShadow: '0 2px 8px rgba(201,168,76,0.18)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>사람부터 구할래요</span>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => handleCategoryTab('tennis')}
            className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200"
            style={categoryTab === 'tennis'
              ? { background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.34)', backdropFilter: 'blur(8px)' }
              : { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.72)', border: '1.5px solid rgba(255,255,255,0.18)' }
            }
          >
            🎾 오직 테니스
          </button>
          <button
            onClick={() => handleCategoryTab('dating')}
            className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200"
            style={categoryTab === 'dating'
              ? { background: '#FAFAFA', color: '#1F3D2A', border: '1.5px solid rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', boxShadow: '0 6px 16px rgba(15,33,24,0.12)' }
              : { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.72)', border: '1.5px solid rgba(255,255,255,0.18)' }
            }
          >
            🎾 테니스 메이트
          </button>
        </div>

        <div className="flex" style={{ background: isDating ? '#FAFAFA' : 'transparent', borderTop: isDating ? '1px solid rgba(31,61,42,0.12)' : '1px solid rgba(201,168,76,0.2)' }}>
          <button
            onClick={() => setActiveTab('others')}
            className="flex-1 py-3 text-sm font-semibold transition-all duration-200 relative"
            style={{ color: activeTab === 'others' ? (isDating ? '#234536' : '#fff') : (isDating ? 'rgba(35,69,54,0.45)' : 'rgba(255,255,255,0.45)') }}
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
            style={{ color: activeTab === 'mine' ? (isDating ? '#234536' : '#fff') : (isDating ? 'rgba(35,69,54,0.45)' : 'rgba(255,255,255,0.45)') }}
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
        {activeTab === 'others' && isDating && datingMode === 'people' ? (
          <DatingPeopleList
            onRequireCourtTicket={() => {
              setPaywallKind('court');
              setPaywallStep('first_limit');
              setShowPaywallPopup(true);
            }}
            onRequireInterestTicket={() => {
              setPaywallKind('interest');
              setPaywallStep('first_limit');
              setShowPaywallPopup(true);
            }}
          />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: isDating ? 'rgba(74,124,92,0.4)' : 'rgba(45,106,79,0.4)', borderTopColor: 'transparent' }}
            />
            <p className="text-sm" style={{ color: isDating ? 'rgba(74,124,92,0.6)' : 'rgba(45,106,79,0.6)' }}>불러오는 중...</p>
          </div>
        ) : (
          <>
            {activeTab === 'others' && isDating && (
              <div className="px-1 pb-4 space-y-2">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  <span className="shrink-0 text-xs font-bold" style={{ color: 'rgba(31,61,42,0.62)', minWidth: 30 }}>
                    성별
                  </span>
                  {GENDER_FILTERS.map((filter) => {
                    const selected = selectedGenderFilter === filter.key;
                    return (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() => setSelectedGenderFilter(filter.key)}
                        className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95"
                        style={{
                          background: selected ? '#1F3D2A' : '#FFFFFF',
                          color: selected ? '#fff' : '#1F3D2A',
                          border: selected ? '1px solid transparent' : '1px solid rgba(74,124,92,0.22)',
                          boxShadow: selected ? '0 2px 7px rgba(31,61,42,0.14)' : 'none',
                        }}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  <span className="shrink-0 text-xs font-bold" style={{ color: 'rgba(31,61,42,0.62)', minWidth: 30 }}>
                    나이
                  </span>
                  {AGE_FILTERS.map((filter) => {
                    const selected = selectedAgeFilters.includes(filter.key);
                    return (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() => toggleAgeFilter(filter.key)}
                        className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95"
                        style={{
                          background: selected ? '#1F3D2A' : '#FFFFFF',
                          color: selected ? '#fff' : '#1F3D2A',
                          border: selected ? '1px solid transparent' : '1px solid rgba(74,124,92,0.22)',
                          boxShadow: selected ? '0 2px 7px rgba(31,61,42,0.14)' : 'none',
                        }}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredCourts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            {isDating ? (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(74,124,92,0.1)', border: '1.5px solid rgba(74,124,92,0.25)' }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#5A8A6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
              <p className="font-semibold text-sm mb-1" style={{ color: isDating ? '#5A8A6E' : '#2D6A4F' }}>
                {isDating ? activeTab === 'others' ? '아직 인연이 없어요' : '아직 등록한 코트가 없어요' : activeTab === 'others' ? '아직 파트너가 없어요' : '아직 등록한 코트가 없어요'}
              </p>
              <p className="text-xs" style={{ color: isDating ? 'rgba(74,124,92,0.7)' : 'rgba(45,106,79,0.55)' }}>
                {isDating ? '첫 번째 설레는 만남을 열어보세요!' : '첫 코트를 등록해보세요!'}
              </p>
            </div>
          </div>
            ) : isDating ? (
                <SwipeCourtDeck
                  courts={filteredCourts}
                  onApply={(court) => openApplyPopup(court)}
                  onInterest={(court) => handleInterestCourt(court)}
                  isInterested={(court) => interestedCourtIds.has(court.id)}
                  isOwnerMode={activeTab === 'mine'}
                  onEdit={(court) => handleEdit(court)}
                  onDelete={(court) => handleDelete(court.id)}
                />
              ) : (
                <div className="space-y-4">
                  {filteredCourts.map((court) => (
                    <TennisCourtCard
                      key={court.id}
                      court={court}
                      isOwner={activeTab === 'mine'}
                      onApply={() => openApplyPopup(court)}
                      onEdit={() => handleEdit(court)}
                      onDelete={() => handleDelete(court.id)}
                    />
                  ))}
                </div>
              )
            }
          </>
        )}
      </div>

      <BottomNav active="home" />

      {showHomeActivityRegionPopup && (
        <div
          className="fixed inset-0 z-[10000] flex flex-col"
          style={{
            background: '#FFFFFF',
            paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
          }}
        >
          <div className="relative h-14 flex items-center justify-center px-5">
            <button
              type="button"
              onClick={() => {
                if (!homeActivityRegionSaving) {
                  setShowHomeActivityRegionPopup(false);
                }
              }}
              className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition"
              style={{ color: '#00592E' }}
              aria-label="뒤로가기"
            >
              <span className="text-3xl leading-none">‹</span>
            </button>

            <h2 className="text-lg font-extrabold" style={{ color: '#00592E' }}>
              주로 활동하는 지역
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pt-8 pb-28">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8"
              style={{ background: '#F1F3F2' }}
            >
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#00592E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>

            <h3 className="text-2xl font-extrabold text-center leading-snug mb-6" style={{ color: '#0B2B2F' }}>
              주로 어디에서<br />테니스를 치시나요?
            </h3>

            <p className="text-base text-center leading-7 mb-10" style={{ color: 'rgba(11,43,47,0.68)' }}>
              선택한 지역을 기준으로<br />
              사람부터 구할래요에서<br />
              이성에게 노출됩니다.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {HOME_ACTIVITY_REGIONS.map((region) => {
                const selected = homeActivityRegionDraft === region;
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setHomeActivityRegionDraft(region)}
                    className="h-16 rounded-xl text-base font-bold transition active:scale-95"
                    style={{
                      background: selected ? '#00592E' : '#FFFFFF',
                      color: selected ? '#FFFFFF' : '#111827',
                      border: selected ? '1.5px solid #00592E' : '1px solid #E1E5E2',
                      boxShadow: selected ? '0 8px 18px rgba(0,89,46,0.18)' : 'none',
                    }}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="fixed left-0 right-0 bottom-0 px-6 pt-4"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #FFFFFF 28%, #FFFFFF 100%)',
              paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 20px)',
            }}
          >
            <button
              type="button"
              disabled={homeActivityRegionSaving}
              onClick={handleHomeActivityRegionSave}
              className="w-full h-16 rounded-xl text-lg font-extrabold transition active:scale-95 disabled:opacity-60"
              style={{
                background: '#00592E',
                color: '#FFFFFF',
                boxShadow: '0 10px 24px rgba(0,89,46,0.20)',
              }}
            >
              {homeActivityRegionSaving ? '저장 중...' : '완료'}
            </button>
          </div>
        </div>
      )}

      {showDatingProfilePopup && (
        <DatingProfileRequiredPopup
          onRegister={() => { setShowDatingProfilePopup(false); navigate('/dating-profile-setup'); }}
          onClose={() => setShowDatingProfilePopup(false)}
        />
      )}
{showPaywallPopup && paywallStep === 'first_limit' && (
        <PaywallLimitPopup
          kind={paywallKind}
          onBuyTicket={() => setPaywallStep('ticket_pack')}
          onSubscribe={() => setPaywallStep('subscription_intro')}
          onClose={() => setShowPaywallPopup(false)}
        />
      )}

      {showPaywallPopup && paywallStep === 'ticket_pack' && (
        <TicketPackPopup
          kind={paywallKind}
          onPurchase={handlePurchase}
          onBack={() => setPaywallStep('first_limit')}
          onClose={() => setShowPaywallPopup(false)}
        />
      )}

      {showPaywallPopup && paywallStep === 'subscription_intro' && (
        <SubscriptionPopup
          onPurchase={() => handlePurchase('dating_monthly_premium')}
          onBack={() => setPaywallStep('first_limit')}
          onClose={() => setShowPaywallPopup(false)}
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
        const sheetBg = isDatingApply ? 'linear-gradient(160deg, #5A8A6E 0%, #DDEADD 100%)' : '#1B4332';
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
                  🎾 테니스 신청 메시지
                </p>
                <textarea
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="예) 안녕하세요! 같이 테니스 치고 싶어요 🎾"
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
                  style={{ background: isDatingApply ? '#4A7C5C' : accentGold, color: '#fff', boxShadow: isDatingApply ? '0 4px 12px rgba(74,124,92,0.35)' : '0 4px 12px rgba(201,168,76,0.35)' }}
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
                ? { background: 'linear-gradient(135deg, #F0F4ED 0%, #E3EBDD 100%)', border: '1.5px solid rgba(224,92,138,0.25)' }
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
