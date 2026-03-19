import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      });

      if (resetError) {
        if (resetError.message.includes('security purposes') || resetError.message.includes('60 seconds')) {
          setError('60초 후에 다시 시도해주세요.');
        } else if (resetError.message.includes('User not found') || resetError.message.includes('user_not_found')) {
          setError('등록되지 않은 이메일입니다.');
        } else if (resetError.message.includes('rate limit') || resetError.message.includes('too many')) {
          setError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        } else {
          setError(`오류: ${resetError.message}`);
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex flex-col">
        <div className="bg-[#1B4332] h-[45vh] flex items-center justify-center">
          <BrandLogo size="md" light={true} />
        </div>

        <div className="flex-1 bg-[#FAF9F7] -mt-7 rounded-t-[28px] px-6 py-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📧</div>
            <h2 className="text-2xl font-bold text-[#1B4332] mb-4">이메일을 확인해주세요</h2>
            <p className="text-gray-600 mb-8">
              이메일을 확인해주세요. 비밀번호 재설정 링크를 보내드렸습니다.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-[#1B4332] text-white py-3 rounded-lg font-medium hover:bg-[#2d5a4a] transition"
            >
              로그인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] flex flex-col">
      <div className="bg-[#1B4332] h-[45vh] flex items-center justify-center">
        <h1 className="text-4xl font-['Playfair_Display'] text-white">Tennis Meet</h1>
      </div>

      <div className="flex-1 bg-[#FAF9F7] -mt-7 rounded-t-[28px] px-6 py-8">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-[#1B4332] mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>뒤로 가기</span>
        </button>

        <h2 className="text-2xl font-bold text-[#1B4332] mb-6">비밀번호 찾기</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              placeholder="example@email.com"
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              가입하신 이메일로 비밀번호 재설정 링크를 보내드립니다.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B4332] text-white py-3 rounded-lg font-medium hover:bg-[#2d5a4a] transition disabled:opacity-50"
          >
            {loading ? '전송 중...' : '재설정 링크 보내기'}
          </button>
        </form>
      </div>
    </div>
  );
}
