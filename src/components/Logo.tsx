import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  linkTo?: string;
}

export function Logo({ size = 'md', showText = true, linkTo = '/dashboard' }: LogoProps) {
  const navigate = useNavigate();
  const sizes = {
    sm: { icon: 32, text: 'text-xl' },
    md: { icon: 40, text: 'text-2xl' },
    lg: { icon: 56, text: 'text-4xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <motion.div 
      className="flex items-center gap-3 cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      onClick={() => navigate(linkTo)}
      role="button"
      tabIndex={0}
    >
      {/* Check-mark + growth logo mark */}
      <div 
        className="relative flex items-center justify-center rounded-xl overflow-hidden"
        style={{ width: icon, height: icon }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/70 opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-white/10" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="relative z-10 w-1/2 h-1/2"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 13l4 4L14 9" className="text-primary-foreground" />
          <path d="M13 6h6v6" className="text-primary-foreground opacity-60" />
          <path d="M19 6l-6 6" className="text-primary-foreground opacity-60" />
        </svg>
      </div>
      
      {showText && (
        <span className={`font-display font-semibold tracking-tight ${text}`}>
          <span className="gradient-text-warm">Check</span>
          <span className="text-foreground">Grow</span>
        </span>
      )}
    </motion.div>
  );
}
