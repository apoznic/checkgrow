import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { LogOut, Sparkles, RefreshCcw, Users, Loader2, FolderOpen, Plus, Building2, MapPin, X, Globe, Check, Shuffle, Menu, Cpu, UserCog, ChevronDown, ArrowRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { GlassButton } from '@/components/GlassCard';
import { FloatingLayout } from '@/components/FloatingLayout';
import { AppTopBar } from '@/components/AppTopBar';
import { ServiceTypeSelector } from '@/components/ServiceTypeSelector';
import { ProjectList } from '@/components/ProjectList';
import { ProjectDetail } from '@/components/ProjectDetail';

import { TeamBuilderPanel } from '@/components/demand/TeamBuilderPanel';
import { DraftHistory, DraftAttempt } from '@/components/demand/DraftHistory';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SwarmMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  skills: string[];
  reason?: string;
  match_confidence?: 'high' | 'medium' | 'low';
  years_experience?: number;
  has_linkedin?: boolean;
}

interface PricingEstimate {
  average_price: number;
  min_price: number;
  max_price: number;
  average_hours: number;
  currency: string;
  service_name: string;
  organizations_count: number;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  owner_id: string;
  requirements: string | null;
  cluster_id?: string | null;
  project_teams?: {
    id: string;
    profile_id: string;
    role_in_project: string | null;
    status: string | null;
  }[];
}

interface Cluster {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  logo_url?: string | null;
}

type View = 'home' | 'generator' | 'projects' | 'detail';

export default function DemandDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [view, setView] = useState<View>('home');
  const [projectDescription, setProjectDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSwarm, setGeneratedSwarm] = useState<SwarmMember[]>([]);
  const [pendingProject, setPendingProject] = useState<{ title: string; description: string; requirements: string } | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<string | null>(null);
  const [pricingEstimate, setPricingEstimate] = useState<PricingEstimate | null>(null);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [replacingMemberId, setReplacingMemberId] = useState<string | null>(null);

  const [draftAttempts, setDraftAttempts] = useState<DraftAttempt[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => { loadClusters(); }, []);
  useEffect(() => { if (user) loadProfile(); }, [user]);
  useEffect(() => { if (profileId) loadProjects(); }, [profileId]);

  // Pre-select cluster from URL query param
  useEffect(() => {
    const clusterParam = searchParams.get('cluster');
    if (clusterParam && clusters.length > 0) {
      const exists = clusters.find(c => c.id === clusterParam);
      if (exists) {
        setSelectedClusterIds([clusterParam]);
      }
    }
  }, [searchParams, clusters]);
  const loadClusters = async () => {
    const { data } = await supabase.from('clusters').select('id, name, description, city, country, logo_url').order('name');
    if (data) {
      // Only show organizations that have completed their profile (name, description, city, country, logo)
      const complete = data.filter(c => c.name && c.description && c.city && c.country && c.logo_url);
      setClusters(complete);
    }
  };

  const loadProfile = async () => {
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user?.id).maybeSingle();
    if (profile) setProfileId(profile.id);
  };

  const loadProjects = async () => {
    setIsLoadingProjects(true);

    // Projects user owns
    const { data: owned } = await supabase
      .from('projects')
      .select(`id, title, description, status, created_at, owner_id, requirements, google_drive_url, project_teams (id, profile_id, role_in_project, status)`)
      .eq('owner_id', profileId)
      .order('created_at', { ascending: false });

    // Projects user is an accepted team member of
    const { data: teamRows } = await supabase
      .from('project_teams')
      .select('project_id')
      .eq('profile_id', profileId)
      .eq('status', 'accepted');

    const memberIds = (teamRows || []).map(r => r.project_id).filter(Boolean);
    let memberProjects: any[] = [];
    if (memberIds.length > 0) {
      const { data: mp } = await supabase
        .from('projects')
        .select(`id, title, description, status, created_at, owner_id, requirements, google_drive_url, project_teams (id, profile_id, role_in_project, status)`)
        .in('id', memberIds)
        .order('created_at', { ascending: false });
      memberProjects = mp || [];
    }

    // Merge and dedupe
    const merged = [...(owned || []), ...memberProjects];
    const seen = new Set<string>();
    const unique = merged.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setProjects(unique);
    setIsLoadingProjects(false);
  };

  const saveDraft = useCallback(() => {
    if (generatedSwarm.length === 0) return;
    const draft: DraftAttempt = {
      id: activeDraftId || crypto.randomUUID(),
      timestamp: new Date(),
      prompt: projectDescription,
      team: [...generatedSwarm],
      projectTitle: pendingProject?.title,
      serviceType: selectedServiceType,
    };
    setDraftAttempts(prev => {
      const existing = prev.findIndex(d => d.id === draft.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = draft;
        return updated;
      }
      return [draft, ...prev].slice(0, 10); // keep last 10
    });
    setActiveDraftId(draft.id);
  }, [generatedSwarm, projectDescription, pendingProject, selectedServiceType, activeDraftId]);

  const generateSwarm = async () => {
    if (!projectDescription.trim()) {
      toast({ title: 'Describe your project', description: 'Tell us what you need help with.', variant: 'destructive' });
      return;
    }

    // Save current team as draft before regenerating
    if (generatedSwarm.length > 0) saveDraft();

    setIsGenerating(true);
    setAiMessage('');

    try {
      const excludedIds = generatedSwarm.map(m => m.id).filter(id => !id.startsWith('temp-'));

      const { data, error } = await supabase.functions.invoke('team-formation', {
        body: {
          message: projectDescription,
          profile_id: profileId,
          current_project: null,
          excluded_profile_ids: excludedIds.length > 0 ? [] : undefined,
          cluster_ids: selectedClusterIds.length > 0 ? selectedClusterIds : undefined,
          service_type: selectedServiceType || undefined,
        },
      });

      if (error) throw error;

      if (data.pricing_estimate) setPricingEstimate(data.pricing_estimate);
      if (data.message) setAiMessage(data.message);

      if (data.project_created) {
        setPendingProject({
          title: data.project_created.title || projectDescription.slice(0, 50),
          description: projectDescription,
          requirements: data.project_created.requirements || '',
        });
      } else {
        setPendingProject({
          title: projectDescription.slice(0, 50) + (projectDescription.length > 50 ? '...' : ''),
          description: projectDescription,
          requirements: '',
        });
      }

      if (data.team_suggestions?.length) {
        const profileIds = data.team_suggestions.map((s: any) => s.profile_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('profiles')
          .select(`id, full_name, avatar_url, linkedin_url, years_total_experience, skills (skill_name)`)
          .in('id', profileIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const swarm: SwarmMember[] = data.team_suggestions.map((suggestion: any) => {
          const profile = profileMap.get(suggestion.profile_id);
          return {
            id: suggestion.profile_id || `temp-${Math.random()}`,
            full_name: profile?.full_name || suggestion.name || 'Team Member',
            avatar_url: profile?.avatar_url || null,
            role: suggestion.role_in_project || 'Team Member',
            skills: profile?.skills?.map((s: any) => s.skill_name) || [],
            reason: suggestion.reason,
            match_confidence: suggestion.match_confidence,
            years_experience: suggestion.years_experience || profile?.years_total_experience,
            has_linkedin: !!profile?.linkedin_url,
          };
        });
        setGeneratedSwarm(swarm);
        // Auto-save as draft
        const draftId = crypto.randomUUID();
        setActiveDraftId(draftId);
      } else {
        toast({ title: 'No matches found', description: data.message || 'Try adjusting your description.' });
      }
    } catch (error) {
      console.error('Error generating swarm:', error);
      toast({ title: 'Error generating team', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveMember = (id: string) => {
    setGeneratedSwarm(prev => prev.filter(m => m.id !== id));
  };

  const handleReplaceMember = async (id: string) => {
    setReplacingMemberId(id);
    try {
      const member = generatedSwarm.find(m => m.id === id);
      if (!member) return;

      const { data, error } = await supabase.functions.invoke('team-formation', {
        body: {
          message: `Find a replacement for the role: ${member.role}. The project is: ${projectDescription}. Specifically need someone with skills similar to: ${member.skills.join(', ')}`,
          profile_id: profileId,
          current_project: null,
          excluded_profile_ids: generatedSwarm.map(m => m.id),
          cluster_ids: selectedClusterIds.length > 0 ? selectedClusterIds : undefined,
          service_type: selectedServiceType || undefined,
        },
      });

      if (error) throw error;

      if (data.team_suggestions?.length) {
        const suggestion = data.team_suggestions[0];
        const { data: profiles } = await supabase
          .from('profiles')
          .select(`id, full_name, avatar_url, linkedin_url, years_total_experience, skills (skill_name)`)
          .eq('id', suggestion.profile_id)
          .maybeSingle();

        if (profiles) {
          const replacement: SwarmMember = {
            id: profiles.id,
            full_name: profiles.full_name,
            avatar_url: profiles.avatar_url,
            role: suggestion.role_in_project || member.role,
            skills: profiles.skills?.map((s: any) => s.skill_name) || [],
            reason: suggestion.reason,
            match_confidence: suggestion.match_confidence,
            years_experience: suggestion.years_experience || profiles.years_total_experience,
            has_linkedin: !!profiles.linkedin_url,
          };
          setGeneratedSwarm(prev => prev.map(m => m.id === id ? replacement : m));
          toast({ title: 'Member replaced', description: `${replacement.full_name} has been swapped in.` });
        }
      } else {
        toast({ title: 'No replacement found', description: 'No alternative talent available for this role.' });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error replacing member', variant: 'destructive' });
    } finally {
      setReplacingMemberId(null);
    }
  };

  const handleConfirmSwarm = async () => {
    if (!profileId || !pendingProject) return;

    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        owner_id: profileId,
        title: pendingProject.title,
        description: pendingProject.description,
        requirements: pendingProject.requirements,
        status: 'open',
        source: 'demand_agent',
      })
      .select()
      .single();

    if (projectError) {
      toast({ title: 'Error creating project', description: projectError.message, variant: 'destructive' });
      return;
    }

    for (const member of generatedSwarm) {
      if (member.id && !member.id.startsWith('temp-')) {
        await supabase.from('project_teams').insert({
          project_id: newProject.id,
          profile_id: member.id,
          role_in_project: member.role,
          status: 'proposed',
        });
      }
    }

    toast({ title: 'Team Confirmed! 🎉', description: 'Your project has been created and invitations sent.' });

    // Remove draft
    setDraftAttempts(prev => prev.filter(d => d.id !== activeDraftId));
    setGeneratedSwarm([]);
    setProjectDescription('');
    setPendingProject(null);
    setPricingEstimate(null);
    setSelectedServiceType(null);
    setAiMessage('');
    setActiveDraftId(null);
    loadProjects();
    setView('projects');
  };

  const handleResumeDraft = (draft: DraftAttempt) => {
    setProjectDescription(draft.prompt);
    setGeneratedSwarm(draft.team);
    setPendingProject(draft.projectTitle ? { title: draft.projectTitle, description: draft.prompt, requirements: '' } : null);
    setSelectedServiceType(draft.serviceType || null);
    setActiveDraftId(draft.id);
    setView('generator');
  };

  const handleDeleteDraft = (id: string) => {
    setDraftAttempts(prev => prev.filter(d => d.id !== id));
    if (activeDraftId === id) setActiveDraftId(null);
  };

  const handleCancelTeam = () => {
    saveDraft();
    setGeneratedSwarm([]);
    setPendingProject(null);
    setPricingEstimate(null);
    setAiMessage('');
  };

  const handleDeleteProject = async (projectId: string) => {
    await supabase.from('project_teams').delete().eq('project_id', projectId);
    await supabase.from('messages').delete().eq('project_id', projectId);
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) {
      toast({ title: 'Error deleting project', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Project deleted' });
      loadProjects();
    }
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };
  const handleProjectClick = (project: Project) => { setSelectedProject(project); setView('detail'); };

  const dashboardTiles = [
    { key: 'projects', label: 'My Projects', desc: `${projects.length} active`, icon: FolderOpen, onClick: () => { sessionStorage.setItem('admin_active_tab', 'projects'); navigate('/admin'); }, accent: 'from-primary/20 to-primary/5' },
    { key: 'kolektiv', label: 'My Organization', desc: 'Manage your organization', icon: Building2, onClick: () => navigate('/admin'), accent: 'from-accent/20 to-accent/5' },
    { key: 'talent', label: "I'm a Talent", desc: 'Switch to talent view', icon: Users, onClick: () => navigate('/supply'), accent: 'from-secondary to-secondary/40' },
    { key: 'join', label: 'Join an Organization', desc: 'Discover organizations', icon: Plus, onClick: () => navigate('/join-kolektiv'), accent: 'from-primary/10 to-transparent' },
    { key: 'create', label: 'Create Organization', desc: 'Start a new organization', icon: Building2, onClick: () => navigate('/join-kolektiv?create=true'), accent: 'from-accent/15 to-primary/5' },
    { key: 'connect', label: 'Connect', desc: 'Network with people', icon: UserCog, onClick: () => navigate('/connect'), accent: 'from-secondary to-secondary/40' },
  ];

  const renderContent = () => {
    switch (view) {
      case 'home':
        return (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-2">Jump into your organization or build a team in seconds.</p>
              </div>

              {/* Build your team — popdown CTA */}
              <div className="mb-10">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="group inline-flex items-center gap-3 px-5 py-3 rounded-full bg-primary text-primary-foreground font-medium shadow-sm hover:shadow-md hover:opacity-95 transition-all">
                      <Sparkles className="w-4 h-4" />
                      Build your team
                      <ChevronDown className="w-4 h-4 group-data-[state=open]:rotate-180 transition-transform" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 p-4">
                    <p className="text-sm font-semibold mb-1">AI team formation</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Describe what you need and we'll match talent from selected pools instantly.
                    </p>
                    <button
                      onClick={() => setView('generator')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Open Generator
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Main dashboard tiles — Bento layout */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[160px]">
                {dashboardTiles.map(tile => {
                  const Icon = tile.icon;
                  const isKolektiv = tile.key === 'kolektiv';
                  return (
                    <button
                      key={tile.key}
                      onClick={tile.onClick}
                      className={cn(
                        "group relative overflow-hidden text-left rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all",
                        isKolektiv
                          ? "col-span-2 row-span-2 p-8 bg-card"
                          : "p-5 bg-card"
                      )}
                    >
                      <div className={cn("flex items-center justify-between", isKolektiv ? "mb-6" : "mb-3")}>
                        <div className={cn("rounded-xl bg-background/80 backdrop-blur flex items-center justify-center", isKolektiv ? "w-14 h-14" : "w-10 h-10")}>
                          <Icon className={cn("text-primary", isKolektiv ? "w-7 h-7" : "w-5 h-5")} />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                      </div>
                      <h3 className={cn("font-semibold text-foreground", isKolektiv ? "text-xl" : "text-sm")}>{tile.label}</h3>
                      <p className={cn("text-muted-foreground mt-1", isKolektiv ? "text-sm" : "text-xs")}>{tile.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );


      case 'detail':
        if (!selectedProject || !profileId) return null;
        return (
          <ProjectDetail
            project={selectedProject}
            profileId={profileId}
            isOwner={true}
            onBack={() => { setSelectedProject(null); setView('projects'); }}
            onProjectUpdate={loadProjects}
          />
        );

      case 'projects':
        return (
          <div className="h-full flex flex-col">
            <header className="border-b border-border/30">
              <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h1 className="font-semibold">My Projects</h1>
                    <p className="text-sm text-muted-foreground">{projects.length} projects</p>
                  </div>
                </div>
                <GlassButton variant="primary" onClick={() => setView('generator')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </GlassButton>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6">
              {isLoadingProjects ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <ProjectList
                  projects={projects}
                  onProjectClick={handleProjectClick}
                  onDeleteProject={handleDeleteProject}
                  onCreateNew={() => setView('generator')}
                  variant="owner"
                  emptyMessage="No projects yet. Create your first project!"
                />
              )}
              </div>
            </div>
          </div>
        );

      default: // generator
        return (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
               {/* Compact header */}
               <div className="mb-6 sm:mb-8">
                 <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  Build your team.
                </h2>
                <p className="text-muted-foreground mt-1">
                  Select a talent pool, describe what you need, and we'll match you instantly.
                </p>
              </div>

              {/* Talent Pool — inline panel */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Talent Pool
                  </label>
                  <div className="flex items-center gap-3">
                    {selectedClusterIds.length > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {selectedClusterIds.length} selected
                        </span>
                        <button
                          onClick={() => setSelectedClusterIds([])}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Clear
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedClusterIds(
                        selectedClusterIds.length === clusters.length ? [] : clusters.map(c => c.id)
                      )}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      {selectedClusterIds.length === clusters.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                </div>

                {/* Country filter tabs + search */}
                {(() => {
                  const countries = [...new Set(clusters.map(c => c.country || 'Other'))].sort((a, b) =>
                    a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)
                  );
                  const showCountryFilter = countries.length > 1 || (countries.length === 1 && countries[0] !== 'Other');
                  const activeCountry = expandedCountries.size > 0 ? [...expandedCountries][0] : null;

                  const filteredClusters = activeCountry
                    ? clusters.filter(c => (c.country || 'Other') === activeCountry)
                    : orgSearch
                      ? clusters.filter(c =>
                          c.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
                          (c.country || '').toLowerCase().includes(orgSearch.toLowerCase()) ||
                          (c.city || '').toLowerCase().includes(orgSearch.toLowerCase())
                        )
                      : clusters;

                  return (
                    <>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                         <div className="relative flex-1 sm:max-w-xs">
                          <input
                            type="text"
                            value={orgSearch}
                            onChange={(e) => { setOrgSearch(e.target.value); setExpandedCountries(new Set()); }}
                            placeholder="Search..."
                            className="w-full pl-3 pr-8 py-2 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
                          />
                          {orgSearch && (
                            <button
                              onClick={() => setOrgSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {showCountryFilter && (
                           <div className="flex gap-1.5 flex-wrap overflow-x-auto scrollbar-hide pb-1">
                            <button
                              onClick={() => setExpandedCountries(new Set())}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                !activeCountry
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              All
                            </button>
                            {countries.map(country => (
                              <button
                                key={country}
                                onClick={() => {
                                  setExpandedCountries(prev =>
                                    prev.has(country) ? new Set() : new Set([country])
                                  );
                                  setOrgSearch('');
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                  activeCountry === country
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {country}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {filteredClusters.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No organizations found</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {filteredClusters.map((cluster) => {
                            const isSelected = selectedClusterIds.includes(cluster.id);
                            const location = [cluster.city, cluster.country].filter(Boolean).join(', ');
                            return (
                              <motion.button
                                key={cluster.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={() => {
                                  setSelectedClusterIds(prev =>
                                    prev.includes(cluster.id)
                                      ? prev.filter(id => id !== cluster.id)
                                      : [...prev, cluster.id]
                                  );
                                }}
                                className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? 'border-primary bg-primary/8 shadow-sm'
                                    : 'border-border bg-card hover:border-primary/30'
                                }`}
                              >
                                {isSelected && (
                                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                  </div>
                                )}
                                {cluster.logo_url ? (
                                  <img src={cluster.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{cluster.name}</p>
                                  {location ? (
                                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                      <MapPin className="w-3 h-3 flex-shrink-0" />
                                      {location}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground/50">No location</p>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      )}

                      {selectedClusterIds.length > 1 && (
                        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                          <Shuffle className="w-3 h-3" />
                          <span>Cross-org mix — talent from {selectedClusterIds.length} pools</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Service type — compact horizontal scroll */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Service type
                  </label>
                  {selectedServiceType && (
                    <button onClick={() => setSelectedServiceType(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <ServiceTypeSelector selected={selectedServiceType} onSelect={setSelectedServiceType} compact />
                </div>
              </div>

              {/* Prompt input — clean card */}
              <div className="mb-6">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                  Project brief
                </label>
                <div className="rounded-2xl border border-border bg-card p-3 sm:p-5 focus-within:border-primary/40 transition-colors">
                   <textarea
                     value={projectDescription}
                     onChange={(e) => setProjectDescription(e.target.value)}
                     placeholder="What are you building? What skills do you need? What's the timeline?"
                     className="w-full h-20 sm:h-24 bg-transparent border-none resize-none text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-sm sm:text-base leading-relaxed"
                   />
                   <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/30">
                     <p className="text-xs text-muted-foreground hidden sm:block">
                      {generatedSwarm.length > 0 ? 'Adjust and regenerate, or tweak the team below' : 'AI matches talent from your selected pools'}
                    </p>
                    <button
                       onClick={generateSwarm}
                       disabled={isGenerating || !projectDescription.trim()}
                       className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity w-full sm:w-auto"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Finding...
                        </>
                      ) : generatedSwarm.length > 0 ? (
                        <>
                          <RefreshCcw className="w-4 h-4" />
                          Regenerate
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Team
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading */}
              {isGenerating && generatedSwarm.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 py-10 justify-center"
                >
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Assembling your team...</p>
                    <div className="flex gap-1 mt-1">
                      {['Scanning', 'Matching', 'Ranking'].map((step, i) => (
                        <motion.span
                          key={step}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                          className="text-xs text-muted-foreground"
                        >
                          {step}{i < 2 ? ' →' : ''}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Team Results */}
              <AnimatePresence>
                {generatedSwarm.length > 0 && !isGenerating && (
                  <TeamBuilderPanel
                    team={generatedSwarm}
                    pricing={pricingEstimate}
                    aiMessage={aiMessage}
                    onRemoveMember={handleRemoveMember}
                    onReplaceMember={handleReplaceMember}
                    onConfirm={handleConfirmSwarm}
                    onRegenerate={generateSwarm}
                    onCancel={handleCancelTeam}
                    isReplacing={replacingMemberId}
                    projectTitle={pendingProject?.title}
                  />
                )}
              </AnimatePresence>

              {/* Draft History */}
              {draftAttempts.length > 0 && (
                <div className="mt-8">
                  <DraftHistory
                    drafts={draftAttempts}
                    activeDraftId={activeDraftId}
                    onResume={handleResumeDraft}
                    onDelete={handleDeleteDraft}
                  />
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <FloatingLayout>
      <AppTopBar />
      <div className="h-full flex flex-col min-h-[calc(100vh-3rem)]">

        {/* Main Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </FloatingLayout>
  );
}
