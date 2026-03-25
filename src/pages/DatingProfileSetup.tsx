import { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, X, Crown, GripVertical, ArrowLeft } from 'lucide-react';
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

const experienceOptions = ['1년미만', '1년차', '2년차', '3년차', '4년차', '5년이상'];

export default function DatingProfileSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, updateProfile } = useAuth();
  const from = (location.state as { from?: string })?.from;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<number>(0);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

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
    experience: profile?.experience || '',
  });
  const [extraData, setExtraData] = useState({
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

  const handleDragStart = (idx: number) => { dragIndexRef.current = idx; };
  const handleDragEnter = (idx: number) => { setDragOver(idx); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

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
    const path = `${user!.id}/dating-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error: uploadError } = await supabase.storage.from('profile_images').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
    if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`);
    const { data: { publicUrl } } = supabase.storage.from('profile_images').getPublicUrl(path);
    return publicUrl;
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!hasMinPhotos) { setError('사진을 3장 이상 등록해주세요'); return; }
    if (!formData.name.trim()) { setError('이름을 입력해주세요'); return; }
    if (!formData.age || Number(formData.age) < 15) { setError('나이를 올바르게 입력해주세요'); return; }
    if (!formData.gender) { setError('성별을 선택해주세요'); return; }
    if (!formData.experience) { setError('구력을 선택해주세요'); return; }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!extraData.mbti || !extraData.height.trim()) {
      setError('모든 항목을 입력해주세요');
      return;
    }
    setLoading(true);

    try {
      const filledSlots = photos.filter((p) => p.preview);
      const uploadedUrls: string[] = await Promise.all(
        filledSlots.map((slot) =>
          slot.file ? uploadPhoto(slot.file) : Promise.resolve(slot.preview)
        )
      );
      const primaryPhoto = uploadedUrls[0] || null;

      const upsertData = {
        id: user!.id,
        user_id: user!.id,
        name: formData.name || profile?.name || '',
        age: Number(formData.age) || profile?.age || 0,
        gender: formData.gender || profile?.gender || '',
        photo_url: primaryPhoto,
        photo_urls: uploadedUrls,
        mbti: extraData.mbti || null,
        height: extraData.height ? Number(extraData.height) : null,
        experience: formData.experience,
        purpose: 'dating',
        profile_completed: true,
      };

      await supabase.from('profiles').upsert(upsertData, { onConflict: 'user_id' });

      updateProfile({
        name: upsertData.name,
        age: upsertData.age,
        gender: upsertData.gender,
        photo_url: primaryPhoto || undefined,
        photo_urls: uploadedUrls,
        mbti: extraData.mbti || undefined,
        height: extraData.height ? Number(extraData.height) : undefined,
        experience: formData.experience,
        purpose: 'dating',
        profile_completed: true,
      });

      navigate(from === 'create-court' ? '/create-court' : '/home', { replace: true });
    } catch (err) {
      console.error('데이팅 프로필 업로드 실패:', err);
      setError('저장에 실패했습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  const isStep2Valid = extraData.mbti !== '' && extraData.height.trim() !== '';

  return (
    <div className="min-h-screen bg-[#1B4332] flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/60 hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">돌아가기</span>
        </button>
      </div>

      <div className="mb-1">
        <BrandLogo size="sm" light={true} />
      </div>
      <h2 className="text-base font-light text-white/70 mb-1 text-center tracking-wider mt-2">
        🥂 코트위 설레는 만남 프로필
      </h2>

      <div className="flex items-center gap-2 mt-3 mb-6">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === 1 ? 'bg-[#C9A84C] text-white' : 'bg-[#C9A84C]/30 text-[#C9A84C]'}`}>1</div>
        <div className={`h-0.5 w-10 transition-all ${step === 2 ? 'bg-[#C9A84C]' : 'bg-white/20'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === 2 ? 'bg-[#C9A84C] text-white' : 'bg-white/20 text-white/40'}`}>2</div>
      </div>

      {step === 1 && (
        <>
          <p className="text-white/60 text-sm mb-8 text-center">
            사진 3장 필수 · 최대 5장
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
                          <img src={slot.preview} alt={`사진 ${idx + 1}`} className="w-full h-full object-cover" />
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
                placeholder="이름을 입력해주세요"
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
                placeholder="예) 28"
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

      {step === 2 && (
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
                {loading ? '저장 중...' : '프로필 등록 완료'}
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); window.scrollTo({ top: 0, behavior: 'instant' }); }}
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
