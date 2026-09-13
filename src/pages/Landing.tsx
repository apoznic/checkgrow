import { useEffect } from 'react';
import { ArrowRight, Users, ClipboardList, TrendingUp, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/lib/auth';

const FEATURES = [
  { icon: TrendingUp, title: 'CRM', body: 'Leads from every source in one pipeline. Kanban, list, and a standard table view.' },
  { icon: Users, title: 'Members', body: 'Every person in the organization with their open tasks. Assign work in one line.' },
  { icon: ClipboardList, title: 'My Life', body: 'A private board, links, and meetings for each member, plus what the team assigned.' },
  { icon: Database, title: 'Registry', body: 'Spreadsheet-style lists with custom columns, CSV export, and inbound webhooks.' },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <>
      <SEO
        title="CheckGrow — The growth workspace for small teams"
        description="CRM, members, tasks, registries, and newsletters in one light, minimal workspace."
        path="/"
        image="/og/default.jpg"
      />
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Nav */}
        <nav className="px-5 sm:px-10 py-5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <Logo size="sm" linkTo="/" />
            <div className="flex items-center gap-2 sm:gap-3">
              {isLoggedIn ? (
                <Link to="/admin" className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#2A2722] text-[#F7F7F5] font-semibold text-[0.9375rem] hover:bg-[#3F3F47] transition-colors">
                  Open workspace <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link to="/auth" className="inline-flex items-center h-10 px-4 rounded-lg text-[0.9375rem] font-semibold text-foreground hover:bg-secondary transition-colors">
                    Log in
                  </Link>
                  <Link to="/auth?mode=signup" className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#2A2722] text-[#F7F7F5] font-semibold text-[0.9375rem] hover:bg-[#3F3F47] transition-colors">
                    Get started <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero */}
        <main className="flex-1 px-5 sm:px-10">
          <div className="max-w-6xl mx-auto py-16 sm:py-24">
            <p className="eyebrow mb-4">Platform</p>
            <h1 className="text-[2.5rem] leading-[1.1] sm:text-h1 font-bold tracking-tight max-w-3xl mb-6">
              The growth workspace for small teams.
            </h1>
            <p className="text-body-lg text-muted-foreground max-w-2xl mb-10">
              One place for the pipeline, the people, and the work. Leads flow in from your other
              systems, get assigned, and get done.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/auth?mode=signup" className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-lg bg-[#2A2722] text-[#F7F7F5] font-semibold hover:bg-[#3F3F47] transition-colors">
                Get started <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/auth" className="inline-flex items-center justify-center h-12 px-7 rounded-lg bg-secondary border border-border text-foreground font-semibold hover:bg-[#ECECE9] transition-colors">
                Log in
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 sm:mt-24">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="glass-panel p-6">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <h3 className="text-h4 mb-2">{title}</h3>
                  <p className="text-small text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-5 sm:px-10 py-6 border-t border-border">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-caption text-[#9B9B9B]">© 2026 CheckGrow</p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
              <Link to="/privacy" className="text-caption text-[#9B9B9B] hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="text-caption text-[#9B9B9B] hover:text-foreground transition-colors">Terms</Link>
              <a href="mailto:info@checkgrow.com" className="text-caption text-[#9B9B9B] hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
