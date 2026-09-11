import { useState, useEffect, ReactNode } from 'react';
import { Settings as SettingsIcon, Shield, Plug } from 'lucide-react';
import { RolePermissions } from './RolePermissions';
import { OrgIntegrations } from './OrgIntegrations';

type Section = 'general' | 'permissions' | 'integrations';

interface SettingsHubProps {
  clusterId: string;
  general: ReactNode;
  initialSection?: Section;
}

const SECTIONS: { id: Section; label: string; icon: typeof SettingsIcon }[] = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Plug },
];

export function SettingsHub({ clusterId, general, initialSection = 'general' }: SettingsHubProps) {
  const [section, setSection] = useState<Section>(initialSection);

  useEffect(() => {
    sessionStorage.setItem('admin_settings_section', section);
  }, [section]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border/40 overflow-x-auto">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                active
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      <div>
        {section === 'general' && general}
        {section === 'permissions' && <RolePermissions clusterId={clusterId} />}
        {section === 'integrations' && <OrgIntegrations clusterId={clusterId} />}
      </div>
    </div>
  );
}
