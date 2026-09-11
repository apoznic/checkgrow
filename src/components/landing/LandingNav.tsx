import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const sections = [
  { id: 'hero', label: 'Home' },
  { id: 'demand-demo', label: 'Demand' },
  { id: 'supply-demo', label: 'Supply' },
  { id: 'crm-demo', label: 'CRM' },
  { id: 'stats', label: 'Stats' },
  { id: 'testimonials', label: 'Reviews' },
];

export function LandingNav() {
  const [activeSection, setActiveSection] = useState('hero');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show nav after scrolling past hero
      setIsVisible(window.scrollY > 300);

      // Determine active section
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) {
            setActiveSection(sections[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-1 px-2 py-1.5 rounded-full bg-foreground/90 backdrop-blur-md shadow-xl border border-foreground/10">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeSection === section.id
                ? 'text-foreground'
                : 'text-background/60 hover:text-background/90'
            }`}
          >
            {activeSection === section.id && (
              <motion.div
                layoutId="landing-nav-active"
                className="absolute inset-0 rounded-full bg-background"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{section.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
