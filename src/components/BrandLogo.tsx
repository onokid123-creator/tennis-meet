interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
}

export default function BrandLogo({ size = 'md', light = true }: BrandLogoProps) {
  const sizes = {
    sm: { iconSize: 20, gap: 'gap-2', fontSize: '1.05rem', letterSpacing: '0.22em' },
    md: { iconSize: 24, gap: 'gap-2.5', fontSize: '1.25rem', letterSpacing: '0.24em' },
    lg: { iconSize: 28, gap: 'gap-3', fontSize: '1.5rem', letterSpacing: '0.26em' },
  };

  const s = sizes[size];
  const goldColor = '#C9A84C';
  const mintColor = '#4ADE80';
  const textColor = light ? '#fff' : '#1B4332';

  return (
    <div className={`flex items-center ${s.gap}`}>
      <svg
        width={s.iconSize}
        height={s.iconSize}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
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
          fontSize: s.fontSize,
          fontWeight: 300,
          letterSpacing: s.letterSpacing,
          color: textColor,
        }}
      >
        TENNIS <span style={{ color: goldColor, fontWeight: 400 }}>MEET</span>
      </span>
    </div>
  );
}
