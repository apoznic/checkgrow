import { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, User, TrendingUp, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { CRMDeal, DealStage } from './types';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface StageOption {
  value: DealStage;
  label: string;
  color: string;
  bgColor: string;
}

interface DealTableProps {
  deals: CRMDeal[];
  stages: StageOption[];
  canManage: boolean;
  onOpen: (deal: CRMDeal) => void;
  onEdit: (deal: CRMDeal) => void;
  onDelete: (dealId: string) => void;
  onStageChange: (dealId: string, stage: DealStage, currentStage: DealStage) => void;
}

type SortKey = 'title' | 'contact' | 'source' | 'stage' | 'value' | 'probability' | 'owner' | 'expected_close_date' | 'updated_at';

const stageOrder: DealStage[] = ['lead', 'negotiation', 'won', 'lost', 'archived'];

/**
 * Standard CRM table for sales leads: one row per lead, sortable columns,
 * inline stage change, and a pipeline total in the footer.
 */
export function DealTable({ deals, stages, canManage, onOpen, onEdit, onDelete, onStageChange }: DealTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'title' || key === 'contact' || key === 'owner' ? 'asc' : 'desc');
    }
  };

  const sorted = useMemo(() => {
    const val = (d: CRMDeal): string | number => {
      switch (sortKey) {
        case 'title': return d.title.toLowerCase();
        case 'contact': return (d.crm_contacts?.company || d.crm_contacts?.name || '').toLowerCase();
        case 'source': return (d.source || '').toLowerCase();
        case 'stage': return stageOrder.indexOf(d.stage);
        case 'value': return d.value ?? -1;
        case 'probability': return d.probability ?? -1;
        case 'owner': return (d.profiles?.full_name || '').toLowerCase();
        case 'expected_close_date': return d.expected_close_date ? new Date(d.expected_close_date).getTime() : Number.MAX_SAFE_INTEGER;
        case 'updated_at': return new Date(d.updated_at).getTime();
      }
    };
    return [...deals].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [deals, sortKey, sortDir]);

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const weightedValue = deals.reduce((sum, d) => sum + ((d.value || 0) * (d.probability ?? 0)) / 100, 0);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const Th = ({ column, children, className = '' }: { column: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={`whitespace-nowrap ${className}`}>
      <button onClick={() => toggleSort(column)} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
        {children}
        <SortIcon column={column} />
      </button>
    </TableHead>
  );

  if (deals.length === 0) {
    return (
      <div className="glass-panel p-12 text-center">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground">No leads found</p>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <Th column="title">Lead</Th>
              <Th column="contact">Contact</Th>
              <Th column="source">Source</Th>
              <Th column="stage">Stage</Th>
              <Th column="value" className="text-right">Value</Th>
              <Th column="probability">Probability</Th>
              <Th column="owner">Owner</Th>
              <Th column="expected_close_date">Expected close</Th>
              <Th column="updated_at">Updated</Th>
              {canManage && <TableHead className="w-[80px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(deal => {
              const stage = stages.find(s => s.value === deal.stage);
              const wonTag = deal.stage === 'archived' ? deal.archived_from : null;
              return (
                <TableRow key={deal.id} className="cursor-pointer" onClick={() => onOpen(deal)}>
                  <TableCell className="max-w-[260px]">
                    <p className="font-medium truncate">{deal.title}</p>
                    {deal.description && (
                      <p className="text-xs text-muted-foreground truncate">{deal.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {deal.crm_contacts ? (
                      <div className="min-w-0">
                        <p className="text-sm truncate flex items-center gap-1.5">
                          <User className="w-3 h-3 text-muted-foreground shrink-0" />
                          {deal.crm_contacts.name}
                        </p>
                        {deal.crm_contacts.company && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 shrink-0" />
                            {deal.crm_contacts.company}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {deal.source ? (
                      <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground border border-[#CFC3D9]">{deal.source}</span>
                    ) : (
                      <span className="text-xs text-[#9B9B9B]">Manual</span>
                    )}
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    {canManage && deal.stage !== 'archived' ? (
                      <select
                        value={deal.stage}
                        onChange={e => onStageChange(deal.id, e.target.value as DealStage, deal.stage)}
                        className={`text-xs font-medium px-2 py-1 rounded-lg border border-transparent bg-transparent ${stage?.bgColor || ''} ${stage?.color || ''}`}
                      >
                        {stages.filter(s => s.value !== 'archived').map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${stage?.bgColor || 'bg-secondary'} ${stage?.color || 'text-muted-foreground'}`}>
                        {wonTag === 'won' ? '🏆 Won' : wonTag === 'lost' ? '✕ Lost' : stage?.label || deal.stage}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {deal.value != null ? (
                      <span className="font-medium">€{deal.value.toLocaleString()}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No value</span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${deal.stage === 'won' ? 'bg-green-500' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, Math.max(0, deal.probability ?? 0))}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-9 text-right">{deal.probability ?? 0}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {deal.profiles ? (
                      <div className="flex items-center gap-2 min-w-0">
                        {deal.profiles.avatar_url ? (
                          <img src={deal.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-3 h-3 text-primary" />
                          </div>
                        )}
                        <span className="text-sm truncate">{deal.profiles.full_name || 'Unassigned'}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {deal.expected_close_date ? format(new Date(deal.expected_close_date), 'dd/MM/yyyy') : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(deal.updated_at), 'dd/MM/yyyy')}
                  </TableCell>
                  {canManage && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onEdit(deal)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(deal.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="text-xs text-muted-foreground">
                {deals.length} {deals.length === 1 ? 'lead' : 'leads'}
              </TableCell>
              <TableCell className="text-right font-semibold whitespace-nowrap">€{totalValue.toLocaleString()}</TableCell>
              <TableCell colSpan={canManage ? 5 : 4} className="text-xs text-muted-foreground whitespace-nowrap">
                Weighted: €{Math.round(weightedValue).toLocaleString()}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
