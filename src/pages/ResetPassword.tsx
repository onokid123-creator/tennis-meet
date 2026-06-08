import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BrandLogo from '../components/BrandLogo';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const prepareRecoverySession = async () => {
      try {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        const hashError = hashParams.get('error');
        const hashErrorCode = hashParams.get('error_code');
        const hashErrorDescription = hashParams.get('error_description');

        if (hashError) {
          console.warn('[RESET_PASSWORD] hash error:', hashErrorCode, hashErrorDescription);

          if (hashErrorCode === 'otp_expired') {
            setError('비밀번호 재설정 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해주세요.');
          } else {
            setError(hashErrorDescription || '비밀번호 재설정 링크가 유효하지 않습니다. 다시 요청해주세요.');
          }

          setHasSession(false);
          setCheckingSession(false);
          window.history.replaceState({}, document.title, '/reset-password');
          return;
        }

        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('[RESET_PASSWORD] exchangeCodeForSession failed:', exchangeError.message);
            setError('비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.');
            setHasSession(false);
            setCheckingSession(false);
            window.history.replaceState({}, document.title, '/reset-password');
            return;
          }

          window.history.replaceState({}, document.title, '/reset-password');
        }

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.warn('[RESET_PASSWORD] setSession failed:', sessionError.message);
            setError('비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.');
            setHasSession(false);
            setCheckingSession(false);
            window.history.replaceState({}, document.title, '/reset-password');
            return;
          }

          window.history.replaceState({}, document.title, '/reset-password');
        }

        const { data } = await supabase.auth.getSession();
        setHasSession(Boolean(data.session));

        if (!data.session) {
          setError('비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.');
        }
      } catch (e) {
        console.error('[RESET_PASSWORD] session check error:', e);
        setError('오류가 발생했습니다. 비밀번호 재설정 링크를 다시 요청해주세요.');
        setHasSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    prepareRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message || '비밀번호 변경에 실패했습니다.');
        return;
      }

      await supabase.auth.signOut();
      setSuccess(true);

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (e) {
      console.error('[RESET_PASSWORD] update error:', e);
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-[#1B4332] font-semibold">확인 중...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex flex-col">
        <div className="bg-[#1B4332] h-[45vh] flex items-center justify-center">
          <BrandLogo size="md" light={true} />
        </div>

        <div className="flex-1 bg-[#FAF9F7] -mt-7 rounded-t-[28px] px-6 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-[#1B4332] mb-4">비밀번호가 변경됐어요</h2>
            <p className="text-gray-600 mb-8">새 비밀번호로 다시 로그인해주세요.</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full bg-[#1B4332] text-white py-3 rounded-lg font-medium hover:bg-[#2d5a4a] transition"
            >
              로그인으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex flex-col">
        <div className="bg-[#1B4332] h-[45vh] flex items-center justify-center">
          <BrandLogo size="md" light={true} />
        </div>

        <div className="flex-1 bg-[#FAF9F7] -mt-7 rounded-t-[28px] px-6 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-[#1B4332] mb-4">링크가 만료됐어요</h2>
            <p className="text-gray-600 mb-8">
              {error || '비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.'}
            </p>
            <button
              onClick={() => navigate('/forgot-password', { replace: true })}
              className="w-full bg-[#1B4332] text-white py-3 rounded-lg font-medium hover:bg-[#2d5a4a] transition"
            >
              재설정 링크 다시 받기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] flex flex-col">
      <div className="bg-[#1B4332] h-[45vh] flex items-center justify-center">
        <BrandLogo size="md" light={true} />
      </div>

      <div className="flex-1 bg-[#FAF9F7] -mt-7 rounded-t-[28px] px-6 py-8">
        <h2 className="text-2xl font-bold text-[#1B4332] mb-6">새 비밀번호 설정</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              placeholder="6자 이상 입력"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
              placeholder="한 번 더 입력"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B4332] text-white py-3 rounded-lg font-medium hover:bg-[#2d5a4a] transition disabled:opacity-50"
          >
            {loading ? '변경 중...' : '비밀번호 변경하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
