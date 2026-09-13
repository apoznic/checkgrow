import { useState } from 'react';
import { Kanban, Webhook, Send, Table2 } from 'lucide-react';
import { DealList } from './DealList';
import { LeadsView } from './LeadsView';
import { LeadWebhooksPanel } from './LeadWebhooksPanel';
import { OutboundWebhooksPanel } from './OutboundWebhooksPanel';

interface CrmTabProps {
  clusterId: string;
  profileId: string;
  canManage: boolean;
  userRole?: string;
  initialDealId?: string | null;
}

type CrmView = 'leads' | 'pipeline' | 'inbound' | 'outbound';

const VIEW_KEY = 'crm_view';

/** CRM tab: the lead pipeline plus the inbound and outbound webhooks around it. */
export function CrmTab({ clusterId, profileId, canManage, userRole, initialDealId }: CrmTabProps) {
  const [view, setView] = useState<CrmView>(() => (initialDealId ? 'leads' : (sessionStorage.getItem(VIEW_KEY) as CrmView) || 'leads'));
  const [openDealId, setOpenDealId] = useState<string | null>(initialDealId ?? null);

  const switchView = (next: CrmView) => {
    setView(next);
    sessionStorage.setItem(VIEW_KEY, next);
  };

  const views: { id: CrmView; label: string; icon: React.ElementType }[] = [
    { id: 'leads', label: 'Leads', icon: Table2 },
    { id: 'pipeline', label: 'Pipeline', icon: Kanban },
    { id: 'inbound', label: 'Inbound webhooks', icon: Webhook },
    { id: 'outbound', label: 'Outbound webhooks', icon: Send },
  ];

  return (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-1 rounded-lg bg-secondary p-1">
        {views.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => switchView(id)}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              view === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {view === 'leads' ? (
        <LeadsView
          clusterId={clusterId}
          profileId={profileId}
          canManage={canManage}
          initialDealId={openDealId}
          onOpenInPipeline={dealId => { setOpenDealId(dealId); switchView('pipeline'); }}
        />
      ) : view === 'pipeline' ? (
        <DealList
          clusterId={clusterId}
          profileId={profileId}
          canManage={canManage}
          userRole={userRole}
          initialDealId={openDealId}
        />
      ) : view === 'inbound' ? (
        <LeadWebhooksPanel
          clusterId={clusterId}
          profileId={profileId}
          canManage={canManage}
          onOpenDeal={dealId => { setOpenDealId(dealId); switchView('pipeline'); }}
        />
      ) : (
        <OutboundWebhooksPanel
          clusterId={clusterId}
          profileId={profileId}
          canManage={canManage}
          onOpenDeal={dealId => { setOpenDealId(dealId); switchView('pipeline'); }}
        />
      )}
    </div>
  );
}
