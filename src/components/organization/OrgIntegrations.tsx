import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Globe, Calendar, Search, Eye, EyeOff, Check, X, Loader2, 
  Plus, Trash2, Power, PowerOff, Settings2, Key, ExternalLink, Ticket 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  service_name: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const SERVICE_DEFINITIONS = [
  {
    name: 'resend',
    label: 'Email (Resend)',
    description: 'Send announcement emails and member invitations',
    icon: Mail,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    fields: [
      { key: 'apiKey', label: 'Resend API Key', placeholder: 're_xxxxxxxxxxxx' },
    ],
    configFields: [
      { key: 'sender_domain', label: 'Sender Domain', placeholder: 'notify.yourdomain.com' },
      { key: 'sender_name', label: 'Sender Name', placeholder: 'Your Org' },
    ],
  },
  {
    name: 'firecrawl',
    label: 'Firecrawl',
    description: 'Scrape websites to generate leads and extract data',
    icon: Globe,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    fields: [
      { key: 'apiKey', label: 'Firecrawl API Key', placeholder: 'fc-xxxxxxxxxxxx' },
    ],
    configFields: [],
  },
  {
    name: 'google_calendar',
    label: 'Google Calendar',
    description: 'Sync team calendar with Google Calendar',
    icon: Calendar,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    fields: [
      { key: 'apiKey', label: 'Google Client ID', placeholder: 'xxxx.apps.googleusercontent.com' },
    ],
    configFields: [
      { key: 'client_secret', label: 'Google Client Secret', placeholder: 'GOCSPX-xxxx' },
    ],
  },
  {
    name: 'perplexity',
    label: 'Perplexity AI',
    description: 'AI-powered web search for prospect finding',
    icon: Search,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    fields: [
      { key: 'apiKey', label: 'Perplexity API Key', placeholder: 'pplx-xxxxxxxxxxxx' },
    ],
    configFields: [],
  },
  {
    name: 'nther',
    label: 'Nther',
    description: 'Link to your Nther event app for team events',
    icon: Ticket,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    fields: [],
    configFields: [
      { key: 'event_url', label: 'Nther Event Link', placeholder: 'https://nther.app/your-org' },
    ],
    linkOnly: true,
  },
];

interface OrgIntegrationsProps {
  clusterId: string;
}

export function OrgIntegrations({ clusterId }: OrgIntegrationsProps) {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadIntegrations();
  }, [clusterId]);

  const loadIntegrations = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('manage-integrations', {
      body: { action: 'list', clusterId },
    });

    if (!error && data?.integrations) {
      setIntegrations(data.integrations);
    }
    setLoading(false);
  };

  const handleSave = async (serviceName: string) => {
    const serviceDef = SERVICE_DEFINITIONS.find(s => s.name === serviceName);
    const isLinkOnly = !!(serviceDef as any)?.linkOnly;

    const apiKey = formValues[`${serviceName}_apiKey`];
    if (!isLinkOnly && !apiKey?.trim()) {
      toast({ title: 'API key is required', variant: 'destructive' });
      return;
    }

    setSaving(serviceName);

    const currentIntegration = integrations.find(i => i.service_name === serviceName);
    const existingConfig = ((currentIntegration?.config as Record<string, string> | null) ?? {});
    const config: Record<string, string> = { ...existingConfig };

    serviceDef?.configFields.forEach(f => {
      const val = configValues[`${serviceName}_${f.key}`] ?? existingConfig[f.key] ?? '';
      if (val?.trim()) config[f.key] = val.trim();
    });

    const { error } = await supabase.functions.invoke('manage-integrations', {
      body: { action: 'upsert', clusterId, serviceName, apiKey: isLinkOnly ? 'link-only' : apiKey!.trim(), config },
    });

    setSaving(null);

    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `${serviceDef?.label || serviceName} configured ✓` });
      setFormValues(prev => ({ ...prev, [`${serviceName}_apiKey`]: '' }));
      setExpandedService(null);
      loadIntegrations();
    }
  };

  const handleToggle = async (serviceName: string) => {
    const { data, error } = await supabase.functions.invoke('manage-integrations', {
      body: { action: 'toggle', clusterId, serviceName },
    });

    if (error) {
      toast({ title: 'Failed to toggle', variant: 'destructive' });
    } else {
      loadIntegrations();
    }
  };

  const handleDelete = async (serviceName: string) => {
    const { error } = await supabase.functions.invoke('manage-integrations', {
      body: { action: 'delete', clusterId, serviceName },
    });

    if (error) {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    } else {
      const serviceDef = SERVICE_DEFINITIONS.find(s => s.name === serviceName);
      toast({ title: `${serviceDef?.label || serviceName} removed` });
      loadIntegrations();
    }
  };

  const getIntegration = (serviceName: string) =>
    integrations.find(i => i.service_name === serviceName);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Integrations
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect external services to enable email, web scraping, calendar sync, and AI search for your organization.
          Each organization manages their own API keys independently.
        </p>
      </div>

      <div className="space-y-3">
        {SERVICE_DEFINITIONS.map((service) => {
          const integration = getIntegration(service.name);
          const isExpanded = expandedService === service.name;
          const isConfigured = !!integration;
          const isActive = integration?.is_active ?? false;
          const Icon = service.icon;

          return (
            <div
              key={service.name}
              className={`border rounded-xl overflow-hidden transition-colors ${
                isConfigured && isActive
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-secondary/10'
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-4">
                <div className={`w-10 h-10 rounded-lg ${service.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${service.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{service.label}</span>
                    {isConfigured && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                      }`}>
                        {isActive ? '● Active' : '○ Paused'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {isConfigured && (
                    <>
                      {(service as any).linkOnly && (integration?.config as Record<string, string>)?.event_url && (
                        <a
                          href={(integration?.config as Record<string, string>).event_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Open Nther"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {!(service as any).linkOnly && (
                        <button
                          onClick={() => handleToggle(service.name)}
                          className={`p-2 rounded-lg transition-colors ${
                            isActive
                              ? 'text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                              : 'text-muted-foreground hover:bg-secondary/50'
                          }`}
                          title={isActive ? 'Pause' : 'Activate'}
                        >
                          {isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(service.name)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setExpandedService(isExpanded ? null : service.name)}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-secondary/50 transition-colors"
                    title={isConfigured ? 'Update key' : 'Configure'}
                  >
                    {isConfigured ? <Key className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Form */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                      {service.fields.map((field) => (
                        <div key={field.key}>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            {field.label}
                          </label>
                          <div className="relative">
                            <input
                              type={showKeys[service.name] ? 'text' : 'password'}
                              value={formValues[`${service.name}_${field.key}`] || ''}
                              onChange={(e) =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  [`${service.name}_${field.key}`]: e.target.value,
                                }))
                              }
                              placeholder={isConfigured ? '••••••••  (enter new key to update)' : field.placeholder}
                              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowKeys((prev) => ({ ...prev, [service.name]: !prev[service.name] }))
                              }
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                            >
                              {showKeys[service.name] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}

                      {service.configFields.map((field) => (
                        <div key={field.key}>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">
                            {field.label}
                          </label>
                          <input
                            type={field.key.toLowerCase().includes('secret') ? 'password' : 'text'}
                            value={
                              configValues[`${service.name}_${field.key}`] ??
                              (integration?.config as Record<string, string>)?.[field.key] ??
                              ''
                            }
                            onChange={(e) =>
                              setConfigValues((prev) => ({
                                ...prev,
                                [`${service.name}_${field.key}`]: e.target.value,
                              }))
                            }
                            placeholder={field.placeholder}
                            className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      ))}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleSave(service.name)}
                          disabled={saving === service.name}
                          className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {saving === service.name ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              {isConfigured ? 'Update' : 'Save & Activate'}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setExpandedService(null)}
                          className="px-4 py-2 bg-secondary/50 text-foreground rounded-lg text-sm hover:bg-secondary transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-secondary/10 p-4">
        <p className="text-xs text-muted-foreground">
          <strong>🔒 Security:</strong> All API keys are encrypted with AES-256-GCM before storage. 
          Keys are never exposed in the browser — they're only decrypted server-side when needed.
        </p>
      </div>
    </div>
  );
}
