import React, { useMemo, useRef, useState } from 'react';
import {
  ClusterAxis,
  GraphOrbit,
  RiskSeverity,
  RiskTicket,
} from '../types/risk';

interface GraphCanvasViewProps {
  tickets: RiskTicket[];
  orbits: GraphOrbit[];
  selectedTicketId: string;
  onSelectTicket: (id: string) => void;
  onUpdateTicketPosition: (id: string, x: number, y: number) => void;
  onToggleSubTask: (ticketId: string, subTaskId: string) => void;
  onAddSubTask: (ticketId: string, title: string) => void;
  onAddAuditNote: (ticketId: string, message: string) => void;
  onFreezeTicket: (ticket: RiskTicket) => void;
  onEscalateTicket: (ticket: RiskTicket) => void;
  onInspectTopology: () => void;
  onNotify: (title: string, message: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
  searchQuery: string;
}

const AXIS_LABELS: Record<ClusterAxis, Record<GraphOrbit['id'], string>> = {
  Typology: {
    alpha: 'ORBIT ALPHA: APAC SYNTHETIC ID RING (Σ $77.7M)',
    beta: 'ORBIT BETA: TBML CUSTOMS INVOICE DRIFT (Σ $42.3M)',
    gamma: 'ORBIT GAMMA: UK RETAIL SMURFING ENGINE (Σ $18.4M)',
    delta: 'ORBIT DELTA: OTC LIQUIDITY ARBITRAGE (Σ $11.2M)',
  },
  Geography: {
    alpha: 'REGION ALPHA: APAC / HKMA / MAS HUB (Σ $77.7M)',
    beta: 'REGION BETA: MARITIME STRAIT & EMEA (Σ $42.3M)',
    gamma: 'REGION GAMMA: UK FASTER PAYMENTS / PRA (Σ $18.4M)',
    delta: 'REGION DELTA: SWISS FINMA / AMER CHIPS (Σ $11.2M)',
  },
  'Jira Workflow': {
    alpha: 'STAGE ALPHA: ACTIVE MITIGATION & DEFCON 1 (Σ $77.7M)',
    beta: 'STAGE BETA: IN TRIAGE & CUSTOMS VALIDATION (Σ $42.3M)',
    gamma: 'STAGE GAMMA: CONTINUOUS MONITORING (Σ $18.4M)',
    delta: 'STAGE DELTA: ESCALATED / GATEWAY HOLD (Σ $11.2M)',
  },
  'Root Cause': {
    alpha: 'VECTOR ALPHA: SIM-FARM SYNTHETIC KYC BYPASS (Σ $77.7M)',
    beta: 'VECTOR BETA: DUPLICATE BILL OF LADING DRIFT (Σ $42.3M)',
    gamma: 'VECTOR GAMMA: SUB-$10K SMURFING DISPERSION (Σ $18.4M)',
    delta: 'VECTOR DELTA: VASP TRAVEL RULE / OTC LEAK (Σ $11.2M)',
  },
};

export const GraphCanvasView: React.FC<GraphCanvasViewProps> = ({
  tickets,
  orbits,
  selectedTicketId,
  onSelectTicket,
  onUpdateTicketPosition,
  onToggleSubTask,
  onAddSubTask,
  onAddAuditNote,
  onFreezeTicket,
  onEscalateTicket,
  onInspectTopology,
  onNotify,
  searchQuery,
}) => {
  const [zoom, setZoom] = useState(0.95);
  const [pan, setPan] = useState({ x: 20, y: 10 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [dbscanActive, setDbscanActive] = useState(true);
  const [clusterAxis, setClusterAxis] = useState<ClusterAxis>('Typology');
  const [bubbleScale, setBubbleScale] = useState<'exposure' | 'velocity'>('exposure');
  const [ceoThreshold, setCeoThreshold] = useState(5);
  const [activeTypologyFilter, setActiveTypologyFilter] = useState<RiskTicket['typology'] | null>(
    null
  );
  const [severityFilter, setSeverityFilter] = useState<RiskSeverity | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const [auditInput, setAuditInput] = useState('');
  const [addingSubTask, setAddingSubTask] = useState(false);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  const viewportRef = useRef<HTMLDivElement>(null);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) ?? tickets[0],
    [tickets, selectedTicketId]
  );

  const visibleTickets = useMemo(() => {
    // Show primary graph bubbles (first 18 + any newly spawned)
    return tickets.filter((t) => t.x > 0 && t.y > 0);
  }, [tickets]);

  const totalCapitalAtRisk = useMemo(() => {
    const sum = tickets
      .filter((t) => t.stage !== 'closed')
      .reduce((acc, t) => acc + t.exposureM, 0);
    return sum.toFixed(2);
  }, [tickets]);

  const criticalCount = tickets.filter((t) => t.severity === 'critical' && !t.frozen).length;
  const warningCount = tickets.filter((t) => t.severity === 'warning').length;
  const nominalCount = 123 + Math.max(0, tickets.length - 23);

  const handleResetLayout = () => {
    setZoom(0.95);
    setPan({ x: 20, y: 10 });
    setActiveTypologyFilter(null);
    setSeverityFilter(null);
    setCeoThreshold(5);
    onNotify('Layout Reset', 'Canvas viewport and spatial filters restored to baseline.', 'info');
  };

  const handleExportVectorMap = () => {
    const svgEl = document.getElementById('risk-graph-svg-layer');
    const serialized = svgEl
      ? new XMLSerializer().serializeToString(svgEl)
      : '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clustered-risk-eye-map-${new Date().toISOString().slice(0, 10)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify(
      'Vector Map Exported',
      'DBSCAN cluster vector topology downloaded as SVG.',
      'success'
    );
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.graph-node') || (e.target as HTMLElement).closest('button')) {
      return;
    }
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingNodeId && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - pan.x) / zoom - dragOffsetRef.current.x;
      const worldY = (e.clientY - rect.top - pan.y) / zoom - dragOffsetRef.current.y;
      onUpdateTicketPosition(
        draggingNodeId,
        Math.max(80, Math.min(2200, Math.round(worldX))),
        Math.max(80, Math.min(1450, Math.round(worldY)))
      );
      return;
    }
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Number(Math.min(2.0, Math.max(0.45, prev + delta)).toFixed(2)));
  };

  const getTicketDimmed = (t: RiskTicket) => {
    if (t.exposureM < ceoThreshold) return true;
    if (activeTypologyFilter && t.typology !== activeTypologyFilter) return true;
    if (severityFilter && t.severity !== severityFilter) return true;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      const matches =
        t.key.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.typology.toLowerCase().includes(q) ||
        t.corridor.toLowerCase().includes(q);
      if (!matches) return true;
    }
    return false;
  };

  const getOrbitOffset = (orbitId: GraphOrbit['id']) => {
    if (clusterAxis === 'Geography') {
      const shift: Record<GraphOrbit['id'], { dx: number; dy: number }> = {
        alpha: { dx: 0, dy: 0 },
        beta: { dx: -40, dy: 20 },
        gamma: { dx: 30, dy: -40 },
        delta: { dx: -30, dy: -20 },
      };
      return shift[orbitId];
    }
    if (clusterAxis === 'Jira Workflow') {
      const shift: Record<GraphOrbit['id'], { dx: number; dy: number }> = {
        alpha: { dx: -20, dy: 20 },
        beta: { dx: 20, dy: -10 },
        gamma: { dx: 40, dy: -30 },
        delta: { dx: -20, dy: 30 },
      };
      return shift[orbitId];
    }
    return { dx: 0, dy: 0 };
  };

  const getComputedSize = (t: RiskTicket) => {
    if (bubbleScale === 'velocity') {
      return Math.round(Math.min(200, Math.max(72, 62 + t.txVelocity * 3.4)));
    }
    return t.radiusPx;
  };

  const getSeverityRingColor = (t: RiskTicket) => {
    if (t.frozen) return '#006194';
    if (t.severity === 'critical') return '#ba1a1a';
    if (t.severity === 'warning') return '#f59e0b';
    if (t.severity === 'crypto') return '#7e22ce';
    return '#006194';
  };

  const typologyCounts = useMemo(
    () => ({
      'Synthetic ID': tickets.filter((t) => t.typology === 'Synthetic ID').length,
      TBML: tickets.filter((t) => t.typology === 'TBML').length,
      'Micro-Smurfing': tickets.filter((t) => t.typology === 'Micro-Smurfing').length,
      'Crypto Gateway': tickets.filter((t) => t.typology === 'Crypto Gateway').length,
    }),
    [tickets]
  );

  return (
    <div className="flex flex-col w-full text-on-surface">
      {/* Top KPI & Operational Filter Ribbon */}
      <div className="bg-surface-container-lowest shadow-sm px-4 py-2 flex flex-col gap-2 select-none border-b border-outline-variant/30">
        {/* Row 1: Executive Risk Metrics + Physics Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
              <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
                Active Graph Bubbles
              </span>
              <span className="font-mono-metric-lg text-on-surface font-semibold ml-1">
                {142 + Math.max(0, tickets.length - 23)}
              </span>
              <span className="font-mono-metric-sm text-secondary bg-surface-container px-1.5 py-0.5 rounded ml-1">
                94.2% Jira Sync
              </span>
            </div>

            <div className="h-4 w-px bg-surface-container-highest hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
                Total Capital at Risk
              </span>
              <span className="font-mono-metric-lg text-on-surface font-bold">
                ${totalCapitalAtRisk}M
              </span>
              <span className="font-mono-metric-sm text-error bg-error-container/40 px-1.5 py-0.5 rounded">
                +$18.4M past 4h
              </span>
            </div>

            <div className="h-4 w-px bg-surface-container-highest hidden lg:block" />

            {/* Appetite Triad Indicators */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setSeverityFilter((prev) => (prev === 'critical' ? null : 'critical'))
                }
                className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
                  severityFilter === 'critical'
                    ? 'bg-error text-on-error shadow-sm'
                    : 'bg-error-container/40 text-on-error-container hover:bg-error-container/70'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    severityFilter === 'critical' ? 'bg-on-error' : 'bg-error'
                  }`}
                />
                <span className="font-label-md">Critical Breaches:</span>
                <span className="font-mono-metric-md font-bold">{criticalCount}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSeverityFilter((prev) => (prev === 'warning' ? null : 'warning'))
                }
                className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
                  severityFilter === 'warning'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    severityFilter === 'warning' ? 'bg-white' : 'bg-amber-500'
                  }`}
                />
                <span className="font-label-md">Approaching SLA:</span>
                <span className="font-mono-metric-md font-bold">{warningCount + 7}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSeverityFilter((prev) => (prev === 'nominal' ? null : 'nominal'))
                }
                className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
                  severityFilter === 'nominal'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    severityFilter === 'nominal' ? 'bg-white' : 'bg-emerald-600'
                  }`}
                />
                <span className="font-label-md">Within Appetite:</span>
                <span className="font-mono-metric-md font-bold">{nominalCount}</span>
              </button>
            </div>
          </div>

          {/* Spatial Physics Controls */}
          <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded">
            <button
              type="button"
              onClick={() => setZoom((z) => Number(Math.max(0.45, z - 0.15).toFixed(2)))}
              title="Zoom Out"
              className="w-7 h-7 flex items-center justify-center rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <span className="font-mono-metric-sm px-2 text-on-surface font-semibold min-w-[46px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Number(Math.min(2.0, z + 0.15).toFixed(2)))}
              title="Zoom In"
              className="w-7 h-7 flex items-center justify-center rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
            <div className="h-4 w-px bg-surface-container-highest mx-1" />
            <button
              type="button"
              onClick={handleResetLayout}
              className="h-7 px-2 flex items-center gap-1 rounded bg-surface-container-lowest text-on-surface font-label-md hover:bg-surface-container shadow-sm transition-colors whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[14px]">device_reset</span>
              <span>Reset Layout</span>
            </button>
            <button
              type="button"
              onClick={() => setDbscanActive((prev) => !prev)}
              className={`h-7 px-2 flex items-center gap-1 rounded font-label-md shadow-sm transition-colors whitespace-nowrap ${
                dbscanActive
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">all_inclusive</span>
              <span>{dbscanActive ? 'DBSCAN Active' : 'DBSCAN Paused'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportVectorMap}
              className="h-7 px-2 flex items-center gap-1 rounded bg-surface-container-lowest text-on-surface font-label-md hover:bg-surface-container shadow-sm transition-colors whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[14px]">file_download</span>
              <span>Vector Map</span>
            </button>
            {!inspectorOpen && (
              <button
                type="button"
                onClick={() => setInspectorOpen(true)}
                className="h-7 px-2 flex items-center gap-1 rounded bg-secondary text-on-secondary font-label-md shadow-sm whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[14px]">dock_to_left</span>
                <span>Inspector</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Filtering Axis, Bubble Scale, CEO Threshold & Typology Filters */}
        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {/* Axis Grouping Selectors */}
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded">
              <span className="font-label-md text-on-surface-variant px-1 font-semibold whitespace-nowrap">
                CLUSTER AXIS:
              </span>
              {(['Typology', 'Geography', 'Jira Workflow', 'Root Cause'] as ClusterAxis[]).map(
                (axis) => (
                  <button
                    key={axis}
                    type="button"
                    onClick={() => setClusterAxis(axis)}
                    className={`px-2.5 py-1 rounded font-label-md transition-colors whitespace-nowrap ${
                      clusterAxis === axis
                        ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {axis}
                  </button>
                )
              )}
            </div>

            {/* Bubble Scale */}
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded">
              <span className="font-label-md text-on-surface-variant px-1 font-semibold whitespace-nowrap">
                BUBBLE SCALE:
              </span>
              <button
                type="button"
                onClick={() => setBubbleScale('exposure')}
                className={`px-2.5 py-1 rounded font-label-md font-medium transition-colors whitespace-nowrap ${
                  bubbleScale === 'exposure'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Exposure ($M)
              </button>
              <button
                type="button"
                onClick={() => setBubbleScale('velocity')}
                className={`px-2.5 py-1 rounded font-label-md font-medium transition-colors whitespace-nowrap ${
                  bubbleScale === 'velocity'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Tx Velocity (tx/min)
              </button>
            </div>

            {/* CEO Threshold Slider */}
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded flex-1 min-w-[230px] max-w-md">
              <span className="font-label-md text-on-surface-variant whitespace-nowrap">
                CEO Threshold:
              </span>
              <input
                type="range"
                min={1}
                max={40}
                step={0.5}
                value={ceoThreshold}
                onChange={(e) => setCeoThreshold(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-surface-container-highest rounded appearance-none cursor-pointer accent-primary"
              />
              <span className="font-mono-metric-sm text-primary font-bold whitespace-nowrap">
                &gt;${ceoThreshold.toFixed(1)}M Executive Filter
              </span>
            </div>
          </div>

          {/* Quick Typology Filter Buttons */}
          <div className="flex items-center gap-1 font-label-md flex-wrap">
            {(
              [
                { key: 'Synthetic ID', label: `Synthetic ID (${typologyCounts['Synthetic ID']})`, tone: 'bg-error/15 text-error' },
                { key: 'TBML', label: `TBML (${typologyCounts['TBML']})`, tone: 'bg-amber-500/15 text-amber-800' },
                { key: 'Micro-Smurfing', label: `Micro-Smurfing (${typologyCounts['Micro-Smurfing']})`, tone: 'bg-blue-500/15 text-secondary' },
                { key: 'Crypto Gateway', label: `Crypto Gateway (${typologyCounts['Crypto Gateway']})`, tone: 'bg-purple-500/15 text-purple-800' },
              ] as const
            ).map((item) => {
              const active = activeTypologyFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setActiveTypologyFilter((prev) => (prev === item.key ? null : item.key))
                  }
                  className={`px-2 py-0.5 rounded font-semibold transition-all whitespace-nowrap ${
                    active ? 'ring-2 ring-primary shadow-sm ' : ''
                  }${item.tone}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary Stage: 2-Column Split (Canvas + Docked Jira Inspector) */}
      <div
        className="flex w-full relative overflow-hidden"
        style={{ height: 'calc(100vh - 182px)', minHeight: '620px' }}
      >
        {/* Main Interactive Graph Canvas */}
        <div
          ref={viewportRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleWheel}
          className={`flex-1 relative overflow-hidden bg-surface select-none ${
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Coordinate Compass & Spatial HUD Overlay */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
            <div className="bg-surface-container-lowest/92 backdrop-blur-sm shadow-sm border border-outline-variant/30 p-2.5 rounded flex flex-col gap-1 w-56">
              <div className="flex items-center justify-between text-on-surface">
                <span className="font-label-md uppercase tracking-wider font-semibold">
                  Canvas Coordinates
                </span>
                <span className="font-mono-metric-sm text-secondary">
                  X: {Math.round(1420 - pan.x)} / Y: {Math.round(-320 - pan.y)}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono-metric-sm text-on-surface-variant">
                <span>DBSCAN Epsilon (ε):</span>
                <span className="font-semibold text-on-surface">
                  {dbscanActive ? '0.428 rad' : 'PAUSED'}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono-metric-sm text-on-surface-variant">
                <span>Repulsion Force:</span>
                <span className="font-semibold text-on-surface">78.4 N</span>
              </div>
              <div className="flex items-center justify-between font-mono-metric-sm text-on-surface-variant">
                <span>Clustered Epics:</span>
                <span className="font-semibold text-error">4 Active Orbits</span>
              </div>
            </div>

            {/* Canvas Legend HUD */}
            <div className="bg-surface-container-lowest/92 backdrop-blur-sm shadow-sm border border-outline-variant/30 p-2 rounded flex items-center gap-3 font-mono-metric-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-error" />
                <span>Critical Breached</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>At-Risk Limit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Within Tolerance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 bg-error" />
                <span>Blocks Link</span>
              </div>
            </div>
          </div>

          {/* Graph World Container */}
          <div
            className="absolute inset-0 origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isPanning || draggingNodeId ? 'none' : 'transform 120ms ease-out',
            }}
          >
            {/* SVG Layer: Orbits & Dynamic Dependency Connectors */}
            <svg
              id="risk-graph-svg-layer"
              className="absolute inset-0 w-[2400px] h-[1600px] pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <marker
                  id="arrow-error"
                  markerHeight="6"
                  markerWidth="6"
                  orient="auto-start-reverse"
                  refX="8"
                  refY="5"
                  viewBox="0 0 10 10"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ba1a1a" />
                </marker>
                <marker
                  id="arrow-amber"
                  markerHeight="6"
                  markerWidth="6"
                  orient="auto-start-reverse"
                  refX="8"
                  refY="5"
                  viewBox="0 0 10 10"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                </marker>
                <marker
                  id="arrow-primary"
                  markerHeight="6"
                  markerWidth="6"
                  orient="auto-start-reverse"
                  refX="8"
                  refY="5"
                  viewBox="0 0 10 10"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#006194" />
                </marker>
                <marker
                  id="arrow-muted"
                  markerHeight="5"
                  markerWidth="5"
                  orient="auto-start-reverse"
                  refX="8"
                  refY="5"
                  viewBox="0 0 10 10"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#707881" />
                </marker>

                <radialGradient cx="50%" cy="50%" id="grad-orbit-alpha" r="50%">
                  <stop offset="0%" stopColor="#ffdad6" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#ffdad6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <radialGradient cx="50%" cy="50%" id="grad-orbit-beta" r="50%">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.5" />
                  <stop offset="70%" stopColor="#fef3c7" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <radialGradient cx="50%" cy="50%" id="grad-orbit-gamma" r="50%">
                  <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
                  <stop offset="70%" stopColor="#dbeafe" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <radialGradient cx="50%" cy="50%" id="grad-orbit-delta" r="50%">
                  <stop offset="0%" stopColor="#f3e8ff" stopOpacity="0.55" />
                  <stop offset="70%" stopColor="#f3e8ff" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Cluster Orbit Hulls */}
              {orbits.map((orbit) => {
                const { dx, dy } = getOrbitOffset(orbit.id);
                return (
                  <g key={orbit.id}>
                    <ellipse
                      cx={orbit.cx + dx}
                      cy={orbit.cy + dy}
                      rx={orbit.rx}
                      ry={orbit.ry}
                      fill={`url(#${orbit.gradientId})`}
                      opacity={dbscanActive ? 0.85 : 0.3}
                      stroke={orbit.stroke}
                      strokeDasharray="6,6"
                      strokeWidth="1.5"
                    />
                    <text
                      x={orbit.cx + dx - orbit.rx + 40}
                      y={orbit.cy + dy - orbit.ry + 40}
                      fill={orbit.textColor}
                      className="font-mono-metric-sm font-semibold tracking-wider uppercase"
                    >
                      {AXIS_LABELS[clusterAxis][orbit.id]}
                    </text>
                  </g>
                );
              })}

              {/* Cross-Epic Risk Propagation Links */}
              {(() => {
                const nAlpha = visibleTickets.find((t) => t.key === 'CRE-8942');
                const nBeta = visibleTickets.find((t) => t.key === 'CRE-8911');
                const nDelta = visibleTickets.find((t) => t.key === 'CRE-9008');
                if (!nAlpha || !nBeta || !nDelta) return null;
                return (
                  <>
                    <path
                      d={`M ${nAlpha.x + 80} ${nAlpha.y - 30} C ${nAlpha.x + 280} ${
                        nAlpha.y - 120
                      }, ${nBeta.x - 280} ${nBeta.y - 60}, ${nBeta.x - 95} ${nBeta.y - 15}`}
                      fill="none"
                      stroke="#ba1a1a"
                      strokeDasharray="4,4"
                      strokeWidth="2"
                      markerEnd="url(#arrow-error)"
                    />
                    <rect fill="#ffdad6" height="20" rx="4" width="144" x="778" y="270" />
                    <text className="font-mono-metric-sm font-bold" fill="#93000a" x="786" y="284">
                      blocks (Cross-Jurisdiction)
                    </text>

                    <path
                      d={`M ${nAlpha.x + 40} ${nAlpha.y + 70} C ${nAlpha.x + 220} ${
                        nAlpha.y + 260
                      }, ${nDelta.x - 260} ${nDelta.y - 120}, ${nDelta.x - 85} ${nDelta.y - 25}`}
                      fill="none"
                      stroke="#707881"
                      strokeDasharray="3,3"
                      strokeWidth="1.5"
                      markerEnd="url(#arrow-muted)"
                    />
                    <rect fill="#eff4ff" height="18" rx="3" width="114" x="776" y="655" />
                    <text className="font-mono-metric-sm" fill="#3f4850" x="783" y="668">
                      relates to (Off-ramp)
                    </text>
                  </>
                );
              })()}

              {/* Dynamic Parent -> Satellite Connectors */}
              {visibleTickets
                .filter((t) => t.parentKey)
                .map((sat) => {
                  const parent = visibleTickets.find((p) => p.key === sat.parentKey);
                  if (!parent) return null;
                  const strokeColor =
                    sat.severity === 'critical'
                      ? '#ba1a1a'
                      : sat.severity === 'warning'
                      ? '#f59e0b'
                      : sat.severity === 'crypto'
                      ? '#7e22ce'
                      : '#006194';
                  const markerId =
                    sat.severity === 'critical'
                      ? 'url(#arrow-error)'
                      : sat.severity === 'warning'
                      ? 'url(#arrow-amber)'
                      : 'url(#arrow-primary)';
                  return (
                    <line
                      key={`edge-${parent.key}-${sat.key}`}
                      x1={parent.x}
                      y1={parent.y}
                      x2={sat.x}
                      y2={sat.y}
                      stroke={strokeColor}
                      strokeWidth={sat.severity === 'critical' ? 2 : 1.5}
                      strokeOpacity={0.7}
                      markerEnd={markerId}
                    />
                  );
                })}
            </svg>

            {/* Interactive Bubble Nodes */}
            {visibleTickets.map((ticket) => {
              const isSelected = ticket.id === selectedTicket?.id;
              const isDimmed = getTicketDimmed(ticket);
              const size = getComputedSize(ticket);
              const ringColor = getSeverityRingColor(ticket);
              const isCore = Boolean(ticket.isCore);

              return (
                <div
                  key={ticket.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (!viewportRef.current) return;
                    const rect = viewportRef.current.getBoundingClientRect();
                    const pointerWorldX = (e.clientX - rect.left - pan.x) / zoom;
                    const pointerWorldY = (e.clientY - rect.top - pan.y) / zoom;
                    dragOffsetRef.current = {
                      x: pointerWorldX - ticket.x,
                      y: pointerWorldY - ticket.y,
                    };
                    setDraggingNodeId(ticket.id);
                    onSelectTicket(ticket.id);
                    setInspectorOpen(true);
                  }}
                  style={{
                    left: `${ticket.x}px`,
                    top: `${ticket.y}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    opacity: isDimmed ? 0.28 : 1,
                    filter: isDimmed ? 'grayscale(80%)' : 'none',
                    transform: `translate(-50%, -50%) scale(${isSelected ? 1.07 : 1})`,
                    boxShadow: isSelected
                      ? `0 0 0 3.5px ${ringColor}, 0 14px 32px -4px rgba(11, 28, 48, 0.25)`
                      : isCore
                      ? `0 0 0 3px ${ringColor}, 0 8px 24px -2px rgba(11, 28, 48, 0.16)`
                      : `0 0 0 1.8px ${ringColor}, 0 4px 12px rgba(11, 28, 48, 0.08)`,
                  }}
                  className="graph-node cursor-pointer absolute rounded-full bg-surface-container-lowest flex flex-col items-center justify-center p-2 text-center transition-shadow hover:z-30"
                >
                  {ticket.epicBadge && (
                    <div
                      className={`absolute -top-2.5 px-2 py-0.5 rounded font-mono-metric-sm font-bold shadow-sm uppercase tracking-wide whitespace-nowrap ${
                        ticket.frozen
                          ? 'bg-primary text-on-primary'
                          : ticket.severity === 'critical'
                          ? 'bg-error text-on-error'
                          : ticket.severity === 'warning'
                          ? 'bg-amber-500 text-white'
                          : ticket.severity === 'crypto'
                          ? 'bg-purple-700 text-white'
                          : 'bg-primary text-on-primary'
                      }`}
                    >
                      {ticket.frozen ? 'CORRIDOR FROZEN' : ticket.epicBadge}
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm bg-secondary shrink-0" />
                    <span className="font-mono-metric-sm font-bold text-primary">
                      {ticket.key}
                    </span>
                  </div>

                  {size >= 92 && (
                    <span className="font-label-md text-on-surface font-semibold leading-tight mt-0.5 line-clamp-2 px-1">
                      {ticket.shortTitle}
                    </span>
                  )}

                  <div
                    className={`font-mono-metric-md font-bold mt-0.5 ${
                      ticket.frozen
                        ? 'text-primary'
                        : ticket.severity === 'critical'
                        ? 'text-error'
                        : ticket.severity === 'warning'
                        ? 'text-amber-900'
                        : ticket.severity === 'crypto'
                        ? 'text-purple-900'
                        : 'text-primary'
                    }`}
                  >
                    {bubbleScale === 'velocity'
                      ? `${ticket.txVelocity} tx/m`
                      : `$${ticket.exposureM.toFixed(1)}M`}
                  </div>

                  {isCore && size >= 150 && (
                    <div className="flex items-center justify-between w-full mt-1.5 pt-1 border-t border-surface-container-highest px-2">
                      <span className="font-label-md text-on-surface-variant truncate">
                        {ticket.assignee.initials} · {ticket.assignee.name.split(' ')[0]}
                      </span>
                      <span
                        className={`font-mono-metric-sm font-bold ${
                          ticket.severity === 'critical' ? 'text-error' : 'text-on-surface-variant'
                        }`}
                      >
                        {ticket.badgeText || ticket.slaDisplay}
                      </span>
                    </div>
                  )}

                  {!isCore && ticket.badgeText && size >= 104 && (
                    <span
                      className={`font-mono-metric-sm px-1.5 py-0.5 rounded mt-0.5 ${
                        ticket.severity === 'critical'
                          ? 'bg-error-container/60 text-on-error-container'
                          : ticket.severity === 'warning'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {ticket.badgeText}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Bottom-Right Mini-Map Widget */}
          <button
            type="button"
            onClick={() => setPan({ x: 20, y: 10 })}
            title="Click to recenter canvas"
            className="absolute bottom-4 right-4 z-20 bg-surface-container-lowest/95 backdrop-blur-md rounded shadow-lg border border-outline-variant/40 p-2.5 flex flex-col gap-1.5 w-44 text-left hover:border-primary transition-colors"
          >
            <div className="flex items-center justify-between text-on-surface">
              <span className="font-label-md uppercase tracking-wider font-semibold">
                Radar Map
              </span>
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                aspect_ratio
              </span>
            </div>
            <div className="w-full h-24 bg-surface-container-low rounded relative overflow-hidden">
              <div className="absolute top-3 left-4 w-6 h-6 rounded-full bg-error/25" />
              <div className="absolute top-3 left-4 w-2 h-2 rounded-full bg-error m-2" />
              <div className="absolute top-2 right-4 w-5 h-5 rounded-full bg-amber-500/25" />
              <div className="absolute top-2 right-4 w-1.5 h-1.5 rounded-full bg-amber-500 m-1.5" />
              <div className="absolute bottom-3 left-6 w-5 h-5 rounded-full bg-primary/25" />
              <div className="absolute bottom-3 left-6 w-1.5 h-1.5 rounded-full bg-primary m-1.5" />
              <div className="absolute bottom-3 right-5 w-4 h-4 rounded-full bg-purple-500/25" />
              <div
                className="absolute rounded border border-primary/50 bg-primary/10 pointer-events-none"
                style={{
                  left: `${Math.max(4, Math.min(60, 12 - pan.x * 0.03))}%`,
                  top: `${Math.max(4, Math.min(60, 10 - pan.y * 0.03))}%`,
                  width: `${Math.min(85, 65 / zoom)}%`,
                  height: `${Math.min(85, 65 / zoom)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between font-mono-metric-sm text-on-surface-variant">
              <span>Clusters: 4 active</span>
              <span className="text-error font-semibold">{criticalCount} breaches</span>
            </div>
          </button>
        </div>

        {/* Right-Hand Interactive Jira Ticket Inspector Drawer */}
        {inspectorOpen && selectedTicket && (
          <aside className="w-[380px] min-w-[380px] bg-surface-container-lowest border-l border-outline-variant/40 shadow-xl flex flex-col z-30 overflow-y-auto panel-scroll">
            {/* Sticky Drawer Header */}
            <div className="p-3 bg-surface-container-low flex flex-col gap-2.5 sticky top-0 z-10 border-b border-outline-variant/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-primary flex items-center justify-center text-on-primary text-[10px] font-bold">
                    J
                  </span>
                  <span className="font-mono-metric-md font-bold text-primary">
                    {selectedTicket.key}
                  </span>
                  <span className="font-mono-metric-sm text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                    {selectedTicket.isCore ? 'EPIC' : 'NODE'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`px-2 py-0.5 rounded font-mono-metric-sm font-bold flex items-center gap-1 ${
                      selectedTicket.frozen
                        ? 'bg-primary-fixed text-primary'
                        : selectedTicket.severity === 'critical'
                        ? 'bg-error-container/60 text-on-error-container'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedTicket.frozen
                          ? 'bg-primary'
                          : selectedTicket.severity === 'critical'
                          ? 'bg-error'
                          : 'bg-amber-500'
                      }`}
                    />
                    {selectedTicket.frozen ? 'FROZEN' : selectedTicket.statusLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInspectorOpen(false)}
                    aria-label="Close inspector panel"
                    className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>

              <h2 className="font-headline-sm text-on-surface font-bold leading-tight">
                {selectedTicket.title}
              </h2>

              {/* Quantitative Triad */}
              <div className="grid grid-cols-3 gap-2 bg-surface-container-lowest p-2 rounded shadow-sm border border-outline-variant/20">
                <div className="flex flex-col">
                  <span className="font-label-md text-on-surface-variant">Risk Score</span>
                  <span
                    className={`font-mono-metric-lg font-bold leading-tight ${
                      selectedTicket.riskScore >= 85 ? 'text-error' : 'text-primary'
                    }`}
                  >
                    {selectedTicket.riskScore.toFixed(1)}
                    <span className="text-xs font-normal text-on-surface-variant">/100</span>
                  </span>
                  <span
                    className={`font-mono-metric-sm font-semibold ${
                      selectedTicket.riskScore >= 85 ? 'text-error' : 'text-on-surface-variant'
                    }`}
                  >
                    {selectedTicket.riskScore >= 85 ? 'CRITICAL' : 'ELEVATED'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-on-surface-variant">Exposure</span>
                  <span className="font-mono-metric-lg text-on-surface font-bold leading-tight">
                    ${selectedTicket.exposureM.toFixed(2)}M
                  </span>
                  <span className="font-mono-metric-sm text-error">
                    +{Math.round((selectedTicket.exposureM / selectedTicket.limitM) * 100)}% limit
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-on-surface-variant">SLA Timer</span>
                  <span className="font-mono-metric-md text-error font-bold leading-tight mt-1">
                    {selectedTicket.slaDisplay}
                  </span>
                  <span className="font-mono-metric-sm text-on-surface-variant">
                    {selectedTicket.frozen ? 'Hold Enforced' : 'Mandatory Hold'}
                  </span>
                </div>
              </div>

              {/* Action Trigger Bar */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => onFreezeTicket(selectedTicket)}
                  className={`flex-1 h-8 rounded font-label-md font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                    selectedTicket.frozen
                      ? 'bg-emerald-700 text-white'
                      : 'bg-error text-on-error hover:opacity-90'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {selectedTicket.frozen ? 'check_circle' : 'block'}
                  </span>
                  <span>
                    {selectedTicket.frozen ? 'CORRIDOR FROZEN' : 'Execute Immediate Freeze'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onEscalateTicket(selectedTicket)}
                  className="h-8 px-2.5 rounded bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-label-md font-medium shadow-sm hover:bg-surface-container transition-colors whitespace-nowrap"
                >
                  {selectedTicket.escalated ? 'Escalated' : 'Escalate to Board'}
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-3 flex flex-col gap-3.5">
              {/* Root Cause Card */}
              <div className="p-2.5 rounded bg-surface-container-low flex flex-col gap-1.5 border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-primary font-bold flex items-center gap-1 uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">psychology</span>
                    Automated Root Cause Topology
                  </span>
                  <span className="font-mono-metric-sm text-on-surface-variant">
                    Confidence: {selectedTicket.confidence}%
                  </span>
                </div>
                <p className="font-body-sm text-on-surface leading-relaxed">
                  {selectedTicket.rootCauseSummary}
                </p>
                <div className="flex items-center justify-between gap-1 mt-1 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    {selectedTicket.rules.map((rule) => (
                      <span
                        key={rule}
                        className="font-mono-metric-sm bg-surface-container-highest px-1.5 py-0.5 rounded text-on-surface"
                      >
                        {rule}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={onInspectTopology}
                    className="font-label-md text-primary font-semibold hover:underline"
                  >
                    Forensic Flow →
                  </button>
                </div>
              </div>

              {/* Governance & Ownership */}
              <div className="flex flex-col gap-1.5">
                <span className="font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                  Governance &amp; Ownership
                </span>
                <div className="grid grid-cols-2 gap-2 text-body-sm">
                  <div className="p-2 rounded bg-surface-container-low flex flex-col">
                    <span className="font-label-md text-on-surface-variant">Assignee</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[10px]">
                        {selectedTicket.assignee.initials}
                      </div>
                      <span className="font-label-md font-semibold text-on-surface truncate">
                        {selectedTicket.assignee.name}
                      </span>
                    </div>
                    <span className="font-mono-metric-sm text-on-surface-variant mt-0.5">
                      {selectedTicket.assignee.role}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-surface-container-low flex flex-col">
                    <span className="font-label-md text-on-surface-variant">Reporter</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-[10px]">
                        DB
                      </div>
                      <span className="font-label-md font-semibold text-on-surface truncate">
                        {selectedTicket.reporter}
                      </span>
                    </div>
                    <span className="font-mono-metric-sm text-on-surface-variant mt-0.5">
                      Model v4.2.1
                    </span>
                  </div>

                  <div className="p-2 rounded bg-surface-container-low flex flex-col">
                    <span className="font-label-md text-on-surface-variant">
                      Risk Appetite Limit
                    </span>
                    <span className="font-mono-metric-md font-bold text-on-surface mt-1">
                      ${(selectedTicket.limitM * 1_000_000).toLocaleString()}
                    </span>
                    <span className="font-mono-metric-sm text-error font-semibold">
                      {selectedTicket.exposureM > selectedTicket.limitM
                        ? `Breached by $${(selectedTicket.exposureM - selectedTicket.limitM).toFixed(2)}M`
                        : 'Within Appetite'}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-surface-container-low flex flex-col">
                    <span className="font-label-md text-on-surface-variant">
                      Compliance Jurisdiction
                    </span>
                    <span className="font-mono-metric-md font-bold text-on-surface mt-1">
                      {selectedTicket.jurisdiction}
                    </span>
                    <span className="font-mono-metric-sm text-on-surface-variant">
                      Dual Filing Required
                    </span>
                  </div>
                </div>
              </div>

              {/* Linked Jira Sub-Tasks */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                    Sub-Tasks &amp; Linked Issues ({selectedTicket.subTasks.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddingSubTask((prev) => !prev)}
                    className="font-label-md text-primary hover:underline font-semibold"
                  >
                    + Link Issue
                  </button>
                </div>

                {addingSubTask && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newSubTaskTitle.trim()) return;
                      onAddSubTask(selectedTicket.id, newSubTaskTitle.trim());
                      setNewSubTaskTitle('');
                      setAddingSubTask(false);
                    }}
                    className="flex gap-1.5"
                  >
                    <input
                      autoFocus
                      type="text"
                      value={newSubTaskTitle}
                      onChange={(e) => setNewSubTaskTitle(e.target.value)}
                      placeholder="Sub-task title..."
                      className="flex-1 h-7 px-2 rounded bg-surface-container-low border border-primary/50 text-body-sm focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="h-7 px-2.5 rounded bg-primary text-on-primary font-label-md font-semibold"
                    >
                      Add
                    </button>
                  </form>
                )}

                <div className="flex flex-col gap-1.5">
                  {selectedTicket.subTasks.length === 0 ? (
                    <div className="p-2.5 rounded bg-surface-container-low text-body-sm text-on-surface-variant">
                      No linked child tasks. Use &ldquo;+ Link Issue&rdquo; to attach a directive.
                    </div>
                  ) : (
                    selectedTicket.subTasks.map((st) => (
                      <label
                        key={st.id}
                        className="p-2 rounded bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex items-center justify-between gap-2 hover:bg-surface-container-low transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={st.completed}
                            onChange={() => onToggleSubTask(selectedTicket.id, st.id)}
                            className="w-3.5 h-3.5 rounded accent-primary shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono-metric-sm text-primary font-bold shrink-0">
                                {st.key}
                              </span>
                              <span
                                className={`font-label-md font-medium truncate ${
                                  st.completed
                                    ? 'line-through text-on-surface-variant'
                                    : 'text-on-surface'
                                }`}
                              >
                                {st.title}
                              </span>
                            </div>
                            <span className="font-mono-metric-sm text-on-surface-variant">
                              {st.meta}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono-metric-sm font-semibold shrink-0 ${
                            st.completed
                              ? 'bg-emerald-100 text-emerald-900'
                              : st.status === 'IN REVIEW'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-surface-container-highest text-on-surface'
                          }`}
                        >
                          {st.completed ? 'DONE' : st.status}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Basel III Audit Trail */}
              <div className="flex flex-col gap-2 pt-2 border-t border-surface-container-highest">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                    Basel III Audit Trail
                  </span>
                  <span className="font-mono-metric-sm text-on-surface-variant">
                    SHA256 Signed
                  </span>
                </div>

                <div className="flex flex-col gap-2 font-body-sm">
                  {selectedTicket.auditTrail.map((entry) => (
                    <div key={entry.id} className="flex gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          entry.isSystem
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-primary text-on-primary'
                        }`}
                      >
                        {entry.initials}
                      </div>
                      <div className="flex flex-col bg-surface-container-low p-2 rounded flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-label-md font-semibold text-on-surface">
                            {entry.author}
                          </span>
                          <span className="font-mono-metric-sm text-on-surface-variant">
                            {entry.timestamp}
                          </span>
                        </div>
                        <p className="font-body-sm text-on-surface mt-1 leading-snug">
                          {entry.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!auditInput.trim()) return;
                    onAddAuditNote(selectedTicket.id, auditInput.trim());
                    setAuditInput('');
                  }}
                  className="mt-1 flex gap-1.5"
                >
                  <input
                    type="text"
                    value={auditInput}
                    onChange={(e) => setAuditInput(e.target.value)}
                    placeholder="Add verified audit note or @mention..."
                    className="flex-1 h-8 px-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 rounded bg-primary text-on-primary font-label-md font-medium hover:opacity-95 transition-opacity"
                  >
                    Post
                  </button>
                </form>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
