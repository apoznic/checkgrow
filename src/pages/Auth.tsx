import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, User, Loader2, Users } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { GlassCard, GlassInput, GlassButton } from '@/components/GlassCard';
import { SEO } from '@/components/SEO';
import { FloatingLayout } from '@/components/FloatingLayout';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';

interface InviteClusterInfo {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const signupTypeParam = searchParams.get('type');
  const intendedType = signupTypeParam === 'supply' || signupTypeParam === 'demand' ? signupTypeParam : null;
  const inviteClusterId = searchParams.get('invite_cluster');

  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup' || !!inviteClusterId);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [inviteCluster, setInviteCluster] = useState<InviteClusterInfo | null>(null);
  const [loadingCluster, setLoadingCluster] = useState(!!inviteClusterId);

  // Load cluster info if invite_cluster param exists
  useEffect(() => {
    if (inviteClusterId) {
      loadClusterInfo(inviteClusterId);
    }
  }, [inviteClusterId]);

  const loadClusterInfo = async (clusterId: string) => {
    setLoadingCluster(true);
    const { data } = await supabase
      .from('clusters')
      .select('id, name, logo_url, description')
      .eq('id', clusterId)
      .single();
    
    if (data) {
      setInviteCluster(data);
    }
    setLoadingCluster(false);
  };

  // After auth, handle invitation acceptance
  useEffect(() => {
    if (user && !authLoading && inviteClusterId) {
      acceptInvitation(inviteClusterId);
    } else if (user && !authLoading && !inviteClusterId) {
      navigate('/dashboard');
    }
  }, [user, authLoading]);

  const acceptInvitation = async (clusterId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: { clusterId },
      });

      if (error) {
        console.error('Accept invitation error:', error);
      }

      if (data?.success) {
        toast({
          title: '🎉 Welcome to the team!',
          description: `You've been added to ${inviteCluster?.name || 'the organization'}.`,
        });
      }
    } catch (e) {
      console.error('Failed to accept invitation:', e);
    }
    
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            title: 'Sign up failed',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Welcome to CheckGrow!',
            description: 'Your account has been created successfully.',
          });
          // Navigation handled by useEffect after user state updates
          if (!inviteClusterId) {
            navigate(intendedType ? `/dashboard?type=${intendedType}` : '/dashboard');
          }
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Sign in failed',
            description: error.message,
            variant: 'destructive',
          });
        } else if (!inviteClusterId) {
          navigate('/dashboard');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const isCustomDomain =
        !window.location.hostname.includes('lovable.app') &&
        !window.location.hostname.includes('lovableproject.com');

      // Store invite cluster ID in localStorage so we can pick it up after OAuth redirect
      if (inviteClusterId) {
        localStorage.setItem('pending_invite_cluster', inviteClusterId);
      }

      if (isCustomDomain) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
            skipBrowserRedirect: true,
          },
        });

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
        }
      } else {
        const result = await lovable.auth.signInWithOAuth('google', {
          redirect_uri: window.location.origin,
        });

        if (result.error) {
          toast({
            title: 'Google sign in failed',
            description: result.error.message,
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Google sign in failed',
        description: error?.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <FloatingLayout>
      <SEO title="Sign in or join CheckGrow" description="Log in to CheckGrow or create an account to join AI-powered team formation, shared CRM, and project workspaces." path="/auth" image="/og/auth.jpg" />
      <div
        className="min-h-[100svh] flex flex-col px-5 sm:px-6 pb-8 sm:pb-12"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
        }}
      >
        {/* Top bar with back button — no overlap with content */}
        <div className="w-full max-w-md mx-auto flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 h-11 px-3 -ml-3 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        <div className="flex-1 flex items-start sm:items-center justify-center">

      {/* Auth Card */}
      <GlassCard className="w-full max-w-md p-6 sm:p-8 relative z-10">
        <div className="flex justify-center mb-6 sm:mb-8">
          <Logo size="lg" />
        </div>

        {/* Invite Banner */}
        {inviteClusterId && (
          <div className="mb-6">
            {loadingCluster ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : inviteCluster ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20"
              >
                {inviteCluster.logo_url ? (
                  <img
                    src={inviteCluster.logo_url}
                    alt={inviteCluster.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">You've been invited to join</p>
                  <p className="font-semibold text-foreground truncate">{inviteCluster.name}</p>
                </div>
              </motion.div>
            ) : null}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={isSignUp ? 'signup' : 'signin'}
            initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isSignUp ? -20 : 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <h1 className="text-2xl font-display font-bold text-center mb-2">
              {inviteClusterId
                ? (isSignUp ? `Join ${inviteCluster?.name || 'the Team'}` : 'Sign In to Join')
                : (isSignUp ? 'Join CheckGrow' : 'Welcome Back')
              }
            </h1>
            <p className="text-muted-foreground text-center mb-8">
              {inviteClusterId
                ? (isSignUp
                  ? 'Create your account to join the team instantly'
                  : 'Sign in and you\'ll be added to the team automatically')
                : (isSignUp
                  ? 'Create your account to get started'
                  : 'Sign in to access your dashboard')
              }
            </p>

            {/* Google Sign In Button */}
            <GlassButton
              type="button"
              className="w-full h-12 mb-5 flex items-center justify-center gap-3 text-base sm:text-sm"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </GlassButton>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background/50 backdrop-blur-sm px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <GlassInput
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-12 h-12 text-base sm:text-sm"
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <GlassInput
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-12 text-base sm:text-sm"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <GlassInput
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-12 text-base sm:text-sm"
                  required
                  minLength={6}
                />
              </div>

              <GlassButton
                type="submit"
                variant="primary"
                className="w-full h-12 text-base sm:text-sm mt-2"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : inviteClusterId ? (
                  isSignUp ? 'Create Account & Join' : 'Sign In & Join'
                ) : isSignUp ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </GlassButton>
            </form>

            <p className="text-center text-muted-foreground mt-6">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-2 text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </motion.div>
        </AnimatePresence>
      </GlassCard>
        </div>
      </div>
    </FloatingLayout>
  );
}
