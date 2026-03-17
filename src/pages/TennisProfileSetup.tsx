import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, X, ArrowLeft } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function TennisProfileSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateProfile } = useAuth();
  const from = (location.state as { from?: string })?.from;

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [experience, setExperience] = useState('');
  const [tennisStyle, setTennisStyle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const experienceOptions = ['1년미만', '1년차', '2년차', '3년차', '4년차', '5년이상'];
  const tennisStyleOptions = ['포핸드형', '백핸드형', '발리형', '서브형', '올라운더'];

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

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
    const path = `${user!.id}/tennis-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('profile-images').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
    if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`);
    const { data: { publicUrl } } = supabase.storage.from('profile-images').getPublicUrl(path);
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    if (!age || Number(age) < 15) { setError('나이를 올바르게 입력해주세요'); return; }
    if (!gender) { setError('성별을 선택해주세요'); return; }
    if (!experience || !tennisStyle) { setError('구력과 테니스 스타일을 선택해주세요'); return; }

    setLoading(true);
    setError('');
    try {
      let photoUrl = '';
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }

      await supabase.from('profiles').upsert(
        {
          id: user!.id,
          user_id: user!.id,
          name: name.trim(),
          age: Number(age),
          gender,
          experience,
          tennis_style: tennisStyle,
          purpose: 'tennis',
          profile_completed: true,
          tennis_photo_url: photoUrl || undefined,
        },
        { onConflict: 'user_id' }
      );

      const tennisProfile = {
        photo_url: photoUrl || undefined,
        name: name.trim(),
        age: Number(age),
        gender,
        experience,
        tennis_style: tennisStyle,
      };
      localStorage.setItem('tennis_profile', JSON.stringify(tennisProfile));

      updateProfile({
        name: name.trim(),
        age: Number(age),
        gender,
        experience,
        tennis_style: tennisStyle,
        purpose: 'tennis',
        profile_completed: true,
        tennis_photo_url: photoUrl || undefined,
      });

      if (from === 'create-court') {
        navigate('/create-court', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!name.trim() && !!age && !!gender && !!experience && !!tennisStyle;

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
        테니스 전용 프로필
      </h2>
      <p className="text-white/50 text-xs mb-8 text-center">구력과 스타일 정보로 최적의 파트너를 찾아드려요</p>

      <div className="w-full max-w-md space-y-7">
        <div>
          <label className="block text-sm font-medium text-white mb-3">사진 (선택사항)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <div className="flex items-center gap-4">
            {photoPreview ? (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                <img src={photoPreview} alt="테니스 프로필" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(''); setPhotoFile(null); }}
                  className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/30 bg-white/5 flex flex-col items-center justify-center gap-1.5 hover:bg-white/10 transition flex-shrink-0"
              >
                <Upload className="w-5 h-5 text-white/50" />
                <span className="text-[10px] text-white/40">사진 추가</span>
              </button>
            )}
            <div>
              <p className="text-white/60 text-sm">테니스 전용 사진 (선택)</p>
              <p className="text-white/30 text-xs mt-1">등록하지 않아도 됩니다</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">이름 <span className="text-[#C9A84C]">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent"
            style={{ fontSize: 16 }}
            placeholder="이름을 입력해주세요"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">나이 <span className="text-[#C9A84C]">*</span></label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#C9A84C] focus:border-transparent"
            style={{ fontSize: 16 }}
            placeholder="예) 28"
            min={15}
            max={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">성별 <span className="text-[#C9A84C]">*</span></label>
          <div className="flex gap-3">
            {['남성', '여성'].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                  gender === g
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
          <label className="block text-sm font-medium text-white mb-3">구력 <span className="text-[#C9A84C]">*</span></label>
          <div className="grid grid-cols-3 gap-2.5">
            {experienceOptions.map((exp) => (
              <button
                key={exp}
                type="button"
                onClick={() => setExperience(exp)}
                className={`py-3 rounded-xl border-2 transition text-sm font-medium ${
                  experience === exp
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
          <label className="block text-sm font-medium text-white mb-3">테니스 스타일 <span className="text-[#C9A84C]">*</span></label>
          <div className="grid grid-cols-3 gap-2.5">
            {tennisStyleOptions.map((style) => (
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
          type="button"
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="w-full bg-[#C9A84C] text-white py-4 rounded-xl font-bold text-base hover:bg-[#b89840] transition disabled:opacity-40 shadow-lg shadow-[#C9A84C]/20"
        >
          {loading ? '저장 중...' : '테니스 프로필 완성하기'}
        </button>
      </div>
    </div>
  );
}
