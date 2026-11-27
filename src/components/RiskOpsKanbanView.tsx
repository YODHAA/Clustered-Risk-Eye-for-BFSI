import React, { useEffect, useMemo, useRef, useState } from 'react';
import { INITIAL_ORBITS, RISK_REGIONS } from '../data/initialRiskData';
import { KanbanStage, OrbitId, RiskRegion, RiskTicket } from '../types/risk';

interface RiskOpsKanbanViewProps {
  tickets: RiskTicket[];
  onMoveTicketStage: (ticketId: string, newStage: KanbanStage) => void;
  onSelectTicketForGraph: (ticketId: string) => void;
  onFreezeTicket: (ticket: RiskTicket) => void;
  onCreateTicket: (ticket: RiskTicket) => void;
  onToggleSubTask: (ticketId: string, subTaskId: string) => void;
  onSwitchToGraph: () => void;
  onExportPdf: () => void;
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

const REGION_TO_ORBIT: Record<RiskRegion, OrbitId> = {
  APAC: 'apac',
  US: 'us',
  UK: 'uk',
  Europe: 'europe',
  'Middle East': 'middle-east',
};

const REGION_CORRIDOR_DEFAULT: Record<RiskRegion, { corridor: string; jurisdiction: string }> = {
  APAC: { corridor: 'HKMA / MAS', jurisdiction: 'HK / Singapore' },
  US: { corridor: 'Fedwire / CHIPS', jurisdiction: 'Fed / OCC' },
  UK: { corridor: 'London Faster Payments', jurisdiction: 'FCA / PRA' },
  Europe: { corridor: 'TARGET2-EUR', jurisdiction: 'ECB / BaFin' },
  'Middle East': { corridor: 'DIFC / ADGM', jurisdiction: 'DFSA / CBUAE' },
};

const TYPOLOGY_ROWS: { label: string; typology: RiskTicket['typology']; icon: string }[] = [
  { label: 'Synthetic Identity Rings', typology: 'Synthetic ID', icon: 'badge' },
  { label: 'Trade Doc & Invoice Drift (TBML)', typology: 'TBML', icon: 'receipt_long' },
  { label: 'Micro-Smurfing / Structuring', typology: 'Micro-Smurfing', icon: 'account_balance' },
  { label: 'Crypto Gateway / VASP Bridge', typology: 'Crypto Gateway', icon: 'currency_bitcoin' },
];

export const RiskOpsKanbanView: React.FC<RiskOpsKanbanViewProps> = ({
  tickets,
  onMoveTicketStage,
  onSelectTicketForGraph,
  onFreezeTicket,
  onCreateTicket,
  onToggleSubTask,
  onSwitchToGraph,
  onExportPdf,
  onNotify,
  nextTicketNumber,
}) => {
  const [subView, setSubView] = useState<SubView>('kanban');
  const [swimlanes, setSwimlanes] = useState(false);
  const [regionFilter, setRegionFilter] = useState<'All Regions' | RiskRegion>('All Regions');
  const [typologyFilter, setTypologyFilter] = useState('All Typologies');
  const [toleranceFilter, setToleranceFilter] = useState<'all' | 'breach' | 'warning' | 'within'>(
    'all'
  );
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState('');
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<KanbanStage | null>(null);

  const [secondsLeft, setSecondsLeft] = useState(14 * 60 + 32);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [newSummary, setNewSummary] = useState('');
  const [newRegion, setNewRegion] = useState<RiskRegion>('APAC');
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
      if (regionFilter !== 'All Regions' && t.region !== regionFilter) return false;
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
          !t.region.toLowerCase().includes(q) &&
          !t.corridor.toLowerCase().includes(q) &&
          !t.typology.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [tickets, regionFilter, typologyFilter, toleranceFilter, ownerFilter, quickFilter]);

  const activePipelineSum = useMemo(() => {
    return tickets
      .filter((t) => t.stage !== 'closed')
      .reduce((acc, t) => acc + t.exposureM, 0)
      .toFixed(1);
  }, [tickets]);

  const criticalCount = useMemo(
    () => tickets.filter((t) => t.severity === 'critical' && !t.frozen).length,
    [tickets]
  );

  const regionalEpicBubbles = useMemo(() => {
    const coords: Record<RiskRegion, { cx: number; cy: number; fill: string }> = {
      APAC: { cx: 140, cy: 130, fill: '#ba1a1a' },
      US: { cx: 295, cy: 165, fill: '#d97706' },
      UK: { cx: 430, cy: 105, fill: '#006194' },
      Europe: { cx: 565, cy: 170, fill: '#7e22ce' },
      'Middle East': { cx: 690, cy: 120, fill: '#0051d5' },
    };

    return RISK_REGIONS.map((region) => {
      const regionTickets = tickets.filter((t) => t.region === region);
      const topTicket =
        [...regionTickets].sort((a, b) => b.exposureM - a.exposureM)[0] ?? tickets[0];
      const totalExposure = regionTickets.reduce((acc, t) => acc + t.exposureM, 0);
      const r = Math.max(34, Math.min(58, 28 + Math.sqrt(totalExposure) * 3.4));
      return {
        region,
        ticket: topTicket,
        totalExposure,
        count: regionTickets.length,
        r,
        ...coords[region],
      };
    });
  }, [tickets]);

  const handleExportAuditCsv = () => {
    const rows = [
      ['Ticket Key', 'Title', 'Region', 'Typology', 'Corridor', 'Exposure ($M)', 'Stage', 'Status'],
      ...tickets.map((t) => [
        t.key,
        `"${t.title.replace(/"/g, '""')}"`,
        t.region,
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
      ER: { name: 'Elena Rostova', initials: 'ER', role: 'Lead Risk Ops' },
      JV: { name: 'Sir Julian Vance', initials: 'JV', role: 'Group CRO' },
      SR: { name: 'Siddharth Rao', initials: 'SR', role: 'SecOps' },
    };
    const owner = ownerMap[newAssignee] ?? ownerMap.ER;
    const orbitId = REGION_TO_ORBIT[newRegion];
    const orbit = INITIAL_ORBITS.find((o) => o.id === orbitId);
    const defaults = REGION_CORRIDOR_DEFAULT[newRegion];

    onCreateTicket({
      id: key,
      key,
      title: newSummary.trim() || `${newRegion} high-value settlement variance alert`,
      shortTitle: (newSummary.trim() || `${newRegion} Risk Trigger`).slice(0, 28),
      region: newRegion,
      orbitId,
      typology: newTypology,
      corridor: defaults.corridor,
      jurisdiction: defaults.jurisdiction,
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
      rootCauseSummary: `Triggered manually from RiskOps Kanban desk for ${newRegion}.`,
      confidence: 90.0,
      rules: ['CRE-MANUAL-01'],
      x: (orbit?.cx ?? 600) + Math.round((Math.random() - 0.5) * 90),
      y: (orbit?.cy ?? 450) + Math.round((Math.random() - 0.5) * 70),
      radiusPx: 108,
      parentKey: tickets.find((t) => t.region === newRegion && t.isCore)?.key,
      subTasks: [],
      auditTrail: [],
    });

    setNewSummary('');
    setLogModalOpen(false);
  };

  return (
    <div className="flex flex-col w-full pb-8">
      {/* Compact Command Header & Filter Bar */}
      <div className="w-full bg-surface-container-lowest px-4 py-3 shadow-sm border-b border-outline-variant/30">
        <div className="flex flex-col gap-3">
          {/* Top Action Strip & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg flex-wrap">
              {(
                [
                  { id: 'kanban', icon: 'view_kanban', label: 'Kanban Board' },
                  { id: 'matrix', icon: 'grid_view', label: 'Regional SLA Matrix' },
                  { id: 'audit', icon: 'table_rows', label: 'Audit Trail' },
                  { id: 'bubble', icon: 'bubble_chart', label: 'Regional Density' },
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

            {/* Concise Metric Snapshots */}
            <div className="hidden xl:flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-mono-metric-sm bg-surface-container-low px-2.5 py-1 rounded">
                <span className="text-on-surface-variant">ACTIVE PIPELINE:</span>
                <span className="font-semibold text-on-surface">${activePipelineSum}M</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono-metric-sm bg-surface-container-low px-2.5 py-1 rounded">
                <span className="text-on-surface-variant">CRITICAL:</span>
                <span className="text-error font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                  {criticalCount} ACTIVE
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono-metric-sm bg-surface-container-low px-2.5 py-1 rounded">
                <span className="text-on-surface-variant">FASTEST SLA:</span>
                <span className="font-semibold text-on-surface">{formatTimer(secondsLeft)}</span>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportPdf}
                className="flex items-center gap-1.5 px-3 h-8 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md font-semibold transition-colors whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">
                  picture_as_pdf
                </span>
                <span>Export PDF</span>
              </button>
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
                <span>{swimlanes ? 'Swimlanes: ON' : 'Swimlanes'}</span>
              </button>
              <button
                type="button"
                onClick={() => setLogModalOpen(true)}
                className="flex items-center gap-1.5 px-3 h-8 bg-primary hover:bg-primary-container text-on-primary rounded font-label-md font-semibold shadow-sm transition-all whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Log Risk Trigger</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-surface-container-low px-2.5 py-1 rounded gap-1.5">
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                  public
                </span>
                <span className="font-label-md text-on-surface-variant">Region:</span>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value as 'All Regions' | RiskRegion)}
                  className="bg-transparent font-label-md text-on-surface focus:outline-none cursor-pointer"
                >
                  <option value="All Regions">All Regions (Global)</option>
                  {RISK_REGIONS.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
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
                  <option value="All Typologies">All Typologies ({tickets.length})</option>
                  <option value="Synthetic ID">Synthetic ID</option>
                  <option value="TBML">Trade Finance / TBML</option>
                  <option value="Micro-Smurfing">Micro-Smurfing</option>
                  <option value="Crypto Gateway">Crypto Gateway</option>
                </select>
              </div>

              {/* Tolerance Filter */}
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded">
                {(
                  [
                    { id: 'all', label: `ALL (${tickets.length})` },
                    {
                      id: 'breach',
                      label: `BREACH (${tickets.filter((t) => t.severity === 'critical').length})`,
                    },
                    {
                      id: 'warning',
                      label: `WARN (${tickets.filter((t) => t.severity === 'warning' || t.severity === 'crypto').length})`,
                    },
                    {
                      id: 'within',
                      label: `WITHIN (${tickets.filter((t) => t.severity === 'nominal').length})`,
                    },
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
                  {
                    initials: 'SR',
                    title: 'Siddharth Rao (SecOps)',
                    bg: 'bg-tertiary-container text-on-tertiary-container',
                  },
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
            <div className="relative w-60">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                search
              </span>
              <input
                ref={quickSearchRef}
                type="text"
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value)}
                placeholder="Filter by key or region..."
                className="w-full h-7 pl-8 pr-7 bg-surface-container-low rounded font-body-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest border border-outline-variant/40 focus:border-primary transition-colors"
              />
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
                Priority Swimlane Mode Active: Sorted by P1 Critical → P2 Elevated → P3 Monitoring
              </span>
              <button
                type="button"
                onClick={() => setSwimlanes(false)}
                className="font-semibold underline"
              >
                Standard Order
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
                              <div className="flex items-center justify-between gap-1 mb-2">
                                <button
                                  type="button"
                                  onClick={() => onSelectTicketForGraph(ticket.id)}
                                  className="bg-error text-on-error px-2 py-0.5 rounded font-mono-metric-sm font-bold hover:opacity-90"
                                >
                                  {ticket.key}
                                </button>
                                <span className="px-2 py-0.5 rounded bg-surface-container font-mono-metric-sm text-on-surface font-semibold">
                                  {ticket.region}
                                </span>
                              </div>

                              <h4
                                onClick={() => onSelectTicketForGraph(ticket.id)}
                                className="font-headline-sm text-body-lg text-on-surface font-bold leading-snug cursor-pointer hover:text-primary"
                              >
                                {ticket.title}
                              </h4>

                              <div className="flex flex-wrap items-center gap-1.5 my-2">
                                <span className="px-2 py-0.5 rounded bg-error text-on-error font-mono-metric-sm font-bold">
                                  ${ticket.exposureM.toFixed(1)}M EXPOSURE
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono-metric-sm text-on-surface-variant">
                                  {ticket.corridor}
                                </span>
                              </div>

                              {/* Live SLA Countdown */}
                              <div className="bg-error-container/30 rounded-lg p-2.5 my-2 flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-wider">
                                    Breach Countdown
                                  </span>
                                  <span className="font-mono-metric-lg text-error font-bold leading-none">
                                    {ticket.frozen ? 'FROZEN' : formatTimer(secondsLeft)}
                                  </span>
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
                                  <span>Directives</span>
                                  <span className="text-primary font-semibold">
                                    {completedSub}/{ticket.subTasks.length} Done
                                  </span>
                                </div>
                                <ul className="text-[11px] font-body-sm text-on-surface-variant space-y-1">
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
                                  className="text-primary text-[11px] font-semibold hover:underline"
                                >
                                  Inspect Graph →
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
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onSelectTicketForGraph(ticket.id)}
                                  className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono-metric-sm font-semibold hover:bg-primary hover:text-on-primary transition-colors"
                                >
                                  {ticket.key}
                                </button>
                                <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono-metric-sm text-[10px] text-on-surface font-medium">
                                  {ticket.region}
                                </span>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded font-mono-metric-sm font-semibold ${
                                  ticket.severity === 'critical'
                                    ? 'bg-error-container/50 text-on-error-container'
                                    : 'bg-surface-container-high text-primary'
                                }`}
                              >
                                ${ticket.exposureM.toFixed(1)}M
                              </span>
                            </div>

                            <h4
                              onClick={() => onSelectTicketForGraph(ticket.id)}
                              className="font-headline-sm text-body-md text-on-surface font-semibold line-clamp-2 group-hover:text-primary transition-colors cursor-pointer"
                            >
                              {ticket.title}
                            </h4>

                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-surface-container-low text-on-surface-variant font-mono-metric-sm">
                              <div
                                className={`flex items-center gap-1 ${
                                  ticket.severity === 'critical' ? 'text-error font-semibold' : ''
                                }`}
                              >
                                <span className="material-symbols-outlined text-[13px]">alarm</span>
                                <span className="text-[11px]">{ticket.slaDisplay}</span>
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

      {/* SUB-VIEW 2: REGIONAL SLA EXPOSURE MATRIX */}
      {subView === 'matrix' && (
        <div className="w-full px-4 py-4">
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
              <div>
                <h3 className="font-headline-md text-on-surface font-semibold">
                  Regional SLA Exposure Matrix
                </h3>
                <p className="font-body-md text-on-surface-variant">
                  Live exposure cross-tabulated across APAC, US, UK, Europe, and Middle East.
                </p>
              </div>
              <div className="flex items-center gap-3 font-mono-metric-sm">
                <span className="flex items-center gap-1 text-on-surface-variant">
                  <span className="w-3 h-3 rounded bg-surface-container" /> &lt; $10M
                </span>
                <span className="flex items-center gap-1 text-on-surface-variant">
                  <span className="w-3 h-3 rounded bg-tertiary-container" /> $10M–$25M
                </span>
                <span className="flex items-center gap-1 text-on-surface-variant">
                  <span className="w-3 h-3 rounded bg-error" /> &gt; $25M Critical
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-md uppercase">
                    <th className="p-3">Typology</th>
                    {RISK_REGIONS.map((reg) => (
                      <th key={reg} className="p-3 text-center">
                        {reg}
                      </th>
                    ))}
                    <th className="p-3 text-right">Aggregate Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {TYPOLOGY_ROWS.map((row) => {
                    const rowTickets = tickets.filter((t) => t.typology === row.typology);
                    const rowTotal = rowTickets.reduce((acc, t) => acc + t.exposureM, 0);

                    return (
                      <tr key={row.typology} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="p-3 font-semibold text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">
                            {row.icon}
                          </span>
                          <span>{row.label}</span>
                        </td>
                        {RISK_REGIONS.map((reg) => {
                          const cellTickets = rowTickets.filter((t) => t.region === reg);
                          const cellSum = cellTickets.reduce((acc, t) => acc + t.exposureM, 0);
                          const topTicket = [...cellTickets].sort(
                            (a, b) => b.exposureM - a.exposureM
                          )[0];

                          if (cellTickets.length === 0 || !topTicket) {
                            return (
                              <td key={reg} className="p-3 text-center">
                                <span className="inline-block px-3 py-1.5 rounded bg-surface-container font-mono-metric-md text-on-surface-variant">
                                  -
                                </span>
                              </td>
                            );
                          }

                          const toneClass =
                            cellSum >= 25
                              ? 'bg-error text-on-error font-bold shadow-sm'
                              : cellSum >= 10
                              ? 'bg-tertiary-container/25 text-on-surface font-semibold'
                              : 'bg-surface-container text-on-surface';

                          return (
                            <td key={reg} className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => onSelectTicketForGraph(topTicket.id)}
                                className={`inline-block px-3 py-1.5 rounded-lg font-mono-metric-md hover:opacity-90 transition-opacity ${toneClass}`}
                              >
                                ${cellSum.toFixed(1)}M ({cellTickets.length})
                              </button>
                            </td>
                          );
                        })}
                        <td
                          className={`p-3 text-right font-mono-metric-md font-bold ${
                            rowTotal >= 25 ? 'text-error' : 'text-on-surface'
                          }`}
                        >
                          ${rowTotal.toFixed(1)}M
                        </td>
                      </tr>
                    );
                  })}
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
                  Verified ledger across closed, frozen, and cryptographically signed corridors.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onExportPdf}
                  className="px-3 py-1.5 bg-primary text-on-primary rounded font-label-md font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  <span>Export PDF Report</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportAuditCsv}
                  className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded font-label-md font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">file_download</span>
                  <span>Export CSV</span>
                </button>
              </div>
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
                          {t.key} · {t.region} — {t.title}
                        </span>
                        <p className="text-body-sm text-on-surface-variant">
                          Dual-sign: J. Vance (CRO) &amp; {t.assignee.name} • Block #
                          {(9401223 - idx * 332).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-secondary font-bold">
                        ${t.exposureM.toFixed(1)}M USD
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

      {/* SUB-VIEW 4: REGIONAL DENSITY MAP */}
      {subView === 'bubble' && (
        <div className="w-full px-4 py-4">
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-headline-md text-on-surface font-semibold">
                  Regional Cluster Density &amp; Threat Proximity
                </h3>
                <p className="font-body-md text-on-surface-variant">
                  Aggregate exposure across APAC, US, UK, Europe, and Middle East. Click any region to inspect.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-error-container text-on-error-container font-mono-metric-sm font-bold">
                {criticalCount} Critical Breaches
              </span>
            </div>

            <div className="w-full h-80 bg-surface-container-low rounded-xl flex items-center justify-center p-4 relative overflow-hidden">
              <svg className="w-full h-full" fill="none" viewBox="0 0 830 280">
                <line stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" x1="40" x2="790" y1="60" y2="60" />
                <line stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" x1="40" x2="790" y1="140" y2="140" />
                <line stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" x1="40" x2="790" y1="220" y2="220" />

                {regionalEpicBubbles.map((item) => (
                  <g
                    key={item.region}
                    className="cursor-pointer"
                    onClick={() => onSelectTicketForGraph(item.ticket.id)}
                  >
                    <circle
                      cx={item.cx}
                      cy={item.cy}
                      fill={item.fill}
                      fillOpacity="0.88"
                      r={item.r}
                    />
                    <circle
                      cx={item.cx}
                      cy={item.cy}
                      r={item.r + 7}
                      stroke={item.fill}
                      strokeDasharray="5 4"
                      strokeWidth="1.5"
                      opacity="0.55"
                    />
                    <text
                      fill="#ffffff"
                      fontFamily="JetBrains Mono"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      x={item.cx}
                      y={item.cy - 5}
                    >
                      {item.region.toUpperCase()}
                    </text>
                    <text
                      fill="#ffffff"
                      fontFamily="JetBrains Mono"
                      fontSize="10"
                      textAnchor="middle"
                      x={item.cx}
                      y={item.cy + 12}
                    >
                      ${item.totalExposure.toFixed(1)}M · {item.count} tkt
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>
      )}

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
                  placeholder="e.g. Unusual liquidity drift in regional gateway"
                  className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/40 rounded font-body-md text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1">
                    Region
                  </label>
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value as RiskRegion)}
                    className="w-full h-9 px-2 bg-surface-container-low border border-outline-variant/40 rounded font-body-md text-on-surface focus:outline-none"
                  >
                    {RISK_REGIONS.map((reg) => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1">
                    Typology
                  </label>
                  <select
                    value={newTypology}
                    onChange={(e) => setNewTypology(e.target.value as RiskTicket['typology'])}
                    className="w-full h-9 px-2 bg-surface-container-low border border-outline-variant/40 rounded font-body-md text-on-surface focus:outline-none"
                  >
                    <option value="Synthetic ID">Synthetic ID</option>
                    <option value="TBML">Trade Finance (TBML)</option>
                    <option value="Micro-Smurfing">Micro-Smurfing</option>
                    <option value="Crypto Gateway">Crypto Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1">
                    At-Risk Capital ($USD)
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
                    <option value="ER">Elena Rostova (Lead Risk Ops)</option>
                    <option value="JV">Sir Julian Vance (Group CRO)</option>
                    <option value="SR">Siddharth Rao (SecOps)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-label-md text-on-surface-variant mb-1">
                    Target SLA Threshold
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
