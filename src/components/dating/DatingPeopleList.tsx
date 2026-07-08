import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type PeopleAgeFilter = 'all' | '20s' | '30s' | '40plus';
type ExperienceFilter = 'all' | '1' | '2' | '3' | '4' | '5plus';

type DatingPerson = {
  user_id: string;
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  photo_url?: string | null;
  photo_urls?: string[] | string | null;
  dating_representative_photo_url?: string | null;
  experience?: string | number | null;
  mbti?: string | null;
  height?: number | string | null;
  purpose?: string | null;
  profile_completed?: boolean | null;
  created_at?: string | null;
};

const AGE_FILTERS: Array<{ key: PeopleAgeFilter; label: string }> = [
  { key: 'all', label: '전체' },
  { key: '20s', label: '20대' },
  { key: '30s', label: '30대' },
  { key: '40plus', label: '40대 이상' },
];

const EXPERIENCE_FILTERS: Array<{ key: ExperienceFilter; label: string }> = [
  { key: 'all', label: '전체' },
  { key: '1', label: '1년' },
  { key: '2', label: '2년' },
  { key: '3', label: '3년' },
  { key: '4', label: '4년' },
  { key: '5plus', label: '5년 이상' },
];

const normalizeGender = (gender?: string | null) => {
  if (!gender) return null;
  if (gender === '남성' || gender === '남자' || gender === 'male') return 'male';
  if (gender === '여성' || gender === '여자' || gender === 'female') return 'female';
  return null;
};

const getOppositeGenderValues = (gender?: string | null) => {
  const normalized = normalizeGender(gender);

  if (normalized === 'male') return ['여성', 'female', '여자'];
  if (normalized === 'female') return ['남성', 'male', '남자'];

  return [];
};

const parsePhotoUrls = (value: DatingPerson['photo_urls']) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  const text = value.trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean);
    }

    if (parsed && typeof parsed === 'object') {
      return Object.values(parsed).filter((url): url is string => typeof url === 'string' && !!url.trim());
    }
  } catch {
    // Continue with loose parsing below.
  }

  if (text.startsWith('{') && text.endsWith('}')) {
    return text
      .slice(1, -1)
      .split(',')
      .map((url) => url.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }

  if (text.includes(',')) {
    return text
      .split(',')
      .map((url) => url.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
  }

  return [text];
};

const getPhotos = (person: DatingPerson) => {
  const urls: string[] = [];

  urls.push(...parsePhotoUrls(person.photo_urls));

  if (person.dating_representative_photo_url) {
    urls.unshift(person.dating_representative_photo_url);
  }

  if (person.photo_url) {
    urls.push(person.photo_url);
  }

  return Array.from(new Set(urls.filter(Boolean)));
};

const getExperienceYear = (experience?: string | number | null) => {
  if (experience === null || experience === undefined) return null;
  if (typeof experience === 'number') return experience;

  const matched = experience.match(/\d+/);
  if (!matched) return null;

  return Number(matched[0]);
};

const isAgeMatched = (age: number | null | undefined, filter: PeopleAgeFilter) => {
  if (filter === 'all') return true;
  if (!age) return false;

  if (filter === '20s') return age >= 20 && age < 30;
  if (filter === '30s') return age >= 30 && age < 40;
  if (filter === '40plus') return age >= 40;

  return true;
};

const isExperienceMatched = (experience: string | number | null | undefined, filter: ExperienceFilter) => {
  if (filter === 'all') return true;

  const year = getExperienceYear(experience);
  if (!year) return false;

  if (filter === '5plus') return year >= 5;
  return year === Number(filter);
};

const formatHeight = (height?: number | string | null) => {
  if (!height) return '-';
  const text = String(height);
  return text.includes('cm') ? text : `${text}cm`;
};

export default function DatingPeopleList() {
  const { user, profile } = useAuth();
  const [people, setPeople] = useState<DatingPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ageFilter, setAgeFilter] = useState<PeopleAgeFilter>('all');
  const [experienceFilter, setExperienceFilter] = useState<ExperienceFilter>('all');
  const [photoViewer, setPhotoViewer] = useState<{ name: string; photos: string[]; index: number } | null>(null);
  const [sentInterestIds, setSentInterestIds] = useState<Set<string>>(new Set());
  const [pendingApplicationIds, setPendingApplicationIds] = useState<Set<string>>(new Set());
  const [processingPersonId, setProcessingPersonId] = useState<string | null>(null);
  const [applicationTarget, setApplicationTarget] = useState<DatingPerson | null>(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applicationSubmitting, setApplicationSubmitting] = useState(false);

  useEffect(() => {
    const fetchPeople = async () => {
      if (!user) {
        setPeople([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const { data: latestProfile, error: myProfileError } = await supabase
        .from('profiles')
        .select('user_id, gender')
        .eq('user_id', user.id)
        .maybeSingle();

      if (myProfileError) {
        console.error('[DatingPeopleList] my profile error:', myProfileError);
        setPeople([]);
        setError('내 프로필 정보를 불러오지 못했습니다.');
        setLoading(false);
        return;
      }

      const myGender = latestProfile?.gender || profile?.gender;
      const targetGenderValues = getOppositeGenderValues(myGender);

      if (targetGenderValues.length === 0) {
        setPeople([]);
        setError('성별 정보가 없어 회원 목록을 불러올 수 없습니다.');
        setLoading(false);
        return;
      }

      const { data, error: peopleError } = await supabase
        .from('profiles')
        .select('user_id,name,age,gender,photo_url,photo_urls,dating_representative_photo_url,experience,mbti,height,purpose,profile_completed,created_at')
        .eq('purpose', 'dating')
        .eq('profile_completed', true)
        .in('gender', targetGenderValues)
        .neq('user_id', user.id)
        .not('photo_urls', 'is', null)
        .order('created_at', { ascending: false });

      if (peopleError) {
        console.error('[DatingPeopleList] people error:', peopleError);
        setPeople([]);
        setError('회원 목록을 불러오지 못했습니다.');
        setLoading(false);
        return;
      }

      const validPeople = (data ?? []).filter((person) => getPhotos(person as DatingPerson).length > 0);
      setPeople(validPeople as DatingPerson[]);

      const targetIds = validPeople.map((person) => (person as DatingPerson).user_id).filter(Boolean);

      if (targetIds.length > 0) {
        const [{ data: interests }, { data: applications }] = await Promise.all([
          supabase
            .from('dating_interests')
            .select('receiver_id')
            .eq('sender_id', user.id)
            .in('receiver_id', targetIds)
            .eq('sender_deleted', false),
          supabase
            .from('dating_people_applications')
            .select('receiver_id,status')
            .eq('sender_id', user.id)
            .in('receiver_id', targetIds)
            .eq('sender_deleted', false)
            .eq('status', 'pending'),
        ]);

        setSentInterestIds(new Set((interests ?? []).map((row) => row.receiver_id)));
        setPendingApplicationIds(new Set((applications ?? []).map((row) => row.receiver_id)));
      } else {
        setSentInterestIds(new Set());
        setPendingApplicationIds(new Set());
      }

      setLoading(false);
    };

    fetchPeople();
  }, [user, profile?.gender]);

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      return (
        isAgeMatched(person.age, ageFilter) &&
        isExperienceMatched(person.experience, experienceFilter)
      );
    });
  }, [people, ageFilter, experienceFilter]);

  const isMaleUser = (gender?: string | null) => {
    const normalized = normalizeGender(gender);
    return normalized === 'male';
  };

  const loadLatestTicketProfile = async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('gender,is_subscribed,free_interest_count,interest_ticket_count,free_meeting_count,ticket_count')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[DatingPeopleList] ticket profile error:', error);
      alert('프로필 정보를 불러오지 못했습니다.');
      return null;
    }

    return data;
  };

  const consumeInterestTicketIfNeeded = async () => {
    const latestProfile = await loadLatestTicketProfile();
    if (!latestProfile) return false;

    const isMale = isMaleUser(latestProfile.gender);
    const isSubscribed = !!latestProfile.is_subscribed;

    if (!isMale || isSubscribed) return true;

    const freeInterestCount = latestProfile.free_interest_count ?? 0;
    const interestTicketCount = latestProfile.interest_ticket_count ?? 0;

    if (freeInterestCount < 3) {
      const { error } = await supabase
        .from('profiles')
        .update({ free_interest_count: freeInterestCount + 1 })
        .eq('user_id', user!.id);

      if (error) {
        console.error('[DatingPeopleList] free interest update error:', error);
        alert('관심 신청권 처리에 실패했습니다.');
        return false;
      }

      return true;
    }

    if (interestTicketCount > 0) {
      const { error } = await supabase
        .from('profiles')
        .update({ interest_ticket_count: Math.max(0, interestTicketCount - 1) })
        .eq('user_id', user!.id);

      if (error) {
        console.error('[DatingPeopleList] interest ticket update error:', error);
        alert('관심 신청권 처리에 실패했습니다.');
        return false;
      }

      return true;
    }

    alert('관심 신청권이 부족합니다. 신청권을 구매하거나 구독이 필요합니다.');
    return false;
  };

  const consumeApplicationTicketIfNeeded = async () => {
    const latestProfile = await loadLatestTicketProfile();
    if (!latestProfile) return false;

    const isMale = isMaleUser(latestProfile.gender);
    const isSubscribed = !!latestProfile.is_subscribed;

    if (!isMale || isSubscribed) return true;

    const freeMeetingCount = latestProfile.free_meeting_count ?? 0;
    const ticketCount = latestProfile.ticket_count ?? 0;

    if (freeMeetingCount < 3) {
      const { error } = await supabase
        .from('profiles')
        .update({ free_meeting_count: freeMeetingCount + 1 })
        .eq('user_id', user!.id);

      if (error) {
        console.error('[DatingPeopleList] free meeting update error:', error);
        alert('신청권 처리에 실패했습니다.');
        return false;
      }

      return true;
    }

    if (ticketCount > 0) {
      const { error } = await supabase
        .from('profiles')
        .update({ ticket_count: Math.max(0, ticketCount - 1) })
        .eq('user_id', user!.id);

      if (error) {
        console.error('[DatingPeopleList] ticket update error:', error);
        alert('신청권 처리에 실패했습니다.');
        return false;
      }

      return true;
    }

    alert('코트 신청권이 부족합니다. 신청권을 구매하거나 구독이 필요합니다.');
    return false;
  };

  const handleSendInterest = async (person: DatingPerson) => {
    if (!user || processingPersonId) return;

    if (sentInterestIds.has(person.user_id)) {
      alert('이미 관심을 보낸 회원입니다.');
      return;
    }

    setProcessingPersonId(person.user_id);

    try {
      const canProceed = await consumeInterestTicketIfNeeded();
      if (!canProceed) return;

      const { error } = await supabase
        .from('dating_interests')
        .insert({
          sender_id: user.id,
          receiver_id: person.user_id,
          status: 'active',
        });

      if (error) {
        if (error.code === '23505') {
          setSentInterestIds((prev) => new Set(prev).add(person.user_id));
          alert('이미 관심을 보낸 회원입니다.');
          return;
        }

        console.error('[DatingPeopleList] send interest error:', error);
        alert('관심 보내기에 실패했습니다.');
        return;
      }

      setSentInterestIds((prev) => new Set(prev).add(person.user_id));
      alert('관심을 보냈습니다.');
    } finally {
      setProcessingPersonId(null);
    }
  };

  const openApplicationPopup = (person: DatingPerson) => {
    if (pendingApplicationIds.has(person.user_id)) {
      alert('이미 신청을 보낸 회원입니다.');
      return;
    }

    setApplicationTarget(person);
    setApplicationMessage('');
  };

  const handleSubmitApplication = async () => {
    if (!user || !applicationTarget || applicationSubmitting) return;

    const message = applicationMessage.trim();
    if (!message) {
      alert('신청 메시지를 입력해주세요.');
      return;
    }

    setApplicationSubmitting(true);
    setProcessingPersonId(applicationTarget.user_id);

    try {
      const canProceed = await consumeApplicationTicketIfNeeded();
      if (!canProceed) return;

      const { error } = await supabase
        .from('dating_people_applications')
        .insert({
          sender_id: user.id,
          receiver_id: applicationTarget.user_id,
          message,
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          setPendingApplicationIds((prev) => new Set(prev).add(applicationTarget.user_id));
          alert('이미 신청을 보낸 회원입니다.');
          setApplicationTarget(null);
          setApplicationMessage('');
          return;
        }

        console.error('[DatingPeopleList] submit application error:', error);
        alert('신청 보내기에 실패했습니다.');
        return;
      }

      setPendingApplicationIds((prev) => new Set(prev).add(applicationTarget.user_id));
      alert('신청을 보냈습니다.');
      setApplicationTarget(null);
      setApplicationMessage('');
    } finally {
      setApplicationSubmitting(false);
      setProcessingPersonId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'rgba(74,124,92,0.4)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: 'rgba(74,124,92,0.6)' }}>회원을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-semibold" style={{ color: '#5A8A6E' }}>{error}</p>
        <p className="text-xs mt-2" style={{ color: 'rgba(74,124,92,0.65)' }}>
          테니스메이트 프로필 정보를 먼저 확인해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 gap-0 rounded-2xl mb-4 overflow-hidden"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(31,61,42,0.08)',
          boxShadow: '0 6px 18px rgba(31,61,42,0.05)',
        }}
      >
        <div className="px-3 py-3">
          <p className="text-xs font-bold mb-2" style={{ color: '#111827' }}>
            나이
          </p>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {AGE_FILTERS.map((filter) => {
              const selected = ageFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setAgeFilter(filter.key)}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition active:scale-95"
                  style={{
                    background: '#FFFFFF',
                    color: selected ? '#0F5132' : '#1F2937',
                    border: selected ? '1.5px solid #0F5132' : '1px solid rgba(17,24,39,0.10)',
                    boxShadow: selected ? '0 2px 5px rgba(15,81,50,0.08)' : 'none',
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="px-3 py-3"
          style={{ borderLeft: '1px solid rgba(31,61,42,0.08)' }}
        >
          <p className="text-xs font-bold mb-2" style={{ color: '#111827' }}>
            구력
          </p>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {EXPERIENCE_FILTERS.map((filter) => {
              const selected = experienceFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setExperienceFilter(filter.key)}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition active:scale-95"
                  style={{
                    background: '#FFFFFF',
                    color: selected ? '#0F5132' : '#1F2937',
                    border: selected ? '1.5px solid #0F5132' : '1px solid rgba(17,24,39,0.10)',
                    boxShadow: selected ? '0 2px 5px rgba(15,81,50,0.08)' : 'none',
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filteredPeople.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(74,124,92,0.1)', border: '1.5px solid rgba(74,124,92,0.25)' }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#5A8A6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="font-semibold text-sm mb-1" style={{ color: '#5A8A6E' }}>
              아직 표시할 회원이 없어요
            </p>
            <p className="text-xs" style={{ color: 'rgba(74,124,92,0.7)' }}>
              조건에 맞는 테니스메이트 회원이 등록되면 여기에 표시돼요.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPeople.map((person) => {
            const photos = getPhotos(person);
            const mainPhoto = photos[0];

            return (
              <div
                key={person.user_id}
                className="rounded-2xl px-4 py-2.5 shadow-sm"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(74,124,92,0.15)',
                  boxShadow: '0 8px 24px rgba(31,61,42,0.08)',
                }}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPhotoViewer({ name: person.name || '프로필 사진', photos, index: 0 })}
                    className="relative shrink-0 transition active:scale-95"
                    aria-label="프로필 사진 보기"
                  >
                    <img
                      src={mainPhoto}
                      alt={person.name || '프로필 사진'}
                      className="w-12 h-12 rounded-full object-cover"
                      style={{ border: '2px solid rgba(74,124,92,0.18)' }}
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-base truncate" style={{ color: '#1F3D2A' }}>
                          {person.name || '이름 없음'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(31,61,42,0.55)' }}>
                          {person.age ? `나이: ${person.age}세` : '나이 미입력'} · {formatHeight(person.height)}
                        </p>
                      </div>

                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span
                        className="px-2 py-1 rounded-full text-[11px] font-semibold"
                        style={{ background: 'rgba(31,61,42,0.06)', color: '#3D6B4E' }}
                      >
                        구력 {person.experience || '-'}
                      </span>
                      {person.mbti && (
                        <span
                          className="px-2 py-1 rounded-full text-[11px] font-semibold"
                          style={{ background: 'rgba(31,61,42,0.06)', color: '#3D6B4E' }}
                        >
                          MBTI: {person.mbti}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendInterest(person)}
                        disabled={processingPersonId === person.user_id || sentInterestIds.has(person.user_id)}
                        className="py-2 rounded-lg text-xs font-bold transition active:scale-95 disabled:opacity-60"
                        style={{
                          background: sentInterestIds.has(person.user_id) ? '#EEF7F1' : '#F7FAF4',
                          color: '#1F3D2A',
                          border: '1px solid rgba(74,124,92,0.22)',
                        }}
                      >
                        {sentInterestIds.has(person.user_id) ? '관심 완료' : processingPersonId === person.user_id ? '처리 중' : '관심 보내기'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openApplicationPopup(person)}
                        disabled={processingPersonId === person.user_id || pendingApplicationIds.has(person.user_id)}
                        className="py-2 rounded-lg text-xs font-bold text-white transition active:scale-95 disabled:opacity-60"
                        style={{ background: pendingApplicationIds.has(person.user_id) ? '#9CA3AF' : 'linear-gradient(135deg, #3D6B4E 0%, #5A8A6E 100%)' }}
                      >
                        {pendingApplicationIds.has(person.user_id) ? '신청 완료' : processingPersonId === person.user_id ? '처리 중' : '신청 보내기'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {applicationTarget && (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => {
            if (!applicationSubmitting) {
              setApplicationTarget(null);
              setApplicationMessage('');
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-4 pb-4 overflow-y-auto"
            style={{
              background: '#FFFFFF',
              maxHeight: '62dvh',
              paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 18px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-3 bg-gray-200" />
            <p className="text-base font-bold mb-1" style={{ color: '#1F3D2A' }}>
              {applicationTarget.name || '회원'}님에게 신청 보내기
            </p>
            <p className="text-xs mb-2" style={{ color: 'rgba(31,61,42,0.55)' }}>
              함께 치고 싶은 이유나 가능한 시간을 간단히 적어주세요.
            </p>

            <textarea
              value={applicationMessage}
              onChange={(e) => setApplicationMessage(e.target.value)}
              placeholder="예: 안녕하세요! 시간 맞으면 같이 테니스 치고 싶어요 :)"
              maxLength={300}
              className="w-full min-h-[72px] rounded-2xl px-4 py-2.5 text-sm outline-none resize-none"
              style={{
                background: '#F7FAF4',
                border: '1px solid rgba(74,124,92,0.2)',
                color: '#1F3D2A',
              }}
            />

            <div className="flex justify-between items-center mt-1 mb-1.5">
              <span className="text-xs" style={{ color: 'rgba(31,61,42,0.45)' }}>
                {applicationMessage.length}/300
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={applicationSubmitting}
                onClick={() => {
                  setApplicationTarget(null);
                  setApplicationMessage('');
                }}
                className="py-2.5 rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-60"
                style={{
                  background: '#F3F4F6',
                  color: '#374151',
                }}
              >
                취소
              </button>
              <button
                type="button"
                disabled={applicationSubmitting}
                onClick={handleSubmitApplication}
                className="py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #3D6B4E 0%, #5A8A6E 100%)' }}
              >
                {applicationSubmitting ? '보내는 중...' : '신청 보내기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {photoViewer && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setPhotoViewer(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPhotoViewer(null);
            }}
            className="absolute top-12 right-5 w-10 h-10 rounded-full text-white text-2xl font-light"
            style={{ background: 'rgba(255,255,255,0.16)' }}
            aria-label="닫기"
          >
            ×
          </button>

          <img
            src={photoViewer.photos[photoViewer.index]}
            alt={photoViewer.name}
            className="max-w-full max-h-[72vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {photoViewer.photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoViewer((prev) => {
                    if (!prev) return prev;
                    return { ...prev, index: prev.index === 0 ? prev.photos.length - 1 : prev.index - 1 };
                  });
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full text-white text-3xl"
                style={{ background: 'rgba(255,255,255,0.16)' }}
                aria-label="이전 사진"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoViewer((prev) => {
                    if (!prev) return prev;
                    return { ...prev, index: prev.index === prev.photos.length - 1 ? 0 : prev.index + 1 };
                  });
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full text-white text-3xl"
                style={{ background: 'rgba(255,255,255,0.16)' }}
                aria-label="다음 사진"
              >
                ›
              </button>

              <div
                className="absolute bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ background: 'rgba(255,255,255,0.16)' }}
              >
                {photoViewer.index + 1} / {photoViewer.photos.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
