import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, DollarSign, ArrowRight, Phone, Mail, Calendar,
  TrendingUp, Clock, MessageSquare, User, Tag, CheckSquare,
  BookOpen, Award, BarChart3, Search, Linkedin, Bot, Globe,
  Sparkles, Target, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface MockDeal {
  id: string;
  title: string;
  value: number;
  contact: string;
  company: string;
  probability: number;
  daysInStage: number;
}

const stages: { key: string; label: string; color: string }[] = [
  { key: 'lead', label: 'Lead', color: 'bg-blue-500' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-amber-500' },
  { key: 'won', label: 'Won', color: 'bg-emerald-500' },
];

const mockDeals: Record<string, MockDeal[]> = {
  lead: [
    { id: 'd1', title: 'Website Redesign', value: 12000, contact: 'Anna Mueller', company: 'Greenleaf GmbH', probability: 40, daysInStage: 3 },
    { id: 'd2', title: 'Mobile App MVP', value: 25000, contact: 'Tom Baker', company: 'StartupXYZ', probability: 30, daysInStage: 7 },
  ],
  negotiation: [
    { id: 'd3', title: 'AI Dashboard', value: 35000, contact: 'Lisa Park', company: 'DataCorp', probability: 70, daysInStage: 5 },
    { id: 'd4', title: 'E-commerce Platform', value: 48000, contact: 'Marco Rossi', company: 'ShopItalia', probability: 85, daysInStage: 2 },
  ],
  won: [
    { id: 'd5', title: 'CRM Integration', value: 18000, contact: 'Sophie Lang', company: 'Flowworks', probability: 100, daysInStage: 0 },
  ],
};

const mockActivities = [
  { icon: Phone, text: 'Call with Anna Mueller', time: '2h ago', type: 'call' },
  { icon: Mail, text: 'Proposal sent to DataCorp', time: '4h ago', type: 'email' },
  { icon: MessageSquare, text: 'Comment on AI Dashboard deal', time: '6h ago', type: 'comment' },
  { icon: Calendar, text: 'Meeting with ShopItalia', time: 'Tomorrow 10:00', type: 'meeting' },
];

const mockContacts = [
  { name: 'Anna Mueller', company: 'Greenleaf GmbH', type: 'Client', status: 'Active', email: 'anna@greenleaf.de' },
  { name: 'Tom Baker', company: 'StartupXYZ', type: 'Lead', status: 'New', email: 'tom@startupxyz.io' },
  { name: 'Lisa Park', company: 'DataCorp', type: 'Client', status: 'Active', email: 'lisa@datacorp.com' },
  { name: 'Marco Rossi', company: 'ShopItalia', type: 'Partner', status: 'Active', email: 'marco@shopitalia.it' },
  { name: 'Sophie Lang', company: 'Flowworks', type: 'Client', status: 'Active', email: 'sophie@flowworks.io' },
];

const mockTasks = [
  { title: 'Follow up on AI Dashboard proposal', assignee: 'You', priority: 'High', due: 'Today', status: 'todo' },
  { title: 'Prepare pitch deck for StartupXYZ', assignee: 'You', priority: 'Medium', due: 'Tomorrow', status: 'todo' },
  { title: 'Schedule demo with Greenleaf', assignee: 'Ana K.', priority: 'High', due: 'Wed', status: 'in_progress' },
  { title: 'Send contract to Flowworks', assignee: 'You', priority: 'Low', due: 'Thu', status: 'done' },
  { title: 'Review ShopItalia requirements', assignee: 'Max W.', priority: 'Medium', due: 'Fri', status: 'in_progress' },
];

const mockCalendarEvents = [
  { title: 'Call with Anna Mueller', time: '09:00 - 09:30', type: 'call', day: 'Mon' },
  { title: 'Team standup', time: '10:00 - 10:15', type: 'meeting', day: 'Mon' },
  { title: 'Demo: ShopItalia', time: '14:00 - 15:00', type: 'meeting', day: 'Tue' },
  { title: 'Proposal review', time: '11:00 - 11:30', type: 'task', day: 'Wed' },
  { title: 'Follow-up: DataCorp', time: '16:00 - 16:30', type: 'call', day: 'Thu' },
];

const mockLeaderboard = [
  { name: 'Ana Kovačević', deals: 5, value: 82000, bonus: 4100 },
  { name: 'Max Weber', deals: 3, value: 45000, bonus: 2250 },
  { name: 'Sophie Martin', deals: 2, value: 30000, bonus: 1500 },
];

type CRMView = 'pipeline' | 'activity' | 'contacts' | 'tasks' | 'calendar' | 'leaderboard' | 'linkedin' | 'ai-leads';

const views: { key: CRMView; label: string; icon: typeof DollarSign }[] = [
  { key: 'pipeline', label: 'Pipeline', icon: BarChart3 },
  { key: 'contacts', label: 'Contacts', icon: BookOpen },
  { key: 'linkedin', label: 'LinkedIn Import', icon: Linkedin },
  { key: 'ai-leads', label: 'AI Lead Gen', icon: Bot },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'activity', label: 'Activity', icon: MessageSquare },
  { key: 'leaderboard', label: 'Finder Fees', icon: Award },
];

export function DemoCRM() {
  const [activeView, setActiveView] = useState<CRMView>('pipeline');

  const totalValue = Object.values(mockDeals).flat().reduce((sum, d) => sum + d.value, 0);
  const weightedValue = Object.values(mockDeals).flat().reduce((sum, d) => sum + d.value * d.probability / 100, 0);

  return (
    <section id="crm-demo" className="relative px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
            Collective CRM
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Pipeline, LinkedIn import, AI lead generation, tasks, calendar &amp; finder's fees — built for collective selling
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden"
        >
          {/* Top Stats */}
          <div className="grid grid-cols-3 border-b border-border">
            {[
              { label: 'Pipeline Value', value: `€${(totalValue / 1000).toFixed(0)}K`, icon: DollarSign },
              { label: 'Weighted Value', value: `€${(weightedValue / 1000).toFixed(0)}K`, icon: TrendingUp },
              { label: 'Active Deals', value: Object.values(mockDeals).flat().length.toString(), icon: Users },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`p-4 md:p-5 text-center ${i < 2 ? 'border-r border-border' : ''}`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-lg md:text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              );
            })}
          </div>

          {/* View Tabs */}
          <div className="flex gap-1 p-2 border-b border-border overflow-x-auto scrollbar-hide">
            {views.map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.key}
                  onClick={() => setActiveView(view.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    activeView === view.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {view.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 md:p-6">
            <AnimatePresence mode="wait">
              {/* Pipeline */}
              {activeView === 'pipeline' && (
                <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {stages.map((stage) => {
                      const deals = mockDeals[stage.key] || [];
                      const stageTotal = deals.reduce((s, d) => s + d.value, 0);
                      return (
                        <div key={stage.key} className="rounded-xl border border-border/50 bg-background/50 p-3">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                              <span className="text-sm font-semibold text-foreground">{stage.label}</span>
                              <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{deals.length}</span>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">€{(stageTotal / 1000).toFixed(0)}K</span>
                          </div>
                          <div className="space-y-2">
                            {deals.map((deal, i) => (
                              <motion.div
                                key={deal.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-primary/30 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="text-sm font-medium text-foreground">{deal.title}</h4>
                                  <span className="text-xs font-bold text-foreground">€{deal.value.toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{deal.contact} • {deal.company}</p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${deal.probability}%` }}
                                        transition={{ delay: 0.3, duration: 0.5 }}
                                        className={`h-full rounded-full ${stage.color}`}
                                      />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{deal.probability}%</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {deal.daysInStage}d
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Contacts */}
              {activeView === 'contacts' && (
                <motion.div key="contacts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border">
                      <Search className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Search contacts...</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{mockContacts.length} contacts</span>
                  </div>
                  <div className="space-y-2">
                    {mockContacts.map((contact, i) => (
                      <motion.div
                        key={contact.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.company}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          contact.type === 'Client' ? 'bg-emerald-100 text-emerald-700' :
                          contact.type === 'Lead' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{contact.type}</span>
                        <span className="text-xs text-muted-foreground hidden md:block">{contact.email}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Tasks */}
              {activeView === 'tasks' && (
                <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'todo', label: 'To Do', color: 'bg-blue-500' },
                      { key: 'in_progress', label: 'In Progress', color: 'bg-amber-500' },
                      { key: 'done', label: 'Done', color: 'bg-emerald-500' },
                    ].map((col) => {
                      const colTasks = mockTasks.filter(t => t.status === col.key);
                      return (
                        <div key={col.key} className="rounded-xl border border-border/50 bg-background/50 p-3">
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-2 h-2 rounded-full ${col.color}`} />
                            <span className="text-xs font-semibold text-foreground">{col.label}</span>
                            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                          </div>
                          <div className="space-y-2">
                            {colTasks.map((task, i) => (
                              <motion.div
                                key={task.title}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="rounded-lg border border-border bg-card p-2.5"
                              >
                                <p className="text-xs font-medium text-foreground mb-1.5 leading-tight">{task.title}</p>
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    task.priority === 'High' ? 'bg-red-100 text-red-700' :
                                    task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                    'bg-secondary text-muted-foreground'
                                  }`}>{task.priority}</span>
                                  <span className="text-[10px] text-muted-foreground">{task.due}</span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Calendar */}
              {activeView === 'calendar' && (
                <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="space-y-2">
                    {['Mon', 'Tue', 'Wed', 'Thu'].map((day) => {
                      const dayEvents = mockCalendarEvents.filter(e => e.day === day);
                      if (dayEvents.length === 0) return null;
                      return (
                        <div key={day}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{day}</p>
                          <div className="space-y-1.5 ml-2 border-l-2 border-border pl-3">
                            {dayEvents.map((event, i) => (
                              <motion.div
                                key={event.title}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card"
                              >
                                <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
                                  event.type === 'call' ? 'bg-blue-500' :
                                  event.type === 'meeting' ? 'bg-primary' :
                                  'bg-amber-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                                  <p className="text-xs text-muted-foreground">{event.time}</p>
                                </div>
                                {event.type === 'call' && <Phone className="w-3.5 h-3.5 text-muted-foreground" />}
                                {event.type === 'meeting' && <Users className="w-3.5 h-3.5 text-muted-foreground" />}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Activity */}
              {activeView === 'activity' && (
                <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="space-y-3">
                    {mockActivities.map((activity, i) => {
                      const Icon = activity.icon;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/60"
                        >
                          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{activity.text}</p>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{activity.time}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* LinkedIn Import */}
              {activeView === 'linkedin' && (
                <motion.div key="linkedin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="rounded-xl border border-border bg-background/50 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Linkedin className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-foreground">Paste LinkedIn Search Results</span>
                    </div>
                    <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-center mb-3">
                      <p className="text-xs text-muted-foreground">Copy your LinkedIn search page (Ctrl+A) and paste here to extract leads</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Extracted Leads Preview</p>
                  <div className="space-y-2">
                    {[
                      { name: 'Elena Vasquez', role: 'Head of Product', company: 'Figma', status: 'Ready' },
                      { name: 'James Chen', role: 'VP Engineering', company: 'Notion', status: 'Ready' },
                      { name: 'Maria Schmidt', role: 'CTO', company: 'N26', status: 'Duplicate' },
                      { name: 'Oliver Park', role: 'Design Lead', company: 'Spotify', status: 'Ready' },
                    ].map((lead, i) => (
                      <motion.div
                        key={lead.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.role} · {lead.company}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          lead.status === 'Ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>{lead.status}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
                    <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-medium text-xs">
                      <Users className="w-3.5 h-3.5" />
                      Import 3 leads to CRM
                    </button>
                  </div>
                </motion.div>
              )}

              {/* AI Lead Gen */}
              {activeView === 'ai-leads' && (
                <motion.div key="ai-leads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Website Scraper */}
                    <div className="rounded-xl border border-border bg-background/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Globe className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Website-to-Lead</span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground">
                          https://acme-corp.com
                        </div>
                        <button className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Scrape
                        </button>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-foreground">Acme Corporation</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">Enterprise SaaS company • San Francisco • 200+ employees</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px]">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-foreground">John Smith</span>
                            <span className="text-muted-foreground">· CEO</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-foreground">Sarah Lee</span>
                            <span className="text-muted-foreground">· CTO</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {['Platform rebuild', 'AI integration'].map(need => (
                            <span key={need} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{need}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* AI Prospect Finder */}
                    <div className="rounded-xl border border-border bg-background/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">AI Prospect Finder</span>
                      </div>
                      <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground mb-3">
                        "Series A fintech startups in DACH needing design..."
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: 'FinLeap', fit: 'High', reason: 'Scaling product team' },
                          { name: 'Wefox', fit: 'High', reason: 'Redesigning mobile app' },
                          { name: 'Billie', fit: 'Medium', reason: 'Brand refresh needed' },
                        ].map((prospect, i) => (
                          <motion.div
                            key={prospect.name}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground">{prospect.name}</p>
                              <p className="text-[10px] text-muted-foreground">{prospect.reason}</p>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              prospect.fit === 'High' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>{prospect.fit}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    AI-generated suggestions — verify before adding to your pipeline
                  </p>
                </motion.div>
              )}

              {/* Leaderboard */}
              {activeView === 'leaderboard' && (
                <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-xs text-muted-foreground mb-4">Members earn finder's fees for deals they bring to the collective</p>
                  <div className="space-y-2">
                    {mockLeaderboard.map((member, i) => (
                      <motion.div
                        key={member.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          i === 0 ? 'bg-amber-100 text-amber-700' :
                          i === 1 ? 'bg-secondary text-muted-foreground' :
                          'bg-secondary text-muted-foreground'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.deals} deals · €{member.value.toLocaleString()} total</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-accent">€{member.bonus.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">finder's fee</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA */}
            <div className="flex gap-3 pt-4 mt-4 border-t border-border/30">
              <Link to="/auth?mode=signup&type=demand" className="flex-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Start managing deals
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3">
              Demo mode — interactive preview with mock data
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
