import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, Loader2, Database, ClipboardPaste, Pencil, Check, X,
  ChevronDown, Settings2, Download, Search, ZoomIn, ZoomOut, Maximize2, Webhook, Copy, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ColumnType = 'text' | 'number' | 'checkbox' | 'date' | 'select' | 'longtext';

interface Registry {
  id: string;
  cluster_id: string;
  name: string;
  description: string | null;
  position: number;
  webhook_token?: string | null;
  webhook_enabled?: boolean | null;
  webhook_last_received_at?: string | null;
}

interface RegistryColumn {
  id: string;
  registry_id: string;
  key: string;
  name: string;
  type: ColumnType;
  options: { choices?: string[] } | null;
  position: number;
}

interface RegistryRow {
  id: string;
  registry_id: string;
  data: Record<string, any>;
  position: number;
  created_at: string;
}

interface Props {
  clusterId: string;
  canManage: boolean;
}

const COL_TYPES: { value: ColumnType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'longtext', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
];

const slugify = (s: string) => {
  const base = s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return base || `col_${Math.random().toString(36).slice(2, 7)}`;
};

// Detect column type from a sample of values
const inferType = (values: string[]): ColumnType => {
  const clean = values.map(v => (v ?? '').trim()).filter(v => v.length > 0);
  if (clean.length === 0) return 'text';
  const isBool = clean.every(v => /^(true|false|yes|no|y|n|0|1|✓|✗|x)$/i.test(v));
  if (isBool) return 'checkbox';
  const isNum = clean.every(v => /^-?\d+([.,]\d+)?$/.test(v));
  if (isNum) return 'number';
  const isDate = clean.every(v => !isNaN(Date.parse(v)) && /\d/.test(v));
  if (isDate) return 'date';
  const longish = clean.some(v => v.length > 60);
  return longish ? 'longtext' : 'text';
};

const parseBool = (v: any) => /^(true|yes|y|1|✓)$/i.test(String(v ?? '').trim());
const DEFAULT_COL_WIDTH = 180;
const MIN_COL_WIDTH = 56;

export function RegistryPanel({ clusterId, canManage }: Props) {
  const { toast } = useToast();
  const [registries, setRegistries] = useState<Registry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [columns, setColumns] = useState<RegistryColumn[]>([]);
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [showColEditor, setShowColEditor] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [search, setSearch] = useState('');
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [zoom, setZoom] = useState<number>(1);

  // Load persisted zoom when registry changes
  useEffect(() => {
    if (!activeId) return;
    try {
      const saved = localStorage.getItem(`registry_zoom_${activeId}`);
      setZoom(saved ? parseFloat(saved) || 1 : 1);
    } catch { setZoom(1); }
  }, [activeId]);

  const setZoomPersist = (z: number) => {
    const clamped = Math.max(0.4, Math.min(1.5, +z.toFixed(2)));
    setZoom(clamped);
    if (activeId) {
      try { localStorage.setItem(`registry_zoom_${activeId}`, String(clamped)); } catch {}
    }
  };

  const fitToScreen = () => {
    if (!activeId) return;
    const totalWidth = columns.reduce((sum, c) => sum + (colWidths[c.id] ?? DEFAULT_COL_WIDTH), 0) + (canManage ? 40 : 0);
    const container = document.getElementById(`registry-table-wrap-${activeId}`);
    const available = container?.clientWidth ?? window.innerWidth - 100;
    if (totalWidth <= 0) return;
    setZoomPersist(Math.min(1, available / totalWidth));
  };

  // Load persisted widths when registry changes
  useEffect(() => {
    if (!activeId) return;
    try {
      const saved = localStorage.getItem(`registry_widths_${activeId}`);
      setColWidths(saved ? JSON.parse(saved) : {});
    } catch { setColWidths({}); }
  }, [activeId]);

  const persistWidths = (next: Record<string, number>) => {
    setColWidths(next);
    if (activeId) {
      try { localStorage.setItem(`registry_widths_${activeId}`, JSON.stringify(next)); } catch {}
    }
  };

  const [resizingColId, setResizingColId] = useState<string | null>(null);

  const tableWidth = useMemo(
    () => columns.reduce((sum, col) => sum + (colWidths[col.id] ?? DEFAULT_COL_WIDTH), 0) + (canManage ? 40 : 0),
    [columns, colWidths, canManage]
  );

  const startResize = (colId: string, startX: number, startWidth: number) => {
    setResizingColId(colId);
    const onMove = (e: MouseEvent) => {
      const w = Math.max(MIN_COL_WIDTH, startWidth + (e.clientX - startX));
      setColWidths(prev => ({ ...prev, [colId]: w }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setColWidths(prev => { persistWidths(prev); return prev; });
      setResizingColId(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };


  useEffect(() => { loadRegistries(); }, [clusterId]);
  useEffect(() => {
    if (activeId) loadRegistry(activeId);
    else { setColumns([]); setRows([]); }
  }, [activeId]);

  const loadRegistries = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('org_registries')
      .select('*')
      .eq('cluster_id', clusterId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    setRegistries(data || []);
    if (!activeId && data && data.length) setActiveId(data[0].id);
    setLoading(false);
  };

  const loadRegistry = async (id: string) => {
    const [colsRes, rowsRes] = await Promise.all([
      (supabase as any).from('org_registry_columns').select('*').eq('registry_id', id).order('position', { ascending: true }),
      (supabase as any).from('org_registry_rows').select('*').eq('registry_id', id).order('position', { ascending: true }).order('created_at', { ascending: true }),
    ]);
    setColumns(colsRes.data || []);
    setRows(rowsRes.data || []);
  };

  const createRegistry = async () => {
    const name = newName.trim();
    if (!name) return;
    const { data, error } = await (supabase as any).from('org_registries').insert({
      cluster_id: clusterId, name, position: registries.length,
    }).select().single();
    if (error) { toast({ title: 'Could not create', description: error.message, variant: 'destructive' }); return; }
    setNewName(''); setShowNew(false);
    await loadRegistries();
    setActiveId(data.id);
  };

  const deleteRegistry = async (id: string) => {
    if (!confirm('Delete this registry and all its data?')) return;
    await (supabase as any).from('org_registries').delete().eq('id', id);
    setRegistries(prev => prev.filter(r => r.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const renameRegistry = async (id: string, name: string) => {
    setRegistries(prev => prev.map(r => r.id === id ? { ...r, name } : r));
    await (supabase as any).from('org_registries').update({ name }).eq('id', id);
  };

  // ----- Webhook -----
  const webhookUrl = (token?: string | null) =>
    token ? `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/registry-webhook?token=${token}` : '';

  const setWebhookEnabled = async (id: string, enabled: boolean) => {
    setRegistries(prev => prev.map(r => r.id === id ? { ...r, webhook_enabled: enabled } : r));
    await (supabase as any).from('org_registries').update({ webhook_enabled: enabled }).eq('id', id);
  };

  const regenerateToken = async (id: string) => {
    if (!confirm('Generate a new link? The old one will stop working.')) return;
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const { error } = await (supabase as any).from('org_registries').update({ webhook_token: token }).eq('id', id);
    if (error) { toast({ title: 'Could not regenerate', description: error.message, variant: 'destructive' }); return; }
    setRegistries(prev => prev.map(r => r.id === id ? { ...r, webhook_token: token } : r));
    toast({ title: 'New link generated' });
  };

  const copyWebhook = (token?: string | null) => {
    navigator.clipboard.writeText(webhookUrl(token));
    toast({ title: 'Link copied' });
  };

  // ----- Columns -----
  const addColumn = async (name: string, type: ColumnType) => {
    if (!activeId || !name.trim()) return;
    let key = slugify(name);
    const existing = new Set(columns.map(c => c.key));
    let i = 1; while (existing.has(key)) { key = `${slugify(name)}_${i++}`; }
    const { data, error } = await (supabase as any).from('org_registry_columns').insert({
      registry_id: activeId, key, name: name.trim(), type, position: columns.length,
    }).select().single();
    if (error) { toast({ title: 'Could not add column', description: error.message, variant: 'destructive' }); return; }
    setColumns(prev => [...prev, data]);
  };

  const updateColumn = async (id: string, patch: Partial<RegistryColumn>) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    await (supabase as any).from('org_registry_columns').update(patch).eq('id', id);
  };

  const deleteColumn = async (id: string) => {
    if (!confirm('Delete this column? Existing data in this column will be removed.')) return;
    setColumns(prev => prev.filter(c => c.id !== id));
    await (supabase as any).from('org_registry_columns').delete().eq('id', id);
  };

  const reorderColumns = async (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIdx = columns.findIndex(c => c.id === fromId);
    const toIdx = columns.findIndex(c => c.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...columns];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const repositioned = next.map((c, i) => ({ ...c, position: i }));
    setColumns(repositioned);
    await Promise.all(
      repositioned.map(c =>
        (supabase as any).from('org_registry_columns').update({ position: c.position }).eq('id', c.id)
      )
    );
  };

  const [dragColId, setDragColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // ----- Rows -----
  const addRow = async () => {
    if (!activeId) return;
    const { data, error } = await (supabase as any).from('org_registry_rows').insert({
      registry_id: activeId, data: {}, position: rows.length,
    }).select().single();
    if (error) { toast({ title: 'Could not add row', description: error.message, variant: 'destructive' }); return; }
    setRows(prev => [...prev, data]);
  };

  const updateRowCell = async (rowId: string, key: string, value: any) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const newData = { ...row.data, [key]: value };
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, data: newData } : r));
    await (supabase as any).from('org_registry_rows').update({ data: newData }).eq('id', rowId);
  };

  const deleteRow = async (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    await (supabase as any).from('org_registry_rows').delete().eq('id', id);
  };

  // ----- Excel paste -----
  const parseClipboard = (text: string): string[][] => {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
      .filter(line => line.length > 0)
      .map(line => line.split('\t'));
  };

  const importGrid = async (grid: string[][]) => {
    if (!activeId) return;
    if (grid.length === 0) { toast({ title: 'Nothing to paste', variant: 'destructive' }); return; }

    // Detect if first row looks like a header: when columns exist, header if any cell matches a column name
    // When no columns exist, always treat first row as header.
    let header: string[];
    let dataRows: string[][];
    if (columns.length === 0) {
      if (grid.length === 1) {
        // Single row + no columns: generate generic headers and treat row as data
        header = grid[0].map((_, i) => `Column ${i + 1}`);
        dataRows = grid;
      } else {
        header = grid[0];
        dataRows = grid.slice(1);
      }
    } else {
      const firstRow = grid[0];
      const colNames = new Set(columns.map(c => c.name.trim().toLowerCase()));
      const looksLikeHeader = grid.length > 1 && firstRow.some(v => colNames.has((v ?? '').trim().toLowerCase()));
      if (looksLikeHeader) { header = firstRow; dataRows = grid.slice(1); }
      else { header = columns.map(c => c.name); dataRows = grid; }
    }


    const inferredTypes: ColumnType[] = header.map((_, idx) =>
      inferType(dataRows.map(r => r[idx] ?? ''))
    );

    // Build/extend column set: create columns for any header not matching an existing one
    let workingCols = [...columns];
    for (let i = 0; i < header.length; i++) {
      const rawName = (header[i] ?? '').trim() || `Column ${workingCols.length + 1}`;
      const matches = workingCols.find(c => c.name.trim().toLowerCase() === rawName.toLowerCase());
      if (matches) continue;
      let key = slugify(rawName);
      const existing = new Set(workingCols.map(c => c.key));
      let n = 1; while (existing.has(key)) { key = `${slugify(rawName)}_${n++}`; }
      const { data, error } = await (supabase as any).from('org_registry_columns').insert({
        registry_id: activeId, key, name: rawName, type: inferredTypes[i], position: workingCols.length,
      }).select().single();
      if (error) { toast({ title: 'Could not create columns', description: error.message, variant: 'destructive' }); return; }
      workingCols.push(data);
    }
    setColumns(workingCols);

    // Map header positions → column
    const colByIdx: (RegistryColumn | null)[] = header.map((h, idx) => {
      const norm = (h ?? '').trim().toLowerCase();
      return workingCols.find(c => c.name.trim().toLowerCase() === norm)
        || workingCols[idx]
        || null;
    });

    const newRows = dataRows.map((rowVals, rIdx) => {
      const dataObj: Record<string, any> = {};
      rowVals.forEach((val, idx) => {
        const col = colByIdx[idx];
        if (!col) return;
        const v = (val ?? '').trim();
        if (col.type === 'checkbox') dataObj[col.key] = parseBool(v);
        else if (col.type === 'number') dataObj[col.key] = v === '' ? null : Number(v.replace(',', '.'));
        else dataObj[col.key] = v;
      });
      return { registry_id: activeId, data: dataObj, position: rows.length + rIdx };
    });

    if (newRows.length === 0) { toast({ title: 'No rows to import', variant: 'destructive' }); return; }

    const { data, error } = await (supabase as any).from('org_registry_rows').insert(newRows).select();
    if (error) { toast({ title: 'Import failed', description: error.message, variant: 'destructive' }); return; }
    setRows(prev => [...prev, ...(data || [])]);
    toast({ title: `Imported ${newRows.length} row${newRows.length === 1 ? '' : 's'}` });
  };

  const handlePasteImport = async () => {
    await importGrid(parseClipboard(pasteText));
    setPasteText(''); setShowPaste(false);
  };

  const handleTablePaste = async (e: React.ClipboardEvent) => {
    if (!canManage || !activeId) return;
    const target = e.target as HTMLElement;
    // Don't hijack pastes into editable cells unless content is clearly multi-cell
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const isMulti = text.includes('\t') || /\r?\n/.test(text.trim());
    const inEditable = target.closest('input, textarea, select, [contenteditable="true"]');
    if (inEditable && !isMulti) return;
    e.preventDefault();
    await importGrid(parseClipboard(text));
  };


  const exportCSV = () => {
    const headers = columns.map(c => c.name);
    const lines = [headers.join(',')];
    for (const row of rows) {
      const vals = columns.map(c => {
        const v = row.data[c.key];
        if (v === undefined || v === null) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      });
      lines.push(vals.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const r = registries.find(x => x.id === activeId);
    a.href = url; a.download = `${slugify(r?.name || 'registry')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      Object.values(r.data || {}).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }, [rows, search]);

  const active = registries.find(r => r.id === activeId);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header / registry switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Registry</h2>
            <p className="text-xs text-muted-foreground">Spreadsheet-style lists with custom columns. Paste from Excel.</p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNew(s => !s)} className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
              <Plus className="w-4 h-4" /> New registry
            </button>
          </div>
        )}
      </div>

      {showNew && canManage && (
        <div className="flex gap-2 rounded-xl border border-border/40 bg-card p-3">
          <input
            autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createRegistry(); if (e.key === 'Escape') { setShowNew(false); setNewName(''); } }}
            placeholder="Registry name (e.g. Suppliers, Volunteers, Equipment)"
            className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg"
          />
          <button onClick={createRegistry} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">Create</button>
          <button onClick={() => { setShowNew(false); setNewName(''); }} className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-secondary">Cancel</button>
        </div>
      )}

      {registries.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border/40 p-12 text-center">
          <Database className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No registries yet</p>
          {canManage && <p className="text-xs text-muted-foreground/60 mt-1">Click "New registry" above to create your first one.</p>}
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border/40 overflow-x-auto">
            {registries.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition ${
                  activeId === r.id ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>

          {active && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search rows…"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-input border border-border rounded-lg"
                  />
                </div>
                <span className="text-xs text-muted-foreground">{filteredRows.length} of {rows.length} rows</span>
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
                    <button onClick={() => setZoomPersist(zoom - 0.1)} className="p-1 rounded hover:bg-secondary" title="Zoom out">
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-medium tabular-nums w-9 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoomPersist(zoom + 0.1)} className="p-1 rounded hover:bg-secondary" title="Zoom in">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={fitToScreen} className="p-1 rounded hover:bg-secondary" title="Fit all columns">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={exportCSV} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                  {canManage && (
                    <>
                      <button onClick={() => setShowPaste(s => !s)} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary flex items-center gap-1">
                        <ClipboardPaste className="w-3.5 h-3.5" /> Paste from Excel
                      </button>
                      <button onClick={() => setShowWebhook(s => !s)} className={`px-3 py-1.5 text-xs rounded-lg border flex items-center gap-1 ${active.webhook_enabled ? 'border-primary/50 text-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}>
                        <Webhook className="w-3.5 h-3.5" /> Webhook
                      </button>
                      <button onClick={() => setShowColEditor(s => !s)} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary flex items-center gap-1">
                        <Settings2 className="w-3.5 h-3.5" /> Columns
                      </button>
                      <button onClick={addRow} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Row
                      </button>
                      <RegistryNameMenu registry={active} onRename={(n) => renameRegistry(active.id, n)} onDelete={() => deleteRegistry(active.id)} />
                    </>
                  )}
                </div>
              </div>

              {showWebhook && canManage && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2"><Webhook className="w-4 h-4 text-primary" /> Send form entries into this registry</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Point any form tool (Framer, Tally, Typeform, Zapier, n8n…) at this address. Each submission becomes a new row, and unknown fields create new columns automatically.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={!!active.webhook_enabled}
                        onChange={e => setWebhookEnabled(active.id, e.target.checked)}
                        className="w-4 h-4 accent-current"
                      />
                      {active.webhook_enabled ? 'Active' : 'Off'}
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={webhookUrl(active.webhook_token)}
                      onFocus={e => e.currentTarget.select()}
                      className="flex-1 px-3 py-2 text-xs font-mono bg-input border border-border rounded-lg"
                    />
                    <button onClick={() => copyWebhook(active.webhook_token)} className="px-3 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    <button onClick={() => regenerateToken(active.id)} className="px-3 py-2 text-xs rounded-lg border border-border hover:bg-secondary flex items-center gap-1" title="Generate a new link">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Method: POST · Body: JSON or form fields. {active.webhook_last_received_at
                      ? `Last entry received ${new Date(active.webhook_last_received_at).toLocaleString()}.`
                      : 'No entries received yet.'}
                    {!active.webhook_enabled && ' Turn it on above before testing.'}
                  </p>
                </div>
              )}

              {showPaste && canManage && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Copy a range from Excel/Sheets (including header row) and paste below. Column names and types will be detected automatically.
                  </p>
                  <textarea
                    value={pasteText} onChange={e => setPasteText(e.target.value)}
                    placeholder="Paste tab-separated rows here…"
                    rows={6}
                    className="w-full px-3 py-2 text-xs font-mono bg-input border border-border rounded-lg resize-y"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setPasteText(''); setShowPaste(false); }} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary">Cancel</button>
                    <button onClick={handlePasteImport} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Import</button>
                  </div>
                </div>
              )}

              {showColEditor && canManage && (
                <ColumnEditor
                  columns={columns}
                  onAdd={addColumn}
                  onUpdate={updateColumn}
                  onDelete={deleteColumn}
                  onClose={() => setShowColEditor(false)}
                />
              )}

              {/* Table */}
              {columns.length === 0 ? (
                <div onPaste={handleTablePaste} tabIndex={0} className="rounded-xl border-2 border-dashed border-border/40 p-12 text-center focus:outline-none focus:border-primary/50">
                  <p className="text-sm text-muted-foreground">No columns yet.</p>
                  {canManage && <p className="text-xs text-muted-foreground/60 mt-1">Click here and paste from Excel (Ctrl/Cmd+V) to create columns and rows instantly.</p>}
                </div>

              ) : (
                <div id={`registry-table-wrap-${activeId}`} onPaste={handleTablePaste} tabIndex={0} className="rounded-xl border border-border/40 bg-card overflow-x-auto focus:outline-none w-fit max-w-full">
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%` }}>
                    <table className="text-sm" style={{ tableLayout: 'fixed', width: `${tableWidth}px` }}>
                    <colgroup>
                      {columns.map(col => (
                        <col key={col.id} style={{ width: (colWidths[col.id] ?? DEFAULT_COL_WIDTH) + 'px' }} />
                      ))}
                      {canManage && <col style={{ width: '40px' }} />}
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border/40 bg-secondary/30">
                        {columns.map(col => (
                          <th
                            key={col.id}
                            draggable={canManage && resizingColId !== col.id}
                            onDragStart={(e) => {
                              if (!canManage || resizingColId) { e.preventDefault(); return; }
                              // Block drag if mousedown originated inside an input, button, or the resize handle
                              const target = e.target as HTMLElement;
                              if (target.closest('input, textarea, button, [data-resize-handle]')) { e.preventDefault(); return; }
                              setDragColId(col.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => { if (!canManage || !dragColId) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverColId !== col.id) setDragOverColId(col.id); }}
                            onDragLeave={() => { if (dragOverColId === col.id) setDragOverColId(null); }}
                            onDrop={(e) => { if (!canManage || !dragColId) return; e.preventDefault(); reorderColumns(dragColId, col.id); setDragColId(null); setDragOverColId(null); }}
                            onDragEnd={() => { setDragColId(null); setDragOverColId(null); }}
                            className={`group/th relative text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap overflow-hidden ${canManage ? 'cursor-grab active:cursor-grabbing' : ''} ${dragOverColId === col.id && dragColId && dragColId !== col.id ? 'bg-primary/10' : ''} ${dragColId === col.id ? 'opacity-50' : ''}`}
                            title={canManage ? 'Drag to reorder' : undefined}
                          >

                            {canManage ? (
                              <input
                                defaultValue={col.name}
                                onMouseDown={(e) => e.stopPropagation()}
                                onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                draggable={false}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v && v !== col.name) updateColumn(col.id, { name: v });
                                  else e.target.value = col.name;
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                  if (e.key === 'Escape') { (e.target as HTMLInputElement).value = col.name; (e.target as HTMLInputElement).blur(); }
                                }}
                                className="inline-block max-w-[calc(100%-3.5rem)] align-middle bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-1 py-0.5 text-xs font-semibold text-foreground outline-none cursor-text"
                                title="Click to rename"
                              />
                            ) : (
                              <span className="truncate inline-block max-w-full align-middle">{col.name}</span>
                            )}
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground/60">({col.type})</span>

                            {canManage && (
                              <button
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()}
                                onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                draggable={false}
                                onClick={(e) => { e.stopPropagation(); deleteColumn(col.id); }}
                                className="absolute top-1/2 -translate-y-1/2 right-4 opacity-0 group-hover/th:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition z-10"
                                title="Delete column"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}

                            <span
                              data-resize-handle="true"
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startResize(col.id, e.clientX, colWidths[col.id] ?? DEFAULT_COL_WIDTH); }}
                              onClick={(e) => e.stopPropagation()}
                              onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              draggable={false}
                              className="absolute top-0 right-0 h-full w-2.5 cursor-col-resize bg-border/40 hover:bg-primary/60 transition-colors z-20"

                              title="Drag to resize column"
                            />


                          </th>
                        ))}
                        {canManage && <th />}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map(row => (
                        <tr key={row.id} className="border-b border-border/20 hover:bg-secondary/20 group">
                          {columns.map(col => (
                            <td key={col.id} className="px-2 py-1 align-top overflow-hidden">
                              <CellEditor col={col} value={row.data?.[col.key]} onChange={v => updateRowCell(row.id, col.key, v)} disabled={!canManage} />
                            </td>
                          ))}
                          {canManage && (
                            <td className="px-2 py-1 align-top">
                              <button onClick={() => deleteRow(row.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1" title="Delete row">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={columns.length + (canManage ? 1 : 0)} className="px-3 py-8 text-center text-xs text-muted-foreground">
                            No rows{search ? ' match your search' : ''}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ----- Helpers -----

function CellEditor({ col, value, onChange, disabled }: { col: RegistryColumn; value: any; onChange: (v: any) => void; disabled?: boolean }) {
  if (col.type === 'checkbox') {
    return (
      <input type="checkbox" checked={!!value} disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 cursor-pointer" />
    );
  }
  if (col.type === 'number') {
    return (
      <input type="number" defaultValue={value ?? ''} disabled={disabled}
        onBlur={e => { const v = e.target.value; onChange(v === '' ? null : Number(v)); }}
        className="w-full px-2 py-1 text-sm bg-transparent border border-transparent hover:border-border focus:border-primary rounded outline-none" />
    );
  }
  if (col.type === 'date') {
    return (
      <input type="date" defaultValue={value ?? ''} disabled={disabled}
        onBlur={e => onChange(e.target.value || null)}
        className="w-full px-2 py-1 text-sm bg-transparent border border-transparent hover:border-border focus:border-primary rounded outline-none" />
    );
  }
  if (col.type === 'select') {
    const choices = col.options?.choices || [];
    return (
      <select defaultValue={value ?? ''} disabled={disabled}
        onChange={e => onChange(e.target.value || null)}
        className="w-full px-2 py-1 text-sm bg-transparent border border-transparent hover:border-border focus:border-primary rounded outline-none">
        <option value="">—</option>
        {choices.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    );
  }
  if (col.type === 'longtext') {
    return (
      <textarea defaultValue={value ?? ''} disabled={disabled} rows={2}
        onBlur={e => onChange(e.target.value)}
        className="w-full px-2 py-1 text-sm bg-transparent border border-transparent hover:border-border focus:border-primary rounded outline-none resize-y min-h-[28px]" />
    );
  }
  return (
    <input type="text" defaultValue={value ?? ''} disabled={disabled}
      onBlur={e => onChange(e.target.value)}
      className="w-full px-2 py-1 text-sm bg-transparent border border-transparent hover:border-border focus:border-primary rounded outline-none" />
  );
}

function ColumnEditor({ columns, onAdd, onUpdate, onDelete, onClose }: {
  columns: RegistryColumn[];
  onAdd: (name: string, type: ColumnType) => void;
  onUpdate: (id: string, patch: Partial<RegistryColumn>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ColumnType>('text');
  return (
    <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Manage columns</h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <div className="space-y-2">
        {columns.map(col => (
          <div key={col.id} className="flex items-center gap-2 bg-card border border-border/40 rounded-lg p-2">
            <input
              defaultValue={col.name}
              onBlur={e => { if (e.target.value.trim() && e.target.value.trim() !== col.name) onUpdate(col.id, { name: e.target.value.trim() }); }}
              className="flex-1 px-2 py-1 text-sm bg-input border border-border rounded"
            />
            <select
              value={col.type}
              onChange={e => onUpdate(col.id, { type: e.target.value as ColumnType })}
              className="px-2 py-1 text-xs bg-input border border-border rounded"
            >
              {COL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {col.type === 'select' && (
              <input
                placeholder="Options (comma-separated)"
                defaultValue={col.options?.choices?.join(', ') || ''}
                onBlur={e => onUpdate(col.id, { options: { choices: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded"
              />
            )}
            <button onClick={() => onDelete(col.id)} className="p-1 text-muted-foreground hover:text-destructive" title="Delete column">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-border/40 pt-3">
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="New column name"
          className="flex-1 px-2 py-1.5 text-sm bg-input border border-border rounded"
        />
        <select value={type} onChange={e => setType(e.target.value as ColumnType)} className="px-2 py-1.5 text-xs bg-input border border-border rounded">
          {COL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button
          onClick={() => { if (name.trim()) { onAdd(name.trim(), type); setName(''); } }}
          className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
    </div>
  );
}

function RegistryNameMenu({ registry, onRename, onDelete }: { registry: Registry; onRename: (n: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(registry.name);
  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { onRename(name); setEditing(false); } if (e.key === 'Escape') { setName(registry.name); setEditing(false); } }}
          className="px-2 py-1 text-xs bg-input border border-border rounded w-40"
        />
        <button onClick={() => { onRename(name); setEditing(false); }} className="p-1 text-primary"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => { setName(registry.name); setEditing(false); }} className="p-1 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => setEditing(true)} className="px-2 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary flex items-center gap-1" title="Rename">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={onDelete} className="px-2 py-1.5 text-xs rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center gap-1" title="Delete registry">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
