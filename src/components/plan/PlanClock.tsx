import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { MONTHS } from '@/data/planGrgSeed';

export const TIMELINE_START = new Date(2026, 6, 1); // 1 Jul 2026
export const TIMELINE_END = new Date(2027, 1, 28, 23, 59, 59); // 28 Feb 2027

/** Index into MONTHS for a given date, or -1 when outside the plan window. */
export function currentMonthIndex(now: Date) {
  const idx = (now.getFullYear() - 2026) * 12 + now.getMonth() - 6;
  return idx >= 0 && idx < MONTHS.length ? idx : -1;
}

const KEY_DATES: { label: string; date: Date }[] = [
  { label: 'Submission to HANFA', date: new Date(2026, 9, 5) },
  { label: 'Completeness check done', date: new Date(2026, 10, 16) },
  { label: 'Target decision', date: new Date(2027, 0, 15) },
];

function fmtZagreb(d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zagreb', ...opts }).format(d);
}

const DAY = 86400000;

interface Props {
  milestones: { status?: string | null; data: { status?: string | null } }[];
}

export function PlanClock({ milestones }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const total = TIMELINE_END.getTime() - TIMELINE_START.getTime();
  const elapsed = now.getTime() - TIMELINE_START.getTime();
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));

  const done = milestones.filter((m) => (m.status ?? m.data.status) === 'done').length;
  const inProgress = milestones.filter((m) => (m.status ?? m.data.status) === 'in_progress').length;
  const donePct = milestones.length ? (done / milestones.length) * 100 : 0;

  const mIdx = currentMonthIndex(now);
  const phaseLabel =
    mIdx === -1
      ? now < TIMELINE_START
        ? 'Before kick-off'
        : 'Past the planned window'
      : `Month ${mIdx + 1} of ${MONTHS.length} · ${MONTHS[mIdx]}`;

  const next = KEY_DATES.find((k) => k.date.getTime() > now.getTime());
  const daysLeft = Math.ceil((TIMELINE_END.getTime() - now.getTime()) / DAY);

  return (
    <div className="glass-panel divide-y divide-border/50 overflow-hidden">
      {/* Row 1 — clock */}
      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Now · Zagreb
          </p>
          <p className="text-2xl font-semibold tabular-nums leading-tight">
            {fmtZagreb(now, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </p>
          <p className="text-sm text-muted-foreground">
            {fmtZagreb(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Where we are</p>
          <p className="text-2xl font-semibold leading-tight">{mIdx === -1 ? '—' : MONTHS[mIdx]}</p>
          <p className="text-sm text-muted-foreground">{phaseLabel}</p>
        </div>
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Time remaining</p>
          <p className="text-2xl font-semibold tabular-nums leading-tight">
            {daysLeft > 0 ? daysLeft : 0} <span className="text-base font-normal">days</span>
          </p>
          <p className="text-sm text-muted-foreground">to end of target decision window</p>
        </div>
      </div>

      {/* Row 2 — timeline bar */}
      <div className="p-4 space-y-2">
        <div className="flex justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>Jul 2026</span>
          <span className="tabular-nums normal-case">{pct.toFixed(1)}% of timeline elapsed</span>
          <span>Feb 2027</span>
        </div>
        <div className="relative h-2.5 rounded-full bg-secondary/60 overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
          {KEY_DATES.map((k) => {
            const p = ((k.date.getTime() - TIMELINE_START.getTime()) / total) * 100;
            if (p < 0 || p > 100) return null;
            return (
              <span
                key={k.label}
                title={`${k.label} · ${fmtZagreb(k.date, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                className="absolute top-0 h-full w-px bg-foreground/50"
                style={{ left: `${p}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Row 3 — stats */}
      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50 text-sm">
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Milestone progress</p>
          <div className="h-2 rounded-full bg-secondary/60 overflow-hidden mb-2">
            <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${donePct}%` }} />
          </div>
          <p className="text-muted-foreground tabular-nums">
            {done} done · {inProgress} in progress · {milestones.length} total
          </p>
        </div>
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Next key date</p>
          {next ? (
            <>
              <p className="font-medium">{next.label}</p>
              <p className="text-muted-foreground tabular-nums">
                {fmtZagreb(next.date, { day: 'numeric', month: 'long', year: 'numeric' })} ·{' '}
                {Math.ceil((next.date.getTime() - now.getTime()) / DAY)} days
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">All key dates passed</p>
          )}
        </div>
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Schedule health</p>
          <p className={`font-medium ${donePct + 5 >= pct ? 'text-emerald-500' : 'text-amber-500'}`}>
            {donePct + 5 >= pct ? 'On track' : 'Behind plan'}
          </p>
          <p className="text-muted-foreground tabular-nums">
            {donePct.toFixed(0)}% delivered vs {pct.toFixed(0)}% time used
          </p>
        </div>
      </div>
    </div>

  );
}
