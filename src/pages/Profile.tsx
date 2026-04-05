import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, LogOut, X, ChevronLeft, ChevronRight, Plus, Camera, Star, MessageSquare } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useVisualViewport } from '../hooks/useVisualViewport';

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8F9F4] pb-20 animate-pulse">
      <div className="w-full h-[350px] bg-gray-200" />
      <div className="px-6 py-6">
        <div className="h-7 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-200 rounded mb-6" />
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-3 w-12 bg-gray-200 rounded mb-2" />
              <div className="h-5 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type ProfileTab = 'dating' | 'tennis';

export default function Profile() {
  const navigate = useNavigate();
  const { profile, signOut, updateProfile, loading: authLoading } = useAuth();
  const vpHeight = useVisualViewport();
  const [profileTab, setProfileTab] = useState<ProfileTab>(() => {
    const saved = localStorage.getItem('home_category_tab');
    if (saved === 'tennis' || saved === 'dating') return saved;
    return profile?.purpose === 'tennis' ? 'tennis' : 'dating';
  });
  const [showDatingProfilePopup, setShowDatingProfilePopup] = useState(false);
  const [showTennisSetupPopup, setShowTennisSetupPopup] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [formData, setFormData] = useState({
    newPhotos: [] as File[],
    newPreviews: [] as string[],
    replaceIndex: null as number | null,
    age: '',
    experience: '',
    mbti: '',
    height: '',
  });
  const [editingPhotos, setEditingPhotos] = useState<string[]>([]);
  const [replaceFileMap, setReplaceFileMap] = useState<Record<number, File>>({});
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isTennisEditing, setIsTennisEditing] = useState(false);
  const [tennisForm, setTennisForm] = useState({ experience: '', tennis_style: '' });
  const [tennisPhotoFile, setTennisPhotoFile] = useState<File | null>(null);
  const [tennisPhotoPreview, setTennisPhotoPreview] = useState('');
  const [savingTennis, setSavingTennis] = useState(false);
  const tennisFileInputRef = useRef<HTMLInputElement>(null);
  const [showTennisCreatePopup, setShowTennisCreatePopup] = useState(false);
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [tennisImageLoaded, setTennisImageLoaded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      setProfileLoaded(true);
      if (profile) {
        const photos = profile.photo_urls?.length
          ? profile.photo_urls
          : profile.photo_url
          ? [profile.photo_url]
          : [];
        setEditingPhotos(photos);
        setFormData({
          newPhotos: [],
          newPreviews: [],
          replaceIndex: null,
          age: profile.age?.toString() || '',
          experience: profile.experience || '',
          mbti: profile.mbti || '',
          height: profile.height?.toString() || '',
        });
        const savedTab = localStorage.getItem('home_category_tab');
        if (savedTab === 'tennis' || savedTab === 'dating') {
          setProfileTab(savedTab);
        } else {
          setProfileTab(profile.purpose === 'tennis' ? 'tennis' : 'dating');
        }
      }
    }
  }, [authLoading, profile]);

  const allPhotos: string[] = profile?.photo_urls?.length
    ? profile.photo_urls
    : profile?.photo_url
    ? [profile.photo_url]
    : [];

  const hasTennisProfile = !!profile?.tennis_style;
  const tennisPhotoSrc = profile?.tennis_photo_url || '';

  const allEditingSlots: string[] = isEditing
    ? [...editingPhotos, ...formData.newPreviews]
    : allPhotos;

  const compressFile = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const maxSize = 1200;
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.8);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const compressed = await compressFile(file);
    const path = `${profile!.user_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await supabase.storage.from('profile_images').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
    if (error) throw new Error(`사진 업로드 실패: ${error.message}`);
    const { data: { publicUrl } } = supabase.storage.from('profile_images').getPublicUrl(path);
    return publicUrl;
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 5 - editingPhotos.length - formData.newPhotos.length;
    const toAdd = files.slice(0, remaining);
    const previews = toAdd.map((f) => URL.createObjectURL(f));
    setFormData((prev) => ({
      ...prev,
      newPhotos: [...prev.newPhotos, ...toAdd],
      newPreviews: [...prev.newPreviews, ...previews],
    }));
    e.target.value = '';
  };

  const handleReplacePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || formData.replaceIndex === null) return;
    const idx = formData.replaceIndex;
    const preview = URL.createObjectURL(file);
    const totalExisting = editingPhotos.length;

    if (idx < totalExisting) {
      const updated = [...editingPhotos];
      updated[idx] = preview;
      setEditingPhotos(updated);
      setReplaceFileMap((prev) => ({ ...prev, [idx]: file }));
    } else {
      const newIdx = idx - totalExisting;
      const updatedPhotos = [...formData.newPhotos];
      const updatedPreviews = [...formData.newPreviews];
      updatedPhotos[newIdx] = file;
      updatedPreviews[newIdx] = preview;
      setFormData((prev) => ({ ...prev, newPhotos: updatedPhotos, newPreviews: updatedPreviews }));
    }
    setFormData((prev) => ({ ...prev, replaceIndex: null }));
    e.target.value = '';
  };

  const removeExistingPhoto = (idx: number) => {
    setEditingPhotos((prev) => prev.filter((_, i) => i !== idx));
    setReplaceFileMap((prev) => {
      const updated: Record<number, File> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const n = Number(k);
        if (n !== idx) updated[n > idx ? n - 1 : n] = v;
      });
      return updated;
    });
  };

  const removeNewPhoto = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      newPhotos: prev.newPhotos.filter((_, i) => i !== idx),
      newPreviews: prev.newPreviews.filter((_, i) => i !== idx),
    }));
  };

  const setAsHero = (slotIdx: number) => {
    if (slotIdx === 0) return;
    const allSlots = [...editingPhotos, ...formData.newPreviews];
    const allFiles: Array<File | null> = [
      ...editingPhotos.map((_, i) => replaceFileMap[i] ?? null),
      ...formData.newPhotos,
    ];
    const reorderedSlots = [allSlots[slotIdx], ...allSlots.filter((_, i) => i !== slotIdx)];
    const reorderedFiles = [allFiles[slotIdx], ...allFiles.filter((_, i) => i !== slotIdx)];

    const newExistingPreviews: string[] = [];
    const newExistingFileMap: Record<number, File> = {};
    const newAddedFiles: File[] = [];
    const newAddedPreviews: string[] = [];

    reorderedSlots.forEach((src, i) => {
      const file = reorderedFiles[i];
      if (i < editingPhotos.length) {
        newExistingPreviews.push(src);
        if (file) newExistingFileMap[i] = file;
      } else {
        newAddedPreviews.push(src);
        if (file) newAddedFiles.push(file);
      }
    });

    setEditingPhotos(newExistingPreviews);
    setReplaceFileMap(newExistingFileMap);
    setFormData((prev) => ({ ...prev, newPhotos: newAddedFiles, newPreviews: newAddedPreviews }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const resolvedExisting: string[] = [];
      for (let i = 0; i < editingPhotos.length; i++) {
        if (replaceFileMap[i]) {
          const url = await uploadPhoto(replaceFileMap[i]);
          resolvedExisting.push(url);
        } else {
          resolvedExisting.push(editingPhotos[i]);
        }
      }

      const uploadedNew = await Promise.all(formData.newPhotos.map(uploadPhoto));
      const updatedPhotos = [...resolvedExisting, ...uploadedNew];
      const primaryPhoto = updatedPhotos[0] || null;

      const { error } = await supabase
        .from('profiles')
        .update({
          age: Number(formData.age),
          experience: formData.experience,
          mbti: formData.mbti || null,
          height: formData.height ? Number(formData.height) : null,
          photo_url: primaryPhoto,
          photo_urls: updatedPhotos,
        })
        .eq('user_id', profile!.user_id);

      if (error) throw new Error('프로필 업데이트에 실패했습니다.');

      updateProfile({
        age: Number(formData.age),
        experience: formData.experience,
        mbti: formData.mbti || undefined,
        height: formData.height ? Number(formData.height) : undefined,
        photo_url: primaryPhoto || undefined,
        photo_urls: updatedPhotos,
      });
      setIsEditing(false);
      setReplaceFileMap({});
      setFormData((prev) => ({ ...prev, newPhotos: [], newPreviews: [], replaceIndex: null }));
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleTennisPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTennisPhotoFile(file);
    setTennisPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleTennisSave = async () => {
    if (!tennisForm.experience || !tennisForm.tennis_style) return;
    setSavingTennis(true);
    try {
      let tennisPhotoUrl: string | null = profile?.tennis_photo_url || null;
      if (tennisPhotoFile) {
        tennisPhotoUrl = await uploadPhoto(tennisPhotoFile);
      }

      const updateData: Record<string, unknown> = {
        experience: tennisForm.experience,
        tennis_style: tennisForm.tennis_style,
        tennis_photo_url: tennisPhotoUrl,
      };

      await supabase.from('profiles').update(updateData).eq('user_id', profile!.user_id);
      updateProfile({
        experience: tennisForm.experience,
        tennis_style: tennisForm.tennis_style,
        tennis_photo_url: tennisPhotoUrl || undefined,
      });
      setIsTennisEditing(false);
      setTennisPhotoFile(null);
      setTennisPhotoPreview('');
    } catch {
      alert('저장에 실패했습니다.');
    } finally {
      setSavingTennis(false);
    }
  };

  const startTennisEdit = () => {
    setTennisForm({
      experience: profile?.experience || '',
      tennis_style: profile?.tennis_style || '',
    });
    setTennisPhotoPreview(tennisPhotoSrc);
    setTennisPhotoFile(null);
    setIsTennisEditing(true);
  };

  const handleUseExistingProfileForTennis = async () => {
    if (!profile) return;
    const tennis_style = profile.experience ? '올라운더' : '';
    await supabase.from('profiles').update({ tennis_style }).eq('user_id', profile.user_id);
    updateProfile({ tennis_style });
    setShowTennisCreatePopup(false);
  };

  const handleTabClick = (tab: ProfileTab) => {
    if (tab === profileTab) return;
    const userPurpose = profile?.purpose;

    if (tab === 'dating' && userPurpose === 'tennis') {
      const hasDatingProfile = !!(profile?.mbti || (profile?.photo_urls && profile.photo_urls.length >= 1));
      if (!hasDatingProfile) {
        setShowDatingProfilePopup(true);
        return;
      }
    }
    if (tab === 'tennis' && userPurpose === 'dating') {
      if (!hasTennisProfile) {
        navigate('/tennis-profile-setup');
        return;
      }
    }
    setProfileTab(tab);
  };

  const handleSignOut = async () => {
    if (confirm('로그아웃하시겠습니까?')) {
      await signOut();
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const { error } = await supabase.rpc('delete_user_completely');
      if (error) throw error;
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/signup');
    }
  };

  const experienceOptions = ['1년미만', '1년차', '2년차', '3년차', '4년차', '5년이상'];
  const tennisStyleOptions = ['포핸드형', '백핸드형', '발리형', '서브형', '올라운더'];
  const MBTI_LIST = [
    ['ISTJ', 'ISFJ', 'INFJ', 'INTJ'],
    ['ISTP', 'ISFP', 'INFP', 'INTP'],
    ['ESTP', 'ESFP', 'ENFP', 'ENTP'],
    ['ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'],
  ];
  const heroPhoto = profileTab === 'dating' ? (allPhotos[0] || null) : null;

  if (!profileLoaded) return <ProfileSkeleton />;

  return (
    <div className="min-h-screen bg-[#F8F9F4] pb-20">
      <header className="bg-white border-b border-gray-200 px-6 pt-4 pb-0 sticky top-0 z-10">
        <h1 className="text-2xl font-['Playfair_Display'] mb-3" style={{ color: '#1B3A2D' }}>프로필</h1>
        <div className="flex">
          <button
            onClick={() => handleTabClick('dating')}
            className={`flex-1 py-2.5 text-sm font-semibold transition border-b-2 ${
              profileTab === 'dating'
                ? 'border-[#C9A84C] text-[#C9A84C]'
                : 'border-transparent text-gray-400'
            }`}
          >
            🥂 코트 위 설레는 만남
          </button>
          <button
            onClick={() => handleTabClick('tennis')}
            className={`flex-1 py-2.5 text-sm font-semibold transition border-b-2 ${
              profileTab === 'tennis'
                ? 'border-[#C9A84C] text-[#C9A84C]'
                : 'border-transparent text-gray-400'
            }`}
          >
            🎾 오직 테니스
          </button>
        </div>
      </header>

      {profileTab === 'dating' && (
        <div className="relative w-full" style={{ height: 400 }}>
          {heroPhoto ? (
            <div className="w-full h-full" style={{ background: heroImageLoaded ? 'transparent' : '#e5e7eb' }}>
              <img
                src={heroPhoto}
                alt={profile?.name}
                className="w-full h-full object-cover cursor-pointer"
                loading="eager"
                decoding="sync"
                onLoad={() => setHeroImageLoaded(true)}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                onClick={() => !isEditing && setLightboxIndex(0)}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-[#2D6A4F] flex items-center justify-center">
              <span className="text-white text-6xl font-bold">
                {profile?.name?.charAt(0) || '?'}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        </div>
      )}

      <div className="px-6 py-6 space-y-6">

        {profileTab === 'dating' && <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">🥂 코트 위 설레는 만남 프로필</h2>
            {!isEditing && (
              <button
                onClick={() => {
                  const photos = profile?.photo_urls?.length
                    ? profile.photo_urls
                    : profile?.photo_url
                    ? [profile.photo_url]
                    : [];
                  setEditingPhotos(photos);
                  setReplaceFileMap({});
                  setFormData((prev) => ({ ...prev, newPhotos: [], newPreviews: [], replaceIndex: null }));
                  setIsEditing(true);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition"
                style={{ borderColor: '#C9A84C', color: '#C9A84C' }}
              >
                수정
              </button>
            )}
          </div>

          {(allPhotos.length > 0 || isEditing) && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">
                  사진 ({isEditing ? allEditingSlots.length : allPhotos.length}/5)
                  {isEditing && allEditingSlots.length > 0 && (
                    <span className="text-xs font-normal text-gray-400 ml-1.5">첫 번째 사진이 대표 이미지</span>
                  )}
                </span>
                {isEditing && allEditingSlots.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#2D6A4F] font-semibold border border-[#1B4332] px-3 py-1 rounded-full hover:bg-[#2D6A4F] hover:text-white transition"
                  >
                    + 사진 추가
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoAdd}
                className="hidden"
              />
              <input
                ref={replaceFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleReplacePhotoFile}
                className="hidden"
              />
              <div className="grid grid-cols-2 gap-3">
                {(isEditing ? allEditingSlots : allPhotos).map((src, idx) => {
                  const isExisting = idx < editingPhotos.length;
                  const isHero = idx === 0;
                  return (
                    <div
                      key={idx}
                      className="relative rounded-2xl overflow-hidden bg-gray-100"
                      style={{ height: 250 }}
                    >
                      <img
                        src={src || ''}
                        alt={`사진 ${idx + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        loading="eager"
                        decoding="sync"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        onClick={() => !isEditing && src && setSelectedImage(src)}
                      />
                      {isEditing && isHero && (
                        <div className="absolute top-2 left-2 bg-[#C9A84C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-white stroke-0" />
                          대표
                        </div>
                      )}
                      {isEditing && !isHero && (
                        <button
                          type="button"
                          onClick={() => setAsHero(idx)}
                          className="absolute top-2 left-2 bg-black/45 rounded-full p-1.5 hover:bg-[#C9A84C] transition group"
                          title="대표 이미지로 설정"
                        >
                          <Star className="w-3 h-3 text-white/70 group-hover:fill-white group-hover:text-white transition" />
                        </button>
                      )}
                      {isEditing && (
                        <div className="absolute bottom-2 right-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, replaceIndex: idx }));
                              setTimeout(() => replaceFileInputRef.current?.click(), 50);
                            }}
                            className="bg-black/55 rounded-full p-1.5 hover:bg-black/80 transition"
                            title="사진 교체"
                          >
                            <Camera className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isExisting) {
                                removeExistingPhoto(idx);
                              } else {
                                removeNewPhoto(idx - editingPhotos.length);
                              }
                            }}
                            className="bg-black/55 rounded-full p-1.5 hover:bg-red-500 transition"
                            title="사진 삭제"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {isEditing && allEditingSlots.length === 0 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:border-[#1B4332] transition"
                    style={{ height: 250 }}
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400">사진 추가</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            {/* 이름 / 나이 / 성별 */}
            <div className="flex items-baseline gap-2 mb-4 pb-4 border-b border-gray-100">
              <span className="text-xl font-bold text-gray-900">{profile?.name}</span>
              {profile?.age && (
                <span className="text-gray-500 font-medium">{profile.age}세</span>
              )}
              {profile?.gender && (
                <span
                  className="font-bold text-lg"
                  style={{ color: profile.gender === '남성' ? '#93C5FD' : '#FDA4AF' }}
                >
                  {profile.gender === '남성' ? '♂' : '♀'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {profile?.mbti && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400 font-medium">MBTI</span>
                  <span className="text-2xl font-bold text-gray-900">{profile.mbti}</span>
                </div>
              )}
              {profile?.height && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400 font-medium">키</span>
                  <span className="text-gray-800">
                    <span className="text-2xl font-bold">{profile.height}</span>
                    <span className="text-sm font-medium text-gray-400 ml-1">cm</span>
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400 font-medium">나이</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2D6A4F] focus:border-transparent"
                  />
                ) : (
                  <span className="text-gray-800">
                    <span className="text-2xl font-bold">{profile?.age}</span>
                    <span className="text-sm font-medium text-gray-400 ml-1">세</span>
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400 font-medium">성별</span>
                <span
                  className="text-2xl font-bold"
                  style={{ color: profile?.gender === '남성' ? '#93C5FD' : '#FDA4AF' }}
                >
                  {profile?.gender === '남성' ? '♂ 남성' : '♀ 여성'}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-xs text-gray-400 font-medium block mb-2">구력</span>
              {isEditing ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {experienceOptions.map((exp) => (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => setFormData({ ...formData, experience: exp })}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition ${
                        formData.experience === exp
                          ? 'border-[#1B4332] bg-[#2D6A4F] text-white'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {experienceOptions.map((exp) => {
                    const isSelected = profile?.experience === exp;
                    return (
                      <span
                        key={exp}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition"
                        style={
                          isSelected
                            ? { borderColor: '#C9A84C', color: '#C9A84C', backgroundColor: '#C9A84C14' }
                            : { borderColor: '#D1D5DB', color: '#9CA3AF' }
                        }
                      >
                        {exp}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {isEditing ? (
              <>
                <div className="mb-4">
                  <span className="text-xs text-gray-400 font-medium block mb-2">MBTI</span>
                  <div className="space-y-1.5">
                    {MBTI_LIST.map((row, rowIdx) => (
                      <div key={rowIdx} className="grid grid-cols-4 gap-1.5">
                        {row.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFormData({ ...formData, mbti: type })}
                            className={`py-2 rounded-lg border text-xs font-semibold transition ${
                              formData.mbti === type
                                ? 'border-[#1B4332] bg-[#2D6A4F] text-white'
                                : 'border-gray-300 bg-white text-gray-700'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, mbti: '모름' })}
                      className={`w-full py-2 rounded-lg border text-xs font-semibold transition ${
                        formData.mbti === '모름'
                          ? 'border-[#1B4332] bg-[#2D6A4F] text-white'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      모름
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <span className="text-xs text-gray-400 font-medium block mb-2">키</span>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      placeholder="예) 175"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2D6A4F] focus:border-transparent pr-10"
                      min={100}
                      max={250}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">cm</span>
                  </div>
                </div>
              </>
            ) : null}

            {isEditing && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[#2D6A4F] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#245a40] transition disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setReplaceFileMap({});
                    const photos = profile?.photo_urls?.length
                      ? profile.photo_urls
                      : profile?.photo_url
                      ? [profile.photo_url]
                      : [];
                    setEditingPhotos(photos);
                    setFormData({
                      newPhotos: [],
                      newPreviews: [],
                      replaceIndex: null,
                      age: profile?.age?.toString() || '',
                      experience: profile?.experience || '',
                      mbti: profile?.mbti || '',
                      height: profile?.height?.toString() || '',
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-300 transition"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        </div>}

        {profileTab === 'tennis' && <div>
          {!hasTennisProfile && !isTennisEditing ? (
            <button
              onClick={() => setShowTennisCreatePopup(true)}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-[#2D6A4F] flex items-center justify-center gap-2 text-[#2D6A4F] font-semibold text-sm hover:bg-[#2D6A4F]/5 transition"
            >
              <Plus className="w-4 h-4" />
              테니스 전용 프로필 만들기
            </button>
          ) : isTennisEditing ? (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 space-y-4">
              <div>
                <span className="text-xs text-gray-400 font-medium block mb-2">사진 (선택사항)</span>
                <input
                  ref={tennisFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleTennisPhotoChange}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  {tennisPhotoPreview ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={tennisPhotoPreview} alt="테니스 사진" className="w-full h-full object-cover" loading="eager" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      <div className="absolute bottom-1 right-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => tennisFileInputRef.current?.click()}
                          className="bg-black/55 rounded-full p-1 hover:bg-black/80 transition"
                          title="사진 교체"
                        >
                          <Camera className="w-3 h-3 text-white" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTennisPhotoPreview(''); setTennisPhotoFile(null); }}
                          className="bg-black/55 rounded-full p-1 hover:bg-red-500 transition"
                          title="사진 삭제"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => tennisFileInputRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 hover:border-[#2D6A4F] transition flex-shrink-0"
                    >
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] text-gray-400">사진 추가</span>
                    </button>
                  )}
                  <p className="text-xs text-gray-400">테니스 전용 사진을 등록하세요 (선택)</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-400 font-medium block mb-2">구력</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {experienceOptions.map((exp) => (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => setTennisForm((p) => ({ ...p, experience: exp }))}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition ${
                        tennisForm.experience === exp
                          ? 'border-[#1B4332] bg-[#2D6A4F] text-white'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-400 font-medium block mb-2">테니스 스타일</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {tennisStyleOptions.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setTennisForm((p) => ({ ...p, tennis_style: style }))}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition ${
                        tennisForm.tennis_style === style
                          ? 'border-[#1B4332] bg-[#2D6A4F] text-white'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleTennisSave}
                  disabled={savingTennis || !tennisForm.experience || !tennisForm.tennis_style}
                  className="flex-1 bg-[#2D6A4F] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#245a40] transition disabled:opacity-50"
                >
                  {savingTennis ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => { setIsTennisEditing(false); setTennisPhotoFile(null); setTennisPhotoPreview(''); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-300 transition"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="relative w-full overflow-hidden mb-4" style={{ height: 400 }}>
                {tennisPhotoSrc ? (
                  <div className="w-full h-full" style={{ background: tennisImageLoaded ? 'transparent' : '#e5e7eb' }}>
                    <img
                      src={tennisPhotoSrc}
                      alt="테니스 프로필"
                      className="w-full h-full object-cover"
                      loading="eager"
                      decoding="sync"
                      onLoad={() => setTennisImageLoaded(true)}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-[#1B4332] flex items-center justify-center">
                    <span className="text-6xl">🎾</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 flex items-end justify-end">
                  <button
                    onClick={startTennisEdit}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border transition"
                    style={{ borderColor: 'rgba(255,255,255,0.6)', color: 'white', background: 'rgba(255,255,255,0.15)' }}
                  >
                    수정
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
                {/* 이름 / 나이 / 성별 */}
                <div className="flex items-baseline gap-2 mb-4 pb-4 border-b border-gray-100">
                  <span className="text-xl font-bold text-gray-900">{profile?.name}</span>
                  {profile?.age && (
                    <span className="text-gray-500 font-medium">{profile.age}세</span>
                  )}
                  {profile?.gender && (
                    <span
                      className="font-bold text-lg"
                      style={{ color: profile.gender === '남성' ? '#93C5FD' : '#FDA4AF' }}
                    >
                      {profile.gender === '남성' ? '♂' : '♀'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-medium mb-3">오직테니스 전용 정보</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400 font-medium">구력</span>
                    <span
                      className="text-sm font-bold px-3 py-1.5 rounded-full inline-block"
                      style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}
                    >
                      {profile?.experience}
                    </span>
                  </div>
                  {profile?.tennis_style && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-400 font-medium">테니스 스타일</span>
                      <span
                        className="text-sm font-bold px-3 py-1.5 rounded-full inline-block"
                        style={{ background: 'rgba(45,106,79,0.1)', color: '#2D6A4F' }}
                      >
                        {profile.tennis_style}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>}

        <button
          onClick={() => navigate('/inquiry')}
          className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 mb-2"
          style={{ backgroundColor: '#E5E7EB', color: '#374151' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#D1D5DB')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E5E7EB')}
        >
          <MessageSquare className="w-5 h-5" />
          1:1 문의
        </button>
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
          style={{ backgroundColor: '#E5E7EB', color: '#6B7280' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#D1D5DB')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E5E7EB')}
        >
          <LogOut className="w-5 h-5" />
          로그아웃
        </button>
        <div className="text-center pt-1">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-500 transition"
          >
            회원탈퇴
          </button>
        </div>
      </div>

      <BottomNav active="profile" />

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <div className="bg-white rounded-2xl shadow-xl mx-6 p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">정말 떠나시겠어요? 😢</h2>
            <p className="text-sm text-gray-500 text-center mb-6">탈퇴하시면 모든 데이터가 삭제되며 복구가 불가능합니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition"
                style={{ backgroundColor: '#1B4332' }}
              >
                조금 더 있을게요
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); handleDeleteAccount(); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-600 bg-gray-200 hover:bg-gray-300 transition"
              >
                탈퇴할게요
              </button>
            </div>
          </div>
        </div>
      )}

      {showDatingProfilePopup && (
        <div
          className="sheet-overlay z-50"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowDatingProfilePopup(false)}
        >
          <div
            className="sheet-container bg-white shadow-2xl"
            style={{ maxHeight: `${Math.floor(vpHeight * 0.82)}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-body px-6 pt-6 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
              <p className="text-lg font-bold text-gray-900 mb-1">코트위 설레는 만남 프로필 등록</p>
              <p className="text-xs text-gray-400 mb-6">코트위 설레는 만남은 사진 3장, MBTI, 키가 필수예요</p>
            </div>
            <div className="px-6 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 52px)' }}>
              <button
                onClick={() => { setShowDatingProfilePopup(false); navigate('/dating-profile-setup'); }}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
                style={{ background: '#C9A84C' }}
              >
                프로필 등록하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showTennisSetupPopup && (
        <div
          className="sheet-overlay z-50"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowTennisSetupPopup(false)}
        >
          <div
            className="sheet-container bg-white shadow-2xl"
            style={{ maxHeight: `${Math.floor(vpHeight * 0.82)}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-body px-6 pt-6 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
              <p className="text-lg font-bold text-gray-900 mb-1">오직테니스 프로필 설정</p>
              <p className="text-sm text-gray-500 mb-6">사진 1장 · 구력 · 테니스 스타일을 등록해주세요</p>
            </div>
            <div className="px-6 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 52px)' }}>
              <button
                onClick={() => { setShowTennisSetupPopup(false); navigate('/tennis-profile-setup'); }}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
                style={{ background: '#C9A84C' }}
              >
                직접 등록하기
              </button>
            </div>
          </div>
        </div>
      )}


      {showTennisCreatePopup && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowTennisCreatePopup(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl px-6 pt-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
            <p className="text-lg font-bold text-gray-900 mb-1">오직테니스 프로필 만들기</p>
            <p className="text-sm text-gray-500 mb-6">사진 · 구력 · 테니스 스타일을 직접 등록해주세요</p>
            <button
              onClick={() => { setShowTennisCreatePopup(false); navigate('/tennis-profile-setup'); }}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white"
              style={{ background: '#C9A84C' }}
            >
              🎾 테니스 전용 프로필 만들기
            </button>
          </div>
        </div>
      )}

      {lightboxIndex !== null && allEditingSlots.length > 0 && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {allEditingSlots.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex - 1 + allEditingSlots.length) % allEditingSlots.length);
                }}
                className="absolute left-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition z-10"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % allEditingSlots.length);
                }}
                className="absolute right-16 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition z-10"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          <img
            src={allEditingSlots[lightboxIndex] || ''}
            alt={`사진 ${lightboxIndex + 1}`}
            className="max-w-full max-h-full object-contain px-4"
            loading="eager"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5">
            {allEditingSlots.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                className={`h-2 rounded-full transition-all ${i === lightboxIndex ? 'bg-white w-4' : 'bg-white/40 w-2'}`}
              />
            ))}
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
              position: 'absolute',
              top: '20px', right: '20px',
              background: 'white',
              border: 'none',
              borderRadius: '50%',
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
