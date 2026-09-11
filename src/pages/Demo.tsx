import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/lib/auth';

import { DemoDemandAgent } from '@/components/landing/DemoDemandAgent';
import { DemoSupplyAgent } from '@/components/landing/DemoSupplyAgent';
import { DemoCRM } from '@/components/landing/DemoCRM';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { LandingNav } from '@/components/landing/LandingNav';
import { SEO } from '@/components/SEO';

export default function Demo() {
  const { user, loading } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="CheckGrow Demo — See AI Team Formation in Action" description="Walk through CheckGrow's demand agent, supply agent, and CRM. See how AI matches talent to projects in real time." path="/demo" image="/og/demo.jpg" />
      <nav className="sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/"><Logo size="sm" /></Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {!loading && user ? (
              <Link to="/dashboard">
                <button className="px-4 sm:px-5 py-2 sm:py-2.5 bg-foreground text-background rounded-full font-semibold text-xs sm:text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
                  Dashboard
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <button className="px-3 sm:px-5 py-2 sm:py-2.5 text-foreground font-medium text-xs sm:text-sm hover:text-foreground/70 transition-colors">
                    Log in
                  </button>
                </Link>
                <Link to="/auth?mode=signup">
                  <button className="px-4 sm:px-5 py-2 sm:py-2.5 bg-foreground text-background rounded-full font-semibold text-xs sm:text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
                    <span className="hidden sm:inline">Get Started</span>
                    <span className="sm:hidden">Start</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <LandingNav />

      <main>
        <div id="hero">
          <div id="demand-demo">
            <DemoDemandAgent />
          </div>
        </div>
        <DemoSupplyAgent />
        <DemoCRM />
        <div id="testimonials">
          <TestimonialsSection />
        </div>

        <section className="relative px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <div className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden" style={{ background: 'hsl(25, 30%, 25%)' }}>
              <h2 className="text-3xl md:text-5xl font-bold mb-5 text-white">
                Ready to build your dream team?
              </h2>
              <p className="text-white/70 mb-10 max-w-lg mx-auto text-lg">
                Join thousands of professionals and companies using AI to find the perfect match.
              </p>
              <Link to="/auth?mode=signup">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 bg-white text-foreground rounded-full font-semibold text-base inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="px-6 py-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            © 2024 CheckGrow — AI-Powered Team Formation
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
            <a href="mailto:info@checkgrow.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
