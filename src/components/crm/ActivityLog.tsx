import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Mail, Phone, Calendar, FileText, MessageSquare,
  Loader2, X, User 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButton, GlassInput } from '@/components/GlassCard';
import { CRMActivity, CRMContact, CRMDeal } from './types';
import { GlassSelect } from '@/components/ui/glass-select';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityLogProps {
  clusterId: string;
  profileId: string;
}

const activityTypes = [
  { value: 'email', label: 'Email', icon: Mail, color: 'text-blue-400' },
  { value: 'call', label: 'Call', icon: Phone, color: 'text-green-400' },
  { value: 'meeting', label: 'Meeting', icon: Calendar, color: 'text-purple-400' },
  { value: 'note', label: 'Note', icon: FileText, color: 'text-amber-400' },
];

export function ActivityLog({ clusterId, profileId }: ActivityLogProps) {
  const { toast } = useToast();
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDeal, setFilterDeal] = useState<string>('all');

  const [formData, setFormData] = useState({
    activity_type: 'note',
    subject: '',
    content: '',
    contact_id: '',
    deal_id: '',
    activity_date: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    loadActivities();
    loadContacts();
    loadDeals();

    const channel = supabase
      .channel('crm_activities_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_activities', filter: `cluster_id=eq.${clusterId}` }, () => {
        loadActivities();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clusterId]);

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from('crm_activities')
      .select(`
        *,
        profiles:created_by(id, full_name, avatar_url),
        crm_contacts(id, name),
        crm_deals(id, title)
      `)
      .eq('cluster_id', clusterId)
      .order('activity_date', { ascending: false })
      .limit(100);

    if (!error && data) {
      setActivities(data as unknown as CRMActivity[]);
    }
    setIsLoading(false);
  };

  const loadContacts = async () => {
    const { data } = await supabase
      .from('crm_contacts')
      .select('id, name')
      .eq('cluster_id', clusterId);
    if (data) setContacts(data as unknown as CRMContact[]);
  };

  const loadDeals = async () => {
    const { data } = await supabase
      .from('crm_deals')
      .select('id, title')
      .eq('cluster_id', clusterId);
    if (data) setDeals(data as unknown as CRMDeal[]);
  };

  const handleSubmit = async () => {
    if (!formData.subject.trim()) return;
    setIsSubmitting(true);

    const { error } = await supabase.from('crm_activities').insert({
      cluster_id: clusterId,
      activity_type: formData.activity_type,
      subject: formData.subject.trim(),
      content: formData.content.trim() || null,
      contact_id: formData.contact_id || null,
      deal_id: formData.deal_id || null,
      activity_date: formData.activity_date,
      created_by: profileId,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Activity logged' });
      closeModal();
    }

    setIsSubmitting(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      activity_type: 'note',
      subject: '',
      content: '',
      contact_id: '',
      deal_id: '',
      activity_date: new Date().toISOString().slice(0, 16),
    });
  };

  const filteredActivities = activities.filter(a => {
    if (filterType !== 'all' && a.activity_type !== filterType) return false;
    if (filterDeal !== 'all' && a.deal_id !== filterDeal) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filterType === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {activityTypes.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                  filterType === t.value ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 items-center">
          {deals.length > 0 && (
            <GlassSelect
              value={filterDeal}
              onChange={setFilterDeal}
              options={[
                { value: 'all', label: 'All Deals' },
                ...deals.map(d => ({ value: d.id, label: d.title })),
              ]}
            />
          )}
          <GlassButton variant="primary" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Log Activity
          </GlassButton>
        </div>
      </div>

      {/* Activity Timeline */}
      {filteredActivities.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No activities logged yet</p>
        </div>
      ) : (
        <div className="relative space-y-4">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border/50" />
          {filteredActivities.map((activity, index) => {
            const typeInfo = activityTypes.find(t => t.value === activity.activity_type);
            const Icon = typeInfo?.icon || FileText;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-14"
              >
                <div className={`absolute left-4 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center ${typeInfo?.color}`}>
                  <Icon className="w-3 h-3" />
                </div>

                <div className="glass-panel p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{activity.subject}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{format(new Date(activity.activity_date), 'MMM d, yyyy h:mm a')}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(activity.activity_date), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activity.profiles && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{activity.profiles.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {activity.content && (
                    <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                      {activity.content}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs">
                    {activity.crm_contacts && (
                      <span className="px-2 py-1 rounded bg-secondary/50">
                        Contact: {activity.crm_contacts.name}
                      </span>
                    )}
                    {activity.crm_deals && (
                      <span className="px-2 py-1 rounded bg-secondary/50">
                        Deal: {activity.crm_deals.title}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Activity Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel p-6 w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Log Activity</h2>
                <button onClick={closeModal} className="p-1 hover:bg-secondary/50 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Activity Type</label>
                  <div className="flex gap-2">
                    {activityTypes.map(t => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.value}
                          onClick={() => setFormData(p => ({ ...p, activity_type: t.value }))}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                            formData.activity_type === t.value 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Subject *</label>
                  <GlassInput
                    value={formData.subject}
                    onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                    placeholder="Activity subject"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Contact</label>
                    <select
                      value={formData.contact_id}
                      onChange={e => setFormData(p => ({ ...p, contact_id: e.target.value }))}
                      className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Deal</label>
                    <select
                      value={formData.deal_id}
                      onChange={e => setFormData(p => ({ ...p, deal_id: e.target.value }))}
                      className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm"
                    >
                      <option value="">None</option>
                      {deals.map(d => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Date & Time</label>
                  <GlassInput
                    type="datetime-local"
                    value={formData.activity_date}
                    onChange={e => setFormData(p => ({ ...p, activity_date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Notes</label>
                  <textarea
                    value={formData.content}
                    onChange={e => setFormData(p => ({ ...p, content: e.target.value }))}
                    placeholder="Activity details..."
                    className="w-full h-24 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <GlassButton onClick={closeModal} className="flex-1">Cancel</GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!formData.subject.trim() || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Activity'}
                </GlassButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
