import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, User, Building, Mail, Phone, 
  Loader2, X, TrendingUp, CheckSquare, Trash, UserCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassInput } from '@/components/GlassCard';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { GlassSelect } from '@/components/ui/glass-select';
import { CRMContact, ContactType } from './types';
import { ContactDetail } from './ContactDetail';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CRMContactsBookProps {
  clusterId: string;
  profileId: string;
  canManage: boolean;
  userRole?: string;
}

const contactTypes: { value: ContactType; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: 'bg-primary/20 text-primary' },
  { value: 'prospect', label: 'Prospect', color: 'bg-accent/20 text-accent' },
  { value: 'client', label: 'Client', color: 'bg-green-500/20 text-green-400' },
  { value: 'partner', label: 'Partner', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'vendor', label: 'Vendor', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'other', label: 'Other', color: 'bg-muted text-muted-foreground' },
];

export function CRMContactsBook({ clusterId, profileId, canManage, userRole }: CRMContactsBookProps) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [dealLinkedIds, setDealLinkedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContactType | 'all'>('all');
  const [filterCreator, setFilterCreator] = useState<string>('all');
  const [viewingContact, setViewingContact] = useState<CRMContact | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selection state for mass delete
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    contact_type: 'client' as ContactType,
    notes: '',
  });

  useEffect(() => {
    loadContacts();
    loadDealLinkedContacts();

    const channel = supabase
      .channel('crm_contacts_book_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_contacts', filter: `cluster_id=eq.${clusterId}` }, () => {
        loadContacts();
        loadDealLinkedContacts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clusterId]);

  const loadContacts = async () => {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*, profiles:assigned_to(id, full_name, avatar_url), creator:created_by(id, full_name, avatar_url)')
      .eq('cluster_id', clusterId)
      .order('name', { ascending: true });

    if (!error && data) {
      setContacts(data as unknown as CRMContact[]);
    }
    setIsLoading(false);
  };

  const loadDealLinkedContacts = async () => {
    const { data } = await supabase
      .from('crm_deals')
      .select('contact_id')
      .eq('cluster_id', clusterId)
      .not('contact_id', 'is', null);
    if (data) {
      setDealLinkedIds(new Set(data.map(d => d.contact_id!)));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    setIsSubmitting(true);

    const { error } = await supabase.from('crm_contacts').insert({
      cluster_id: clusterId,
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      company: formData.company.trim() || null,
      position: formData.position.trim() || null,
      contact_type: formData.contact_type,
      notes: formData.notes.trim() || null,
      created_by: profileId,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contact added' });
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', company: '', position: '', contact_type: 'client', notes: '' });
    }
    setIsSubmitting(false);
  };

  const handleMassDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    const idsArray = Array.from(selectedIds);

    const { error } = await supabase
      .from('crm_contacts')
      .delete()
      .in('id', idsArray);

    setIsDeleting(false);
    if (error) {
      toast({ title: 'Error deleting contacts', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `${idsArray.length} contact(s) deleted` });
      setSelectedIds(new Set());
      setSelectionMode(false);
      loadContacts();
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isManagerRole = ['owner', 'admin', 'project_manager'].includes(userRole || '');
  const canDelete = ['owner', 'admin'].includes(userRole || '');

  // Build unique creators list for filter
  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach(c => {
      const creator = (c as any).creator;
      if (creator?.id && creator?.full_name) {
        map.set(creator.id, creator.full_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [contacts]);

  const filteredContacts = contacts.filter(c => {
    if (!isManagerRole && c.created_by !== profileId) return false;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || c.contact_type === filterType;
    const matchesCreator = filterCreator === 'all' || c.created_by === filterCreator;
    return matchesSearch && matchesType && matchesCreator;
  });

  const selectAll = () => setSelectedIds(new Set(filteredContacts.map(c => c.id)));
  const deselectAll = () => setSelectedIds(new Set());

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
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <GlassInput
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="pl-10"
            />
          </div>
          <GlassSelect
            value={filterType}
            onChange={v => setFilterType(v as ContactType | 'all')}
            options={[
              { value: 'all', label: 'All Types' },
              ...contactTypes.map(t => ({ value: t.value, label: t.label }))
            ]}
            className="min-w-[130px]"
          />
          {isManagerRole && creatorOptions.length > 1 && (
            <GlassSelect
              value={filterCreator}
              onChange={v => setFilterCreator(v)}
              options={[
                { value: 'all', label: 'All People' },
                ...creatorOptions,
              ]}
              className="min-w-[150px]"
            />
          )}
        </div>
        <div className="flex gap-2">
          {canDelete && selectionMode ? (
            <>
              <GlassButtonNew variant="ghost" onClick={selectAll} size="sm">Select All</GlassButtonNew>
              <GlassButtonNew variant="ghost" onClick={deselectAll} size="sm">Clear</GlassButtonNew>
              <GlassButtonNew 
                variant="destructive" 
                onClick={handleMassDelete}
                disabled={selectedIds.size === 0 || isDeleting}
                isLoading={isDeleting}
                leftIcon={<Trash className="w-4 h-4" />}
              >
                Delete ({selectedIds.size})
              </GlassButtonNew>
              <GlassButtonNew variant="ghost" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}>
                Cancel
              </GlassButtonNew>
            </>
          ) : (
            <>
              {canDelete && (
                <GlassButtonNew
                  variant="ghost"
                  onClick={() => setSelectionMode(true)}
                  leftIcon={<CheckSquare className="w-4 h-4" />}
                >
                  Select
                </GlassButtonNew>
              )}
              <GlassButtonNew
                variant="primary"
                onClick={() => setShowModal(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Contact
              </GlassButtonNew>
            </>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      {filteredContacts.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No contacts found</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  {selectionMode && <th className="p-3 w-10"></th>}
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Company</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Phone</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Added by</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Linked</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => {
                  const typeInfo = contactTypes.find(t => t.value === contact.contact_type);
                  const isLinked = dealLinkedIds.has(contact.id);
                  const creator = (contact as any).creator;
                  const isSelected = selectedIds.has(contact.id);
                  return (
                    <tr
                      key={contact.id}
                      className={`border-b border-border/10 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-secondary/30'
                      }`}
                      onClick={() => {
                        if (selectionMode) toggleSelection(contact.id);
                        else setViewingContact(contact);
                      }}
                    >
                      {selectionMode && (
                        <td className="p-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                          }`}>
                            {isSelected && <span className="text-primary-foreground text-xs">✓</span>}
                          </div>
                        </td>
                      )}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{contact.name}</p>
                            {contact.position && (
                              <p className="text-xs text-muted-foreground">{contact.position}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        {contact.company && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Building className="w-3 h-3" />
                            <span>{contact.company}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        {contact.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{contact.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={`${typeInfo?.color} border-0 text-xs`}>
                          {typeInfo?.label}
                        </Badge>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        {creator && (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={creator.avatar_url || ''} />
                              <AvatarFallback className="text-[10px] bg-secondary">
                                {(creator.full_name || '?').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                              {creator.full_name || 'Unknown'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {isLinked && (
                          <div className="flex items-center gap-1 text-primary">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-xs">Deal</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel p-6 w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Add Contact</h2>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-secondary/50 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1 block">Name *</label>
                    <GlassInput
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Email</label>
                    <GlassInput
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Phone</label>
                    <GlassInput
                      value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Company</label>
                    <GlassInput
                      value={formData.company}
                      onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Position</label>
                    <GlassInput
                      value={formData.position}
                      onChange={e => setFormData(p => ({ ...p, position: e.target.value }))}
                      placeholder="Job title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Type</label>
                    <GlassSelect
                      value={formData.contact_type}
                      onChange={v => setFormData(p => ({ ...p, contact_type: v as ContactType }))}
                      options={contactTypes.map(t => ({ value: t.value, label: t.label }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    className="w-full h-20 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <GlassButtonNew variant="ghost" onClick={() => setShowModal(false)} className="flex-1">
                  Cancel
                </GlassButtonNew>
                <GlassButtonNew
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!formData.name.trim()}
                  isLoading={isSubmitting}
                  className="flex-1"
                >
                  Add Contact
                </GlassButtonNew>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Detail Modal */}
      <AnimatePresence>
        {viewingContact && (
          <ContactDetail
            contact={viewingContact}
            profileId={profileId}
            canManage={canManage}
            onClose={() => setViewingContact(null)}
            onUpdate={loadContacts}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
