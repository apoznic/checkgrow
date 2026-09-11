import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Loader2, Trash2, Save, X, Upload, Image as ImageIcon,
  FileText, BookOpen, Link2, ExternalLink, MessageSquare,
  User, Paperclip, ChevronDown, ChevronUp, Edit3
} from 'lucide-react';
import { MentionInput } from '@/components/crm/MentionInput';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface DocPage {
  id: string;
  title: string;
  content: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  author_id: string;
  profiles?: { full_name: string | null; avatar_url: string | null };
}

interface DocImage {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  sort_order: number;
}

interface DocComment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles?: { full_name: string | null; avatar_url: string | null };
}

interface LinkUrl {
  url: string;
  label?: string;
}

interface ProjectLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  urls: LinkUrl[];
  created_at: string;
  added_by: string;
  profiles?: { full_name: string | null };
}

interface ProjectWikiDocsProps {
  projectId: string;
  profileId: string;
}

export function ProjectWikiDocs({ projectId, profileId }: ProjectWikiDocsProps) {
  const { toast } = useToast();

  // Docs state
  const [pages, setPages] = useState<DocPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Expanded doc state (inline view)
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [docImages, setDocImages] = useState<DocImage[]>([]);
  const [isUploadingToDoc, setIsUploadingToDoc] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Discussion
  const [docComments, setDocComments] = useState<DocComment[]>([]);
  const [showDiscussion, setShowDiscussion] = useState<string | null>(null);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [docMentionMembers, setDocMentionMembers] = useState<{ id: string; full_name: string | null; avatar_url: string | null }[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Links state
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkDescription, setNewLinkDescription] = useState('');
  const [newLinkUrls, setNewLinkUrls] = useState<{ url: string; label: string }[]>([{ url: '', label: '' }]);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLinkUrls, setEditLinkUrls] = useState<{ url: string; label: string }[]>([]);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => { loadPages(); loadLinks(); loadDocMembers(); }, [projectId]);
  useEffect(() => { if (pages.length > 0) loadCommentCounts(); }, [pages]);
  useEffect(() => {
    if (expandedDocId) { loadDocImages(expandedDocId); }
  }, [expandedDocId]);
  useEffect(() => {
    if (showDiscussion) loadDocComments(showDiscussion);
  }, [showDiscussion]);
  useEffect(() => {
    if (docComments.length > 0) commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [docComments]);

  // Realtime subscription for doc images
  useEffect(() => {
    if (!expandedDocId) return;
    const channelName = `doc-images-${expandedDocId}-${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_doc_images',
          filter: `doc_id=eq.${expandedDocId}`,
        },
        () => {
          loadDocImages(expandedDocId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [expandedDocId]);

  // ---- Data loading ----
  const loadPages = async () => {
    setIsLoading(true);
    const { data } = await (supabase as any)
      .from('project_docs')
      .select('*, profiles:author_id(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });
    setPages((data as DocPage[]) || []);
    setIsLoading(false);
  };

  const loadCommentCounts = async () => {
    const counts: Record<string, number> = {};
    for (const page of pages) {
      const { count } = await (supabase as any)
        .from('project_doc_comments')
        .select('id', { count: 'exact', head: true })
        .eq('doc_id', page.id);
      counts[page.id] = count || 0;
    }
    setCommentCounts(counts);
  };

  const loadDocImages = async (docId: string) => {
    const { data } = await (supabase as any)
      .from('project_doc_images')
      .select('*')
      .eq('doc_id', docId)
      .order('sort_order', { ascending: true });
    setDocImages((data as DocImage[]) || []);
  };

  const loadLinks = async () => {
    const { data } = await (supabase as any)
      .from('project_links')
      .select('*, profiles:added_by(full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setLinks(((data || []) as any[]).map(l => ({
      ...l,
      urls: Array.isArray(l.urls) && l.urls.length > 0 ? l.urls : [{ url: l.url, label: '' }],
    })));
  };

  const loadDocComments = async (docId: string) => {
    const { data } = await (supabase as any)
      .from('project_doc_comments')
      .select('id, content, created_at, author_id, profiles:author_id(full_name, avatar_url)')
      .eq('doc_id', docId)
      .order('created_at', { ascending: true });
    setDocComments((data as DocComment[]) || []);
  };

  const loadDocMembers = async () => {
    const [teamRes, ownerRes] = await Promise.all([
      supabase.from('project_teams').select('profiles:profile_id(id, full_name, avatar_url)').eq('project_id', projectId).eq('status', 'accepted'),
      supabase.from('projects').select('profiles:owner_id(id, full_name, avatar_url)').eq('id', projectId).single(),
    ]);
    const members: { id: string; full_name: string | null; avatar_url: string | null }[] = [];
    const seen = new Set<string>();
    if (ownerRes.data?.profiles) {
      const o = ownerRes.data.profiles as any;
      if (o.id) { members.push(o); seen.add(o.id); }
    }
    if (teamRes.data) {
      teamRes.data.forEach((t: any) => {
        const p = t.profiles;
        if (p?.id && !seen.has(p.id)) { members.push(p); seen.add(p.id); }
      });
    }
    setDocMentionMembers(members);
  };

  // ---- Helpers ----
  const sanitizeStorageFileName = (fileName: string) => {
    const normalized = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const dotIndex = normalized.lastIndexOf('.');
    const rawName = dotIndex > 0 ? normalized.slice(0, dotIndex) : normalized;
    const rawExt = dotIndex > 0 ? normalized.slice(dotIndex + 1) : '';

    const safeName = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'file';

    const safeExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '');
    return safeExt ? `${safeName}.${safeExt}` : safeName;
  };

  const buildStoragePath = (docId: string, fileName: string) =>
    `${projectId}/docs/${docId}/${Date.now()}_${sanitizeStorageFileName(fileName)}`;

  // ---- Doc CRUD ----
  const handleCreateDoc = async () => {
    if (!newDocTitle.trim()) return;
    setIsCreatingDoc(true);
    const { data, error } = await (supabase as any).from('project_docs').insert({
      project_id: projectId, author_id: profileId,
      title: newDocTitle.trim(),
      content: newDocDescription.trim() || null,
      sort_order: pages.length,
    }).select('id').single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setIsCreatingDoc(false);
      return;
    }

    // Upload pending files
    if (data && pendingFiles.length > 0) {
      let uploadSuccess = 0;
      let uploadFail = 0;
      let lastErr = '';
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const filePath = buildStoragePath(data.id, file.name);
        console.log('Create-upload:', file.name, '->', filePath);
        const { error: uploadError } = await supabase.storage.from('task-attachments').upload(filePath, file);
        if (uploadError) {
          console.error('Create-upload storage error:', JSON.stringify(uploadError));
          lastErr = uploadError.message;
          uploadFail++;
          continue;
        }
        const { data: urlData } = supabase.storage.from('task-attachments').getPublicUrl(filePath);
        const { error: insertError } = await (supabase as any).from('project_doc_images').insert({
          doc_id: data.id, file_name: file.name, file_url: urlData.publicUrl, file_size: file.size, sort_order: i,
        });
        if (insertError) {
          console.error('Create-upload DB error:', JSON.stringify(insertError));
          lastErr = insertError.message;
          uploadFail++;
        } else {
          uploadSuccess++;
        }
      }
      if (uploadFail > 0) {
        toast({ title: `${uploadFail} file(s) failed`, description: lastErr, variant: 'destructive' });
      }
    }

    setNewDocTitle(''); setNewDocDescription(''); setPendingFiles([]);
    setShowCreateDoc(false);
    toast({ title: 'Document added ✓' });
    loadPages();
    setIsCreatingDoc(false);
  };

  const handleDeleteDoc = async (id: string) => {
    setDeletingId(id);
    await (supabase as any).from('project_doc_comments').delete().eq('doc_id', id);
    await (supabase as any).from('project_doc_images').delete().eq('doc_id', id);
    await (supabase as any).from('project_docs').delete().eq('id', id);
    if (expandedDocId === id) setExpandedDocId(null);
    loadPages();
    toast({ title: 'Document deleted' });
    setDeletingId(null);
  };

  const handleSaveDocEdit = async () => {
    if (!editingDocId || !editTitle.trim()) return;
    setIsSavingEdit(true);
    await (supabase as any).from('project_docs')
      .update({ title: editTitle.trim(), content: editContent.trim() || null })
      .eq('id', editingDocId);
    setEditingDocId(null);
    toast({ title: 'Saved ✓' });
    loadPages();
    setIsSavingEdit(false);
  };

  const handleUploadToDoc = async (e: React.ChangeEvent<HTMLInputElement>, docId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingToDoc(true);
    let successCount = 0;
    let failCount = 0;
    const fileArray = Array.from(files);
    let lastError = '';
    
    for (const file of fileArray) {
      try {
        const filePath = buildStoragePath(docId, file.name);
        console.log('Uploading file:', file.name, 'size:', file.size, 'path:', filePath);
        
        const { error: uploadError } = await supabase.storage.from('task-attachments').upload(filePath, file);
        if (uploadError) {
          console.error('Storage upload error:', JSON.stringify(uploadError));
          lastError = uploadError.message || 'Storage upload failed';
          failCount++;
          continue;
        }
        
        const { data: urlData } = supabase.storage.from('task-attachments').getPublicUrl(filePath);
        console.log('File uploaded, inserting record with URL:', urlData.publicUrl);
        
        const { error: insertError } = await (supabase as any).from('project_doc_images').insert({
          doc_id: docId, file_name: file.name, file_url: urlData.publicUrl, file_size: file.size, sort_order: docImages.length + successCount,
        });
        if (insertError) {
          console.error('DB insert error:', JSON.stringify(insertError));
          lastError = insertError.message || 'Database insert failed';
          failCount++;
        } else {
          successCount++;
        }
      } catch (err: any) {
        console.error('Unexpected upload error:', err);
        lastError = err?.message || 'Unexpected error';
        failCount++;
      }
    }
    
    if (failCount > 0) {
      toast({ title: `${failCount} file(s) failed`, description: lastError, variant: 'destructive' });
    }
    if (successCount > 0) {
      toast({ title: `${successCount} file(s) uploaded ✓` });
    }
    
    loadDocImages(docId);
    setIsUploadingToDoc(false);
    if (e.target) e.target.value = '';
  };

  const handleDeleteAttachment = async (imageId: string) => {
    await (supabase as any).from('project_doc_images').delete().eq('id', imageId);
    if (expandedDocId) loadDocImages(expandedDocId);
  };

  // ---- Links CRUD ----
  const handleAddLink = async () => {
    if (!newLinkTitle.trim() || newLinkUrls.every(u => !u.url.trim())) return;
    setIsAddingLink(true);
    const cleanUrls = newLinkUrls.filter(u => u.url.trim()).map(u => ({
      url: u.url.trim().startsWith('http') ? u.url.trim() : `https://${u.url.trim()}`,
      label: u.label.trim() || undefined,
    }));
    const primaryUrl = cleanUrls[0]?.url || '';

    const { error } = await (supabase as any).from('project_links').insert({
      project_id: projectId, added_by: profileId,
      title: newLinkTitle.trim(),
      url: primaryUrl,
      description: newLinkDescription.trim() || null,
      urls: cleanUrls,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewLinkTitle(''); setNewLinkDescription('');
      setNewLinkUrls([{ url: '', label: '' }]);
      setShowAddLink(false);
      loadLinks();
      toast({ title: 'Link added ✓' });
    }
    setIsAddingLink(false);
  };

  const handleDeleteLink = async (id: string) => {
    await (supabase as any).from('project_links').delete().eq('id', id);
    loadLinks();
  };

  const handleAddUrlToLink = async (linkId: string) => {
    const link = links.find(l => l.id === linkId);
    if (!link) return;
    const cleanUrls = editLinkUrls.filter(u => u.url.trim()).map(u => ({
      url: u.url.trim().startsWith('http') ? u.url.trim() : `https://${u.url.trim()}`,
      label: u.label.trim() || undefined,
    }));
    const allUrls = [...link.urls, ...cleanUrls];
    await (supabase as any).from('project_links')
      .update({ urls: allUrls })
      .eq('id', linkId);
    setEditingLinkId(null);
    setEditLinkUrls([]);
    loadLinks();
  };

  const handleRemoveUrlFromLink = async (linkId: string, urlIndex: number) => {
    const link = links.find(l => l.id === linkId);
    if (!link || link.urls.length <= 1) return;
    const newUrls = link.urls.filter((_, i) => i !== urlIndex);
    await (supabase as any).from('project_links')
      .update({ urls: newUrls, url: newUrls[0]?.url || '' })
      .eq('id', linkId);
    loadLinks();
  };

  // ---- Comments ----
  const handleAddComment = async (text: string) => {
    if (!text.trim() || !showDiscussion) return;
    setIsSendingComment(true);
    await (supabase as any).from('project_doc_comments').insert({
      doc_id: showDiscussion, author_id: profileId, content: text.trim(),
    });
    loadDocComments(showDiscussion);
    loadCommentCounts();
    setIsSendingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await (supabase as any).from('project_doc_comments').delete().eq('id', commentId);
    if (showDiscussion) { loadDocComments(showDiscussion); loadCommentCounts(); }
  };

  // ---- Helpers ----
  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name);
  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@\w[\w\s]*?)(?=\s@|\s|$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-primary font-medium bg-primary/10 px-0.5 rounded">{part}</span>;
      }
      return part;
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* ===== DOCUMENTS SECTION ===== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Documents
          </h3>
          {!showCreateDoc && (
            <button
              onClick={() => setShowCreateDoc(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Doc
            </button>
          )}
        </div>

        {/* Create Doc Form */}
        <AnimatePresence>
          {showCreateDoc && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-card rounded-xl border border-border p-4 space-y-3">
              <input value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} placeholder="Document title..."
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" autoFocus />
              <textarea value={newDocDescription} onChange={e => setNewDocDescription(e.target.value)} placeholder="Short description (optional)..."
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px] resize-y" />

              {/* Pending file uploads */}
              {pendingFiles.length > 0 && (
                <div className="space-y-1">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1 bg-secondary/30 rounded">
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate flex-1">{f.name}</span>
                      <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="text-destructive hover:text-destructive/80">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Attach files
                  <input type="file" multiple className="hidden" onChange={e => {
                    if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    e.target.value = '';
                  }} />
                </label>
                <div className="flex gap-2">
                  <button onClick={() => { setShowCreateDoc(false); setNewDocTitle(''); setNewDocDescription(''); setPendingFiles([]); }}
                    className="px-3 py-1.5 text-sm rounded-lg hover:bg-secondary text-muted-foreground">Cancel</button>
                  <button onClick={handleCreateDoc} disabled={!newDocTitle.trim() || isCreatingDoc}
                    className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {isCreatingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Doc List */}
        {pages.length === 0 && !showCreateDoc ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground mb-1">No documents yet</p>
            <p className="text-xs text-muted-foreground/60">Add documents with descriptions and file attachments</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map(page => {
              const isExpanded = expandedDocId === page.id;
              const isEditingThis = editingDocId === page.id;
              const imageFiles = isExpanded ? docImages.filter(f => isImage(f.file_name)) : [];
              const otherFiles = isExpanded ? docImages.filter(f => !isImage(f.file_name)) : [];

              return (
                <div key={page.id} className="bg-card rounded-xl border border-border overflow-hidden transition-colors hover:border-border/80">
                  {/* Header row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedDocId(isExpanded ? null : page.id)}
                  >
                    <FileText className="w-4 h-4 text-primary/60 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{page.title}</span>
                        {(commentCounts[page.id] || 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                            <MessageSquare className="w-2.5 h-2.5" /> {commentCounts[page.id]}
                          </span>
                        )}
                      </div>
                      {page.content && !isExpanded && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{page.content}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {page.profiles?.full_name || 'Unknown'} · {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); setShowDiscussion(showDiscussion === page.id ? null : page.id); }}
                        className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDeleteDoc(page.id); }} disabled={deletingId === page.id}
                        className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                        {deletingId === page.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border">
                        <div className="p-4 space-y-3">
                          {/* Description */}
                          {isEditingThis ? (
                            <div className="space-y-2">
                              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                                className="w-full px-3 py-2 text-sm font-medium bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                              <textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Description..."
                                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px] resize-y" />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditingDocId(null)} className="px-3 py-1.5 text-xs rounded-lg hover:bg-secondary text-muted-foreground">Cancel</button>
                                <button onClick={handleSaveDocEdit} disabled={isSavingEdit || !editTitle.trim()}
                                  className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                                  {isSavingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 inline mr-1" />}Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed flex-1">
                                {page.content || <span className="text-muted-foreground italic text-xs">No description</span>}
                              </p>
                              <button onClick={() => { setEditingDocId(page.id); setEditTitle(page.title); setEditContent(page.content || ''); }}
                                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0 ml-2">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Images */}
                          {imageFiles.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {imageFiles.map(img => (
                                <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary/20 cursor-pointer"
                                  onClick={() => setLightboxUrl(img.file_url)}>
                                  <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover" />
                                  <button onClick={e => { e.stopPropagation(); handleDeleteAttachment(img.id); }}
                                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Other files */}
                          {otherFiles.length > 0 && (
                            <div className="space-y-1">
                              {otherFiles.map(f => (
                                <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/30 group text-xs">
                                  <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate hover:text-primary transition-colors">{f.file_name}</a>
                                  {f.file_size && <span className="text-[10px] text-muted-foreground/60">{formatSize(f.file_size)}</span>}
                                  <button onClick={() => handleDeleteAttachment(f.id)}
                                    className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Upload more */}
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors cursor-pointer">
                            {isUploadingToDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            Add files
                            <input type="file" multiple className="hidden" onChange={e => handleUploadToDoc(e, page.id)} disabled={isUploadingToDoc} />
                          </label>
                        </div>

                        {/* Inline Discussion */}
                        <AnimatePresence>
                          {showDiscussion === page.id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="border-t border-border">
                              <div className="p-3 space-y-2 max-h-[250px] overflow-y-auto">
                                {docComments.length === 0 ? (
                                  <p className="text-xs text-muted-foreground/50 text-center py-3">No comments yet</p>
                                ) : docComments.map(c => (
                                  <div key={c.id} className="flex items-start gap-2 group">
                                    {c.profiles?.avatar_url ? (
                                      <img src={c.profiles.avatar_url} className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <User className="w-3 h-3 text-primary" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-[11px] font-semibold">{c.profiles?.full_name || 'User'}</span>
                                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                                      </div>
                                      <p className="text-xs text-foreground/80 mt-0.5 break-words">{renderCommentContent(c.content)}</p>
                                    </div>
                                    {c.author_id === profileId && (
                                      <button onClick={() => handleDeleteComment(c.id)} className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <div ref={commentsEndRef} />
                              </div>
                              <div className="border-t border-border p-3">
                                <div className="px-2 py-1.5 bg-input border border-border rounded-lg focus-within:ring-1 focus-within:ring-ring">
                                  <MentionInput
                                    orgMembers={docMentionMembers}
                                    onSubmit={handleAddComment}
                                    isSubmitting={isSendingComment}
                                    placeholder="Comment... use @ to mention"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Links section moved to dedicated Links panel */}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
            <button className="absolute top-4 right-4 p-2 text-white hover:text-white/80" onClick={() => setLightboxUrl(null)}>
              <X className="w-6 h-6" />
            </button>
            <img src={lightboxUrl} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
