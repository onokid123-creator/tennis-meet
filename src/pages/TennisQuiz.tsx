import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import quiz001 from '../assets/quiz_001.jpeg';
import quiz002 from '../assets/quiz_002.jpeg';
import quiz003 from '../assets/quiz_003.jpeg';

const QUIZZES = [
  {
    image: quiz001,
    hint: '시__',
    answers: ['시너', '신너', 'sinner', 'jannik sinner', '야닉 시너', '얀닉 시너'],
  },
  {
    image: quiz002,
    hint: '알___',
    answers: ['알카라스', '알카러스', 'alcaraz', 'carlos alcaraz', '카를로스 알카라스'],
  },
  {
    image: quiz003,
    hint: '조____',
    answers: ['조코비치', '조코', 'djokovic', 'novak djokovic', '노박 조코비치'],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '').replace(/[._-]/g, '');
}

export default function TennisQuiz() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const quiz = QUIZZES[index];
  const correctAnswers = useMemo(() => quiz.answers.map(normalize), [quiz.answers]);

  const goNext = () => {
    if (!correctAnswers.includes(normalize(answer))) {
      setError('정확한 이름을 입력해야 다음 단계로 넘어갈 수 있어요.');
      return;
    }

    setError('');

    if (index < QUIZZES.length - 1) {
      setIndex(index + 1);
      setAnswer('');
      return;
    }

    localStorage.setItem('tennis_quiz_passed', '1');
    navigate('/purpose-selection', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex items-center justify-center px-5 py-6">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl px-6 py-7 border border-green-900/10">
        <div className="flex justify-center gap-2 mb-5">
          {QUIZZES.map((_, i) => (
            <div
              key={i}
              className="h-2.5 rounded-full transition-all"
              style={{
                width: i === index ? 30 : 10,
                background: i <= index ? '#1B7A46' : '#E5E7EB',
              }}
            />
          ))}
        </div>

        <div className="text-center mb-5">
          <div className="mx-auto mb-3 w-14 h-14 rounded-full border-2 border-green-700/20 flex items-center justify-center text-green-700 text-2xl font-black">
            ✓
          </div>

          <h1 className="text-[26px] leading-tight font-black text-gray-950">
            테니스 미트는
            <br />
            <span className="text-[#1B7A46]">테니스 치는 분들만 가입할 수 있어요.</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-gray-700">
            안전한 커뮤니티를 위해
            <br />
            간단한 퀴즈 3문제를 풀어주세요.
          </p>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-gray-950 aspect-[4/3] mb-5">
          <img src={quiz.image} alt="테니스 퀴즈" className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1.5 text-sm font-bold text-emerald-300">
            문제 {index + 1}/3
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-lg font-black text-gray-950">위 선수의 이름은 무엇일까요?</p>
          <p className="mt-2 text-base text-gray-600">
            힌트: <span className="font-black text-[#1B7A46]">{quiz.hint}</span>
          </p>
        </div>

        <input
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') goNext();
          }}
          placeholder="이름을 입력해주세요"
          autoFocus
          className="w-full h-14 rounded-2xl border-2 px-4 text-base font-bold outline-none"
          style={{ borderColor: error ? '#EF4444' : '#1B7A46' }}
        />

        <div
          className="mt-3 rounded-2xl px-4 py-3 text-sm font-semibold leading-relaxed"
          style={{
            background: error ? '#FEF2F2' : '#F0F7F3',
            color: error ? '#DC2626' : '#1F3D2A',
          }}
        >
          {error || '정확한 이름을 입력해야 다음 단계로 넘어갈 수 있어요.'}
        </div>

        <button
          onClick={goNext}
          className="mt-5 w-full h-14 rounded-2xl text-white text-lg font-black shadow-lg active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg, #16874B 0%, #1B5E3A 100%)' }}
        >
          {index === QUIZZES.length - 1 ? '완료' : '다음'}
        </button>
      </div>
    </div>
  );
}
