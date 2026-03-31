import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourts } from '../contexts/CourtsContext';
import { supabase } from '../lib/supabase';
import { Court } from '../types';

import { ArrowLeft, X } from 'lucide-react';
import StepBar from '../components/create-court/StepBar';
import CourtMapSearch from '../components/create-court/CourtMapSearch';
import DateTimePicker from '../components/create-court/DateTimePicker';

function DatingProfileRequiredPopup({ onRegister, onClose }: { onRegister: () => void; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl px-6 pt-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <p className="text-lg font-bold text-gray-900 mb-1">코트위 설레는 만남 프로필 등록</p>
        <p className="text-xs text-gray-400 mb-6">코트위 설레는 만남은 사진 3장, MBTI, 키, 자기소개가 필수예요</p>
        <button
          onClick={onRegister}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
          style={{ background: '#C9A84C' }}
        >
          프로필 등록하기
        </button>
      </div>
    </div>
  );
}

function TennisProfilePopup({ onUseExisting, onCreateNew, onClose }: {
  onUseExisting: () => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl px-6 pt-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
        <p className="text-lg font-bold text-gray-900 mb-1">오직테니스 프로필 설정</p>
        <p className="text-sm text-gray-500 mb-6">사진 1장 · 구력 · 테니스 스타일을 등록해주세요</p>
        <button
          onClick={onUseExisting}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm mb-3"
          style={{ background: '#F3F4F6', color: '#374151' }}
        >
          기존 프로필 사용
        </button>
        <button
          onClick={onCreateNew}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
          style={{ background: '#C9A84C' }}
        >
          직접 등록하기
        </button>
      </div>
    </div>
  );
}

type CategoryTab = 'tennis' | 'dating';

interface CourtLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

function getActiveCategoryPurpose(): CategoryTab {
  const saved = localStorage.getItem('home_category_tab');
  if (saved === 'tennis' || saved === 'dating') return saved;
  return 'tennis';
}

function SelectButton({
  label,
  selected,
  onClick,
  accentColor,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  accentColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="py-3 px-4 rounded-xl border-2 text-sm font-semibold transition"
      style={
        selected
          ? { backgroundColor: accentColor, borderColor: accentColor, color: '#fff' }
          : { borderColor: '#E5E7EB', backgroundColor: '#fff', color: '#374151' }
      }
    >
      {label}
    </button>
  );
}

export default function CreateCourt() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { triggerRefresh } = useCourts();

  const editCourt: Court | undefined = (location.state as { editCourt?: Court })?.editCourt;
  const isEditing = !!editCourt;
  const passedPurpose: CategoryTab | undefined = (location.state as { purpose?: CategoryTab })?.purpose;

  const purpose: CategoryTab = isEditing
    ? (editCourt!.purpose as CategoryTab)
    : passedPurpose === 'tennis' || passedPurpose === 'dating'
      ? passedPurpose
      : (profile?.purpose === 'tennis' || profile?.purpose === 'dating')
        ? (profile.purpose as CategoryTab)
        : getActiveCategoryPurpose();

  const isTennis = purpose === 'tennis';

  const [showTennisProfilePopup, setShowTennisProfilePopup] = useState(false);
  const [showDatingProfilePopup, setShowDatingProfilePopup] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (isEditing || profileChecked) return;
    const userPurpose = profile?.purpose;
    if (isTennis) {
      const hasSupabaseProfile = !!(profile?.experience || profile?.photo_url);
      const hasLocalProfile = !!localStorage.getItem('tennis_profile');
      if (!hasSupabaseProfile && !hasLocalProfile) {
        setShowTennisProfilePopup(true);
      }
    } else if (userPurpose === 'dating') {
      const hasLocalDatingProfile = !!localStorage.getItem('dating_profile');
      const hasSupabaseDatingProfile = !!(profile?.name || profile?.age || profile?.photo_url);
      if (!hasLocalDatingProfile && !hasSupabaseDatingProfile) {
        setShowDatingProfilePopup(true);
      }
    }
    setProfileChecked(true);
  }, [isTennis, isEditing, profileChecked, profile?.purpose, profile?.experience, profile?.photo_url, profile?.name, profile?.age]);
  const accentColor = isTennis ? '#1B4332' : '#C9A84C';
  const TOTAL_STEPS = 4;

  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [loading, setLoading] = useState(false);

  const [selectedCourt, setSelectedCourt] = useState<CourtLocation | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedEndTime, setSelectedEndTime] = useState('');

  const [format, setFormat] = useState('');
  const [experienceWanted, setExperienceWanted] = useState('');
  const [maleSlots, setMaleSlots] = useState(0);
  const [femaleSlots, setFemaleSlots] = useState(0);
  const [costOption, setCostOption] = useState('');
  const [courtFee, setCourtFee] = useState('');

  const [description, setDescription] = useState('');
  const [courtNumber, setCourtNumber] = useState('');

  const maxDescLen = isTennis ? 100 : 150;

  useEffect(() => {
    if (editCourt) {
      setSelectedCourt({ name: editCourt.court_name, address: '', lat: 37.5665, lng: 126.978 });
      setSelectedDate(editCourt.date || '');
      setSelectedTime(editCourt.start_time || '');
      setSelectedEndTime(editCourt.end_time || '');
      setFormat(editCourt.format || '');
      setExperienceWanted(editCourt.experience_wanted || '');
      setDescription(editCourt.description || '');
      setMaleSlots(editCourt.male_slots || 0);
      setFemaleSlots(editCourt.female_slots || 0);
      setCostOption(editCourt.cost || '');
      setCourtFee(editCourt.court_fee?.toString() || '');
      setCourtNumber(editCourt.court_number || '');
    }
  }, []);

  const canProceed = (() => {
    if (step === 1) return !!selectedCourt;
    if (step === 2) return !!selectedDate && !!selectedTime && !!selectedEndTime;
    if (step === 3) {
      if (isTennis) return !!format && (maleSlots > 0 || femaleSlots > 0) && courtFee.trim() !== '' && Number(courtFee) >= 0;
      return !!format && !!costOption && (maleSlots > 0 || femaleSlots > 0);
    }
    if (step === 4) return description.trim().length > 0;
    return false;
  })();

  const slideRef = useRef<HTMLDivElement>(null);

  const goNext = () => {
    if (!canProceed || animating) return;
    setDirection('forward');
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setAnimating(false);
    }, 250);
  };

  const goBack = () => {
    if (step === 1) { navigate(-1); return; }
    if (animating) return;
    setDirection('back');
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setAnimating(false);
    }, 250);
  };

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 600;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = base64;
    });
  };

  const handleSubmit = async () => {
    if (!canProceed || loading || !user) return;
    setLoading(true);

    try {
      const endTime = selectedEndTime || (() => {
        const [h] = selectedTime.split(':');
        return `${String(parseInt(h) + 1).padStart(2, '0')}:00`;
      })();

      const datingProfile = JSON.parse(localStorage.getItem('dating_profile') || localStorage.getItem('optimistic_profile') || '{}');

      const rawDatingPhotos: string[] = (() => {
        if (datingProfile?.photos?.length) return datingProfile.photos;
        if (datingProfile?.photo_urls?.length) return datingProfile.photo_urls;
        if (datingProfile?.photo_url) return [datingProfile.photo_url];
        return [];
      })();

      const datingPhotos: string[] = await Promise.all(
        rawDatingPhotos.map(photo =>
          photo.startsWith('data:') ? compressImage(photo) : Promise.resolve(photo)
        )
      );

      let tennisPhotoUrl: string | null = null;
      if (purpose === 'tennis') {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('tennis_photo_url, photo_url')
          .eq('user_id', user.id)
          .maybeSingle();
        tennisPhotoUrl = myProfile?.tennis_photo_url || myProfile?.photo_url || null;
      } else {
        tennisPhotoUrl = datingPhotos[0] || null;
      }

      const courtData: Record<string, unknown> = {
        user_id: user.id,
        host_id: user.id,
        purpose,
        court_name: selectedCourt!.name,
        date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        format: format || '단식',
        match_type: format || '단식',
        description,
        court_number: courtNumber.trim() || null,
        male_slots: maleSlots,
        female_slots: femaleSlots,
        male_count: maleSlots,
        female_count: femaleSlots,
        tennis_photo_url: tennisPhotoUrl,
      };

      if (!isEditing) {
        courtData.confirmed_male_slots = 0;
        courtData.confirmed_female_slots = 0;
      }

      if (isTennis) {
        courtData.experience_wanted = experienceWanted;
        courtData.court_fee = courtFee ? Number(courtFee) : null;
      }

      if (!isTennis) {
        courtData.cost = costOption;
        courtData.match_type = format || '단식';
        courtData.male_count = maleSlots;
        courtData.female_count = femaleSlots;
        courtData.court_intro = description;

        if (isEditing) {
          const existingPhotos: string[] = editCourt!.owner_photos?.length
            ? editCourt!.owner_photos
            : editCourt!.owner_photo
              ? [editCourt!.owner_photo]
              : [];
          const finalPhotos = datingPhotos.length > 0 ? datingPhotos : existingPhotos;
          courtData.owner_photos = finalPhotos;
          courtData.owner_photo = finalPhotos[0] || null;
          courtData.tennis_photo_url = finalPhotos[0] || null;
          courtData.owner_mbti = datingProfile?.mbti || editCourt!.owner_mbti || null;
          courtData.owner_height = datingProfile?.height || editCourt!.owner_height || null;
          courtData.owner_bio = datingProfile?.bio || editCourt!.owner_bio || null;
          courtData.owner_experience = datingProfile?.experience || editCourt!.owner_experience || null;
          courtData.owner_gender = datingProfile?.gender || editCourt!.owner_gender || null;
          courtData.owner_age = datingProfile?.age || editCourt!.owner_age || null;
          courtData.owner_name = datingProfile?.name || editCourt!.owner_name || null;
        } else {
          courtData.confirmed_male_slots = 0;
          courtData.confirmed_female_slots = 0;
          courtData.owner_photos = datingPhotos;
          courtData.owner_photo = datingPhotos[0] || null;
          courtData.tennis_photo_url = datingPhotos[0] || null;
          courtData.owner_mbti = datingProfile?.mbti || null;
          courtData.owner_height = datingProfile?.height || null;
          courtData.owner_bio = datingProfile?.bio || null;
          courtData.owner_experience = datingProfile?.experience || null;
          courtData.owner_gender = datingProfile?.gender || null;
          courtData.owner_age = datingProfile?.age || null;
          courtData.owner_name = datingProfile?.name || null;
        }
      }

      if (isEditing) {
        const { error } = await supabase.from('courts').update(courtData).eq('id', editCourt!.id).eq('user_id', user!.id);
        if (error) { console.error('[CreateCourt] update error:', error); throw new Error(error.message || '수정에 실패했습니다.'); }
      } else {
        const { error } = await supabase.from('courts').insert(courtData).select().single();
        if (error) { console.error('[CreateCourt] insert error:', error); throw new Error(error.message || '등록에 실패했습니다.'); }
      }

      triggerRefresh();
      localStorage.setItem('home_category_tab', purpose === 'tennis' ? 'tennis' : 'dating');
      localStorage.setItem('home_active_tab', 'mine');
      navigate('/home', { replace: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const tennisFormats = ['단식', '남복', '여복', '혼복'];

  const stepTitles = isTennis
    ? [
        '어디서 치실 건가요? 🎾',
        '언제 만날까요? 📅',
        '어떤 경기 원하세요? 🏆',
        '같이 칠 분들께 한마디! 💬',
      ]
    : [
        '코트 위 설레는 만남을 등록해봐요 🥂',
        '언제 만나고 싶으세요? 💫',
        '어떤 분을 찾고 계세요? 💝',
        '설레는 첫인상을 남겨요 💌',
      ];

  const slideStyle: React.CSSProperties = {
    transition: animating ? 'opacity 0.25s ease, transform 0.25s ease' : undefined,
    opacity: animating ? 0 : 1,
    transform: animating
      ? direction === 'forward'
        ? 'translateX(-20px)'
        : 'translateX(20px)'
      : 'translateX(0)',
  };

  return (
    <div className="fixed inset-0 bg-[#F8F9F4] flex flex-col z-50" style={{ height: '100dvh' }}>
      {showDatingProfilePopup && (
        <DatingProfileRequiredPopup
          onRegister={() => { navigate('/dating-profile-setup', { state: { from: 'create-court' } }); }}
          onClose={() => setShowDatingProfilePopup(false)}
        />
      )}

      {showTennisProfilePopup && (
        <TennisProfilePopup
          onUseExisting={() => {
            const optimistic = localStorage.getItem('optimistic_profile');
            const source = optimistic ? JSON.parse(optimistic) : null;
            const stored = localStorage.getItem('dating_profile');
            const dating = stored ? JSON.parse(stored) : null;
            const tennisData = {
              photo_url: source?.photo_url || dating?.photo_url || undefined,
              experience: source?.experience || dating?.experience || '',
              position: '',
            };
            localStorage.setItem('tennis_profile', JSON.stringify(tennisData));
            setShowTennisProfilePopup(false);
          }}
          onCreateNew={() => { navigate('/tennis-profile-setup', { state: { from: 'create-court' } }); }}
          onClose={() => setShowTennisProfilePopup(false)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={goBack} className="p-1.5 rounded-full hover:bg-gray-100 transition">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <StepBar currentStep={step} totalSteps={TOTAL_STEPS} color={accentColor} />
        </div>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-gray-100 transition">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </header>

      {/* Step label */}
      <div className="px-5 pt-1 pb-0 flex-shrink-0">
        <p className="text-xs font-medium" style={{ color: accentColor }}>
          {step} / {TOTAL_STEPS} 단계
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4" ref={slideRef} style={slideStyle}>
        {step === 1 && (
          <CourtMapSearch
            selected={selectedCourt}
            onSelect={setSelectedCourt}
            markerColor={accentColor}
            title={stepTitles[0]}
            searchSuffix="테니스장"
          />
        )}

        {step === 2 && (
          <DateTimePicker
            title={stepTitles[1]}
            accentColor={accentColor}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            selectedEndTime={selectedEndTime}
            showEndTime={true}
            onDateChange={setSelectedDate}
            onTimeChange={setSelectedTime}
            onEndTimeChange={setSelectedEndTime}
          />
        )}

        {step === 3 && isTennis && (
          <div className="flex flex-col gap-5">
            <h2 className="text-xl font-bold text-gray-900">{stepTitles[2]}</h2>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">경기 방식</p>
              <div className="grid grid-cols-2 gap-2">
                {tennisFormats.map((f) => (
                  <SelectButton key={f} label={f} selected={format === f} onClick={() => {
                    setFormat(f);
                    setMaleSlots(0);
                    setFemaleSlots(0);
                  }} accentColor={accentColor} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">모집 인원</p>
              <div className="space-y-3">
                {[
                  { label: '남자', value: maleSlots, setter: setMaleSlots },
                  { label: '여자', value: femaleSlots, setter: setFemaleSlots },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setter(Math.max(0, value - 1))}
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-lg font-bold transition"
                        style={{ borderColor: value > 0 ? accentColor : '#E5E7EB', color: value > 0 ? accentColor : '#9CA3AF' }}
                      >
                        −
                      </button>
                      <span className="text-lg font-bold text-gray-900 w-4 text-center">{value}</span>
                      <button
                        type="button"
                        onClick={() => setter(Math.min(4, value + 1))}
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-lg font-bold transition"
                        style={{ borderColor: value < 4 ? accentColor : '#E5E7EB', color: value < 4 ? accentColor : '#9CA3AF' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">매칭비 <span className="text-red-400">*</span></p>
              <div className="relative">
                <input
                  type="number"
                  value={courtFee}
                  onChange={(e) => setCourtFee(e.target.value)}
                  placeholder="예) 10000"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:border-transparent text-sm font-medium pr-12"
                  style={{ outlineColor: accentColor }}
                  min={0}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">원</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">1인당 매칭비를 입력해주세요 (무료는 0원 입력)</p>
            </div>
          </div>
        )}

        {step === 3 && !isTennis && (
          <div className="flex flex-col gap-5">
            <h2 className="text-xl font-bold text-gray-900">{stepTitles[2]}</h2>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">경기 방식</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '단식 (1대1 미팅 💑)', value: '단식' },
                  { label: '혼복 (2대2 미팅 👫👫)', value: '혼복' },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setFormat(value);
                      setMaleSlots(0);
                      setFemaleSlots(0);
                    }}
                    className="py-3 px-4 rounded-xl border-2 text-sm font-semibold transition"
                    style={
                      format === value
                        ? { backgroundColor: accentColor, borderColor: accentColor, color: '#fff' }
                        : { borderColor: '#E5E7EB', backgroundColor: '#fff', color: '#374151' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {format === '단식' && <p className="text-xs text-gray-400 mt-1.5">1대1 설레는 만남 · 수락 시 1:1 채팅방 생성</p>}
              {format === '혼복' && <p className="text-xs text-gray-400 mt-1.5">2대2 더블 매칭 · 수락 시 단체 채팅방 생성</p>}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">모집 인원</p>
              <div className="space-y-3">
                {[
                  { label: '남자', value: maleSlots, setter: setMaleSlots },
                  { label: '여자', value: femaleSlots, setter: setFemaleSlots },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setter(Math.max(0, value - 1))}
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-lg font-bold transition"
                        style={{ borderColor: value > 0 ? accentColor : '#E5E7EB', color: value > 0 ? accentColor : '#9CA3AF' }}
                      >
                        −
                      </button>
                      <span className="text-lg font-bold text-gray-900 w-4 text-center">{value}</span>
                      <button
                        type="button"
                        onClick={() => setter(Math.min(4, value + 1))}
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-lg font-bold transition"
                        style={{ borderColor: value < 4 ? accentColor : '#E5E7EB', color: value < 4 ? accentColor : '#9CA3AF' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">코트비</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '같이 나눠요 💑', value: 'dutch' },
                  { label: '제가 낼게요 😊', value: 'host' },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCostOption(value)}
                    className="py-4 px-3 rounded-2xl border-2 text-sm font-semibold transition flex flex-col items-center gap-1"
                    style={
                      costOption === value
                        ? { backgroundColor: accentColor, borderColor: accentColor, color: '#fff' }
                        : { borderColor: '#E5E7EB', backgroundColor: '#fff', color: '#374151' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900">{stepTitles[3]}</h2>

            {!isTennis && (
              <p className="text-sm font-medium text-center py-2" style={{ color: '#C9A84C' }}>
                🍽️ 테니스 끝난 후 식사 한번 해봐요 😊
              </p>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">코트 번호 <span className="text-gray-400 font-normal text-xs">(선택)</span></p>
              <input
                type="text"
                value={courtNumber}
                onChange={(e) => setCourtNumber(e.target.value)}
                placeholder="예) 3번 코트"
                maxLength={20}
                className="w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-gray-400 placeholder-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1.5">참가자들이 현장에서 찾기 쉽도록 입력해주세요</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <textarea
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= maxDescLen) setDescription(e.target.value);
                }}
                placeholder={
                  isTennis
                    ? '예) 즐겁게 같이 치실 분 환영해요! 실력 무관 🎾'
                    : '예) 테니스 좋아하는 활발한 성격이에요 😊 같이 치고 맛있는 거 먹어요!'
                }
                rows={4}
                className="w-full text-sm text-gray-800 resize-none focus:outline-none placeholder-gray-400 leading-relaxed"
              />
              <p className="text-xs text-gray-400 text-right mt-2">
                {description.length}/{maxDescLen}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">등록 요약</p>
              <div className="flex gap-2 text-sm">
                <span className="text-gray-500 w-16 flex-shrink-0">장소</span>
                <span className="font-medium text-gray-900 truncate">{selectedCourt?.name}{courtNumber.trim() ? ` · ${courtNumber.trim()}` : ''}</span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-gray-500 w-16 flex-shrink-0">날짜</span>
                <span className="font-medium text-gray-900">{selectedDate} {selectedTime}{selectedEndTime ? ` ~ ${selectedEndTime}` : ''}</span>
              </div>
              {isTennis && format && (
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-16 flex-shrink-0">형식</span>
                  <span className="font-medium text-gray-900">{format}</span>
                </div>
              )}
              {isTennis && (maleSlots > 0 || femaleSlots > 0) && (
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-16 flex-shrink-0">모집</span>
                  <span className="font-medium text-gray-900">
                    {maleSlots > 0 && femaleSlots > 0 ? `혼합 남${maleSlots}+여${femaleSlots}명` : maleSlots > 0 ? `남성 ${maleSlots}명` : `여성 ${femaleSlots}명`}
                  </span>
                </div>
              )}
              {!isTennis && (
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-16 flex-shrink-0">방식</span>
                  <span className="font-medium text-gray-900">{format} · 남{maleSlots}+여{femaleSlots}명</span>
                </div>
              )}
              {!isTennis && costOption && (
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-16 flex-shrink-0">비용</span>
                  <span className="font-medium text-gray-900">{costOption === 'dutch' ? '같이 나눠요 💑' : '제가 낼게요 😊'}</span>
                </div>
              )}
              {isTennis && courtFee && (
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-16 flex-shrink-0">코트비</span>
                  <span className="font-medium text-gray-900">1인당 {Number(courtFee).toLocaleString()}원</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="h-24" />
      </div>

      {/* Bottom button */}
      <div
        className="flex-shrink-0 px-5 pb-safe bg-white border-t border-gray-100 pt-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition active:scale-[0.98]"
            style={{
              background: canProceed
                ? isTennis
                  ? accentColor
                  : 'linear-gradient(135deg, #C9A84C 0%, #E8A598 100%)'
                : '#D1D5DB',
            }}
          >
            다음
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed || loading}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition active:scale-[0.98]"
            style={{
              background: canProceed && !loading
                ? isTennis
                  ? accentColor
                  : 'linear-gradient(135deg, #C9A84C 0%, #E8A598 100%)'
                : '#D1D5DB',
            }}
          >
            {loading ? '등록 중...' : isEditing ? '수정 완료' : '등록 완료'}
          </button>
        )}
      </div>
    </div>
  );
}
