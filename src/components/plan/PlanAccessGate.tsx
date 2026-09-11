import { useEffect, useState, type ReactNode } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SHARED_PASSWORD = 'stefan123';
const STORAGE_KEY = 'plan-grg-mica-unlocked';
const PROJECT_MATCH = /GRG|MiCA|Golden Ratio/i;

/**
 * Members of the GRG project (signed in to CheckGrow) get straight through.
 * Everyone else has to enter the shared plan password.
 */
export function PlanAccessGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const check = async () => {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') {
        if (active) {
          setAllowed(true);
          setChecking(false);
        }
        return;
      }

      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        // RLS only returns projects this user can actually see.
        const { data: projects } = await supabase.from('projects').select('id, title');
        const hasGrg = (projects ?? []).some((p) => PROJECT_MATCH.test(p.title ?? ''));
        if (hasGrg && active) {
          setAllowed(true);
          setChecking(false);
          return;
        }
      }

      if (active) setChecking(false);
    };

    check();
    return () => {
      active = false;
    };
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === SHARED_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, '1');
      setAllowed(true);
    } else {
      setError('Incorrect password.');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allowed) return <>{children}</>;

  return (
    <div className="min-h-[100svh] flex items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-lg font-semibold">GRG · MiCA project plan</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-5">
          This plan is protected. Enter the password to view it, or sign in to CheckGrow with an
          account that has access to the project.
        </p>

        <label htmlFor="plan-password" className="sr-only">
          Password
        </label>
        <input
          id="plan-password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="Password"
          className="w-full h-12 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}

        <button
          type="submit"
          className="mt-4 w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          View plan
        </button>
      </form>
    </div>
  );
}
