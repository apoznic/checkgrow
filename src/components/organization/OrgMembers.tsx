import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Crown, Shield, UserCog, User, Check, X, Loader2, 
  MoreVertical, ChevronDown, UserMinus, Mail, UserPlus, Send, AlertTriangle,
  Clock, CheckCircle2, XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButton, GlassInput } from '@/components/GlassCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Member {
  id: string;
  role: string;
  status: string;
  requested_at: string;
  profile_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
}

interface OrgMembersProps {
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
  invited_by: string;
  inviter_name?: string;
}

export function OrgMembers({ clusterId, canManage, currentProfileId }: OrgMembersProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'approved' | 'pending' | 'invited'>('approved');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [resendConfigured, setResendConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    loadMembers();
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
      .select('id, email, status, created_at, accepted_at, invited_by')
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: false });
    
    if (data) {
      setInvitations(data as Invitation[]);
    }
  };

  const loadMembers = async () => {
    setIsLoading(true);

    const [approvedRes, pendingRes] = await Promise.all([
      supabase
        .from('cluster_enrollments')
        .select(`
          id,
          role,
          status,
          requested_at,
          profile_id,
          profiles (
            id,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq('cluster_id', clusterId)
        .eq('status', 'approved')
        .order('role'),
      supabase
        .from('cluster_enrollments')
        .select(`
          id,
          role,
          status,
          requested_at,
          profile_id,
          profiles (
            id,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq('cluster_id', clusterId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false }),
    ]);

    if (approvedRes.data) setMembers(approvedRes.data as unknown as Member[]);
    if (pendingRes.data) setPendingRequests(pendingRes.data as unknown as Member[]);

    setIsLoading(false);
  };

  const handleEnrollmentAction = async (enrollmentId: string, approve: boolean) => {
    setProcessingId(enrollmentId);

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
    } else {
      toast({
        title: approve ? 'Member approved!' : 'Request declined',
      });
      loadMembers();
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
      toast({
        title: 'Error updating role',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Role updated' });
      loadMembers();
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
      loadMembers();
    }

    setProcessingId(null);
  };

  const getRoleInfo = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[ROLES.length - 1];
  };

  // Extract emails from messy input (commas, semicolons, spaces, newlines, etc.)
  const parseEmails = (raw: string): string[] => {
    // Split by common delimiters: comma, semicolon, newline, space, pipe, tab
    const parts = raw.split(/[,;\n\r\t|]+/).map(s => s.trim()).filter(Boolean);
    const emails: string[] = [];
    for (const part of parts) {
      // Extract anything that looks like an email from each chunk
      const match = part.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
      if (match) emails.push(match[0].toLowerCase());
    }
    return [...new Set(emails)]; // deduplicate
  };

  const [sendProgress, setSendProgress] = useState<{ total: number; sent: number; failed: string[] } | null>(null);

  const handleInvite = async () => {
    const emails = parseEmails(inviteEmail);
    if (emails.length === 0) {
      toast({ title: 'No valid email addresses found', description: 'Please enter at least one valid email.', variant: 'destructive' });
      return;
    }
    setIsSendingInvite(true);
    setSendProgress({ total: emails.length, sent: 0, failed: [] });

    // Get cluster name and inviter name once
    const [clusterRes, profileRes] = await Promise.all([
      supabase.from('clusters').select('name').eq('id', clusterId).single(),
      supabase.from('profiles').select('full_name').eq('id', currentProfileId).single(),
    ]);

    const clusterName = clusterRes.data?.name || 'CheckGrow';
    const inviterName = profileRes.data?.full_name || 'A team member';
    const failed: string[] = [];

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const { data, error } = await supabase.functions.invoke('invite-to-kolektiv', {
        body: { email, clusterId, clusterName, inviterName },
      });

      if (error || data?.error) {
        failed.push(email);
      }
      setSendProgress({ total: emails.length, sent: i + 1, failed });
    }

    if (failed.length === 0) {
      toast({ title: `📧 ${emails.length} invitation${emails.length > 1 ? 's' : ''} sent!` });
    } else if (failed.length < emails.length) {
      toast({ title: `Sent ${emails.length - failed.length} of ${emails.length}`, description: `Failed: ${failed.join(', ')}`, variant: 'destructive' });
    } else {
      toast({ title: 'All invitations failed', variant: 'destructive' });
    }

    setInviteEmail('');
    setSendProgress(null);
    setIsSendingInvite(false);
    setShowInvite(false);
    setActiveSection('invited');
    loadInvitations();
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
      {/* Section Tabs + Invite Button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('approved')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeSection === 'approved'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            Members ({members.length})
          </button>
          {canManage && (
            <button
              onClick={() => setActiveSection('pending')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeSection === 'pending'
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
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
              onClick={() => setActiveSection('invited')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeSection === 'invited'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
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
            className="border border-border rounded-2xl bg-card p-5"
          >
            <h3 className="font-medium mb-1 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Invite people to your organization
            </h3>
            {resendConfigured === false && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4 mt-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">Email service not configured</p>
                  <p className="text-muted-foreground mt-0.5">
                    Add a Resend API key in <strong>Integrations</strong> to send email invitations.
                  </p>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-3">
              Paste one or many emails — separated by commas, spaces, newlines, or any format. We'll figure it out.
            </p>
            <textarea
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={"john@example.com, jane@company.com\nmark@team.io"}
              rows={3}
              className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3 placeholder:text-muted-foreground"
              disabled={isSendingInvite}
            />
            {sendProgress && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Sending invitations...</span>
                  <span>{sendProgress.sent} / {sendProgress.total}</span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
                  />
                </div>
                {sendProgress.failed.length > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    Failed: {sendProgress.failed.join(', ')}
                  </p>
                )}
              </div>
            )}
            {!sendProgress && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {parseEmails(inviteEmail).length > 0
                    ? `${parseEmails(inviteEmail).length} email${parseEmails(inviteEmail).length > 1 ? 's' : ''} detected`
                    : 'No emails detected yet'}
                </p>
                <GlassButton
                  variant="primary"
                  onClick={handleInvite}
                  disabled={isSendingInvite || parseEmails(inviteEmail).length === 0}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send {parseEmails(inviteEmail).length > 1 ? `${parseEmails(inviteEmail).length} Invites` : 'Invite'}
                </GlassButton>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>


      {/* Content */}
      <AnimatePresence mode="wait">
        {activeSection === 'approved' ? (
          <motion.div
            key="approved"
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

                return (
                  <div
                    key={member.id}
                    className="glass-panel p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
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
                      <div className="flex items-center gap-2">
                        <RoleIcon className={`w-3 h-3 ${roleInfo.color}`} />
                        <span className={`text-sm ${roleInfo.color}`}>{roleInfo.label}</span>
                      </div>
                    </div>
                    {canManage && !isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
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
                                {role.label}
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
                );
              })
            )}
          </motion.div>
        ) : activeSection === 'pending' ? (
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
        ) : activeSection === 'invited' ? (
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
        ) : null}
      </AnimatePresence>
    </div>
  );
}
