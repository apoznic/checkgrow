 import { useState, useEffect } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Crown, Shield, UserCog, User, Loader2, 
  MoreVertical, Briefcase, Star, ChevronDown, ChevronUp,
  BarChart3, Check, X, Clock, UserMinus, UserPlus, Mail, Send, AlertTriangle,
  CheckCircle2, XCircle
} from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 import { SkillBadge } from '@/components/SkillBadge';
 import { GlassButton, GlassInput } from '@/components/GlassCard';
 import {
   DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
 
 interface PendingRequest {
   id: string;
   profile_id: string;
   requested_at: string;
   profiles: {
     id: string;
     full_name: string | null;
     avatar_url: string | null;
     bio: string | null;
   };
 }
 
 interface Skill {
   id: string;
   skill_name: string;
   skill_level: string | null;
   years_experience: number | null;
 }
 
 interface MemberWithSkills {
   id: string;
   role: string;
   status: string;
   profile_id: string;
   profiles: {
     id: string;
     full_name: string | null;
     avatar_url: string | null;
     bio: string | null;
   };
   skills: Skill[];
   projectCount: number;
 }
 
 interface OrgSkillSummary {
   skill_name: string;
   count: number;
   members: string[];
 }
 
 interface MemberSkillsViewProps {
   clusterId: string;
   canManage: boolean;
   currentProfileId: string;
 }
 
 const ROLES = [
   { value: 'owner', label: 'Owner', icon: Crown, color: 'text-yellow-500' },
   { value: 'admin', label: 'Admin', icon: Shield, color: 'text-purple-500' },
   { value: 'project_manager', label: 'Project Manager', icon: UserCog, color: 'text-blue-500' },
   { value: 'member', label: 'Member', icon: User, color: 'text-muted-foreground' },
 ];
 
 interface Invitation {
   id: string;
   email: string;
   status: string;
   created_at: string;
   accepted_at: string | null;
 }

 export function MemberSkillsView({ clusterId, canManage, currentProfileId }: MemberSkillsViewProps) {
   const { toast } = useToast();
   const [members, setMembers] = useState<MemberWithSkills[]>([]);
   const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
   const [orgSkills, setOrgSkills] = useState<OrgSkillSummary[]>([]);
   const [invitations, setInvitations] = useState<Invitation[]>([]);
   const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [expandedMember, setExpandedMember] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'members' | 'skills' | 'pending' | 'invited'>('members');
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    const [sendProgress, setSendProgress] = useState<{ sent: number; total: number; failed: string[] } | null>(null);
    const [resendConfigured, setResendConfigured] = useState<boolean | null>(null);
 
   useEffect(() => {
     loadMembersWithSkills();
     loadInvitations();
     checkResendStatus();
   }, [clusterId]);

   const checkResendStatus = async () => {
     const { data } = await supabase.functions.invoke('manage-integrations', {
       body: { action: 'list', clusterId },
     });
     if (data?.integrations) {
       const resend = data.integrations.find((i: any) => i.service_name === 'resend' && i.is_active);
       setResendConfigured(!!resend);
     } else {
       setResendConfigured(false);
     }
    };

   const loadInvitations = async () => {
     const { data } = await supabase
       .from('cluster_invitations')
       .select('id, email, status, created_at, accepted_at')
       .eq('cluster_id', clusterId)
       .order('created_at', { ascending: false });
     if (data) setInvitations(data as Invitation[]);
   };

   const loadMembersWithSkills = async () => {
     setIsLoading(true);
 
     const [approvedRes, pendingRes] = await Promise.all([
       supabase
         .from('cluster_enrollments')
         .select(`
           id,
           role,
           status,
           profile_id,
           profiles (
             id,
             full_name,
             avatar_url,
             bio
           )
         `)
         .eq('cluster_id', clusterId)
         .eq('status', 'approved'),
       supabase
         .from('cluster_enrollments')
         .select(`
           id,
           profile_id,
           requested_at,
           profiles (
             id,
             full_name,
             avatar_url,
             bio
           )
         `)
         .eq('cluster_id', clusterId)
         .eq('status', 'pending')
         .order('requested_at', { ascending: false })
     ]);
 
     if (!approvedRes.data) {
       setIsLoading(false);
       return;
     }
 
     if (pendingRes.data) {
       setPendingRequests(pendingRes.data as unknown as PendingRequest[]);
     }
 
     const memberIds = approvedRes.data.map(e => e.profile_id);
     
     const [skillsRes, projectsRes] = await Promise.all([
       supabase
         .from('skills')
         .select('*')
         .in('profile_id', memberIds),
       supabase
         .from('project_teams')
         .select('profile_id, project_id')
         .in('profile_id', memberIds)
         .eq('status', 'accepted')
     ]);
 
     const membersWithData: MemberWithSkills[] = approvedRes.data.map(e => {
       const memberSkills = skillsRes.data?.filter(s => s.profile_id === e.profile_id) || [];
       const memberProjects = projectsRes.data?.filter(p => p.profile_id === e.profile_id) || [];
       
       return {
         id: e.id,
         role: e.role,
         status: e.status,
         profile_id: e.profile_id,
         profiles: e.profiles as MemberWithSkills['profiles'],
         skills: memberSkills,
         projectCount: memberProjects.length
       };
     });
 
     setMembers(membersWithData);
 
     const skillMap = new Map<string, { count: number; members: string[] }>();
     membersWithData.forEach(member => {
       member.skills.forEach(skill => {
         const existing = skillMap.get(skill.skill_name) || { count: 0, members: [] };
         existing.count++;
         existing.members.push(member.profiles.full_name || 'Anonymous');
         skillMap.set(skill.skill_name, existing);
       });
     });
 
     const aggregatedSkills: OrgSkillSummary[] = Array.from(skillMap.entries())
       .map(([skill_name, data]) => ({ skill_name, ...data }))
       .sort((a, b) => b.count - a.count);
 
     setOrgSkills(aggregatedSkills);
     setIsLoading(false);
   };
 
  const handleEnrollmentAction = async (enrollmentId: string, approve: boolean) => {
    setProcessingId(enrollmentId);

    // Optimistically remove from pending list for instant UI feedback
    setPendingRequests(prev => prev.filter(r => r.id !== enrollmentId));

    const { error } = await supabase
      .from('cluster_enrollments')
      .update({
        status: approve ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', enrollmentId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      // Revert optimistic update on error by refetching
      await loadMembersWithSkills();
    } else {
      toast({
        title: approve ? 'Member approved!' : 'Request declined',
      });
      // Refetch to get full updated data including new member in approved list
      await loadMembersWithSkills();
    }

    setProcessingId(null);
  };
 
   const handleRoleChange = async (enrollmentId: string, newRole: 'owner' | 'admin' | 'project_manager' | 'member') => {
     setProcessingId(enrollmentId);
     const { error } = await supabase
       .from('cluster_enrollments')
       .update({ role: newRole })
       .eq('id', enrollmentId);
 
     if (error) {
       toast({ title: 'Error updating role', description: error.message, variant: 'destructive' });
     } else {
       toast({ title: 'Role updated' });
       loadMembersWithSkills();
     }
     setProcessingId(null);
   };
  
  const handleRemoveMember = async (enrollmentId: string, memberName: string | null) => {
    if (!confirm(`Remove ${memberName || 'this member'} from the organization?`)) return;
    setProcessingId(enrollmentId);

    const { error } = await supabase
      .from('cluster_enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (error) {
      toast({
        title: 'Error removing member',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: `${memberName || 'Member'} removed from organization` });
      loadMembersWithSkills();
    }

    setProcessingId(null);
  };

    const parseEmails = (text: string): string[] => {
      const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
      const matches = text.match(emailRegex) || [];
      return [...new Set(matches.map(e => e.toLowerCase()))];
    };

    const handleInviteByEmail = async () => {
      const emails = parseEmails(inviteEmail);
      if (emails.length === 0) {
        toast({ title: 'No valid emails found', variant: 'destructive' });
        return;
      }
      setIsSendingInvite(true);
      setSendProgress({ sent: 0, total: emails.length, failed: [] });

      const [clusterRes, profileRes] = await Promise.all([
        supabase.from('clusters').select('name').eq('id', clusterId).single(),
        supabase.from('profiles').select('full_name').eq('id', currentProfileId).single(),
      ]);

      const failed: string[] = [];
      for (let i = 0; i < emails.length; i++) {
        const { data, error } = await supabase.functions.invoke('invite-to-kolektiv', {
          body: {
            email: emails[i],
            clusterId,
            clusterName: clusterRes.data?.name || 'CheckGrow',
            inviterName: profileRes.data?.full_name || 'A team member',
          },
        });
        if (error || data?.error) {
          failed.push(emails[i]);
        }
        setSendProgress({ sent: i + 1, total: emails.length, failed });
      }

      if (failed.length === 0) {
        toast({ title: `📧 ${emails.length} invitation${emails.length > 1 ? 's' : ''} sent!` });
      } else {
        toast({ title: `Sent ${emails.length - failed.length}/${emails.length}. ${failed.length} failed.`, variant: 'destructive' });
      }
      setInviteEmail('');
      setShowInvite(false);
      setIsSendingInvite(false);
      setSendProgress(null);
      setViewMode('invited');
      loadInvitations();
    };

    const getRoleInfo = (role: string) => {
      return ROLES.find(r => r.value === role) || ROLES[ROLES.length - 1];
    };
 
   const getSkillLevel = (level: string | null): 'beginner' | 'intermediate' | 'advanced' | 'expert' => {
     if (!level) return 'intermediate';
     return level as 'beginner' | 'intermediate' | 'advanced' | 'expert';
   };
 
   if (isLoading) {
     return (
       <div className="flex items-center justify-center py-12">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
        {/* View Toggle + Invite Button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setViewMode('members')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                viewMode === 'members'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Members ({members.length})
            </button>
            <button
              onClick={() => setViewMode('skills')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                viewMode === 'skills'
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Org Skills ({orgSkills.length})
            </button>
            {canManage && (
              <button
                onClick={() => setViewMode('pending')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  viewMode === 'pending'
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Pending Requests
                {pendingRequests.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-accent text-accent-foreground">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setViewMode('invited')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  viewMode === 'invited'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Invited
                {invitations.filter(i => i.status === 'pending').length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-primary text-primary-foreground">
                    {invitations.filter(i => i.status === 'pending').length}
                  </span>
                )}
              </button>
            )}
          </div>
          {canManage && (
            <GlassButton variant="primary" onClick={() => setShowInvite(!showInvite)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite by Email
            </GlassButton>
          )}
        </div>

        {/* Invite Form */}
        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-panel p-5"
            >
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Invite someone to your organization
               </h3>
               {resendConfigured === false && (
                 <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                   <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                   <div className="text-sm">
                     <p className="font-medium text-amber-600 dark:text-amber-400">Email service not configured</p>
                     <p className="text-muted-foreground mt-0.5">
                       To send email invitations, add a Resend API key in your organization's <strong>Integrations</strong> settings.
                       Make sure the sender domain is verified in your Resend account.
                     </p>
                   </div>
                 </div>
               )}
               <p className="text-sm text-muted-foreground mb-3">
                  Paste one or many emails — separated by commas, spaces, newlines, or any format.
                </p>
               <textarea
                 value={inviteEmail}
                 onChange={(e) => setInviteEmail(e.target.value)}
                 placeholder="name@example.com, another@company.com&#10;third@email.com"
                 className="w-full h-24 bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
               />
               {sendProgress ? (
                 <div className="space-y-2">
                   <div className="w-full bg-secondary rounded-full h-2">
                     <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }} />
                   </div>
                   <p className="text-xs text-muted-foreground">
                     Sending {sendProgress.sent}/{sendProgress.total}...
                   </p>
                 </div>
               ) : (
                 <div className="flex items-center justify-between">
                   <p className="text-xs text-muted-foreground">
                     {parseEmails(inviteEmail).length > 0
                       ? `${parseEmails(inviteEmail).length} email${parseEmails(inviteEmail).length > 1 ? 's' : ''} detected`
                       : 'No emails detected yet'}
                   </p>
                   <GlassButton
                     variant="primary"
                     onClick={handleInviteByEmail}
                     disabled={isSendingInvite || parseEmails(inviteEmail).length === 0}
                   >
                     {isSendingInvite ? (
                       <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                       <><Send className="w-4 h-4 mr-2" />Send {parseEmails(inviteEmail).length > 1 ? `${parseEmails(inviteEmail).length} Invites` : 'Invite'}</>
                     )}
                   </GlassButton>
                 </div>
               )}
             </motion.div>
           )}
         </AnimatePresence>


       <AnimatePresence mode="wait">
         {viewMode === 'pending' && canManage ? (
           <motion.div
             key="pending"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             className="space-y-3"
           >
             {pendingRequests.length === 0 ? (
               <div className="glass-panel p-8 text-center">
                 <Check className="w-12 h-12 mx-auto mb-3 text-primary/50" />
                 <p className="text-muted-foreground">No pending requests</p>
               </div>
             ) : (
               pendingRequests.map((request) => (
                 <motion.div
                   key={request.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, x: -100 }}
                   className="glass-panel p-4 flex items-center gap-4"
                 >
                   <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                     {request.profiles.avatar_url ? (
                       <img
                         src={request.profiles.avatar_url}
                         alt={request.profiles.full_name || ''}
                         className="w-full h-full object-cover"
                       />
                     ) : (
                       <User className="w-6 h-6 text-muted-foreground" />
                     )}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="font-medium truncate">
                       {request.profiles.full_name || 'Anonymous'}
                     </p>
                     <p className="text-sm text-muted-foreground line-clamp-1">
                       {request.profiles.bio || 'No bio provided'}
                     </p>
                   </div>
                   <div className="flex gap-2">
                     <GlassButton
                       variant="primary"
                       onClick={() => handleEnrollmentAction(request.id, true)}
                       disabled={processingId === request.id}
                       className="!px-3 !py-2"
                     >
                       {processingId === request.id ? (
                         <Loader2 className="w-4 h-4 animate-spin" />
                       ) : (
                         <Check className="w-4 h-4" />
                       )}
                     </GlassButton>
                     <GlassButton
                       onClick={() => handleEnrollmentAction(request.id, false)}
                       disabled={processingId === request.id}
                       className="!px-3 !py-2 hover:!bg-destructive/10 hover:!text-destructive"
                     >
                       <X className="w-4 h-4" />
                     </GlassButton>
                   </div>
                 </motion.div>
               ))
             )}
           </motion.div>
         ) : viewMode === 'members' ? (
           <motion.div
             key="members"
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 20 }}
             className="space-y-3"
           >
             {members.length === 0 ? (
               <div className="glass-panel p-8 text-center">
                 <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                 <p className="text-muted-foreground">No members yet</p>
               </div>
             ) : (
               members.map((member) => {
                 const roleInfo = getRoleInfo(member.role);
                 const RoleIcon = roleInfo.icon;
                 const isCurrentUser = member.profile_id === currentProfileId;
                 const isExpanded = expandedMember === member.id;
 
                 return (
                   <motion.div
                     key={member.id}
                     layout
                     className="glass-panel overflow-hidden"
                   >
                     <div 
                       className="p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                       onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                     >
                       <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                         {member.profiles.avatar_url ? (
                           <img
                             src={member.profiles.avatar_url}
                             alt={member.profiles.full_name || ''}
                             className="w-full h-full object-cover"
                           />
                         ) : (
                           <User className="w-6 h-6 text-muted-foreground" />
                         )}
                       </div>
                       
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                           <p className="font-medium truncate">
                             {member.profiles.full_name || 'Anonymous'}
                           </p>
                           {isCurrentUser && (
                             <span className="text-xs text-muted-foreground">(You)</span>
                           )}
                         </div>
                         <div className="flex items-center gap-3 text-sm">
                           <span className={`flex items-center gap-1 ${roleInfo.color}`}>
                             <RoleIcon className="w-3 h-3" />
                             {roleInfo.label}
                           </span>
                           <span className="flex items-center gap-1 text-muted-foreground">
                             <Briefcase className="w-3 h-3" />
                             {member.projectCount} projects
                           </span>
                           <span className="flex items-center gap-1 text-muted-foreground">
                             <Star className="w-3 h-3" />
                             {member.skills.length} skills
                           </span>
                         </div>
                       </div>
 
                       <div className="flex items-center gap-2">
                         {isExpanded ? (
                           <ChevronUp className="w-4 h-4 text-muted-foreground" />
                         ) : (
                           <ChevronDown className="w-4 h-4 text-muted-foreground" />
                         )}
                         
                         {canManage && !isCurrentUser && (
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                               <button className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                                 <MoreVertical className="w-4 h-4 text-muted-foreground" />
                               </button>
                             </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[200px]">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Change Role</div>
                                {ROLES.map((role) => {
                                  if (role.value === member.role) return null;
                                  const Icon = role.icon;
                                  return (
                                    <DropdownMenuItem
                                      key={role.value}
                                      onClick={() => handleRoleChange(member.id, role.value as 'owner' | 'admin' | 'project_manager' | 'member')}
                                      disabled={processingId === member.id}
                                    >
                                      <Icon className={`w-4 h-4 mr-2 ${role.color}`} />
                                      Make {role.label}
                                    </DropdownMenuItem>
                                  );
                                })}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onClick={() => handleRemoveMember(member.id, member.profiles.full_name)}
                                  disabled={processingId === member.id}
                                >
                                  <UserMinus className="w-4 h-4 mr-2" />
                                  Remove from Organization
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
                         )}
                       </div>
                     </div>
 
                     {isExpanded && (
                       <motion.div
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="border-t border-border/30 px-4 py-4 bg-secondary/20"
                       >
                         {member.skills.length === 0 ? (
                           <p className="text-sm text-muted-foreground">No skills added yet</p>
                         ) : (
                           <div className="flex flex-wrap gap-2">
                             {member.skills.map(skill => (
                               <SkillBadge
                                 key={skill.id}
                                 skill={skill.skill_name}
                                 level={getSkillLevel(skill.skill_level)}
                               />
                             ))}
                           </div>
                         )}
                       </motion.div>
                     )}
                   </motion.div>
                 );
               })
             )}
            </motion.div>
          ) : viewMode === 'invited' && canManage ? (
            <motion.div
              key="invited"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {invitations.length === 0 ? (
                <div className="glass-panel p-8 text-center">
                  <Mail className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No invitations sent yet</p>
                </div>
              ) : (
                invitations.map((inv) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited {new Date(inv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {inv.status === 'pending' ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      ) : inv.status === 'accepted' ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Accepted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
                          <XCircle className="w-3 h-3" />
                          {inv.status}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          ) : (
           <motion.div
             key="skills"
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             className="space-y-4"
           >
             {orgSkills.length === 0 ? (
               <div className="glass-panel p-8 text-center">
                 <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                 <p className="text-muted-foreground">No skills recorded in organization</p>
               </div>
             ) : (
               <>
                 <div className="glass-panel p-4">
                   <h3 className="text-sm font-medium mb-3">Organization Skill Coverage</h3>
                   <div className="flex flex-wrap gap-2">
                     {orgSkills.slice(0, 10).map(skill => (
                       <span 
                         key={skill.skill_name}
                         className="px-3 py-1.5 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
                       >
                         {skill.skill_name} 
                         <span className="ml-1.5 opacity-70">×{skill.count}</span>
                       </span>
                     ))}
                     {orgSkills.length > 10 && (
                       <span className="px-3 py-1.5 rounded-full text-sm bg-secondary text-muted-foreground">
                         +{orgSkills.length - 10} more
                       </span>
                     )}
                   </div>
                 </div>
 
                 <div className="grid gap-3">
                   {orgSkills.map(skill => (
                     <div key={skill.skill_name} className="glass-panel p-4">
                       <div className="flex items-center justify-between mb-2">
                         <span className="font-medium">{skill.skill_name}</span>
                         <span className="text-sm text-muted-foreground">
                           {skill.count} member{skill.count !== 1 ? 's' : ''}
                         </span>
                       </div>
                       <div className="w-full bg-secondary/50 rounded-full h-2 mb-2">
                         <div 
                           className="bg-primary rounded-full h-2 transition-all"
                           style={{ width: `${Math.min((skill.count / members.length) * 100, 100)}%` }}
                         />
                       </div>
                       <div className="flex flex-wrap gap-1">
                         {skill.members.map((name, idx) => (
                           <span key={idx} className="text-xs text-muted-foreground">
                             {name}{idx < skill.members.length - 1 ? ',' : ''}
                           </span>
                         ))}
                       </div>
                     </div>
                   ))}
                 </div>
               </>
             )}
           </motion.div>
         )}
       </AnimatePresence>
     </div>
   );
 }