import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, X, Crown, GripVertical } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

interface PhotoSlot {
  file: File | null;
  preview: string;
  uploading: boolean;
}

const EMPTY_SLOT: PhotoSlot = { file: null, preview: '', uploading: false };

const MBTI_LIST = [
  ['ISTJ', 'ISFJ', 'INFJ', 'INTJ'],
  ['ISTP', 'ISFP', 'INFP', 'INTP'],
  ['ESTP', 'ESFP', 'ENFP', 'ENTP'],
  ['ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'],
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<number>(0);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const purpose = profile?.purpose as 'tennis' | 'dating' | undefined;
  const isTennis = purpose === 'tennis';

  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { ...EMPTY_SLOT },
    { ...EMPTY_SLOT },
    { ...EMPTY_SLOT },
    { ...EMPTY_SLOT },
    { ...EMPTY_SLOT },
  ]);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    age: profile?.age?.toString() || '',
    gender: profile?.gender || '',
    experience: '',
  });
  const [tennisStyle, setTennisStyle] = useState('');
  const [extraData, setExtraData] = useState({
    bio: '',
    mbti: '',
    height: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const photoCount = photos.filter((p) => p.preview).length;
  const hasMinPhotos = photoCount >= 3;

  const openFilePicker = (slotIdx: number) => {
    activeSlotRef.current = slotIdx;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const idx = activeSlotRef.current;
    const preview = URL.createObjectURL(file);
    setPhotos((prev) => {
      const next = [...prev];
      next[idx] = { file, preview, uploading: false };
      return next;
    });
    e.target.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[idx] = { ...EMPTY_SLOT };
      return next;
    });
  };

  const handleDragStart = (idx: number) => {
    dragIndexRef.current = idx;
  };

  const handleDragEnter = (idx: number) => {
    setDragOver(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = useCallback((targetIdx: number) => {
    const fromIdx = dragIndexRef.current;
    if (fromIdx === null || fromIdx === targetIdx) {
      dragIndexRef.current = null;
      setDragOver(null);
      return;
    }
    setPhotos((prev) => {
      const next = [...prev];
      [next[fromIdx], next[targetIdx]] = [next[targetIdx], next[fromIdx]];
      return next;
    });
    dragIndexRef.current = null;
    setDragOver(null);
  }, []);

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
    const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
    if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`);
    const { data: { publicUrl } } = supabase.storage.from('profile-images').getPublicUrl(path);
    return publicUrl;
  };

  const handleTennisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.name.trim()) { setError('이름을 입력해주세요'); setLoading(false); return; }
    if (!formData.age || Number(formData.age) < 15) { setError('나이를 올바르게 입력해주세요'); setLoading(false); return; }
    if (!formData.gender) { setError('성별을 선택해주세요'); setLoading(false); return; }
    if (!formData.experience) { setError('구력을 선택해주세요'); setLoading(false); return; }
    if (!tennisStyle) { setError('테니스 스타일을 선택해주세요'); setLoading(false); return; }

    try {
      const filledSlots = photos.filter((p) => p.preview);
      const uploadedUrls: string[] = await Promise.all(
        filledSlots.map((slot) =>
          slot.file ? uploadPhoto(slot.file) : Promise.resolve(slot.preview)
        )
      );

      const primaryPhoto = uploadedUrls[0] || null;

      await supabase.from('profiles').upsert(
        {
          user_id: user!.id,
          name: formData.name,
          age: Number(formData.age),
          gender: formData.gender,
          experience: formData.experience,
          tennis_style: tennisStyle,
          purpose: 'tennis',
          profile_completed: true,
          photo_url: primaryPhoto,
          photo_urls: uploadedUrls,
          bio: null,
          mbti: null,
          height: null,
        },
        { onConflict: 'user_id' }
      );

      await refreshProfile();
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('프로필 저장 실패:', err);
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasMinPhotos) { setError('사진을 3장 이상 등록해주세요'); return; }
    if (!formData.name.trim()) { setError('이름을 입력해주세요'); return; }
    if (!formData.age || Number(formData.age) < 15) { setError('나이를 올바르게 입력해주세요'); return; }
    if (!formData.gender) { setError('성별을 선택해주세요'); return; }
    if (!formData.experience) { setError('구력을 선택해주세요'); return; }
    if (!purpose) {
      setError('목적 선택 화면으로 다시 이동합니다.');
      setTimeout(() => navigate('/purpose-selection'), 1000);
      return;
    }

    setStep(2);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const filledSlots = photos.filter((p) => p.preview);
      const uploadedUrls: string[] = await Promise.all(
        filledSlots.map((slot) =>
          slot.file ? uploadPhoto(slot.file) : Promise.resolve(slot.preview)
        )
      );

      const primaryPhoto = uploadedUrls[0] || null;

      await supabase.from('profiles').upsert(
        {
          user_id: user!.id,
          name: formData.name,
          age: Number(formData.age),
          gender: formData.gender,
          experience: formData.experience,
          purpose,
          profile_completed: true,
          photo_url: primaryPhoto,
          photo_urls: uploadedUrls,
          bio: extraData.bio || null,
          mbti: extraData.mbti || null,
          height: extraData.height ? Number(extraData.height) : null,
        },
        { onConflict: 'user_id' }
      );

      await refreshProfile();
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('프로필 저장 실패:', err);
      setError('저장에 실패했습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  const preloadImages = (srcs: string[]) => {
    srcs.forEach((src) => {
      if (src) {
        const img = new window.Image();
        img.src = src;
      }
    });
  };

  // preloadImages is used in the background upload
  void preloadImages;

  const experienceOptions = ['1년미만', '1년차', '2년차', '3년차', '4년차', '5년이상'];
  const isStep2Valid = extraData.bio.trim() !== '' && extraData.mbti !== '' && extraData.height.trim() !== '';

  return (
    <div className="min-h-screen bg-[#1B4332] flex flex-col items-center px-5 py-10">
      <div className="mb-1">
        <BrandLogo size="sm" light={true} />
      </div>
      <h2 className="text-base font-light text-white/70 mb-1 text-center tracking-wider mt-2">
        프로필을 완성해주세요
      </h2>

      {!isTennis && (
        <div className="flex items-center gap-2 mt-3 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === 1 ? 'bg-[#C9A84C] text-white' : 'bg-[#C9A84C]/30 text-[#C9A84C]'}`}>1</div>
          <div className={`h-0.5 w-10 transition-all ${step === 2 ? 'bg-[#C9A84C]' : 'bg-white/20'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === 2 ? 'bg-[#C9A84C] text-white' : 'bg-white/20 text-white/40'}`}>2</div>
        </div>
      )}

      {isTennis && (
        <>
          <p className="text-white/60 text-sm mb-8 text-center mt-4">
            사진은 선택사항입니다
          </p>

          <form onSubmit={handleTennisSubmit} className="w-full max-w-md space-y-7">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-white text-sm font-semibold">사진 등록</span>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/50">
                  선택사항
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex justify-center">
                <div
                  className="relative w-32 aspect-[3/4] rounded-2xl overflow-hidden"
                  draggable={!!photos[0].preview}
                  onDragStart={() => handleDragStart(0)}
                  onDragEnter={() => handleDragEnter(0)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(0)}
                  onDragEnd={() => { dragIndexRef.current = null; setDragOver(null); }}
                >
                  {photos[0].preview ? (
                    <>
                      <img
                        src={photos[0].preview}
                        alt="사진 1"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1.5 left-1.5 bg-[#C9A84C] rounded-full p-1">
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(0)}
                        className="absolute top-1.5 right-1.5 bg-black/50 rounded-full p-0.5 hover:bg-red-500 transition"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFilePicker(0)}
                      className="w-full h-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-white/20 bg-white/5 hover:bg-white/10 rounded-2xl transition"
                    >
                      <Crown className="w-4 h-4 text-white/30" />
                      <Upload className="w-5 h-5 text-white/40" />
                      <span className="text-[10px] font-semibold text-white/40">사진 추가</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent"
                style={{ fontSize: 16 }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">나이</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent"
                style={{ fontSize: 16 }}
                min={15}
                max={100}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">성별</label>
              <div className="flex gap-3">
                {['남성', '여성'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                      formData.gender === g
                        ? 'border-[#C9A84C] bg-[#C9A84C] text-white'
                        : 'border-white/20 bg-white/10 text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">구력</label>
              <div className="grid grid-cols-3 gap-2.5">
                {experienceOptions.map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setFormData({ ...formData, experience: exp })}
                    className={`py-3 rounded-xl border-2 transition text-sm font-medium ${
                      formData.experience === exp
                        ? 'border-[#C9A84C] bg-[#C9A84C] text-white'
                        : 'border-white/20 bg-white/10 text-white'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">테니스 스타일</label>
              <div className="grid grid-cols-3 gap-2.5">
                {['포핸드형', '백핸드형', '발리형', '서브형', '올라운더'].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setTennisStyle(style)}
                    className={`py-3 rounded-xl border-2 transition text-sm font-medium ${
                      tennisStyle === style
                        ? 'border-[#C9A84C] bg-[#C9A84C] text-white'
                        : 'border-white/20 bg-white/10 text-white'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C9A84C] text-white py-4 rounded-xl font-bold text-base hover:bg-[#b89840] transition disabled:opacity-50 shadow-lg shadow-[#C9A84C]/20"
            >
              {loading ? '저장 중...' : '완료'}
            </button>
          </form>
        </>
      )}

      {!isTennis && step === 1 && (
        <>
          <p className="text-white/60 text-sm mb-8 text-center">
            사진 5장 필수
          </p>

          <form onSubmit={handleStep1Next} className="w-full max-w-md space-y-7">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-white text-sm font-semibold">사진 등록</span>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  hasMinPhotos ? 'bg-green-500/20 text-green-300' : 'bg-[#C9A84C]/20 text-[#C9A84C]'
                }`}>
                  {photoCount}/5 · 필수 3장
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="grid grid-cols-3 gap-2">
                {photos.map((slot, idx) => {
                  const isRequired = idx < 3;
                  const isFirst = idx === 0;
                  const isDragging = dragOver === idx;

                  return (
                    <div
                      key={idx}
                      draggable={!!slot.preview}
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnter={() => handleDragEnter(idx)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={() => { dragIndexRef.current = null; setDragOver(null); }}
                      className={`relative aspect-[3/4] rounded-2xl overflow-hidden transition-all ${
                        isDragging ? 'ring-2 ring-[#C9A84C] scale-105' : ''
                      }`}
                    >
                      {slot.preview ? (
                        <>
                          <img
                            src={slot.preview}
                            alt={`사진 ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {isFirst && (
                            <div className="absolute top-1.5 left-1.5 bg-[#C9A84C] rounded-full p-1">
                              <Crown className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div className="absolute top-1.5 right-7 bg-black/40 rounded-full p-0.5 cursor-grab">
                            <GripVertical className="w-3 h-3 text-white" />
                          </div>
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1.5 right-1.5 bg-black/50 rounded-full p-0.5 hover:bg-red-500 transition"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                          <div className="absolute bottom-1.5 left-1.5 bg-black/40 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                            {idx + 1}/5
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openFilePicker(idx)}
                          className={`w-full h-full flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-2xl transition ${
                            isRequired
                              ? 'border-[#C9A84C]/60 bg-[#C9A84C]/10 hover:bg-[#C9A84C]/20'
                              : 'border-white/20 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          {isFirst && (
                            <Crown className={`w-4 h-4 ${isRequired ? 'text-[#C9A84C]' : 'text-white/30'}`} />
                          )}
                          <Upload className={`w-5 h-5 ${isRequired ? 'text-[#C9A84C]' : 'text-white/40'}`} />
                          <span className={`text-[10px] font-semibold ${isRequired ? 'text-[#C9A84C]' : 'text-white/40'}`}>
                            {idx + 1}/5{isRequired ? ' *' : ''}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {!hasMinPhotos && (
                <p className="text-[#C9A84C] text-xs mt-2 text-center font-medium">
                  사진을 3장 이상 등록해주세요
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent"
                style={{ fontSize: 16 }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">나이</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent"
                style={{ fontSize: 16 }}
                min={15}
                max={100}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">성별</label>
              <div className="flex gap-3">
                {['남성', '여성'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                      formData.gender === g
                        ? 'border-[#C9A84C] bg-[#C9A84C] text-white'
                        : 'border-white/20 bg-white/10 text-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">구력</label>
              <div className="grid grid-cols-3 gap-2.5">
                {experienceOptions.map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setFormData({ ...formData, experience: exp })}
                    className={`py-3 rounded-xl border-2 transition text-sm font-medium ${
                      formData.experience === exp
                        ? 'border-[#C9A84C] bg-[#C9A84C] text-white'
                        : 'border-white/20 bg-white/10 text-white'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!hasMinPhotos}
              className="w-full bg-[#C9A84C] text-white py-4 rounded-xl font-bold text-base hover:bg-[#b89840] transition disabled:opacity-40 shadow-lg shadow-[#C9A84C]/20"
            >
              다음 단계
            </button>
          </form>
        </>
      )}

      {!isTennis && step === 2 && (
        <>
          <p className="text-white/60 text-sm mb-8 text-center">
            추가 정보를 입력해주세요
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-7">

            <div>
              <label className="block text-sm font-medium text-white mb-3">MBTI</label>
              <div className="space-y-2">
                {MBTI_LIST.map((row, rowIdx) => (
                  <div key={rowIdx} className="grid grid-cols-4 gap-2">
                    {row.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setExtraData({ ...extraData, mbti: type })}
                        className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                          extraData.mbti === type
                            ? 'border-[#C9A84C] bg-[#C9A84C] text-white'
                            : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExtraData({ ...extraData, mbti: '모름' })}
                  className={`w-full py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                    extraData.mbti === '모름'
                      ? 'border-[#C9A84C] bg-[#C9A84C] text-white'
                      : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  모름
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">키</label>
              <div className="relative">
                <input
                  type="number"
                  value={extraData.height}
                  onChange={(e) => setExtraData({ ...extraData, height: e.target.value })}
                  placeholder="예) 175"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent pr-16"
                  style={{ fontSize: 16 }}
                  min={100}
                  max={250}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/50 font-medium">
                  cm
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || !isStep2Valid}
                className="w-full bg-[#C9A84C] text-white py-4 rounded-xl font-bold text-base hover:bg-[#b89840] transition disabled:opacity-40 shadow-lg shadow-[#C9A84C]/20"
              >
                {loading ? '저장 중...' : '프로필 완성하기'}
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 0); }}
                className="w-full py-3 rounded-xl border border-white/20 text-white/60 text-sm font-medium hover:bg-white/5 transition"
              >
                이전으로
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
