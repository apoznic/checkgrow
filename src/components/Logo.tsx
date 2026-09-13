import { useNavigate } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkTo?: string;
}

/** Flat CheckGrow mark: periwinkle tile with a white check + growth arrow. */
export function Logo({ size = 'md', showText = true, linkTo = '/dashboard' }: LogoProps) {
  const navigate = useNavigate();
  const sizes = {
    sm: { icon: 32, text: 'text-xl', radius: 'rounded-md' },
    md: { icon: 40, text: 'text-2xl', radius: 'rounded-lg' },
    lg: { icon: 56, text: 'text-4xl', radius: 'rounded-xl' },
  };

  const { icon, text, radius } = sizes[size];

  return (
    <div
      className="flex items-center gap-3 cursor-pointer select-none"
      onClick={() => navigate(linkTo)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(linkTo); }}
    >
      <div
        className={`flex items-center justify-center bg-primary ${radius}`}
        style={{ width: icon, height: icon }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-1/2 h-1/2"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 13l4 4L14 9" />
          <path d="M13 6h6v6" opacity="0.7" />
          <path d="M19 6l-6 6" opacity="0.7" />
        </svg>
      </div>

      {showText && (
        <span className={`font-display font-bold tracking-tight text-foreground ${text}`}>
          CheckGrow
        </span>
      )}
    </div>
  );
}
