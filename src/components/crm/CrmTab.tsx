import { useState } from 'react';
import { Kanban, Webhook } from 'lucide-react';
import { DealList } from './DealList';
import { LeadWebhooksPanel } from './LeadWebhooksPanel';

interface CrmTabProps {
  clusterId: string;
  profileId: string;
  canManage: boolean;
  userRole?: string;
  initialDealId?: string | null;
}

type CrmView = 'pipeline' | 'inbound';

const VIEW_KEY = 'crm_view';

/** CRM tab: the lead pipeline plus the inbound webhooks that feed it. */
export function CrmTab({ clusterId, profileId, canManage, userRole, initialDealId }: CrmTabProps) {
  const [view, setView] = useState<CrmView>(() => (initialDealId ? 'pipeline' : (sessionStorage.getItem(VIEW_KEY) as CrmView) || 'pipeline'));
  const [openDealId, setOpenDealId] = useState<string | null>(initialDealId ?? null);

  const switchView = (next: CrmView) => {
    setView(next);
    sessionStorage.setItem(VIEW_KEY, next);
  };

  const views: { id: CrmView; label: string; icon: React.ElementType }[] = [
    { id: 'pipeline', label: 'Pipeline', icon: Kanban },
    { id: 'inbound', label: 'Inbound leads', icon: Webhook },
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

      {view === 'pipeline' ? (
        <DealList
          clusterId={clusterId}
          profileId={profileId}
          canManage={canManage}
          userRole={userRole}
          initialDealId={openDealId}
        />
      ) : (
        <LeadWebhooksPanel
          clusterId={clusterId}
          profileId={profileId}
          canManage={canManage}
          onOpenDeal={dealId => { setOpenDealId(dealId); switchView('pipeline'); }}
        />
      )}
    </div>
  );
}
