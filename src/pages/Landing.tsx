import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { SEO } from '@/components/SEO';
import { AmberFlowShader } from '@/components/landing/AmberFlowShader';
import { useAuth } from '@/lib/auth';

export default function Landing() {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <>
      <SEO
        title="CheckGrow — Build your dream team"
        description="One canvas for the work, the people, and the pipeline."
        path="/"
        image="/og/default.jpg"
      />
      <div className="relative min-h-screen w-full overflow-hidden text-foreground">
        <AmberFlowShader />

        <div
          className="relative flex flex-col min-h-screen"
          style={{
            zIndex: 1,
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Nav */}
          <nav className="px-5 sm:px-10 py-4 sm:py-5">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <Logo size="sm" />
              <div className="flex items-center gap-1.5 sm:gap-3">
                {isLoggedIn ? (
                  <Link to="/dashboard">
                    <button className="px-4 sm:px-5 h-11 bg-foreground text-background rounded-full font-semibold text-sm inline-flex items-center gap-2 active:scale-95 sm:hover:scale-105 transition-transform">
                      Dashboard <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      className="px-3 sm:px-4 h-11 inline-flex items-center text-foreground font-medium text-sm hover:opacity-70 transition-opacity"
                    >
                      Log in
                    </Link>
                    <Link to="/auth?mode=signup">
                      <button className="px-4 sm:px-5 h-11 bg-foreground text-background rounded-full font-semibold text-sm inline-flex items-center gap-1.5 sm:gap-2 active:scale-95 sm:hover:scale-105 transition-transform">
                        <span className="hidden xs:inline">Get Started</span>
                        <span className="xs:hidden">Sign up</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>

          {/* Hero — simple, left-aligned over shader */}
          <main className="flex-1 flex items-center px-5 sm:px-10 py-10 sm:py-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="max-w-7xl mx-auto w-full"
            >
              <div className="max-w-2xl">
                <h1 className="text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground mb-5 sm:mb-6">
                  Build your dream team.
                </h1>
                <p className="text-base sm:text-xl text-foreground/60 mb-8 sm:mb-10 max-w-xl leading-relaxed">
                  One canvas for the work, the people, and the pipeline.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Link to="/auth?mode=signup" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto px-7 h-14 sm:h-12 bg-foreground text-background rounded-full font-semibold text-base sm:text-sm inline-flex items-center justify-center gap-2 active:scale-[0.98] sm:hover:scale-[1.03] transition-transform">
                      Get started <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link to="/demo" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto px-7 h-14 sm:h-12 bg-background/70 backdrop-blur-sm border border-foreground/15 text-foreground rounded-full font-semibold text-base sm:text-sm hover:bg-background transition-colors">
                      Try the live demo
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </main>

          {/* Footer */}
          <footer className="px-5 sm:px-10 py-5 sm:py-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-foreground/50 order-2 sm:order-1">© 2026 CheckGrow</p>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 order-1 sm:order-2">
                <Link to="/demo" className="text-xs text-foreground/50 hover:text-foreground transition-colors">Demo</Link>
                <Link to="/privacy" className="text-xs text-foreground/50 hover:text-foreground transition-colors">Privacy</Link>
                <Link to="/terms" className="text-xs text-foreground/50 hover:text-foreground transition-colors">Terms</Link>
                <a href="mailto:info@checkgrow.com" className="text-xs text-foreground/50 hover:text-foreground transition-colors">Contact</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
