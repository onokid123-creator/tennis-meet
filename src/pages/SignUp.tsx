import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, X, Check } from 'lucide-react';

type ModalType = 'terms' | 'privacy' | null;

const TERMS_CONTENT = [
  { title: '제1조', text: '본 약관은 Tennis Meet가 제공하는 테니스 파트너 매칭 서비스의 이용 조건을 규정합니다.' },
  { title: '제2조', text: '만 17세 이상이면 누구나 이용 가능합니다.' },
  { title: '제3조', text: '허위 프로필, 음란물, 사기 행위를 금지하며 위반 시 이용이 제한됩니다.' },
  { title: '제4조', text: '서비스: 오직테니스(테니스 파트너 매칭), 설레는 만남(이성 매칭), 채팅 및 매칭 기능.' },
  { title: '제5조', text: '회사는 이용자 간 매칭 결과 및 만남에 대해 책임을 지지 않습니다.' },
];

const PRIVACY_CONTENT = [
  { title: '수집항목', text: '이름, 이메일, 생년월일, 성별, 프로필 사진, 테니스 구력.' },
  { title: '수집목적', text: '회원가입, 테니스 파트너 매칭 서비스 제공.' },
  { title: '보유기간', text: '회원 탈퇴 시 즉시 삭제.' },
  { title: '제3자 제공', text: '이용자 동의 없이 제3자에게 제공하지 않습니다.' },
  { title: '처리위탁', text: 'Supabase Inc.(데이터베이스 및 인증).' },
  { title: '개인정보 보호책임자', text: '김민욱' },
];

function ConsentModal({
  type,
  onClose,
  onConfirm,
}: {
  type: ModalType;
  onClose: () => void;
  onConfirm: (type: ModalType) => void;
}) {
  if (!type) return null;

  const isTerms = type === 'terms';
  const title = isTerms ? '이용약관' : '개인정보처리방침';
  const items = isTerms ? TERMS_CONTENT : PRIVACY_CONTENT;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg flex flex-col"
        style={{
          background: '#fff',
          borderRadius: '16px 16px 0 0',
          maxHeight: '80vh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition active:scale-90"
            style={{ background: '#F3F4F6' }}
          >
            <X className="w-4 h-4" style={{ color: '#6B7280' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {items.map((item) => (
            <div key={item.title}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1B4332', marginBottom: 4 }}>{item.title}</p>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.65 }}>{item.text}</p>
            </div>
          ))}
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 16 }}>시행일: 2026년 3월 13일</p>
        </div>

        <div className="px-6 py-4" style={{ borderTop: '1px solid #F3F4F6' }}>
          <button
            onClick={() => onConfirm(type)}
            className="w-full py-3.5 font-bold transition active:scale-[0.98]"
            style={{
              background: '#1B4332',
              color: '#fff',
              borderRadius: '12px',
              fontSize: 15,
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
  badge,
  onView,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  badge: string;
  onView: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button type="button" onClick={onChange} className="flex items-center gap-2.5 flex-1 min-w-0">
        <div
          className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition"
          style={{
            background: checked ? '#C9A84C' : 'rgba(255,255,255,0.08)',
            border: `2px solid ${checked ? '#C9A84C' : 'rgba(255,255,255,0.3)'}`,
          }}
        >
          {checked && <Check className="w-3 h-3" style={{ color: '#fff', strokeWidth: 3 }} />}
        </div>
        <span style={{ fontSize: 14, color: 'rgba(27,67,50,0.8)' }}>
          {label}{' '}
          <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>({badge})</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onView}
        className="flex-shrink-0 ml-2 px-2.5 py-1 rounded transition active:scale-95"
        style={{
          fontSize: 12,
          color: 'rgba(27,67,50,0.55)',
          border: '1px solid #D1FAE5',
          background: '#F0FFF4',
          fontWeight: 500,
        }}
      >
        보기
      </button>
    </div>
  );
}

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    birthdate: '',
    gender: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [toast, setToast] = useState('');

  const allAgreed = agreeTerms && agreePrivacy;

  const ageFromBirthdate = formData.birthdate ? (() => {
    const today = new Date();
    const birth = new Date(formData.birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  })() : null;

  const isUnderAge = ageFromBirthdate !== null && ageFromBirthdate < 17;

  const toggleAll = () => {
    const next = !allAgreed;
    setAgreeTerms(next);
    setAgreePrivacy(next);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleModalConfirm = (type: ModalType) => {
    if (type === 'terms') setAgreeTerms(true);
    if (type === 'privacy') setAgreePrivacy(true);
    setModal(null);
  };

  const calculateAge = (birthdate: string) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms || !agreePrivacy) {
      showToast('이용약관 및 개인정보처리방침에 동의해주세요.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const age = calculateAge(formData.birthdate);
      await signUp(formData.email, formData.password, formData.name, age, formData.gender);
      localStorage.removeItem('profile_photo_fallback');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 0);
      navigate('/purpose-selection');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      console.error('[SignUp Page] 회원가입 실패:', msg);
      if (msg.includes('이미 가입된')) {
        navigate('/purpose-selection');
        return;
      }
      setError(msg || '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.');
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

  return (
    <>
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'linear-gradient(160deg, #F0FFF4 0%, #ECFDF5 100%)' }}
      >
        <div className="px-5 pt-14 pb-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-90"
            style={{ background: 'rgba(27,67,50,0.08)', border: '1px solid rgba(27,67,50,0.15)' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: '#1B4332' }} />
          </button>
        </div>

        <div className="flex-1 px-6 pb-12 overflow-y-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke="#C9A84C" strokeWidth="1.3" />
                <circle cx="14" cy="14" r="7.5" stroke="#4ADE80" strokeWidth="0.9" strokeDasharray="2.5 2" />
                <line x1="3" y1="14" x2="25" y2="14" stroke="#C9A84C" strokeWidth="1" />
                <path d="M14 3 C10 6 9 10 9 14 C9 18 10 22 14 25" stroke="#4ADE80" strokeWidth="1" fill="none" />
                <path d="M14 3 C18 6 19 10 19 14 C19 18 18 22 14 25" stroke="#C9A84C" strokeWidth="1" fill="none" />
                <circle cx="14" cy="14" r="1.8" fill="#C9A84C" />
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
                TENNIS <span style={{ color: '#C9A84C', fontWeight: 400 }}>MEET</span>
              </span>
            </div>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 300,
                color: '#1B4332',
                lineHeight: 1.4,
                letterSpacing: '0.02em',
              }}
            >
              시작해볼까요
            </h2>
            <p className="mt-2.5" style={{ fontSize: 14, color: 'rgba(27,67,50,0.55)' }}>
              정보를 입력하고 테니스 인연을 찾아보세요
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
              <label className="block text-sm font-medium mb-2" style={{ color: '#1B4332' }}>이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                className="w-full px-4 py-3.5 focus:outline-none"
                style={inputStyle('name')}
                placeholder="홍길동"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1B4332' }}>이메일</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className="w-full px-4 py-3.5 focus:outline-none"
                style={inputStyle('email')}
                placeholder="example@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1B4332' }}>비밀번호</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="w-full px-4 py-3.5 focus:outline-none"
                style={inputStyle('password')}
                placeholder="6자 이상"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1B4332' }}>생년월일</label>
              <input
                type="date"
                value={formData.birthdate}
                onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                onFocus={() => setFocusedField('birthdate')}
                onBlur={() => setFocusedField(null)}
                className="w-full px-4 py-3.5 focus:outline-none"
                style={inputStyle('birthdate')}
                required
              />
              {isUnderAge && (
                <p className="mt-2 text-sm" style={{ color: '#FCA5A5', fontWeight: 500 }}>
                  Tennis Meet는 만 17세 이상만 이용 가능합니다.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1B4332' }}>성별</label>
              <div className="flex gap-3">
                {['남성', '여성'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: g })}
                    className="flex-1 py-3.5 font-semibold text-sm transition active:scale-95"
                    style={formData.gender === g
                      ? {
                          background: '#C9A84C',
                          color: '#1B4332',
                          border: '1.5px solid transparent',
                          borderRadius: '14px',
                          boxShadow: '0 4px 12px rgba(201,168,76,0.3)',
                          fontWeight: 700,
                        }
                      : {
                          background: '#fff',
                          color: '#1B4332',
                          border: '1.5px solid #D1FAE5',
                          borderRadius: '14px',
                        }
                    }
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ background: '#fff', border: '1px solid #D1FAE5' }}
            >
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-2.5 w-full"
              >
                <div
                  className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition"
                  style={{
                    background: allAgreed ? '#C9A84C' : 'rgba(255,255,255,0.08)',
                    border: `2px solid ${allAgreed ? '#C9A84C' : 'rgba(255,255,255,0.3)'}`,
                  }}
                >
                  {allAgreed && <Check className="w-3 h-3" style={{ color: '#fff', strokeWidth: 3 }} />}
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1B4332' }}>전체 동의</span>
              </button>

              <div style={{ height: 1, background: '#D1FAE5' }} />

              <CheckboxRow
                checked={agreeTerms}
                onChange={() => setAgreeTerms(!agreeTerms)}
                label="이용약관 동의"
                badge="필수"
                onView={() => setModal('terms')}
              />
              <CheckboxRow
                checked={agreePrivacy}
                onChange={() => setAgreePrivacy(!agreePrivacy)}
                label="개인정보처리방침 동의"
                badge="필수"
                onView={() => setModal('privacy')}
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading || !formData.gender || !allAgreed || isUnderAge}
                className="w-full py-4 font-bold tracking-widest uppercase transition active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: '#C9A84C',
                  color: '#1B4332',
                  borderRadius: '14px',
                  fontSize: 13,
                  letterSpacing: '0.18em',
                  fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
                }}
              >
                {loading ? '가입 중...' : 'SIGN UP'}
              </button>
            </div>
          </form>

          <div className="mt-4 text-center px-2">
            <p style={{ fontSize: 12, color: 'rgba(27,67,50,0.5)', lineHeight: 1.6 }}>
              가입하면{' '}
              <a
                href="https://dull-ursinia-865.notion.site/2cb7ab85060781568d22f9b1151324f4"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#C9A84C', fontWeight: 600, textDecoration: 'underline' }}
              >
                이용약관
              </a>
              {' '}및{' '}
              <a
                href="https://dull-ursinia-865.notion.site/Tennis-Meet-3227ab850607803d85ecf5380d35a1bd"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#C9A84C', fontWeight: 600, textDecoration: 'underline' }}
              >
                개인정보처리방침
              </a>
              에 동의하는 것으로 간주됩니다.
            </p>
          </div>

          <div className="mt-5 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm transition"
              style={{ color: 'rgba(27,67,50,0.65)' }}
            >
              이미 계정이 있으신가요?{' '}
              <span style={{ color: '#C9A84C', fontWeight: 700 }}>로그인</span>
            </button>
          </div>
        </div>
      </div>

      <ConsentModal
        type={modal}
        onClose={() => setModal(null)}
        onConfirm={handleModalConfirm}
      />

      {toast && (
        <div
          className="fixed bottom-24 left-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium"
          style={{
            transform: 'translateX(-50%)',
            background: 'rgba(26,26,46,0.9)',
            color: '#fff',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
