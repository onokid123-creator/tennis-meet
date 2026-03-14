import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url('/A_stunning_Korean_man_and_woman_in_premium_high-en-1773381133751.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          objectFit: 'cover',
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.10) 40%, rgba(0,0,0,0.28) 70%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-6 pt-16 pb-14">
        <div className="flex flex-col items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
            <path d="M12 2 C12 2 6 7 6 12 C6 17 12 22 12 22 C12 22 18 17 18 12 C18 7 12 2 12 2Z" stroke="rgba(255,255,255,0.8)" strokeWidth="1" fill="none" />
            <path d="M2 12 C5 10 9 9 12 9 C15 9 19 10 22 12" stroke="rgba(255,255,255,0.8)" strokeWidth="1" fill="none" />
            <path d="M2 12 C5 14 9 15 12 15 C15 15 19 14 22 12" stroke="rgba(255,255,255,0.8)" strokeWidth="1" fill="none" />
          </svg>

          <div className="text-center">
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                fontSize: '2.4rem',
                fontWeight: 300,
                letterSpacing: '0.22em',
                color: 'rgba(255,255,255,0.97)',
                lineHeight: 1,
                textShadow: '0 2px 16px rgba(0,0,0,0.25)',
              }}
            >
              TENNIS
            </h1>
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                fontSize: '2.4rem',
                fontWeight: 500,
                letterSpacing: '0.22em',
                color: '#C9A84C',
                lineHeight: 1,
                textShadow: '0 2px 16px rgba(0,0,0,0.25)',
              }}
            >
              MEET
            </h1>
          </div>

          <p
            style={{
              fontSize: 10,
              letterSpacing: '0.3em',
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 400,
              textTransform: 'uppercase',
              textShadow: '0 1px 8px rgba(0,0,0,0.3)',
            }}
          >
            Tennis · Romance · Connection
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 font-bold tracking-widest uppercase transition active:scale-[0.97]"
            style={{
              background: 'rgba(255,255,255,0.97)',
              color: '#1B4332',
              borderRadius: '16px',
              fontSize: 13,
              letterSpacing: '0.2em',
              boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
            }}
          >
            LOGIN
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="w-full py-4 font-bold tracking-widest uppercase transition active:scale-[0.97]"
            style={{
              background: 'transparent',
              color: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              fontSize: 13,
              letterSpacing: '0.2em',
              border: '1.5px solid rgba(255,255,255,0.75)',
            }}
          >
            SIGN UP
          </button>
        </div>
      </div>
    </div>
  );
}
