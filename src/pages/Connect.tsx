import { useState, useEffect, useRef } from 'react';
import { FloatingLayout } from '@/components/FloatingLayout';
import { AppTopBar } from '@/components/AppTopBar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { ConnectChat } from '@/components/connect/ConnectChat';
import { ConnectMessages } from '@/components/connect/ConnectMessages';
import { Sparkles, MessageCircle } from 'lucide-react';

export default function Connect() {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matchmaker' | 'messages'>('matchmaker');

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfileId(data.id);
        });
    }
  }, [user]);

  const tabs = [
    { id: 'matchmaker' as const, label: 'Find Connections', icon: Sparkles },
    { id: 'messages' as const, label: 'Messages', icon: MessageCircle },
  ];

  return (
    <FloatingLayout>
      <AppTopBar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-secondary/50 rounded-xl p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'matchmaker' && profileId && (
          <ConnectChat profileId={profileId} onConnect={() => setActiveTab('messages')} />
        )}
        {activeTab === 'messages' && profileId && (
          <ConnectMessages profileId={profileId} />
        )}
      </div>
    </FloatingLayout>
  );
}
