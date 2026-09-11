import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, User, Building, Mail, Phone, 
  MoreVertical, Edit, Trash2, Loader2, X, Linkedin,
  CheckSquare, Trash, TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassInput } from '@/components/GlassCard';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { GlassSelect } from '@/components/ui/glass-select';
import { CRMContact, ContactType } from './types';
import { LinkedInImport } from './LinkedInImport';
import { ContactDetail } from './ContactDetail';
import { InlineTypeBadge, InlineLeadStatus, InlineTags } from './InlineContactLabels';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ContactListProps {
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

export function ContactList({ clusterId, profileId, canManage, userRole }: ContactListProps) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContactType | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showLinkedInImport, setShowLinkedInImport] = useState(false);
  const [editingContact, setEditingContact] = useState<CRMContact | null>(null);
  const [viewingContact, setViewingContact] = useState<CRMContact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Selection state for mass delete
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    contact_type: 'lead' as ContactType,
    tags: '',
    notes: '',
    source: '',
  });

  useEffect(() => {
    loadContacts();

    const channel = supabase
      .channel('crm_contacts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_contacts', filter: `cluster_id=eq.${clusterId}` }, () => {
        loadContacts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clusterId]);

  const loadContacts = async () => {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*, profiles:assigned_to(id, full_name, avatar_url), creator:created_by(id, full_name, avatar_url)')
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setContacts(data as unknown as CRMContact[]);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    setIsSubmitting(true);

    const contactData = {
      cluster_id: clusterId,
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      company: formData.company.trim() || null,
      position: formData.position.trim() || null,
      contact_type: formData.contact_type,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: formData.notes.trim() || null,
      source: formData.source.trim() || null,
      created_by: profileId,
    };

    if (editingContact) {
      const { error } = await supabase
        .from('crm_contacts')
        .update(contactData)
        .eq('id', editingContact.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Contact updated' });
        closeModal();
      }
    } else {
      const { error } = await supabase
        .from('crm_contacts')
        .insert(contactData);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Contact added' });
        closeModal();
      }
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    const { error } = await supabase.from('crm_contacts').delete().eq('id', id);
    setIsDeleting(false);
    
    if (error) {
      toast({ title: 'Error deleting contact', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contact deleted' });
      loadContacts();
    }
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
      toast({ title: `${idsArray.length} contacts deleted` });
      setSelectedIds(new Set());
      setSelectionMode(false);
      loadContacts();
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredContacts.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const openEdit = (contact: CRMContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      position: contact.position || '',
      contact_type: contact.contact_type,
      tags: contact.tags.join(', '),
      notes: contact.notes || '',
      source: contact.source || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingContact(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      contact_type: 'lead',
      tags: '',
      notes: '',
      source: '',
    });
  };

  const isManagerRole = ['owner', 'admin', 'project_manager'].includes(userRole || '');

  const filteredContacts = contacts.filter(c => {
    // Members only see their own leads
    if (!isManagerRole && c.created_by !== profileId) return false;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || c.contact_type === filterType;
    return matchesSearch && matchesType;
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
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
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
        </div>
        <div className="flex gap-2">
          {canManage && selectionMode ? (
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
              {canManage && (
                <GlassButtonNew
                  variant="ghost"
                  onClick={() => setSelectionMode(true)}
                  leftIcon={<CheckSquare className="w-4 h-4" />}
                >
                  Select
                </GlassButtonNew>
              )}
              <GlassButtonNew
                variant="outline"
                onClick={() => setShowLinkedInImport(true)}
                leftIcon={<Linkedin className="w-4 h-4" />}
              >
                Import
              </GlassButtonNew>
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
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Added by</th>
                  {canManage && !selectionMode && <th className="p-3 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => {
                  const typeInfo = contactTypes.find(t => t.value === contact.contact_type);
                  const isSelected = selectedIds.has(contact.id);
                  const creator = (contact as any).creator;

                  return (
                    <tr
                      key={contact.id}
                      className={`border-b border-border/10 cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-secondary/30'
                      }`}
                      onClick={() => {
                        if (selectionMode) {
                          toggleSelection(contact.id);
                        } else {
                          setViewingContact(contact);
                        }
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
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
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
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Building className="w-3 h-3" />
                            <span>{contact.company}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        {contact.email && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{contact.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        {contact.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <InlineTypeBadge
                          contactId={contact.id}
                          currentType={contact.contact_type}
                          canManage={canManage}
                          onUpdate={loadContacts}
                        />
                      </td>
                      <td className="p-3">
                        <InlineLeadStatus
                          contactId={contact.id}
                          currentStatus={contact.lead_status || 'new'}
                          canManage={canManage}
                          onUpdate={loadContacts}
                        />
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
                      {canManage && !selectionMode && (
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <button className="p-1 hover:bg-secondary/50 rounded">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(contact); }}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
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
              className="glass-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">
                  {editingContact ? 'Edit Contact' : 'Add Contact'}
                </h2>
                <button onClick={closeModal} className="p-1 hover:bg-secondary/50 rounded">
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
                  <div>
                    <label className="text-sm font-medium mb-1 block">Source</label>
                    <GlassInput
                      value={formData.source}
                      onChange={e => setFormData(p => ({ ...p, source: e.target.value }))}
                      placeholder="LinkedIn, Referral, etc."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium mb-1 block">Tags</label>
                    <GlassInput
                      value={formData.tags}
                      onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))}
                      placeholder="tag1, tag2, tag3"
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
                <GlassButtonNew variant="ghost" onClick={closeModal} className="flex-1">
                  Cancel
                </GlassButtonNew>
                <GlassButtonNew
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!formData.name.trim()}
                  isLoading={isSubmitting}
                  className="flex-1"
                >
                  {editingContact ? 'Update' : 'Add Contact'}
                </GlassButtonNew>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LinkedIn Import Modal */}
      <AnimatePresence>
        {showLinkedInImport && (
          <LinkedInImport
            clusterId={clusterId}
            profileId={profileId}
            onClose={() => setShowLinkedInImport(false)}
            onSuccess={loadContacts}
          />
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
