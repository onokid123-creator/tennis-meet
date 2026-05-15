import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => ({
    background: '#fff',
    border: `1.5px solid ${focusedField === field ? '#C9A84C' : '#D1FAE5'}`,
    borderRadius: '14px',
    fontSize: 16,
    color: '#1B4332',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(201,168,76,0.15)' : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });

  const goldColor = '#C9A84C';
  const mintColor = '#4ADE80';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #F0FFF4 0%, #ECFDF5 100%)' }}
    >
      <div className="px-5 pt-14 pb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90"
          style={{ background: 'rgba(27,67,50,0.08)', border: '1px solid rgba(27,67,50,0.15)' }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: '#1B4332' }} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-10">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke={goldColor} strokeWidth="1.3" />
              <circle cx="14" cy="14" r="7.5" stroke={mintColor} strokeWidth="0.9" strokeDasharray="2.5 2" />
              <line x1="3" y1="14" x2="25" y2="14" stroke={goldColor} strokeWidth="1" />
              <path d="M14 3 C10 6 9 10 9 14 C9 18 10 22 14 25" stroke={mintColor} strokeWidth="1" fill="none" />
              <path d="M14 3 C18 6 19 10 19 14 C19 18 18 22 14 25" stroke={goldColor} strokeWidth="1" fill="none" />
              <circle cx="14" cy="14" r="1.8" fill={goldColor} />
            </svg>
            <span
              style={{
                fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                fontSize: '1.05rem',
                fontWeight: 300,
                letterSpacing: '0.22em',
                color: '#1B4332',
              }}
            >
              TENNIS <span style={{ color: goldColor, fontWeight: 400 }}>MEET</span>
            </span>
          </div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 300,
              color: '#1B4332',
              lineHeight: 1.4,
              letterSpacing: '0.02em',
            }}
          >
            테니스로 시작되는 설레는 만남
          </h2>
          <p className="mt-2.5" style={{ fontSize: 14, color: 'rgba(27,67,50,0.55)' }}>
            이메일과 비밀번호로 로그인해주세요
          </p>
        </div>

        {error && (
          <div
            className="mb-5 px-4 py-3 rounded-2xl text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#B91C1C' }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1B4332' }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className="w-full px-4 py-3.5 focus:outline-none"
              style={inputStyle('email')}
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1B4332' }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className="w-full px-4 py-3.5 focus:outline-none"
              style={inputStyle('password')}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 font-bold tracking-widest uppercase transition active:scale-[0.98] disabled:opacity-50"
              style={{
                background: '#C9A84C',
                color: '#1B4332',
                borderRadius: '14px',
                fontSize: 13,
                letterSpacing: '0.18em',
                fontWeight: 700,
                boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
              }}
            >
              {loading ? '로그인 중...' : 'LOGIN'}
            </button>
          </div>
        </form>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={() => navigate('/signup')}
            className="text-sm font-medium transition"
            style={{ color: 'rgba(27,67,50,0.65)' }}
          >
            처음이신가요?{' '}
            <span style={{ color: '#C9A84C', fontWeight: 700 }}>회원가입</span>
          </button>
          <button
            onClick={() => navigate('/forgot-password')}
            className="text-xs transition"
            style={{ color: 'rgba(27,67,50,0.45)' }}
          >
            비밀번호 찾기
          </button>
        </div>
      </div>
    </div>
  );
}
