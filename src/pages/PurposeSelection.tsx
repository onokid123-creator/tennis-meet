import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function PurposeSelection() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [selectedPurpose, setSelectedPurpose] = useState<'tennis' | 'dating' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!selectedPurpose || !user) return;
    setLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({ purpose: selectedPurpose, profile_completed: false })
        .eq('user_id', user.id);
      await refreshProfile();
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 0);
      if (selectedPurpose === 'tennis') {
        navigate('/tennis-profile-setup', { replace: true });
      } else {
        navigate('/dating-profile-setup', { replace: true });
      }
    } catch (err) {
      console.error('목적 저장 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1B4332] to-[#2d5a4a] flex flex-col items-center justify-center px-6 py-12">
      <h2 className="text-2xl font-['Playfair_Display'] text-white mb-12 text-center">
        당신의 테니스 스타일을 선택해 주세요
      </h2>

      <div className="w-full max-w-md space-y-6">
        <button
          onClick={() => setSelectedPurpose('tennis')}
          className={`w-full h-64 rounded-2xl overflow-hidden relative transition ${
            selectedPurpose === 'tennis' ? 'ring-4 ring-[#C9A84C]' : ''
          }`}
        >
          <img
            src="https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80"
            alt="테니스"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
            <div className="text-white">
              <h3 className="text-2xl font-bold mb-2">오직 테니스</h3>
              <p className="text-sm opacity-90">순수하게 테니스 파트너를 찾습니다</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setSelectedPurpose('dating')}
          className={`w-full h-64 rounded-2xl overflow-hidden relative transition ${
            selectedPurpose === 'dating' ? 'ring-4 ring-[#C9A84C]' : ''
          }`}
        >
          <img
            src="/assets/image.png"
            alt="코트 위 설레는 만남"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col items-center justify-center p-6">
            <div className="text-white text-center mb-4">
              <h3 className="text-2xl font-bold mb-2">취미를 넘어, 설레는 사랑으로</h3>
              <p className="text-sm opacity-90">코트 밖에서도 이어지는 특별한 만남</p>
            </div>
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
              <span className="inline-block px-4 py-2 bg-[#C9A84C] text-white text-xs font-semibold rounded-full">
                얼굴 사진 등록 필수
              </span>
            </div>
          </div>
        </button>
      </div>

      <button
        onClick={handleStart}
        disabled={!selectedPurpose || loading}
        className="mt-12 px-12 py-4 bg-[#C9A84C] text-white font-bold text-lg rounded-full hover:bg-[#b89840] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '저장 중...' : '시작하기'}
      </button>
    </div>
  );
}
