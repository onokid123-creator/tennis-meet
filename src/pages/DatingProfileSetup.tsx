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

const MAX_ORIGINAL_PHOTO_SIZE = 15 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;

const experienceOptions = ['1년미만', '1년차', '2년차', '3년차', '4년차', '5년이상'];

const ACTIVITY_REGIONS = [
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

export default function DatingProfileSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, updateProfile } = useAuth();
  const from = (location.state as { from?: string })?.from;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<number>(0);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

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
    activity_region: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const photoCount = photos.filter((p) => p.preview).length;
  const isFemale = formData.gender === '여성';
  const isMale = formData.gender === '남성';
  const hasRepresentativePhoto = !!photos[0]?.preview;
  const hasMinPhotos = isFemale ? hasRepresentativePhoto : isMale ? photoCount >= 3 : photoCount >= 1;
  const photoRequirementText = isFemale ? '대표 사진 1장 필수 · 나머지 선택' : isMale ? '사진 3장 필수 · 최대 5장' : '대표 사진 먼저 등록해주세요';
  const photoBadgeText = isFemale ? `${photoCount}/5 · 대표 1장 필수` : isMale ? `${photoCount}/5 · 필수 3장` : `${photoCount}/5 · 대표 사진 필수`;
  const photoErrorText = isFemale ? '대표 사진 1장을 등록해주세요' : isMale ? '사진을 3장 이상 등록해주세요' : '성별을 선택해주세요';

  const openFilePicker = (slotIdx: number) => {
    activeSlotRef.current = slotIdx;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const idx = activeSlotRef.current;
    const photoLabel = `${idx + 1}번째 사진`;

    console.log('[DatingProfileSetup] file selected', {
      index: idx,
      name: file.name,
      type: file.type,
      size: file.size,
      overLimit: file.size > MAX_ORIGINAL_PHOTO_SIZE,
    });

    if (file.size > MAX_ORIGINAL_PHOTO_SIZE) {
      setError(`${photoLabel} 용량이 너무 큽니다. 15MB 이하 사진으로 다시 선택해주세요.`);
      input.value = '';
      return;
    }

    if (file.type && !file.type.startsWith('image/')) {
      setError(`${photoLabel} 파일 형식이 올바르지 않습니다. 이미지 파일을 선택해주세요.`);
      input.value = '';
      return;
    }

    const preview = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      console.log('[DatingProfileSetup] preview load success', {
        index: idx,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });

      setError('');
      setPhotos((prev) => {
        const next = [...prev];
        next[idx] = { file, preview, uploading: false };
        return next;
      });
    };

    img.onerror = () => {
      console.error('[DatingProfileSetup] preview load failed', {
        index: idx,
        name: file.name,
        type: file.type,
        size: file.size,
      });

      URL.revokeObjectURL(preview);
      setError(`${photoLabel}을 불러올 수 없습니다. 다른 사진으로 다시 선택해주세요.`);
    };

    img.src = preview;
    input.value = '';
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

  const compressFile = (file: File, index?: number): Promise<Blob> => {
    const photoLabel = index !== undefined ? `${index + 1}번째 사진` : '사진';

    if (file.size > MAX_ORIGINAL_PHOTO_SIZE) {
      return Promise.reject(new Error(`${photoLabel} 용량이 너무 큽니다. 15MB 이하 사진으로 다시 선택해주세요.`));
    }

    if (file.type && !file.type.startsWith('image/')) {
      return Promise.reject(new Error(`${photoLabel} 파일 형식이 올바르지 않습니다. 이미지 파일을 선택해주세요.`));
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const sourceWidth = img.naturalWidth || img.width;
        const sourceHeight = img.naturalHeight || img.height;

        if (!sourceWidth || !sourceHeight) {
          reject(new Error(`${photoLabel}을 불러올 수 없습니다. 다른 사진으로 다시 선택해주세요.`));
          return;
        }

        const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * ratio));
        const height = Math.max(1, Math.round(sourceHeight * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error(`${photoLabel}을 처리할 수 없습니다. 다른 사진으로 다시 선택해주세요.`));
          return;
        }

        context.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob || blob.size === 0) {
            reject(new Error(`${photoLabel} 압축에 실패했습니다. 다른 사진으로 다시 선택해주세요.`));
            return;
          }

          resolve(blob);
        }, 'image/jpeg', JPEG_QUALITY);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`${photoLabel}을 불러올 수 없습니다. 갤러리에서 다른 사진으로 다시 선택해주세요.`));
      };

      img.src = url;
    });
  };

  const uploadPhoto = async (file: File, index?: number): Promise<string> => {
    console.log('[DatingProfileSetup] uploadPhoto:start', {
      index,
      name: file.name,
      type: file.type,
      size: file.size,
      userId: user?.id,
    });

    const compressed = await compressFile(file, index);

    console.log('[DatingProfileSetup] uploadPhoto:compressed', {
      index,
      originalSize: file.size,
      compressedSize: compressed.size,
      compressedType: compressed.type,
    });

    const path = `${user!.id}/dating-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('profile_images')
      .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });

    if (uploadError) {
      console.error('[DatingProfileSetup] uploadPhoto:error', {
        index,
        path,
        message: uploadError.message,
        error: uploadError,
      });
      throw new Error(`${index !== undefined ? index + 1 : ''}번째 사진 업로드에 실패했습니다. 다시 시도해주세요.`);
    }

    const { data: { publicUrl } } = supabase.storage.from('profile_images').getPublicUrl(path);

    console.log('[DatingProfileSetup] uploadPhoto:success', {
      index,
      path,
      publicUrl,
    });

    return publicUrl;
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) { setError('이름을 입력해주세요'); return; }
    if (!formData.age || Number(formData.age) < 15) { setError('나이를 올바르게 입력해주세요'); return; }
    if (!formData.gender) { setError('성별을 선택해주세요'); return; }
    if (!hasMinPhotos) { setError(photoErrorText); return; }
    if (!formData.experience) { setError('구력을 선택해주세요'); return; }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!extraData.mbti || !extraData.height.trim() || !extraData.activity_region) {
      setError('모든 항목을 입력해주세요');
      return;
    }
    setLoading(true);

    try {
      console.log('[DatingProfileSetup] submit:start', {
        userId: user?.id,
        email: user?.email,
        gender: formData.gender,
        photoCount: photos.filter((p) => p.preview).length,
        mbti: extraData.mbti,
        height: extraData.height,
        activity_region: extraData.activity_region,
      });

      const filledSlots = photos.filter((p) => p.preview);

      const uploadedUrls: string[] = [];
      for (let i = 0; i < filledSlots.length; i += 1) {
        const slot = filledSlots[i];
        try {
          const url = slot.file ? await uploadPhoto(slot.file, i) : slot.preview;
          uploadedUrls.push(url);
        } catch (uploadErr) {
          console.error('[DatingProfileSetup] submit:upload failed', {
            index: i,
            error: uploadErr,
          });
          throw uploadErr;
        }
      }

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
        activity_region: extraData.activity_region || null,
        experience: formData.experience,
        purpose: 'dating',
        profile_completed: true,
      };

      console.log('[DatingProfileSetup] profile upsert:start', {
        userId: user?.id,
        photoCount: uploadedUrls.length,
        purpose: upsertData.purpose,
        profileCompleted: upsertData.profile_completed,
      });

      const { data: savedProfile, error: upsertError } = await supabase
        .from('profiles')
        .upsert(upsertData, { onConflict: 'user_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('[DatingProfileSetup] profile upsert:error', upsertError);
        throw new Error(`프로필 저장 실패: ${upsertError.message}`);
      }

      console.log('[DatingProfileSetup] profile upsert:success', savedProfile);

      updateProfile({
        name: upsertData.name,
        age: upsertData.age,
        gender: upsertData.gender,
        photo_url: primaryPhoto || undefined,
        photo_urls: uploadedUrls,
        mbti: extraData.mbti || undefined,
        height: extraData.height ? Number(extraData.height) : undefined,
        activity_region: extraData.activity_region || undefined,
        experience: formData.experience,
        purpose: 'dating',
        profile_completed: true,
      });

      navigate(from === 'create-court' ? '/create-court' : '/home', { replace: true });
    } catch (err) {
      console.error('[DatingProfileSetup] submit:failed', err);
      setError(err instanceof Error ? err.message : '저장에 실패했습니다. 다시 시도해주세요.');
      setLoading(false);
    }
  };

  const isStep2Valid = extraData.mbti !== '' && extraData.height.trim() !== '';
  const isStep3Valid = extraData.activity_region !== '';

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-10" style={{ background: 'linear-gradient(180deg, #FFF8F1 0%, #F7EFE4 52%, #EEF7F0 100%)' }}>
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#6B5A45] hover:text-[#2D6A4F] transition mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">돌아가기</span>
        </button>
      </div>

      <div className="mb-1">
        <BrandLogo size="sm" light={false} />
      </div>
      <h2 className="text-base font-light text-[#6B5A45] mb-1 text-center tracking-wider mt-2">
        🎾 테니스 메이트 프로필
      </h2>

      <div className="flex items-center gap-2 mt-3 mb-6">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === 1 ? 'bg-[#C9A84C] text-white shadow-sm' : 'bg-white/70 text-[#C9A84C] border border-[#E7D9BE]'}`}>1</div>
        <div className={`h-0.5 w-10 transition-all ${step >= 2 ? 'bg-[#C9A84C]' : 'bg-[#E7D9BE]'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === 2 ? 'bg-[#C9A84C] text-white shadow-sm' : 'bg-white/70 text-[#B7A27A] border border-[#E7D9BE]'}`}>2</div>
        <div className={`h-0.5 w-10 transition-all ${step >= 3 ? 'bg-[#C9A84C]' : 'bg-[#E7D9BE]'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === 3 ? 'bg-[#C9A84C] text-white shadow-sm' : 'bg-white/70 text-[#B7A27A] border border-[#E7D9BE]'}`}>3</div>
      </div>

      {step === 1 && (
        <>
        <div className="mb-8 text-center space-y-3">
  <p className="text-[#6B5A45] text-sm font-medium">
    {photoRequirementText}
  </p>

  <div className="bg-white/75 border border-[#EADDC8] rounded-2xl px-4 py-4 shadow-sm">
    <p className="text-[#5F5345] text-sm leading-relaxed">
      테니스 메이트는 서로의 신뢰를 위해<br />
      <span className="text-[#C9A84C] font-semibold">얼굴이 나온 사진 등록</span>이 필요해요.
    </p>

    <p className="text-[#C9A84C] text-xs font-semibold mt-2">
      코트 등록 시 사진 비공개 선택 가능
    </p>

    <p className="text-[#8A7B68] text-xs mt-2">
      자연스럽고 안전한 만남 문화를 위해 운영되고 있어요
    </p>
  </div>
</div>

          <form onSubmit={handleStep1Next} className="w-full max-w-md space-y-7">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#3F3A31] text-sm font-semibold">사진 등록</span>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  hasMinPhotos ? 'bg-[#E7F4EA] text-[#2D6A4F]' : 'bg-[#FFF3D6] text-[#B88A22]'
                }`}>
                  {photoBadgeText}
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
                  const isRequired = isFemale ? idx === 0 : isMale ? idx < 3 : idx === 0;
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
                              ? 'border-[#C9A84C]/70 bg-white/75 hover:bg-[#FFF7E6]'
                              : 'border-[#E5D8C2] bg-white/55 hover:bg-white/80'
                          }`}
                        >
                          {isFirst && (
                            <Crown className={`w-4 h-4 ${isRequired ? 'text-[#C9A84C]' : 'text-[#B7A27A]'}`} />
                          )}
                          <Upload className={`w-5 h-5 ${isRequired ? 'text-[#C9A84C]' : 'text-[#B7A27A]'}`} />
                          <span className={`text-[10px] font-semibold ${isRequired ? 'text-[#C9A84C]' : 'text-[#8A7B68]'}`}>
                            {idx + 1}/5{isRequired ? ' *' : ''}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-500 px-3 py-2 rounded-xl text-xs mt-3 text-center">
                  {error}
                </div>
              )}

              {!hasMinPhotos && (
                <p className="text-[#B88A22] text-xs mt-2 text-center font-medium">
                  {photoErrorText}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3F3A31] mb-1">이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/85 border border-[#E5D8C2] rounded-xl text-[#2F2A24] placeholder-[#B7A27A] focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent shadow-sm"
                style={{ fontSize: 16 }}
                placeholder="이름을 입력해주세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3F3A31] mb-1">나이</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-4 py-3 bg-white/85 border border-[#E5D8C2] rounded-xl text-[#2F2A24] placeholder-[#B7A27A] focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent shadow-sm"
                style={{ fontSize: 16 }}
                placeholder="예) 28"
                min={15}
                max={100}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3F3A31] mb-2">성별</label>
              <div className="flex gap-3">
                {['남성', '여성'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                      formData.gender === g
                        ? 'border-[#C9A84C] bg-[#C9A84C] text-white shadow-sm'
                        : 'border-[#E5D8C2] bg-white/70 text-[#5F5345] hover:bg-white'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3F3A31] mb-2">구력</label>
              <div className="grid grid-cols-3 gap-2.5">
                {experienceOptions.map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setFormData({ ...formData, experience: exp })}
                    className={`py-3 rounded-xl border-2 transition text-sm font-medium ${
                      formData.experience === exp
                        ? 'border-[#C9A84C] bg-[#C9A84C] text-white shadow-sm'
                        : 'border-[#E5D8C2] bg-white/70 text-[#5F5345] hover:bg-white'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-500 px-4 py-3 rounded-xl text-sm">
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
          <p className="text-[#6B5A45] text-sm mb-8 text-center">
            추가 정보를 입력해주세요
          </p>

          <form onSubmit={(e) => { e.preventDefault(); if (!isStep2Valid) return; setStep(3); setError(''); window.scrollTo({ top: 0, behavior: 'instant' }); }} className="w-full max-w-md space-y-7">
            <div>
              <label className="block text-sm font-medium text-[#3F3A31] mb-3">MBTI</label>
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
                            ? 'border-[#C9A84C] bg-[#C9A84C] text-white shadow-sm'
                            : 'border-[#E5D8C2] bg-white/70 text-[#5F5345] hover:bg-white'
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
                      ? 'border-[#C9A84C] bg-[#C9A84C] text-white shadow-sm'
                      : 'border-[#E5D8C2] bg-white/70 text-[#5F5345] hover:bg-white'
                  }`}
                >
                  모름
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#3F3A31] mb-2">키</label>
              <div className="relative">
                <input
                  type="number"
                  value={extraData.height}
                  onChange={(e) => setExtraData({ ...extraData, height: e.target.value })}
                  placeholder="예) 175"
                  className="w-full px-4 py-3 bg-white/85 border border-[#E5D8C2] rounded-xl text-[#2F2A24] placeholder-[#B7A27A] focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent pr-16 shadow-sm"
                  style={{ fontSize: 16 }}
                  min={100}
                  max={250}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8A7B68] font-medium">
                  cm
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-500 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={!isStep2Valid}
                className="w-full bg-[#C9A84C] text-white py-4 rounded-xl font-bold text-base hover:bg-[#b89840] transition disabled:opacity-40 shadow-lg shadow-[#C9A84C]/20"
              >
                다음 단계
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                className="w-full py-3 rounded-xl border border-[#E5D8C2] text-[#6B5A45] text-sm font-medium hover:bg-white/70 transition"
              >
                이전으로
              </button>
            </div>
          </form>
        </>
      )}

      {step === 3 && (
        <>
          <p className="text-[#6B5A45] text-sm mb-8 text-center leading-relaxed">
            주로 활동하는 지역을 선택해주세요.<br />
            선택한 지역은 사람부터 구할래요에 프로필 정보로 노출돼요.
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid #EADDC8' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(45,106,79,0.08)' }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <p className="text-sm leading-6" style={{ color: '#5F5345' }}>
                  선택한 지역은 <b>사람부터 구할래요</b>에서 다른 이성 회원들에게 프로필 정보로 노출돼요.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {ACTIVITY_REGIONS.filter((region) => region !== '전체').map((region) => {
                const selected = extraData.activity_region === region;
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setExtraData({ ...extraData, activity_region: region })}
                    className="py-3 rounded-xl border-2 text-sm font-semibold transition active:scale-95"
                    style={{
                      borderColor: selected ? '#C9A84C' : '#E5D8C2',
                      background: selected ? '#C9A84C' : 'rgba(255,255,255,0.7)',
                      color: selected ? '#FFFFFF' : '#5F5345',
                      boxShadow: selected ? '0 4px 12px rgba(201,168,76,0.22)' : 'none',
                    }}
                  >
                    {region}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-500 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || !isStep3Valid}
                className="w-full bg-[#C9A84C] text-white py-4 rounded-xl font-bold text-base hover:bg-[#b89840] transition disabled:opacity-40 shadow-lg shadow-[#C9A84C]/20"
              >
                {loading ? '저장 중...' : '프로필 등록 완료'}
              </button>
              <button
                type="button"
                onClick={() => { setStep(2); setError(''); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                className="w-full py-3 rounded-xl border border-[#E5D8C2] text-[#6B5A45] text-sm font-medium hover:bg-white/70 transition"
              >
                이전 단계
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
