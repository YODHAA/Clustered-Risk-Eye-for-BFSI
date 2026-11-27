import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KanbanStage, RiskTicket } from '../types/risk';

interface RiskOpsKanbanViewProps {
  tickets: RiskTicket[];
  onMoveTicketStage: (ticketId: string, newStage: KanbanStage) => void;
  onSelectTicketForGraph: (ticketId: string) => void;
  onFreezeTicket: (ticket: RiskTicket) => void;
  onCreateTicket: (ticket: RiskTicket) => void;
  onToggleSubTask: (ticketId: string, subTaskId: string) => void;
  onSwitchToGraph: () => void;
  onNotify: (title: string, message: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
  nextTicketNumber: number;
}

type SubView = 'kanban' | 'matrix' | 'audit' | 'bubble';

const STAGES: {
  id: KanbanStage;
  title: string;
  dotColor: string;
  highlighted?: boolean;
}[] = [
  { id: 'triggered', title: 'TRIGGERED', dotColor: 'bg-primary' },
  { id: 'triage', title: 'IN TRIAGE', dotColor: 'bg-secondary' },
  { id: 'mitigation', title: 'ACTIVE MITIGATION', dotColor: 'bg-error animate-ping', highlighted: true },
  { id: 'verification', title: 'VERIFICATION & QA', dotColor: 'bg-tertiary-container' },
  { id: 'closed', title: 'CLOSED & RESOLVED', dotColor: 'bg-secondary' },
];

export const RiskOpsKanbanView: React.FC<RiskOpsKanbanViewProps> = ({
  tickets,
  onMoveTicketStage,
  onSelectTicketForGraph,
  onFreezeTicket,
  onCreateTicket,
  onToggleSubTask,
  onSwitchToGraph,
  onNotify,
  nextTicketNumber,
}) => {
  const [subView, setSubView] = useState<SubView>('kanban');
  const [swimlanes, setSwimlanes] = useState(false);
  const [corridorFilter, setCorridorFilter] = useState('All Corridors (Global)');
  const [typologyFilter, setTypologyFilter] = useState('All Typologies');
  const [toleranceFilter, setToleranceFilter] = useState<'all' | 'breach' | 'warning' | 'within'>(
    'all'
  );
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState('');
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<KanbanStage | null>(null);

  // Live SLA timer for CRE-8942
  const [secondsLeft, setSecondsLeft] = useState(14 * 60 + 32);
  // Log Risk Trigger Modal
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [newSummary, setNewSummary] = useState('');
  const [newTypology, setNewTypology] = useState<RiskTicket['typology']>('Synthetic ID');
  const [newAmount, setNewAmount] = useState('15000000');
  const [newAssignee, setNewAssignee] = useState('ER');
  const [newSlaTier, setNewSlaTier] = useState<'P1' | 'P2' | 'P3'>('P1');

  const quickSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          target.blur();
          setLogModalOpen(false);
        }
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setLogModalOpen(true);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const core = tickets.find((t) => t.key === 'CRE-8942');
        if (core) onFreezeTicket(core);
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        onSwitchToGraph();
      } else if (e.key === '/') {
        e.preventDefault();
        quickSearchRef.current?.focus();
      } else if (e.key === 'Escape') {
        setLogModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tickets, onFreezeTicket, onSwitchToGraph]);

  const formatTimer = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (corridorFilter !== 'All Corridors (Global)') {
        const c = t.corridor.toLowerCase();
        const j = t.jurisdiction.toLowerCase();
        if (corridorFilter === 'APAC & ASEAN Direct' && !c.includes('singapore') && !c.includes('hong kong') && !j.includes('mas') && !j.includes('hkma')) return false;
        if (corridorFilter === 'EMEA Clearing / TARGET2' && !c.includes('target2') && !c.includes('london') && !c.includes('emea') && !c.includes('swiss')) return false;
        if (corridorFilter === 'Americas Fedwire / CHIPS' && !c.includes('chips') && !c.includes('fednow') && !c.includes('fedwire')) return false;
        if (corridorFilter === 'LatAm Cross-Border' && !c.includes('são paulo') && !c.includes('latam') && !j.includes('bcb')) return false;
      }
      if (typologyFilter !== 'All Typologies' && t.typology !== typologyFilter) return false;
      if (toleranceFilter === 'breach' && t.severity !== 'critical') return false;
      if (toleranceFilter === 'warning' && t.severity !== 'warning' && t.severity !== 'crypto') return false;
      if (toleranceFilter === 'within' && t.severity !== 'nominal') return false;
      if (ownerFilter && t.assignee.initials !== ownerFilter) return false;
      if (quickFilter.trim()) {
        const q = quickFilter.trim().toLowerCase();
        if (
          !t.key.toLowerCase().includes(q) &&
          !t.title.toLowerCase().includes(q) &&
          !t.corridor.toLowerCase().includes(q) &&
          !t.typology.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [tickets, corridorFilter, typologyFilter, toleranceFilter, ownerFilter, quickFilter]);

  const activePipelineSum = useMemo(() => {
    const sum = tickets
      .filter((t) => t.stage !== 'closed')
      .reduce((acc, t) => acc + t.exposureM, 0);
    return sum.toFixed(1);
  }, [tickets]);

  const handleExportAuditCsv = () => {
    const rows = [
      ['Ticket Key', 'Title', 'Typology', 'Corridor', 'Exposure ($M)', 'Stage', 'Status'],
      ...tickets.map((t) => [
        t.key,
        `"${t.title.replace(/"/g, '""')}"`,
        t.typology,
        t.corridor,
        t.exposureM.toFixed(2),
        t.stage.toUpperCase(),
        t.statusLabel,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `basel-riskops-audit-dossier-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Basel Dossier Exported', 'CSV risk audit ledger downloaded.', 'success');
  };

  const handlePublishRiskTrigger = () => {
    const numericUsd = Number(newAmount.replace(/[^0-9.]/g, '')) || 15000000;
    const exposureM = Number((numericUsd / 1_000_000).toFixed(2));
    const key = `CRE-${nextTicketNumber}`;
    const ownerMap: Record<string, { name: string; initials: string; role: string }> = {
      ER: { name: 'Elena Rostova', initials: 'ER', role: 'Lead APAC' },
      JV: { name: 'Sir Julian Vance', initials: 'JV', role: 'Group CRO' },
      SR: { name: 'Siddharth Rao', initials: 'SR', role: 'SecOps' },
    };
    const owner = ownerMap[newAssignee] ?? ownerMap.ER;

    onCreateTicket({
      id: key,
      key,
      title: newSummary.trim() || 'Unusual Fedwire settlement variance in NY-Lon corridor',
      shortTitle: (newSummary.trim() || 'New Risk Trigger').slice(0, 28),
      orbitId:
        newTypology === 'TBML'
          ? 'beta'
          : newTypology === 'Micro-Smurfing'
          ? 'gamma'
          : newTypology === 'Crypto Gateway'
          ? 'delta'
          : 'alpha',
      typology: newTypology,
      corridor: 'NY-Lon Fedwire',
      jurisdiction: 'Fed / PRA',
      severity: newSlaTier === 'P1' ? 'critical' : newSlaTier === 'P2' ? 'warning' : 'nominal',
      statusLabel: newSlaTier === 'P1' ? 'DEFCON 1: BREACH' : 'IN TRIAGE',
      riskScore: newSlaTier === 'P1' ? 91.2 : 74.0,
      exposureM,
      limitM: 10.0,
      txVelocity: 14.5,
      slaSeconds: newSlaTier === 'P1' ? 2700 : 7200,
      slaDisplay: newSlaTier === 'P1' ? '00:45:00' : '02:00:00',
      assignee: owner,
      reporter: 'RiskOps Manual Trigger',
      density: 4,
      stage: 'triggered',
      priority: newSlaTier,
      rootCauseSummary: 'Triggered manually from RiskOps Kanban command desk.',
      confidence: 90.0,
      rules: ['CRE-MANUAL-01'],
      x: 410,
      y: 350,
      radiusPx: 110,
      parentKey: 'CRE-8942',
      subTasks: [],
      auditTrail: [],
    });

    setNewSummary('');
    setLogModalOpen(false);
  };

  return (
    <div className="flex flex-col w-full pb-20">
      {/* Controls & Threat Vector Header Bar */}
      <div className="w-full bg-surface-container-lowest px-4 py-3 shadow-sm border-b border-outline-variant/30">
        <div className="flex flex-col gap-3">
          {/* Top Action Strip & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg flex-wrap">
              {(
                [
                  { id: 'kanban', icon: 'view_kanban', label: 'Kanban Board' },
                  { id: 'matrix', icon: 'grid_view', label: 'SLA Exposure Matrix' },
                  { id: 'audit', icon: 'table_rows', label: 'Audit Trail List' },
                  { id: 'bubble', icon: 'bubble_chart', label: 'Bubble Density Map' },
                ] as const
              ).map((tab) => {
                const active = subView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSubView(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded font-label-md transition-all whitespace-nowrap ${
                      active
                        ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Metric Snapshots */}
            <div className="hidden xl:flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-mono-metric-sm bg-surface-container-low px-2.5 py-1 rounded">
                <span className="text-on-surface-variant">ACTIVE PIPELINE:</span>
                <span className="font-semibold text-on-surface">${activePipelineSum}M</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono-metric-sm bg-surface-container-low px-2.5 py-1 rounded">
                <span className="text-on-surface-variant">BREACH PROXIMITY:</span>
                <span className="text-error font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />3 CRITICAL
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono-metric-sm bg-surface-container-low px-2.5 py-1 rounded">
                <span className="text-on-surface-variant">AVG MTTR:</span>
                <span className="font-semibold text-secondary">3h 24m</span>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSwimlanes((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 h-8 rounded font-body-md transition-colors whitespace-nowrap ${
                  swimlanes
                    ? 'bg-secondary text-on-secondary font-semibold'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>{swimlanes ? 'Priority Swimlanes: ON' : 'Swimlanes'}</span>
              </button>
              <button
                type="button"
                onClick={() => setLogModalOpen(true)}
                className="flex items-center gap-1.5 px-3 h-8 bg-primary hover:bg-primary-container text-on-primary rounded font-label-md font-semibold shadow-sm transition-all whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Log Risk Trigger / Issue</span>
                <span className="bg-primary-container/40 text-on-primary text-[10px] px-1 rounded font-mono-metric-sm">
                  C
                </span>
              </button>
            </div>
          </div>

          {/* SLA Threat Vector Banner */}
          <div className="relative overflow-hidden bg-error-container/20 border border-error/20 rounded-xl p-3 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start lg:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-error flex items-center justify-center text-on-error shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[20px] animate-pulse">
                    crisis_alert
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-headline-sm font-semibold text-on-error-container">
                      SLA Threat Vector: 3 High-Yield Exposure Incidents Approaching Critical
                      Threshold (&lt;45m)
                    </span>
                    <span className="bg-error text-on-error font-mono-metric-sm font-semibold px-2 py-0.5 rounded">
                      DEFCON 2
                    </span>
                  </div>
                  <p className="font-body-sm text-on-surface-variant mt-0.5">
                    Total At-Risk Liquidity:{' '}
                    <span className="font-mono-metric-sm text-on-surface font-semibold">
                      $67.40M
                    </span>{' '}
                    across APAC Corridor and Swiss Clearinghouse hubs. Regulatory reporting
                    mandatory if unresolved.
                  </p>
                </div>
              </div>

              {/* Urgency Progress Breakdown Strip */}
              <div className="flex flex-col min-w-[280px] lg:w-80 gap-1.5">
                <div className="flex justify-between font-mono-metric-sm">
                  <span className="text-error font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-error" /> 3 Imminent Breach
                  </span>
                  <span className="text-on-surface-variant">5 Warning</span>
                  <span className="text-secondary font-semibold">18 Nominal</span>
                </div>
                <div className="w-full h-2 rounded bg-surface-container flex overflow-hidden">
                  <div className="h-full bg-error w-[15%]" title="Imminent Breach (15%)" />
                  <div className="h-full bg-tertiary-container w-[25%]" title="Warning (25%)" />
                  <div className="h-full bg-secondary w-[60%]" title="Nominal (60%)" />
                </div>
                <div className="flex justify-between text-[10px] font-mono-metric-sm text-on-surface-variant">
                  <span>T-{formatTimer(secondsLeft)} Fastest Expiry</span>
                  <span>Cluster Velocity: +14% / hr</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-surface-container-low px-2.5 py-1 rounded gap-1.5">
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                  public
                </span>
                <span className="font-label-md text-on-surface-variant">Corridor:</span>
                <select
                  value={corridorFilter}
                  onChange={(e) => setCorridorFilter(e.target.value)}
                  className="bg-transparent font-label-md text-on-surface focus:outline-none cursor-pointer"
                >
                  <option>All Corridors (Global)</option>
                  <option>APAC &amp; ASEAN Direct</option>
                  <option>EMEA Clearing / TARGET2</option>
                  <option>Americas Fedwire / CHIPS</option>
                  <option>LatAm Cross-Border</option>
                </select>
              </div>

              <div className="flex items-center bg-surface-container-low px-2.5 py-1 rounded gap-1.5">
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                  category
                </span>
                <span className="font-label-md text-on-surface-variant">Typology:</span>
                <select
                  value={typologyFilter}
                  onChange={(e) => setTypologyFilter(e.target.value)}
                  className="bg-transparent font-label-md text-on-surface focus:outline-none cursor-pointer"
                >
                  <option value="All Typologies">All Typologies (12)</option>
                  <option value="Synthetic ID">Synthetic Identity Ring</option>
                  <option value="TBML">Trade Doc Forgery / TBML</option>
                  <option value="Micro-Smurfing">Structuring / Micro-Smurfing</option>
                  <option value="Crypto Gateway">Crypto Gateway / Liquidity</option>
                </select>
              </div>

              {/* Tolerance Filter */}
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded">
                <span className="font-label-md text-on-surface-variant px-1">Tolerance:</span>
                {(
                  [
                    { id: 'all', label: `ALL (${tickets.length})` },
                    { id: 'breach', label: `BREACH (${tickets.filter((t) => t.severity === 'critical').length})` },
                    { id: 'warning', label: `WARNING (${tickets.filter((t) => t.severity === 'warning' || t.severity === 'crypto').length})` },
                    { id: 'within', label: `WITHIN (${tickets.filter((t) => t.severity === 'nominal').length})` },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setToleranceFilter(item.id)}
                    className={`px-2 py-0.5 rounded font-mono-metric-sm transition-colors ${
                      toleranceFilter === item.id
                        ? item.id === 'breach'
                          ? 'bg-error-container text-on-error-container font-semibold'
                          : 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Owner Avatar Filters */}
              <div className="flex items-center gap-1 pl-1">
                <span className="font-label-md text-on-surface-variant mr-1">Owner:</span>
                {[
                  { initials: 'ER', title: 'Elena Rostova (Lead)', bg: 'bg-primary text-on-primary' },
                  { initials: 'JV', title: 'Julian Vance (CRO)', bg: 'bg-secondary text-on-secondary' },
                  { initials: 'SR', title: 'Siddharth Rao (SecOps)', bg: 'bg-tertiary-container text-on-tertiary-container' },
                ].map((o) => {
                  const active = ownerFilter === o.initials;
                  return (
                    <button
                      key={o.initials}
                      type="button"
                      title={o.title}
                      onClick={() => setOwnerFilter((prev) => (prev === o.initials ? null : o.initials))}
                      className={`w-6 h-6 rounded-full text-[10px] font-mono-metric-sm flex items-center justify-center shadow-sm transition-transform ${
                        o.bg
                      } ${active ? 'ring-2 ring-primary scale-110' : 'opacity-85 hover:opacity-100'}`}
                    >
                      {o.initials}
                    </button>
                  );
                })}
                {ownerFilter && (
                  <button
                    type="button"
                    onClick={() => setOwnerFilter(null)}
                    className="text-[11px] font-mono-metric-sm text-primary hover:underline ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                search
              </span>
              <input
                ref={quickSearchRef}
                type="text"
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value)}
                placeholder="Filter tickets, hash, entity... [/]"
                className="w-full h-7 pl-8 pr-7 bg-surface-container-low rounded font-body-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest border border-outline-variant/40 focus:border-primary transition-colors"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono-metric-sm text-[10px] text-on-surface-variant bg-surface-container px-1 rounded">
                /
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: KANBAN BOARD */}
      {subView === 'kanban' && (
        <div className="w-full px-4 py-4">
          {swimlanes && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 font-label-md text-primary flex items-center justify-between">
              <span>
                Priority Swimlane Mode Active: Cards sorted by P1 Critical Exposure → P2 Elevated → P3 Monitoring
              </span>
              <button
                type="button"
                onClick={() => setSwimlanes(false)}
                className="font-semibold underline"
              >
                Standard Columns
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 items-start">
            {STAGES.map((stage) => {
              const colTickets = filteredTickets
                .filter((t) => t.stage === stage.id)
                .sort((a, b) =>
                  swimlanes ? a.priority.localeCompare(b.priority) : b.exposureM - a.exposureM
                );
              const colSum = colTickets.reduce((acc, t) => acc + t.exposureM, 0);

              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStage(stage.id);
                  }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedTicketId) {
                      onMoveTicketStage(draggedTicketId, stage.id);
                    }
                    setDraggedTicketId(null);
                    setDragOverStage(null);
                  }}
                  className={`flex flex-col rounded-xl p-2.5 transition-all ${
                    stage.highlighted
                      ? 'bg-surface-container shadow-md ring-2 ring-error/50'
                      : 'bg-surface-container-low shadow-sm'
                  } ${dragOverStage === stage.id ? 'ring-2 ring-primary bg-primary-fixed/20' : ''}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                      <span
                        className={`font-headline-sm text-on-surface ${
                          stage.highlighted ? 'font-bold' : 'font-semibold'
                        }`}
                      >
                        {stage.title}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono-metric-sm font-bold ${
                          stage.highlighted
                            ? 'bg-error text-on-error'
                            : 'bg-surface-container text-on-surface'
                        }`}
                      >
                        {colTickets.length}
                      </span>
                    </div>
                    <span
                      className={`font-mono-metric-sm font-semibold ${
                        stage.highlighted ? 'text-error font-bold' : 'text-on-surface-variant'
                      }`}
                    >
                      ${colSum.toFixed(1)}M
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2.5">
                    {colTickets.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed border-outline-variant/50 text-center font-body-sm text-on-surface-variant">
                        Drop ticket here
                      </div>
                    ) : (
                      colTickets.map((ticket) => {
                        const isFeatured = ticket.key === 'CRE-8942';
                        const completedSub = ticket.subTasks.filter((s) => s.completed).length;

                        if (isFeatured) {
                          return (
                            <div
                              key={ticket.id}
                              draggable
                              onDragStart={() => setDraggedTicketId(ticket.id)}
                              className="group relative bg-surface-container-lowest rounded-lg p-3 shadow-md ring-1 ring-error transition-all"
                            >
                              <div className="flex items-start justify-between gap-1 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onSelectTicketForGraph(ticket.id)}
                                    className="bg-error text-on-error px-2 py-0.5 rounded font-mono-metric-sm font-bold hover:opacity-90"
                                  >
                                    {ticket.key}
                                  </button>
                                  <span className="bg-error-container text-on-error-container text-[10px] font-mono-metric-sm font-bold px-1.5 py-0.5 rounded">
                                    DEFCON 1
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 bg-error-container/60 text-on-error-container px-2 py-0.5 rounded-full shadow-sm">
                                  <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                                  <span className="font-mono-metric-sm font-bold">
                                    D:{ticket.density}
                                  </span>
                                </div>
                              </div>

                              <h4
                                onClick={() => onSelectTicketForGraph(ticket.id)}
                                className="font-headline-sm text-body-lg text-on-surface font-bold leading-snug cursor-pointer hover:text-primary"
                              >
                                {ticket.title}
                              </h4>

                              <div className="flex flex-wrap items-center gap-1.5 my-2">
                                <span className="px-2 py-0.5 rounded bg-error text-on-error font-mono-metric-sm font-bold">
                                  ${ticket.exposureM.toFixed(2)}M EXPOSURE
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono-metric-sm text-on-surface-variant">
                                  {ticket.corridor}
                                </span>
                              </div>

                              {/* Live SLA Countdown */}
                              <div className="bg-error-container/30 rounded-lg p-2.5 my-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-error text-[20px]">
                                    timer
                                  </span>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-wider">
                                      Breach Countdown
                                    </span>
                                    <span className="font-mono-metric-lg text-error font-bold leading-none">
                                      {ticket.frozen ? 'FROZEN' : formatTimer(secondsLeft)}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onFreezeTicket(ticket)}
                                  className={`px-2.5 py-1 rounded font-label-md font-semibold transition-colors flex items-center gap-1 ${
                                    ticket.frozen
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-error hover:bg-on-error-container text-on-error'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    lock_clock
                                  </span>
                                  <span>{ticket.frozen ? 'Frozen' : 'Freeze Hub'}</span>
                                </button>
                              </div>

                              {/* Mitigation Directives */}
                              <div className="flex flex-col gap-1 my-2">
                                <div className="flex items-center justify-between text-[11px] font-mono-metric-sm text-on-surface-variant">
                                  <span>Mitigation Directives</span>
                                  <span className="text-primary font-semibold">
                                    {completedSub} of {ticket.subTasks.length} completed
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden flex">
                                  <div
                                    className="h-full bg-primary transition-all"
                                    style={{
                                      width: `${
                                        ticket.subTasks.length
                                          ? Math.round((completedSub / ticket.subTasks.length) * 100)
                                          : 60
                                      }%`,
                                    }}
                                  />
                                </div>
                                <ul className="text-[11px] font-body-sm text-on-surface-variant space-y-1 mt-1">
                                  {ticket.subTasks.slice(0, 3).map((st) => (
                                    <li
                                      key={st.id}
                                      onClick={() => onToggleSubTask(ticket.id, st.id)}
                                      className="flex items-center gap-1 cursor-pointer hover:text-primary"
                                    >
                                      <span
                                        className={`material-symbols-outlined text-[14px] ${
                                          st.completed ? 'text-secondary' : 'text-error'
                                        }`}
                                      >
                                        {st.completed ? 'check_circle' : 'pending'}
                                      </span>
                                      <span
                                        className={
                                          st.completed ? 'line-through opacity-75' : 'text-on-surface'
                                        }
                                      >
                                        {st.title}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-surface-container-low text-on-surface-variant font-mono-metric-sm">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-[11px] flex items-center justify-center font-bold">
                                    {ticket.assignee.initials}
                                  </span>
                                  <span className="text-body-sm font-medium text-on-surface">
                                    {ticket.assignee.name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onSelectTicketForGraph(ticket.id)}
                                  className="flex items-center gap-0.5 text-primary text-[11px] font-semibold hover:underline"
                                >
                                  <span className="material-symbols-outlined text-[13px]">hub</span>
                                  9 Nodes
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={ticket.id}
                            draggable
                            onDragStart={() => setDraggedTicketId(ticket.id)}
                            className="group relative bg-surface-container-lowest rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border border-outline-variant/20"
                          >
                            <div className="flex items-start justify-between gap-1 mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onSelectTicketForGraph(ticket.id)}
                                  className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono-metric-sm font-semibold hover:bg-primary hover:text-on-primary transition-colors"
                                >
                                  {ticket.key}
                                </button>
                                <span
                                  className={`material-symbols-outlined text-[15px] ${
                                    ticket.priority === 'P1'
                                      ? 'text-error'
                                      : ticket.stage === 'closed'
                                      ? 'text-secondary'
                                      : 'text-tertiary-container'
                                  }`}
                                >
                                  {ticket.stage === 'closed'
                                    ? 'check_circle'
                                    : ticket.priority === 'P1'
                                    ? 'keyboard_double_arrow_up'
                                    : 'arrow_upward'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 bg-surface-container-low px-1.5 py-0.5 rounded-full">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    ticket.severity === 'critical'
                                      ? 'bg-error animate-pulse'
                                      : ticket.severity === 'warning'
                                      ? 'bg-amber-500'
                                      : 'bg-secondary'
                                  }`}
                                />
                                <span className="font-mono-metric-sm text-[10px] font-bold">
                                  D:{ticket.density}
                                </span>
                              </div>
                            </div>

                            <h4
                              onClick={() => onSelectTicketForGraph(ticket.id)}
                              className="font-headline-sm text-body-md text-on-surface font-semibold line-clamp-2 group-hover:text-primary transition-colors cursor-pointer"
                            >
                              {ticket.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-1 my-2">
                              <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono-metric-sm text-on-surface-variant">
                                {ticket.corridor}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-mono-metric-sm font-semibold ${
                                  ticket.severity === 'critical'
                                    ? 'bg-error-container/40 text-on-error-container'
                                    : 'bg-surface-container-high text-primary'
                                }`}
                              >
                                ${ticket.exposureM.toFixed(2)}M
                              </span>
                            </div>

                            {ticket.dualKeyState && (
                              <div className="bg-secondary/5 rounded p-1.5 my-1 flex items-center justify-between text-body-sm">
                                <span className="text-secondary font-medium text-[11px] flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">
                                    vpn_key
                                  </span>
                                  {ticket.dualKeyState}
                                </span>
                                <span className="font-mono-metric-sm text-[10px] bg-secondary-fixed text-on-secondary-fixed px-1.5 py-0.5 rounded font-semibold">
                                  Key 2 Awaited
                                </span>
                              </div>
                            )}

                            {ticket.shaHash && (
                              <div className="bg-surface-container-low p-1.5 rounded flex items-center justify-between text-[10px] font-mono-metric-sm text-on-surface-variant my-1">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px] text-secondary">
                                    fingerprint
                                  </span>
                                  <span>{ticket.shaHash}</span>
                                </span>
                                <span className="text-secondary font-semibold">IMMUTABLE</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1.5 text-on-surface-variant font-mono-metric-sm">
                              <div
                                className={`flex items-center gap-1 ${
                                  ticket.severity === 'critical' ? 'text-error font-semibold' : ''
                                }`}
                              >
                                <span className="material-symbols-outlined text-[14px]">alarm</span>
                                <span>{ticket.slaDisplay}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {stage.id !== 'closed' && (
                                  <button
                                    type="button"
                                    title="Advance stage"
                                    onClick={() => {
                                      const idx = STAGES.findIndex((s) => s.id === stage.id);
                                      if (idx < STAGES.length - 1) {
                                        onMoveTicketStage(ticket.id, STAGES[idx + 1].id);
                                      }
                                    }}
                                    className="w-5 h-5 rounded bg-surface-container hover:bg-primary hover:text-on-primary flex items-center justify-center transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">
                                      arrow_forward
                                    </span>
                                  </button>
                                )}
                                <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] flex items-center justify-center font-bold">
                                  {ticket.assignee.initials}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: SLA EXPOSURE MATRIX */}
      {subView === 'matrix' && (
        <div className="w-full px-4 py-4">
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
              <div>
                <h3 className="font-headline-md text-on-surface font-semibold">
                  Real-Time SLA Exposure &amp; Breaching Heatmatrix
                </h3>
                <p className="font-body-md text-on-surface-variant">
                  Two-dimensional cross-tabulation of Typology Urgency vs Regulatory Jurisdictional
                  Exposure.
                </p>
              </div>
              <div className="flex items-center gap-3 font-mono-metric-sm">
                <span className="flex items-center gap-1 text-on-surface-variant">
                  <span className="w-3 h-3 rounded bg-surface-container" /> &lt; $5M
                </span>
                <span className="flex items-center gap-1 text-on-surface-variant">
                  <span className="w-3 h-3 rounded bg-surface-container-high" /> $5M–$20M
                </span>
                <span className="flex items-center gap-1 text-on-surface-variant">
                  <span className="w-3 h-3 rounded bg-tertiary-container" /> $20M–$50M
                </span>
                <span className="flex items-center gap-1 text-on-surface-variant">
                  <span className="w-3 h-3 rounded bg-error" /> &gt; $50M Critical
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-md uppercase">
                    <th className="p-3">Typology / Jurisdiction</th>
                    <th className="p-3 text-center">APAC (MAS / HKMA)</th>
                    <th className="p-3 text-center">EMEA (ECB / PRA)</th>
                    <th className="p-3 text-center">AMER (Fed / OCC)</th>
                    <th className="p-3 text-center">LATAM (BCB / CNBV)</th>
                    <th className="p-3 text-right">Aggregate SLA Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  <tr className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-3 font-semibold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        account_balance
                      </span>
                      <span>Unregistered Wire Funnels</span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectTicketForGraph('CRE-8942')}
                        className="inline-block px-3 py-1.5 rounded-lg bg-error text-on-error font-mono-metric-md font-bold shadow-sm hover:opacity-90"
                      >
                        $48.2M (T-14m)
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-3 py-1.5 rounded bg-surface-container font-mono-metric-md text-on-surface">
                        $2.4M (Nominal)
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-3 py-1.5 rounded bg-tertiary-container/20 text-on-surface font-mono-metric-md font-semibold">
                        $12.1M (T-82m)
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-3 py-1.5 rounded bg-surface-container font-mono-metric-md text-on-surface-variant">
                        -
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono-metric-md font-bold text-error">
                      $62.7M
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-3 font-semibold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[18px]">
                        badge
                      </span>
                      <span>Synthetic Identity Networks</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-3 py-1.5 rounded bg-surface-container font-mono-metric-md text-on-surface">
                        $4.1M
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-3 py-1.5 rounded bg-surface-container font-mono-metric-md text-on-surface-variant">
                        -
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-3 py-1.5 rounded bg-surface-container-high text-primary font-mono-metric-md font-semibold">
                        $8.3M
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectTicketForGraph('CRE-8995')}
                        className="inline-block px-3 py-1.5 rounded bg-error-container text-on-error-container font-mono-metric-md font-bold hover:opacity-90"
                      >
                        $9.4M (T-22m)
                      </button>
                    </td>
                    <td className="p-3 text-right font-mono-metric-md font-bold text-error">
                      $21.8M
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-3 font-semibold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary-container text-[18px]">
                        receipt_long
                      </span>
                      <span>Trade Documentation &amp; LC Forgery</span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectTicketForGraph('CRE-8912')}
                        className="inline-block px-3 py-1.5 rounded bg-surface-container-high text-primary font-mono-metric-md font-bold hover:bg-primary hover:text-on-primary transition-colors"
                      >
                        $11.2M (T-54m)
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-3 py-1.5 rounded bg-surface-container font-mono-metric-md text-on-surface">
                        $3.0M
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-3 py-1.5 rounded bg-surface-container font-mono-metric-md text-on-surface-variant">
                        -
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-3 py-1.5 rounded bg-surface-container font-mono-metric-md text-on-surface-variant">
                        -
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono-metric-md font-bold text-on-surface">
                      $14.2M
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: AUDIT TRAIL LIST */}
      {subView === 'audit' && (
        <div className="w-full px-4 py-4">
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
              <div>
                <h3 className="font-headline-md text-on-surface font-semibold">
                  Cryptographic Risk Event Audit Trail
                </h3>
                <p className="font-body-md text-on-surface-variant">
                  Immutable sequence ledger verified against dual-key institutional sign-offs.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportAuditCsv}
                className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded font-label-md font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                <span>Export Basel Dossier (.CSV)</span>
              </button>
            </div>

            <div className="space-y-2 font-mono-metric-sm">
              {tickets
                .filter((t) => t.stage === 'closed' || t.frozen || t.shaHash)
                .map((t, idx) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTicketForGraph(t.id)}
                    className="p-3 bg-surface-container-low hover:bg-surface-container rounded-lg flex items-center justify-between gap-4 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-[20px]">
                        lock
                      </span>
                      <div>
                        <span className="font-semibold text-on-surface">
                          {t.key} {t.title}
                        </span>
                        <p className="text-body-sm text-on-surface-variant">
                          Dual-sign: J. Vance (CRO) &amp; {t.assignee.name} • Stamped block #
                          {(9401223 - idx * 332).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-secondary font-bold">
                        ${(t.exposureM * 1_000_000).toLocaleString()} USD
                      </span>
                      <p className="text-on-surface-variant">
                        {t.remediatedAgo ? `Remediated ${t.remediatedAgo}` : 'Frozen & Verified'}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: BUBBLE DENSITY MAP */}
      {subView === 'bubble' && (
        <div className="w-full px-4 py-4">
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-headline-md text-on-surface font-semibold">
                  Cluster Bubble Density &amp; Threat Proximity
                </h3>
                <p className="font-body-md text-on-surface-variant">
                  Visualizing ticket concentration against remaining SLA survival time. Click any
                  bubble to inspect on Graph Canvas.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-error-container text-on-error-container font-mono-metric-sm font-bold">
                14 High-Density Clusters Breached
              </span>
            </div>

            <div className="w-full h-80 bg-surface-container-low rounded-xl flex items-center justify-center p-4 relative overflow-hidden">
              <svg className="w-full h-full" fill="none" viewBox="0 0 800 300">
                <line stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" x1="50" x2="750" y1="50" y2="50" />
                <line stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" x1="50" x2="750" y1="150" y2="150" />
                <line stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" x1="50" x2="750" y1="250" y2="250" />

                <g
                  className="cursor-pointer"
                  onClick={() => onSelectTicketForGraph('CRE-8942')}
                >
                  <circle cx="210" cy="120" fill="#ba1a1a" fillOpacity="0.88" r="56" />
                  <circle
                    cx="210"
                    cy="120"
                    r="64"
                    stroke="#ba1a1a"
                    strokeDasharray="6 4"
                    strokeWidth="2"
                  />
                  <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="12" fontWeight="bold" textAnchor="middle" x="210" y="114">
                    CRE-8942
                  </text>
                  <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle" x="210" y="132">
                    $48.2M • 14m
                  </text>
                </g>

                <g
                  className="cursor-pointer"
                  onClick={() => onSelectTicketForGraph('CRE-8995')}
                >
                  <circle cx="360" cy="185" fill="#007bb9" fillOpacity="0.88" r="38" />
                  <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold" textAnchor="middle" x="360" y="180">
                    CRE-8995
                  </text>
                  <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="360" y="198">
                    $9.4M • 22m
                  </text>
                </g>

                <g
                  className="cursor-pointer"
                  onClick={() => onSelectTicketForGraph('CRE-9014')}
                >
                  <circle cx="490" cy="95" fill="#0051d5" fillOpacity="0.88" r="44" />
                  <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold" textAnchor="middle" x="490" y="90">
                    CRE-9014
                  </text>
                  <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="490" y="108">
                    $18.6M • 31m
                  </text>
                </g>

                <g
                  className="cursor-pointer"
                  onClick={() => onSelectTicketForGraph('CRE-8890')}
                >
                  <circle cx="630" cy="160" fill="#545c72" fillOpacity="0.8" r="48" />
                  <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="11" fontWeight="bold" textAnchor="middle" x="630" y="155">
                    CRE-8890
                  </text>
                  <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" x="630" y="173">
                    $22.1M • 2h
                  </text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky SLA Compliance & Velocity Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-40 w-full bg-surface-container-lowest border-t border-outline-variant/40 px-4 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[18px]">speed</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-on-surface-variant">
                  Mean Time To Mitigate (MTTM)
                </span>
                <div className="flex items-center gap-1.5 font-mono-metric-md">
                  <span className="font-bold text-on-surface">3.4 hrs</span>
                  <span className="text-[11px] text-secondary font-semibold bg-secondary-fixed/50 px-1 rounded">
                    Target &lt; 4.0h
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-on-surface-variant">
                  Global SLA Compliance
                </span>
                <div className="flex items-center gap-1.5 font-mono-metric-md">
                  <span className="font-bold text-on-surface">96.2%</span>
                  <span className="text-[11px] text-secondary font-semibold">+0.8% DoD</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-tertiary-container/10 flex items-center justify-center text-tertiary-container">
                <span className="material-symbols-outlined text-[18px]">trending_up</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-on-surface-variant">
                  Escalation Velocity
                </span>
                <div className="flex items-center gap-1.5 font-mono-metric-md">
                  <span className="font-bold text-on-surface">14.2 tx/hr</span>
                  <span className="text-[11px] text-error font-semibold">High Activity</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-on-surface-variant font-mono-metric-sm">
            <span className="text-[11px]">KEYBOARD SHORTCUTS:</span>
            <button
              type="button"
              onClick={() => setLogModalOpen(true)}
              className="flex items-center gap-1 hover:text-primary"
            >
              <kbd className="px-1.5 py-0.5 bg-surface-container-low text-on-surface rounded shadow-sm text-[10px] font-semibold">
                C
              </kbd>
              <span>Create</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const core = tickets.find((t) => t.key === 'CRE-8942');
                if (core) onFreezeTicket(core);
              }}
              className="flex items-center gap-1 hover:text-error"
            >
              <kbd className="px-1.5 py-0.5 bg-surface-container-low text-on-surface rounded shadow-sm text-[10px] font-semibold">
                F
              </kbd>
              <span>Freeze</span>
            </button>
            <button
              type="button"
              onClick={onSwitchToGraph}
              className="flex items-center gap-1 hover:text-primary"
            >
              <kbd className="px-1.5 py-0.5 bg-surface-container-low text-on-surface rounded shadow-sm text-[10px] font-semibold">
                G
              </kbd>
              <span>Graph Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => quickSearchRef.current?.focus()}
              className="flex items-center gap-1 hover:text-primary"
            >
              <kbd className="px-1.5 py-0.5 bg-surface-container-low text-on-surface rounded shadow-sm text-[10px] font-semibold">
                /
              </kbd>
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Log New Risk Trigger Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-[60] bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-xl w-full p-5 shadow-xl border border-outline-variant/60 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <h3 className="font-headline-md text-on-surface font-semibold">
                  Initiate New Risk Trigger Issue
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
                className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 font-body-sm">
              <div>
                <label className="block font-label-md text-on-surface-variant mb-1">
                  Risk Ticket Summary
                </label>
                <input
                  type="text"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="e.g. Unusual Fedwire settlement variance in NY-Lon corridor"
                  className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/40 rounded font-body-md text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1">
                    Exposure Typology
                  </label>
                  <select
                    value={newTypology}
                    onChange={(e) => setNewTypology(e.target.value as RiskTicket['typology'])}
                    className="w-full h-9 px-2 bg-surface-container-low border border-outline-variant/40 rounded font-body-md text-on-surface focus:outline-none"
                  >
                    <option value="Synthetic ID">Synthetic ID Ring</option>
                    <option value="TBML">Trade Doc Discrepancy (TBML)</option>
                    <option value="Micro-Smurfing">Structuring / Micro-Smurfing</option>
                    <option value="Crypto Gateway">Crypto Gateway Drift</option>
                  </select>
                </div>

                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1">
                    Est. At-Risk Capital ($USD)
                  </label>
                  <input
                    type="text"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="15000000"
                    className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/40 rounded font-mono-metric-sm text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1">
                    Lead Risk Investigator
                  </label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full h-9 px-2 bg-surface-container-low border border-outline-variant/40 rounded font-body-md text-on-surface focus:outline-none"
                  >
                    <option value="ER">Elena Rostova (Lead APAC)</option>
                    <option value="JV">Sir Julian Vance (Group CRO)</option>
                    <option value="SR">Siddharth Rao (SecOps)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1">
                    Target SLA Max Threshold
                  </label>
                  <select
                    value={newSlaTier}
                    onChange={(e) => setNewSlaTier(e.target.value as 'P1' | 'P2' | 'P3')}
                    className="w-full h-9 px-2 bg-surface-container-low border border-outline-variant/40 rounded font-body-md text-on-surface focus:outline-none"
                  >
                    <option value="P1">45 Minutes (Critical P1)</option>
                    <option value="P2">2 Hours (Standard P2)</option>
                    <option value="P3">4 Hours (Monitoring P3)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
                className="px-3 h-8 bg-surface-container hover:bg-surface-container-high text-on-surface rounded font-label-md font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishRiskTrigger}
                className="px-4 h-8 bg-primary hover:bg-primary-container text-on-primary rounded font-label-md font-semibold shadow-sm"
              >
                Publish Incident &amp; Arm Timers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
