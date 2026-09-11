import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ChevronLeft, ChevronRight, X, Loader2,
  Calendar as CalendarIcon, Clock, Tag, User, Trash2,
  Link2, MoreVertical, RefreshCw, Unplug, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface CalendarEvent {
  id: string;
  cluster_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  color: string;
  created_by: string;
  assigned_to: string | null;
  task_id: string | null;
  deal_id: string | null;
  contact_id: string | null;
  tags: string[];
  created_at: string;
  google_event_id?: string | null;
  synced_at?: string | null;
  profiles?: Profile;
}

interface SharedCalendarProps {
  clusterId: string;
  profileId: string;
  orgMembers: Profile[];
  userRole?: string;
}

const EVENT_COLORS = [
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400', dot: 'bg-blue-500' },
  { id: 'emerald', label: 'Green', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  { id: 'amber', label: 'Yellow', bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400', dot: 'bg-amber-500' },
  { id: 'red', label: 'Red', bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', dot: 'bg-red-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400', dot: 'bg-purple-500' },
  { id: 'pink', label: 'Pink', bg: 'bg-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-400', dot: 'bg-pink-500' },
];

const getColorConfig = (color: string) => EVENT_COLORS.find(c => c.id === color) || EVENT_COLORS[0];

export function SharedCalendar({ clusterId, profileId, orgMembers, userRole }: SharedCalendarProps) {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Google Calendar state (org-level)
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalConnectedBy, setGcalConnectedBy] = useState<string | null>(null);
  const [gcalLoading, setGcalLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const canManageGcal = userRole === 'owner' || userRole === 'admin';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '10:00',
    all_day: false,
    color: 'blue',
    assigned_to: '',
    tags: [] as string[],
  });

  const checkGcalStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=status&clusterId=${clusterId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const data = await response.json();
      setGcalConnected(data.connected || false);
      setGcalConnectedBy(data.connected_by || null);
    } catch (err) {
      console.error('Failed to check Google Calendar status:', err);
    }
  }, [clusterId]);

  // Auto-pull from Google when connected
  const autoSyncFromGoogle = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'pull', clusterId }),
        }
      );
      const data = await response.json();
      if (data.success) {
        loadEvents();
      }
    } catch (err) {
      console.error('Auto-sync from Google failed:', err);
    }
  }, [clusterId]);

  useEffect(() => {
    loadEvents();
    checkGcalStatus();
    const channel = supabase
      .channel('calendar_events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `cluster_id=eq.${clusterId}` }, () => {
        loadEvents();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clusterId, checkGcalStatus]);

  // Auto-pull when gcal becomes connected
  useEffect(() => {
    if (gcalConnected) {
      autoSyncFromGoogle();
    }
  }, [gcalConnected, autoSyncFromGoogle]);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*, profiles:created_by(id, full_name, avatar_url)')
      .eq('cluster_id', clusterId)
      .order('start_date', { ascending: true });

    if (!error && data) {
      setEvents(data as unknown as CalendarEvent[]);
    }
    setIsLoading(false);
  };

  const connectGoogleCalendar = async () => {
    setGcalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Please log in first', variant: 'destructive' });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=authorize&clusterId=${clusterId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const data = await response.json();
      if (data.url) {
        // Open in popup
        const popup = window.open(data.url, 'google-calendar-auth', 'width=500,height=600,left=200,top=100');
        // Poll for popup close
        const interval = setInterval(() => {
          if (popup?.closed) {
            clearInterval(interval);
            checkGcalStatus();
            setGcalLoading(false);
          }
        }, 500);
      } else {
        toast({ title: 'Failed to connect Google Calendar', description: data.error || 'Unknown error. Check Integrations settings.', variant: 'destructive' });
        setGcalLoading(false);
      }
    } catch (err) {
      console.error('Connect error:', err);
      toast({ title: 'Connection failed', variant: 'destructive' });
      setGcalLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth?action=disconnect&clusterId=${clusterId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      setGcalConnected(false);
      toast({ title: 'Google Calendar disconnected' });
    } catch (err) {
      toast({ title: 'Disconnect failed', variant: 'destructive' });
    }
  };

  const syncFromGoogle = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'pull', clusterId }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast({ title: `Synced ${data.imported} new events from Google Calendar` });
        loadEvents();
      } else {
        toast({ title: 'Sync failed', description: data.error, variant: 'destructive' });
        if (data.error?.includes('expired') || data.error?.includes('reconnect')) {
          setGcalConnected(false);
        }
      }
    } catch (err) {
      toast({ title: 'Sync failed', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const pushToGoogle = async (event: CalendarEvent) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'push',
            clusterId,
            eventId: event.id,
            eventData: {
              title: event.title,
              description: event.description,
              start_date: event.start_date,
              end_date: event.end_date,
              all_day: event.all_day,
              google_event_id: event.google_event_id,
            },
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Event synced to Google Calendar' });
        loadEvents();
      } else {
        toast({ title: 'Push failed', description: data.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Push failed', variant: 'destructive' });
    }
  };

  const openCreateModal = (date?: Date) => {
    const d = date || new Date();
    setFormData({
      title: '',
      description: '',
      start_date: format(d, 'yyyy-MM-dd'),
      start_time: '09:00',
      end_date: format(d, 'yyyy-MM-dd'),
      end_time: '10:00',
      all_day: false,
      color: 'blue',
      assigned_to: '',
      tags: [],
    });
    setEditingEvent(null);
    setTagInput('');
    setShowEventModal(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : startDate;
    setFormData({
      title: event.title,
      description: event.description || '',
      start_date: format(startDate, 'yyyy-MM-dd'),
      start_time: format(startDate, 'HH:mm'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      end_time: format(endDate, 'HH:mm'),
      all_day: event.all_day,
      color: event.color || 'blue',
      assigned_to: event.assigned_to || '',
      tags: event.tags || [],
    });
    setEditingEvent(event);
    setTagInput('');
    setShowEventModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    setIsSubmitting(true);

    const startDateTime = formData.all_day
      ? `${formData.start_date}T00:00:00`
      : `${formData.start_date}T${formData.start_time}:00`;
    const endDateTime = formData.all_day
      ? `${formData.end_date || formData.start_date}T23:59:59`
      : `${formData.end_date || formData.start_date}T${formData.end_time}:00`;

    const eventData = {
      cluster_id: clusterId,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      start_date: startDateTime,
      end_date: endDateTime,
      all_day: formData.all_day,
      color: formData.color,
      assigned_to: formData.assigned_to || null,
      tags: formData.tags,
      created_by: profileId,
    };

    let error;
    if (editingEvent) {
      const { created_by, ...updateData } = eventData;
      ({ error } = await supabase.from('calendar_events').update(updateData).eq('id', editingEvent.id));
    } else {
      ({ error } = await supabase.from('calendar_events').insert(eventData));
    }

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingEvent ? 'Event updated' : 'Event created' });
      setShowEventModal(false);
      loadEvents();

      // Auto-push to Google Calendar if connected
      if (gcalConnected) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // For new events, we need the ID — re-fetch the latest
            let eventToSync = editingEvent;
            if (!editingEvent) {
              const { data: latest } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('cluster_id', clusterId)
                .eq('created_by', profileId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
              if (latest) eventToSync = latest as unknown as CalendarEvent;
            }
            if (eventToSync) {
              await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    action: 'push',
                    clusterId,
                    eventId: eventToSync.id,
                    eventData: {
                      title: formData.title.trim(),
                      description: formData.description.trim() || '',
                      start_date: `${formData.start_date}T${formData.all_day ? '00:00' : formData.start_time}:00`,
                      end_date: `${formData.end_date || formData.start_date}T${formData.all_day ? '23:59' : formData.end_time}:00`,
                      all_day: formData.all_day,
                      google_event_id: eventToSync.google_event_id,
                    },
                  }),
                }
              );
              loadEvents();
            }
          }
        } catch (err) {
          console.error('Auto-push to Google failed:', err);
        }
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    // Find the event to check for google_event_id before deleting
    const eventToDelete = events.find(e => e.id === id);
    
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Event deleted' });
      setShowEventModal(false);
      loadEvents();

      // Auto-delete from Google Calendar if connected and event was synced
      if (gcalConnected && eventToDelete?.google_event_id) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'delete',
                  clusterId,
                  eventData: { google_event_id: eventToDelete.google_event_id },
                }),
              }
            );
          }
        } catch (err) {
          console.error('Auto-delete from Google failed:', err);
        }
      }
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(p => ({ ...p, tags: [...p.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }));
  };

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter(event => {
      // Extract date portion directly from ISO string to avoid timezone shifts
      const startStr = event.start_date.substring(0, 10);
      const endStr = event.end_date ? event.end_date.substring(0, 10) : startStr;
      return dayStr >= startStr && dayStr <= endStr;
    });
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Joint Calendar</h3>
          <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">{events.length} events</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Google Calendar Connection — org-level */}
          {gcalConnected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1.5 transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  </svg>
                  Connected{gcalConnectedBy ? ` by ${gcalConnectedBy}` : ''}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={syncFromGoogle} disabled={isSyncing}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Pull from Google'}
                </DropdownMenuItem>
                {canManageGcal && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={disconnectGoogleCalendar} className="text-destructive">
                      <Unplug className="w-3.5 h-3.5 mr-1.5" /> Disconnect
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : canManageGcal ? (
            <button
              onClick={connectGoogleCalendar}
              disabled={gcalLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary/50 hover:bg-secondary/70 flex items-center gap-1.5 transition-colors border border-border/30"
            >
              {gcalLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                </svg>
              )}
              Connect Google Calendar
            </button>
          ) : null}
          <button
            onClick={() => openCreateModal()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-secondary/50 rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy')}</h4>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            Today
          </button>
        </div>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-secondary/50 rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-border/30 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-secondary/30">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="px-1 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                onDoubleClick={() => openCreateModal(day)}
                className={`relative min-h-[72px] sm:min-h-[88px] p-1 border-t border-r border-border/15 text-left transition-colors hover:bg-secondary/30 ${
                  !isCurrentMonth ? 'opacity-30' : ''
                } ${isSelected ? 'bg-primary/5 ring-1 ring-primary/30' : ''} ${
                  i % 7 === 6 ? 'border-r-0' : ''
                }`}
              >
                <span className={`text-[11px] font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isTodayDate ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}>
                  {format(day, 'd')}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 3).map(event => {
                    const colorConfig = getColorConfig(event.color);
                    const isGoogleEvent = !!event.google_event_id;
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); openEditModal(event); }}
                        className={`text-[9px] sm:text-[10px] leading-tight px-1 py-0.5 rounded ${colorConfig.bg} ${colorConfig.text} truncate cursor-pointer hover:opacity-80 transition-opacity border ${colorConfig.border} flex items-center gap-0.5`}
                      >
                        {isGoogleEvent && (
                          <svg className="w-2 h-2 flex-shrink-0 opacity-60" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          </svg>
                        )}
                        <span className="truncate">{event.title}</span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border/30 p-4 bg-secondary/10">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h4>
                <button
                  onClick={() => openCreateModal(selectedDate)}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No events on this day. Double-click to create one.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(event => {
                    const colorConfig = getColorConfig(event.color);
                    const assignee = orgMembers.find(m => m.id === event.assigned_to);
                    const isGoogleEvent = !!event.google_event_id;
                    return (
                      <div
                        key={event.id}
                        className={`flex items-start gap-3 p-3 rounded-lg ${colorConfig.bg} border ${colorConfig.border} cursor-pointer hover:opacity-90 transition-opacity`}
                        onClick={() => openEditModal(event)}
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colorConfig.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-sm font-medium ${colorConfig.text}`}>{event.title}</p>
                            {isGoogleEvent && (
                              <span className="text-[9px] bg-secondary/50 px-1.5 py-0.5 rounded-full text-muted-foreground flex items-center gap-0.5">
                                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                </svg>
                                Synced
                              </span>
                            )}
                          </div>
                          {event.description && <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {!event.all_day && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(event.start_date), 'h:mm a')}
                                {event.end_date && ` – ${format(new Date(event.end_date), 'h:mm a')}`}
                              </span>
                            )}
                            {event.all_day && <span className="text-[10px] text-muted-foreground">All day</span>}
                            {assignee && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <User className="w-3 h-3" /> {assignee.full_name}
                              </span>
                            )}
                            {event.tags?.length > 0 && event.tags.map(tag => (
                              <span key={tag} className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded-full text-muted-foreground">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button onClick={e => e.stopPropagation()} className="p-1 hover:bg-secondary/50 rounded">
                              <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(event); }}>Edit</DropdownMenuItem>
                            {gcalConnected && !isGoogleEvent && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); pushToGoogle(event); }}>
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Push to Google
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }} className="text-destructive">
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel p-5 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold">{editingEvent ? 'Edit Event' : 'New Event'}</h2>
                <button onClick={() => setShowEventModal(false)} className="p-1 hover:bg-secondary/50 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Title *</label>
                  <input
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    placeholder="Event title"
                    className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Event details..."
                    className="w-full h-16 bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-primary/40"
                  />
                </div>

                {/* All Day Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.all_day}
                    onChange={e => setFormData(p => ({ ...p, all_day: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-xs font-medium">All day event</span>
                </label>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Start Date *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))}
                      className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
                    />
                  </div>
                  {!formData.all_day && (
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Start Time</label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={e => setFormData(p => ({ ...p, start_time: e.target.value }))}
                        className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))}
                      className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
                    />
                  </div>
                  {!formData.all_day && (
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">End Time</label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={e => setFormData(p => ({ ...p, end_time: e.target.value }))}
                        className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
                      />
                    </div>
                  )}
                </div>

                {/* Color */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Color</label>
                  <div className="flex gap-2">
                    {EVENT_COLORS.map(color => (
                      <button
                        key={color.id}
                        onClick={() => setFormData(p => ({ ...p, color: color.id }))}
                        className={`w-7 h-7 rounded-full ${color.dot} transition-all ${
                          formData.color === color.id ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Assign To */}
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Assign To</label>
                  <select
                    value={formData.assigned_to}
                    onChange={e => setFormData(p => ({ ...p, assigned_to: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border/30 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
                  >
                    <option value="">Unassigned</option>
                    {orgMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name || 'Anonymous'}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Tags</label>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-secondary/60 px-2 py-1 rounded-full flex items-center gap-1 text-muted-foreground">
                        #{tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-foreground">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      placeholder="Add tag..."
                      className="flex-1 bg-secondary/50 border border-border/30 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/40"
                    />
                    <button
                      onClick={addTag}
                      disabled={!tagInput.trim()}
                      className="px-2.5 py-1.5 text-xs bg-secondary/60 rounded-lg hover:bg-secondary/80 disabled:opacity-40 transition-colors"
                    >
                      <Tag className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-5">
                {editingEvent && (
                  <button
                    onClick={() => handleDelete(editingEvent.id)}
                    className="px-3 py-2 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {editingEvent && gcalConnected && !editingEvent.google_event_id && (
                  <button
                    onClick={() => { pushToGoogle(editingEvent); setShowEventModal(false); }}
                    className="px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Push to Google
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-xs rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.title.trim() || !formData.start_date || isSubmitting}
                  className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors font-medium"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
