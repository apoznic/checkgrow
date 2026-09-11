import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Settings, RefreshCcw, Bell, FolderOpen, Building2, ChevronDown, Plus, UserPlus, MessageSquare, Menu, X, Lightbulb, Rocket, Target, Wand2, ArrowRight, Brain, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppTopBar } from '@/components/AppTopBar';
import { SupplyNextSteps } from '@/components/SupplyNextSteps';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassTextarea, GlassButton } from '@/components/GlassCard';
import { ChatMessage } from '@/components/ChatMessage';
import { FloatingLayout } from '@/components/FloatingLayout';
import { ConversationalWizard } from '@/components/ConversationalWizard';
import { StatusIndicator } from '@/components/StatusIndicator';
import { SkillBadge } from '@/components/SkillBadge';
import { SkillRadarPanel } from '@/components/SkillRadarPanel';
import { AvatarUpload } from '@/components/AvatarUpload';
import { ProfileSettingsModal } from '@/components/ProfileSettingsModal';
import { TeamInvitation } from '@/components/TeamInvitation';
import { ProjectList } from '@/components/ProjectList';
import { ProjectDetail } from '@/components/ProjectDetail';
import { ClusterSelection } from '@/components/ClusterSelection';
import { OrgDashboard } from '@/components/organization';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Skill {
  id: string;
  skill_name: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience: number;
}

interface Profile {
  id: string;
  full_name: string | null;
  bio: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  is_available: boolean;
  availability_note: string | null;
}

interface Invitation {
  id: string;
  role_in_project: string | null;
  status: string | null;
  created_at: string;
  project_id: string;
  projects: {
    id: string;
    title: string;
    description: string | null;
    owner_id: string;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
    };
  };
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  owner_id: string;
  requirements: string | null;
}

interface EnrolledCluster {
  id: string;
  name: string;
  role: string;
}

interface AvailableCluster {
  id: string;
  name: string;
}

type MainView = 'cluster-selection' | 'wizard' | 'chat' | 'invitations' | 'projects' | 'detail' | 'org-dashboard';

export default function SupplyDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const [mainView, setMainView] = useState<MainView>('cluster-selection');
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Welcome to your AI Skill Mapper! I'm here to help you build a comprehensive profile that gets you matched to the best projects.\n\nTell me about yourself — what's your role, what technologies do you work with, and what kind of projects have you been involved in? The more detail you share, the better I can map your skills!",
    },
  ]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    "I'm a full-stack developer with 5 years of experience",
    "I work mainly with design and creative tools",
    "I'm a project manager in the tech industry",
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEnrollment, setIsCheckingEnrollment] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isUpdatingInvitation, setIsUpdatingInvitation] = useState<string | null>(null);
  const [enrolledClusters, setEnrolledClusters] = useState<EnrolledCluster[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [availableClusters, setAvailableClusters] = useState<AvailableCluster[]>([]);
  const [showJoinOrgs, setShowJoinOrgs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (profile?.id) {
      checkClusterEnrollment();
      loadSkills();
      loadInvitations();
      loadActiveProjects();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (enrolledClusters.length > 0 && skills.length > 0 && mainView === 'wizard') {
      setMainView('chat');
    }
  }, [skills, enrolledClusters]);

  const checkClusterEnrollment = async () => {
    if (!profile?.id) return;

    const { data: enrollments } = await supabase
      .from('cluster_enrollments')
      .select(`status, role, cluster_id, clusters (id, name)`)
      .eq('profile_id', profile.id);

    const approvedEnrollments = (enrollments || []).filter(e => e.status === 'approved');

    if (approvedEnrollments.length > 0) {
      const clusters = approvedEnrollments.map(d => ({
        id: (d.clusters as any).id,
        name: (d.clusters as any).name,
        role: d.role,
      }));
      setEnrolledClusters(clusters);
      if (skills.length > 0) {
        setMainView('chat');
      } else {
        setMainView('wizard');
      }
    } else {
      setMainView('cluster-selection');
    }

    const enrolledClusterIds = (enrollments || []).map(e => e.cluster_id);
    const { data: allClusters } = await supabase
      .from('clusters')
      .select('id, name, description, logo_url, city, country')
      .order('name');

    const available = (allClusters || []).filter(c =>
      !enrolledClusterIds.includes(c.id) &&
      c.name?.trim() && c.description?.trim() && c.logo_url?.trim() && c.city?.trim() && c.country?.trim()
    );
    setAvailableClusters(available);
    setIsCheckingEnrollment(false);
  };

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user?.id).maybeSingle();
    if (data) setProfile(data as Profile);
  };

  const loadSkills = async () => {
    if (!profile?.id) return;
    const { data: skillsData } = await supabase.from('skills').select('*').eq('profile_id', profile.id);
    if (skillsData) setSkills(skillsData as Skill[]);
  };

  const loadInvitations = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('project_teams')
      .select(`id, role_in_project, status, created_at, project_id, projects (id, title, description, owner_id, profiles:owner_id (full_name, avatar_url))`)
      .eq('profile_id', profile.id)
      .eq('status', 'proposed')
      .order('created_at', { ascending: false });
    if (data) setInvitations(data as unknown as Invitation[]);
  };

  const loadActiveProjects = async () => {
    if (!profile?.id) return;
    const { data: teamData } = await supabase
      .from('project_teams')
      .select(`projects (id, title, description, status, created_at, owner_id, requirements, google_drive_url)`)
      .eq('profile_id', profile.id)
      .eq('status', 'accepted');

    const { data: ownedData } = await supabase
      .from('projects')
      .select('id, title, description, status, created_at, owner_id, requirements, google_drive_url')
      .eq('owner_id', profile.id);

    const teamProjects = (teamData || []).map((d: any) => d.projects).filter(Boolean) as Project[];
    const ownedProjects = (ownedData || []) as Project[];
    const projectMap = new Map<string, Project>();
    [...ownedProjects, ...teamProjects].forEach(p => projectMap.set(p.id, p));
    setActiveProjects(Array.from(projectMap.values()));
  };

  interface WizardData {
    skills: string[];
    workExperience: string;
    yearsExperience: number;
    projectTypes: string[];
    availability: number;
  }

  const handleWizardComplete = async (data: WizardData) => {
    if (!profile?.id) return;
    for (const skillName of data.skills) {
      const { data: newSkill, error } = await supabase
        .from('skills')
        .insert({
          profile_id: profile.id,
          skill_name: skillName,
          skill_level: 'intermediate',
          years_experience: Math.max(1, Math.floor(data.yearsExperience / 3)),
        })
        .select()
        .single();
      if (!error && newSkill) setSkills((prev) => [...prev, newSkill as Skill]);
    }

    await supabase
      .from('profiles')
      .update({
        is_available: data.availability > 30,
        work_experience: data.workExperience || null,
        years_total_experience: data.yearsExperience,
        project_types: data.projectTypes,
        onboarding_completed: data.skills.length >= 10,
      })
      .eq('id', profile.id);

    setProfile((prev) => prev ? { ...prev, is_available: data.availability > 30 } : null);
    setMainView('chat');
    toast({ title: 'Profile Updated! 🎉', description: `Added ${data.skills.length} skills to your profile. You're ready for matching!` });
  };

  const handleSend = async (overrideMessage?: string) => {
    const userMessage = (overrideMessage || input).trim();
    if (!userMessage || isLoading) return;
    if (!overrideMessage) setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setSuggestedQuestions([]);
    setIsLoading(true);

    try {
      const conversationHistory = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userMessage },
      ];

      const response = await supabase.functions.invoke('skill-mapper', {
        body: { messages: conversationHistory, current_skills: skills, profile_id: profile?.id },
      });

      if (response.error) throw response.error;
      const { message, skills_to_add, traits_to_add, profile_updates, suggested_questions } = response.data;

      if (skills_to_add?.length) {
        for (const skill of skills_to_add) {
          const exists = skills.some(s => s.skill_name.toLowerCase() === skill.skill_name.toLowerCase());
          if (exists) continue;
          const { data: newSkill, error } = await supabase
            .from('skills')
            .insert({
              profile_id: profile?.id,
              skill_name: skill.skill_name,
              skill_level: skill.skill_level || 'intermediate',
              years_experience: skill.years_experience || 0,
            })
            .select()
            .single();
          if (!error && newSkill) setSkills((prev) => [...prev, newSkill as Skill]);
        }
      }

      // Save character traits
      if (traits_to_add?.length && profile?.id) {
        for (const trait of traits_to_add) {
          await supabase.from('profile_traits' as any).upsert({
            profile_id: profile.id,
            trait_name: trait.trait_name,
            trait_category: trait.trait_category,
            confidence: trait.confidence || 'inferred',
            confirmed: trait.confidence === 'confirmed',
            source: 'skill_mapper',
          }, { onConflict: 'profile_id,trait_name' });
        }
      }

      if (profile_updates && profile?.id) {
        const cleanUpdates: Record<string, any> = {};
        for (const [key, value] of Object.entries(profile_updates)) {
          if (value !== null && value !== undefined) cleanUpdates[key] = value;
        }
        if (Object.keys(cleanUpdates).length > 0) {
          await supabase.from('profiles').update(cleanUpdates).eq('id', profile.id);
          setProfile((prev) => prev ? { ...prev, ...cleanUpdates } : null);
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: message }]);
      if (suggested_questions?.length) setSuggestedQuestions(suggested_questions);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    const { error } = await supabase.from('skills').delete().eq('id', skillId);
    if (!error) setSkills((prev) => prev.filter((s) => s.id !== skillId));
  };

  const handleProfileUpdate = (updates: Partial<Profile>) => {
    setProfile((prev) => prev ? { ...prev, ...updates } : null);
  };

  const handleAvatarUpload = async (url: string) => {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
    if (!error) handleProfileUpdate({ avatar_url: url });
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    const newStatus = !profile.is_available;
    const { error } = await supabase.from('profiles').update({ is_available: newStatus }).eq('id', profile.id);
    if (!error) {
      handleProfileUpdate({ is_available: newStatus });
      toast({
        title: newStatus ? 'You are now available' : 'You are now unavailable',
        description: newStatus ? 'You can be matched to new projects' : 'You will not be matched to new projects',
      });
    }
  };

  const handleInvitationResponse = async (invitationId: string, accept: boolean) => {
    setIsUpdatingInvitation(invitationId);
    const { error } = await supabase.from('project_teams').update({ status: accept ? 'accepted' : 'declined' }).eq('id', invitationId);
    if (error) {
      toast({ title: 'Error updating invitation', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: accept ? 'Invitation accepted! 🎉' : 'Invitation declined',
        description: accept ? 'You are now part of the team.' : 'The project owner has been notified.',
      });
      loadInvitations();
      loadActiveProjects();
    }
    setIsUpdatingInvitation(null);
  };

  const handleEnrollmentComplete = () => { checkClusterEnrollment(); };

  if (isCheckingEnrollment) {
    return (
      <FloatingLayout>
        <div className="min-h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </FloatingLayout>
    );
  }

  // Cluster selection — minimal layout
  if (mainView === 'cluster-selection') {
    return (
      <FloatingLayout>
        <AppTopBar onOpenSettings={() => setShowSettings(true)} userName={profile?.full_name} avatarUrl={profile?.avatar_url} />
        <div className="h-full flex flex-col min-h-[calc(100vh-3rem)]">
          <main className="flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div key="cluster-selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center p-6">
                {profile?.id && <ClusterSelection profileId={profile.id} onEnrollmentComplete={handleEnrollmentComplete} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </FloatingLayout>
    );
  }

  // Org dashboard — full width
  if (mainView === 'org-dashboard') {
    const selectedOrg = enrolledClusters.find(c => c.id === selectedOrgId);
    if (!selectedOrg || !profile?.id) return null;
    return (
      <FloatingLayout>
        <AppTopBar onOpenSettings={() => setShowSettings(true)} userName={profile?.full_name} avatarUrl={profile?.avatar_url} />
        <OrgDashboard
          clusterId={selectedOrg.id}
          clusterName={selectedOrg.name}
          userRole={selectedOrg.role}
          profileId={profile.id}
          onBack={() => setMainView('chat')}
        />
        {showSettings && profile && (
          <ProfileSettingsModal profile={profile} onClose={() => setShowSettings(false)} onUpdate={handleProfileUpdate} />
        )}
      </FloatingLayout>
    );
  }

  // Wizard — centered
  if (mainView === 'wizard') {
    return (
      <FloatingLayout>
        <AppTopBar onOpenSettings={() => setShowSettings(true)} userName={profile?.full_name} avatarUrl={profile?.avatar_url} />
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-3rem)]">
          <ConversationalWizard onComplete={handleWizardComplete} />
        </div>
        {showSettings && profile && (
          <ProfileSettingsModal profile={profile} onClose={() => setShowSettings(false)} onUpdate={handleProfileUpdate} />
        )}
      </FloatingLayout>
    );
  }

  // Project detail — full width centered
  if (mainView === 'detail' && selectedProject && profile?.id) {
    return (
      <FloatingLayout>
        <AppTopBar onOpenSettings={() => setShowSettings(true)} userName={profile?.full_name} avatarUrl={profile?.avatar_url} />
        <ProjectDetail
          project={selectedProject}
          profileId={profile.id}
          isOwner={false}
          onBack={() => { setSelectedProject(null); setMainView('projects'); }}
          onProjectUpdate={loadActiveProjects}
        />
        {showSettings && profile && (
          <ProfileSettingsModal profile={profile} onClose={() => setShowSettings(false)} onUpdate={handleProfileUpdate} />
        )}
      </FloatingLayout>
    );
  }

  const renderContent = () => {
    switch (mainView) {
      case 'invitations':
        return (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Team Invitations</h2>
                <p className="text-muted-foreground mt-1">{invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}</p>
              </div>
              {invitations.length === 0 ? (
                <div className="text-center py-16">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No pending invitations</p>
                  <p className="text-sm text-muted-foreground mt-2">When project owners invite you to their team, you'll see it here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <TeamInvitation
                      key={invitation.id}
                      invitation={invitation}
                      onAccept={() => handleInvitationResponse(invitation.id, true)}
                      onDecline={() => handleInvitationResponse(invitation.id, false)}
                      isLoading={isUpdatingInvitation === invitation.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'projects':
        return (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Active Projects</h2>
                <p className="text-muted-foreground mt-1">{activeProjects.length} project{activeProjects.length !== 1 ? 's' : ''}</p>
              </div>
              <ProjectList
                projects={activeProjects}
                onProjectClick={(project) => { setSelectedProject(project as Project); setMainView('detail'); }}
                variant="member"
                emptyMessage="No active projects. Accept an invitation to join a team!"
              />
            </div>
          </div>
        );

      default: // chat
        const hasConversation = messages.length > 1;
        const quickActions = [
          { icon: Rocket, label: 'Full-stack developer', prompt: "I'm a full-stack developer experienced with React, Node.js, and cloud platforms", color: 'from-blue-500/15 to-blue-600/5 border-blue-200/60' },
          { icon: Palette, label: 'Designer / Creative', prompt: "I work mainly with design, UX research, and creative tools like Figma", color: 'from-pink-500/15 to-pink-600/5 border-pink-200/60' },
          { icon: Target, label: 'Project Manager', prompt: "I'm a project manager experienced with Agile, Scrum, and product strategy", color: 'from-amber-500/15 to-amber-600/5 border-amber-200/60' },
          { icon: Brain, label: 'Data / AI specialist', prompt: "I specialize in data science, machine learning, and AI engineering", color: 'from-purple-500/15 to-purple-600/5 border-purple-200/60' },
        ];

        return (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* Chat Column */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2 sm:py-4 space-y-4">

                  {/* Compact Profile Strip */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-border rounded-2xl bg-card overflow-hidden"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center gap-4">
                        <AvatarUpload
                          userId={user?.id || ''}
                          currentAvatarUrl={profile?.avatar_url}
                          onUploadComplete={handleAvatarUpload}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{profile?.full_name || 'Your Name'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <StatusIndicator available={profile?.is_available ?? true} />
                            <button onClick={toggleAvailability} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                              Toggle
                            </button>
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <motion.p
                            className="text-2xl font-bold text-primary"
                            key={skills.length}
                            initial={{ scale: 1.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                          >
                            {skills.length}
                          </motion.p>
                          <p className="text-xs text-muted-foreground">skills</p>
                        </div>
                      </div>

                      {/* Inline skills */}
                      {skills.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border">
                          <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto scrollbar-hide">
                            <AnimatePresence>
                              {skills.map((skill) => (
                                <SkillBadge
                                  key={skill.id}
                                  skill={skill.skill_name}
                                  level={skill.skill_level}
                                  onRemove={() => handleRemoveSkill(skill.id)}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      )}

                      {/* Next Steps */}
                      <div className="mt-3">
                        <SupplyNextSteps
                          hasAvatar={!!profile?.avatar_url}
                          hasLinkedIn={!!profile?.linkedin_url}
                          skillCount={skills.length}
                          hasOrganization={enrolledClusters.length > 0}
                          hasProjects={activeProjects.length > 0}
                          onGoToSkillMapper={() => setMainView('chat')}
                          onGoToOrgs={() => setShowJoinOrgs(true)}
                          onGoToProjects={() => setMainView('projects')}
                          onGoToSettings={() => setShowSettings(true)}
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Organizations */}
                  {(enrolledClusters.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="border border-border rounded-2xl bg-card p-4 sm:p-5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Organizations</h3>
                        <button
                          onClick={() => navigate('/join-kolektiv')}
                          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Join More
                        </button>
                      </div>
                      <div className="space-y-1">
                        {enrolledClusters.map((cluster) => (
                          <button
                            key={cluster.id}
                            onClick={() => { setSelectedOrgId(cluster.id); setMainView('org-dashboard'); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium flex-1 truncate">{cluster.name}</span>
                            <span className="text-xs text-muted-foreground capitalize">{cluster.role.replace('_', ' ')}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Welcome Hero — shows only before first user message */}
                  {!hasConversation && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-center py-6 sm:py-10"
                    >
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/15 to-accent/15 mb-4">
                        <Wand2 className="w-8 h-8 text-primary" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                        Let's map your skills
                      </h2>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
                        Tell me about your work experience and I'll build a comprehensive skill profile that gets you matched to the best projects.
                      </p>

                      {/* Quick Action Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                        {quickActions.map((action, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.05 }}
                            onClick={() => handleSend(action.prompt)}
                            className={cn(
                              "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br",
                              action.color
                            )}
                          >
                            <div className="w-9 h-9 rounded-lg bg-card/80 flex items-center justify-center flex-shrink-0">
                              <action.icon className="w-4 h-4 text-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{action.label}</p>
                              <p className="text-[11px] text-muted-foreground truncate">Click to start</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Chat Messages */}
                  {hasConversation && (
                    <div className="space-y-4 pt-2">
                      {messages.map((message, index) => (
                        <ChatMessage key={index} role={message.role} content={message.content} />
                      ))}
                      {isLoading && <ChatMessage role="assistant" content="" isLoading />}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Input — sticky bottom */}
              <div className="border-t border-border bg-background/95 backdrop-blur-sm">
                <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
                  {/* Suggested questions — always visible when available */}
                  {suggestedQuestions.length > 0 && !isLoading && (
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lightbulb className="w-3 h-3 text-accent" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestedQuestions.map((q, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleSend(q)}
                            className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/[0.04] hover:bg-primary/10 text-foreground hover:text-primary transition-all truncate max-w-[320px] hover:shadow-sm"
                          >
                            {q}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3 items-end">
                    <GlassTextarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                      placeholder="Tell me about your experience, skills, projects..."
                      className="flex-1 min-h-[48px] max-h-[160px]"
                      rows={2}
                    />
                    <GlassButton variant="primary" onClick={() => handleSend()} disabled={!input.trim() || isLoading}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </GlassButton>
                  </div>
                </div>
              </div>
            </div>

            {/* Skill Radar Panel — desktop only */}
            <div className="hidden lg:block w-80 border-l border-border">
              <SkillRadarPanel skills={skills} onRemoveSkill={handleRemoveSkill} />
            </div>
          </div>
        );
    }
  };

  return (
    <FloatingLayout>
      <AppTopBar onOpenSettings={() => setShowSettings(true)} userName={profile?.full_name} avatarUrl={profile?.avatar_url} />
      <div className="h-full flex flex-col min-h-[calc(100vh-3rem)]">
        {/* Header with tabs — matching Demand agent */}
        <header className="border-b border-border/30 relative">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 py-4">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-accent-foreground" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="font-semibold text-sm">Talent Agent</h1>
                  <p className="text-xs text-muted-foreground">Build your profile & get matched</p>
                </div>
              </div>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex gap-1 mr-4">
                <button
                  onClick={() => setMainView('chat')}
                  className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                    mainView === 'chat' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Skill Mapper
                </button>
                <button
                  onClick={() => setMainView('invitations')}
                  className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                    mainView === 'invitations' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Bell className="w-4 h-4 inline mr-1" />
                  Invitations
                  {invitations.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-primary/20">{invitations.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setMainView('projects')}
                  className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                    mainView === 'projects' || mainView === 'detail' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <FolderOpen className="w-4 h-4 inline mr-1" />
                  Projects
                  {activeProjects.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-primary/20">{activeProjects.length}</span>
                  )}
                </button>
                <button
                  onClick={() => navigate('/join-kolektiv')}
                  className="px-3 py-2 rounded-xl text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Join an Organization
                </button>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Switch Path
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile dropdown */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg z-50 p-4 md:hidden"
              >
                <div className="max-w-7xl mx-auto space-y-2">
                <button onClick={() => { setMainView('chat'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${mainView === 'chat' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
                  <MessageSquare className="w-4 h-4" /> Skill Mapper
                </button>
                <button onClick={() => { setMainView('invitations'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${mainView === 'invitations' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
                  <Bell className="w-4 h-4" /> Invitations
                  {invitations.length > 0 && <span className="ml-auto px-1.5 py-0.5 rounded-full text-xs bg-primary/20">{invitations.length}</span>}
                </button>
                <button onClick={() => { setMainView('projects'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${mainView === 'projects' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}>
                  <FolderOpen className="w-4 h-4" /> Projects
                  {activeProjects.length > 0 && <span className="ml-auto px-1.5 py-0.5 rounded-full text-xs bg-primary/20">{activeProjects.length}</span>}
                </button>
                <div className="border-t border-border/30 my-2" />
                <button onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                  <Settings className="w-4 h-4" /> Settings
                </button>
                <button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                  <RefreshCcw className="w-4 h-4" /> Switch Path
                </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Main Content */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div key={mainView} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showSettings && profile && (
        <ProfileSettingsModal profile={profile} onClose={() => setShowSettings(false)} onUpdate={handleProfileUpdate} />
      )}
    </FloatingLayout>
  );
}
