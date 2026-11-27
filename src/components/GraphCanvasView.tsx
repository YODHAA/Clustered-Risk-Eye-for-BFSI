import React, { useMemo, useRef, useState } from 'react';
import { RISK_REGIONS } from '../data/initialRiskData';
import {
  ClusterAxis,
  GraphOrbit,
  RiskRegion,
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
  onExportPdf: () => void;
  onNotify: (title: string, message: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
  searchQuery: string;
}

const AXIS_LABELS: Record<ClusterAxis, Record<GraphOrbit['id'], string>> = {
  Region: {
    apac: 'APAC · HKMA / MAS ($66.4M)',
    us: 'US · FEDWIRE / CHIPS ($36.2M)',
    uk: 'UK · FASTER PAYMENTS ($21.7M)',
    europe: 'EUROPE · TARGET2 / FINMA ($48.3M)',
    'middle-east': 'MIDDLE EAST · DIFC / QFC ($27.1M)',
  },
  Typology: {
    apac: 'SYNTHETIC ID RING · APAC',
    us: 'TRADE & ACH STRUCTURING · US',
    uk: 'MICRO-SMURFING · UK',
    europe: 'TBML & CRYPTO BRIDGE · EUROPE',
    'middle-east': 'COMMODITY ESCROW · MIDDLE EAST',
  },
  'Jira Workflow': {
    apac: 'DEFCON 1 MITIGATION · APAC',
    us: 'ACTIVE TRIAGE · US',
    uk: 'MONITORING & QA · UK',
    europe: 'MITIGATION & ESCROW · EUROPE',
    'middle-east': 'VERIFICATION & CLOSED · MIDDLE EAST',
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
  onExportPdf,
  onNotify,
  searchQuery,
}) => {
  const [zoom, setZoom] = useState(0.62);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [clusterAxis, setClusterAxis] = useState<ClusterAxis>('Region');
  const [activeRegionFilter, setActiveRegionFilter] = useState<RiskRegion | null>(null);
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

  const visibleTickets = useMemo(() => tickets.filter((t) => t.x > 0 && t.y > 0), [tickets]);

  const totalCapitalAtRisk = useMemo(() => {
    const sum = tickets
      .filter((t) => t.stage !== 'closed')
      .reduce((acc, t) => acc + t.exposureM, 0);
    return sum.toFixed(1);
  }, [tickets]);

  const criticalCount = tickets.filter((t) => t.severity === 'critical' && !t.frozen).length;
  const warningCount = tickets.filter(
    (t) => (t.severity === 'warning' || t.severity === 'crypto') && !t.frozen
  ).length;
  const nominalCount = tickets.filter((t) => t.severity === 'nominal' || t.frozen).length;

  const handleResetLayout = () => {
    setZoom(0.62);
    setPan({ x: 20, y: 20 });
    setActiveRegionFilter(null);
    setSeverityFilter(null);
    onNotify('Layout Reset', 'Canvas viewport and filters restored.', 'info');
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest('.graph-node') ||
      (e.target as HTMLElement).closest('button')
    ) {
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
        Math.max(80, Math.min(1800, Math.round(worldX))),
        Math.max(80, Math.min(1000, Math.round(worldY)))
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
    const delta = e.deltaY < 0 ? 0.06 : -0.06;
    setZoom((prev) => Number(Math.min(1.8, Math.max(0.45, prev + delta)).toFixed(2)));
  };

  const getTicketDimmed = (t: RiskTicket) => {
    if (activeRegionFilter && t.region !== activeRegionFilter) return true;
    if (severityFilter && t.severity !== severityFilter) return true;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      const matches =
        t.key.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.region.toLowerCase().includes(q) ||
        t.typology.toLowerCase().includes(q) ||
        t.corridor.toLowerCase().includes(q);
      if (!matches) return true;
    }
    return false;
  };

  const getSeverityRingColor = (t: RiskTicket) => {
    if (t.frozen) return '#006194';
    if (t.severity === 'critical') return '#ba1a1a';
    if (t.severity === 'warning') return '#d97706';
    if (t.severity === 'crypto') return '#7e22ce';
    return '#006194';
  };

  return (
    <div className="flex flex-col w-full text-on-surface">
      {/* Streamlined Top KPI & Region Filter Ribbon */}
      <div className="bg-surface-container-lowest shadow-sm px-4 py-2.5 flex flex-col gap-2 select-none border-b border-outline-variant/30">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
                Active Tickets
              </span>
              <span className="font-mono-metric-lg text-on-surface font-semibold">
                {tickets.length}
              </span>
            </div>

            <div className="h-4 w-px bg-surface-container-highest hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
                Capital at Risk
              </span>
              <span className="font-mono-metric-lg text-on-surface font-bold">
                ${totalCapitalAtRisk}M
              </span>
            </div>

            <div className="h-4 w-px bg-surface-container-highest hidden lg:block" />

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setSeverityFilter((prev) => (prev === 'critical' ? null : 'critical'))
                }
                className={`flex items-center gap-1.5 px-2 py-1 rounded font-label-md transition-all ${
                  severityFilter === 'critical'
                    ? 'bg-error text-on-error shadow-sm'
                    : 'bg-error-container/40 text-on-error-container hover:bg-error-container/70'
                }`}
              >
                <span>Critical:</span>
                <span className="font-mono-metric-sm font-bold">{criticalCount}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSeverityFilter((prev) => (prev === 'warning' ? null : 'warning'))
                }
                className={`flex items-center gap-1.5 px-2 py-1 rounded font-label-md transition-all ${
                  severityFilter === 'warning'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <span>Elevated:</span>
                <span className="font-mono-metric-sm font-bold">{warningCount}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSeverityFilter((prev) => (prev === 'nominal' ? null : 'nominal'))
                }
                className={`flex items-center gap-1.5 px-2 py-1 rounded font-label-md transition-all ${
                  severityFilter === 'nominal'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <span>Within Limit:</span>
                <span className="font-mono-metric-sm font-bold">{nominalCount}</span>
              </button>
            </div>
          </div>

          {/* Canvas Controls */}
          <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded">
            <button
              type="button"
              onClick={() => setZoom((z) => Number(Math.max(0.45, z - 0.1).toFixed(2)))}
              title="Zoom Out"
              aria-label="Zoom out"
              className="w-7 h-7 flex items-center justify-center rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <span className="font-mono-metric-sm px-2 text-on-surface font-semibold min-w-[44px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Number(Math.min(1.8, z + 0.1).toFixed(2)))}
              title="Zoom In"
              aria-label="Zoom in"
              className="w-7 h-7 flex items-center justify-center rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
            <div className="h-4 w-px bg-surface-container-highest mx-1" />
            <button
              type="button"
              onClick={handleResetLayout}
              className="h-7 px-2.5 flex items-center gap-1 rounded bg-surface-container-lowest text-on-surface font-label-md hover:bg-surface-container shadow-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[14px]">device_reset</span>
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              className="h-7 px-2.5 flex items-center gap-1 rounded bg-primary text-on-primary font-label-md font-semibold hover:opacity-90 shadow-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
              <span>Export PDF</span>
            </button>
            {!inspectorOpen && (
              <button
                type="button"
                onClick={() => setInspectorOpen(true)}
                className="h-7 px-2.5 flex items-center gap-1 rounded bg-secondary text-on-secondary font-label-md shadow-sm whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[14px]">dock_to_left</span>
                <span>Inspector</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Region Selector + Grouping Axis */}
        <div className="flex items-center justify-between gap-3 pt-0.5 flex-wrap">
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded flex-wrap">
            <span className="font-label-md text-on-surface-variant px-1.5 font-semibold whitespace-nowrap">
              REGION:
            </span>
            <button
              type="button"
              onClick={() => setActiveRegionFilter(null)}
              className={`px-2.5 py-1 rounded font-label-md transition-colors whitespace-nowrap ${
                activeRegionFilter === null
                  ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All Regions
            </button>
            {RISK_REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() =>
                  setActiveRegionFilter((prev) => (prev === region ? null : region))
                }
                className={`px-2.5 py-1 rounded font-label-md transition-colors whitespace-nowrap ${
                  activeRegionFilter === region
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {region}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded">
            <span className="font-label-md text-on-surface-variant px-1.5 font-semibold whitespace-nowrap">
              GROUPING:
            </span>
            {(['Region', 'Typology', 'Jira Workflow'] as ClusterAxis[]).map((axis) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* Primary Stage: Canvas + Compact Ticket Inspector */}
      <div
        className="flex w-full relative overflow-hidden"
        style={{ height: 'calc(100vh - 182px)', minHeight: '600px' }}
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
          {/* Graph World Container */}
          <div
            className="absolute inset-0 origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isPanning || draggingNodeId ? 'none' : 'transform 120ms ease-out',
            }}
          >
            {/* SVG Layer: Regional Orbits & Connectors */}
            <svg
              id="risk-graph-svg-layer"
              className="absolute inset-0 w-[1900px] h-[1100px] pointer-events-none"
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

                <radialGradient cx="50%" cy="50%" id="grad-orbit-apac" r="50%">
                  <stop offset="0%" stopColor="#ffdad6" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#ffdad6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <radialGradient cx="50%" cy="50%" id="grad-orbit-us" r="50%">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.5" />
                  <stop offset="70%" stopColor="#fef3c7" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <radialGradient cx="50%" cy="50%" id="grad-orbit-uk" r="50%">
                  <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.5" />
                  <stop offset="70%" stopColor="#dbeafe" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <radialGradient cx="50%" cy="50%" id="grad-orbit-europe" r="50%">
                  <stop offset="0%" stopColor="#f3e8ff" stopOpacity="0.55" />
                  <stop offset="70%" stopColor="#f3e8ff" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <radialGradient cx="50%" cy="50%" id="grad-orbit-me" r="50%">
                  <stop offset="0%" stopColor="#dbe1ff" stopOpacity="0.55" />
                  <stop offset="70%" stopColor="#dbe1ff" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>

              {orbits.map((orbit) => {
                const dimmedOrbit =
                  activeRegionFilter !== null && orbit.region !== activeRegionFilter;
                return (
                  <g key={orbit.id} opacity={dimmedOrbit ? 0.25 : 0.9}>
                    <ellipse
                      cx={orbit.cx}
                      cy={orbit.cy}
                      rx={orbit.rx}
                      ry={orbit.ry}
                      fill={`url(#${orbit.gradientId})`}
                      stroke={orbit.stroke}
                      strokeDasharray="6,6"
                      strokeWidth="1.5"
                    />
                    <text
                      x={orbit.cx}
                      y={orbit.cy - orbit.ry - 10}
                      textAnchor="middle"
                      fill={orbit.textColor}
                      className="font-mono-metric-md font-bold tracking-wider uppercase"
                    >
                      {AXIS_LABELS[clusterAxis][orbit.id]}
                    </text>
                  </g>
                );
              })}

              {/* Cross-Region Propagation Links */}
              {(() => {
                const nApac = visibleTickets.find((t) => t.key === 'CRE-8942');
                const nUs = visibleTickets.find((t) => t.key === 'CRE-9104');
                const nEurope = visibleTickets.find((t) => t.key === 'CRE-8911');
                if (!nApac || !nUs || !nEurope) return null;
                return (
                  <>
                    <path
                      d={`M ${nApac.x + 80} ${nApac.y - 20} C ${nApac.x + 240} ${nApac.y - 80}, ${
                        nUs.x - 240
                      } ${nUs.y - 40}, ${nUs.x - 75} ${nUs.y}`}
                      fill="none"
                      stroke="#ba1a1a"
                      strokeDasharray="4,4"
                      strokeWidth="2"
                      markerEnd="url(#arrow-error)"
                    />
                    <path
                      d={`M ${nApac.x + 65} ${nApac.y + 55} C ${nApac.x + 220} ${nApac.y + 210}, ${
                        nEurope.x - 220
                      } ${nEurope.y - 90}, ${nEurope.x - 75} ${nEurope.y - 10}`}
                      fill="none"
                      stroke="#707881"
                      strokeDasharray="3,3"
                      strokeWidth="1.5"
                      markerEnd="url(#arrow-primary)"
                    />
                  </>
                );
              })()}

              {/* Parent -> Child Connectors */}
              {visibleTickets
                .filter((t) => t.parentKey)
                .map((sat) => {
                  const parent = visibleTickets.find((p) => p.key === sat.parentKey);
                  if (!parent) return null;
                  const strokeColor =
                    sat.severity === 'critical'
                      ? '#ba1a1a'
                      : sat.severity === 'warning'
                      ? '#d97706'
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
              const size = ticket.radiusPx;
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
                    opacity: isDimmed ? 0.25 : 1,
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
                          ? 'bg-amber-600 text-white'
                          : ticket.severity === 'crypto'
                          ? 'bg-purple-700 text-white'
                          : 'bg-primary text-on-primary'
                      }`}
                    >
                      {ticket.frozen ? 'FROZEN' : ticket.region}
                    </div>
                  )}

                  <span className="font-mono-metric-sm font-bold text-primary">
                    {ticket.key}
                  </span>

                  {size >= 96 && (
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
                    ${ticket.exposureM.toFixed(1)}M
                  </div>
                </div>
              );
            })}
          </div>

          {/* Minimal Bottom-Left Legend Strip */}
          <div className="absolute bottom-4 left-4 z-20 bg-surface-container-lowest/92 backdrop-blur-sm shadow-sm border border-outline-variant/30 px-3 py-1.5 rounded-lg flex items-center gap-3 font-mono-metric-sm pointer-events-none">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-error" /> Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Elevated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-700" /> Crypto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Nominal / Frozen
            </span>
          </div>

          {/* Floating Bottom-Right Radar Mini-Map */}
          <button
            type="button"
            onClick={() => {
              setZoom(0.62);
              setPan({ x: 20, y: 20 });
            }}
            title="Click to recenter canvas"
            className="hidden sm:flex absolute bottom-4 right-4 z-20 bg-surface-container-lowest/95 backdrop-blur-md rounded shadow-lg border border-outline-variant/40 p-2 flex-col gap-1 w-36 text-left hover:border-primary transition-colors"
          >
            <div className="flex items-center justify-between font-label-md text-on-surface font-semibold">
              <span>5 Regions</span>
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                aspect_ratio
              </span>
            </div>
            <div className="w-full h-16 bg-surface-container-low rounded relative overflow-hidden">
              <span className="absolute top-2.5 left-3 w-2 h-2 rounded-full bg-error" />
              <span className="absolute top-2 left-16 w-2 h-2 rounded-full bg-amber-500" />
              <span className="absolute bottom-2.5 left-4 w-2 h-2 rounded-full bg-primary" />
              <span className="absolute bottom-2.5 left-16 w-2 h-2 rounded-full bg-purple-600" />
              <span className="absolute top-6 right-3 w-2 h-2 rounded-full bg-secondary" />
            </div>
          </button>
        </div>

        {/* Streamlined Right-Hand Ticket Inspector */}
        {inspectorOpen && selectedTicket && (
          <aside className="w-[340px] min-w-[340px] bg-surface-container-lowest border-l border-outline-variant/40 shadow-xl flex flex-col z-30 overflow-y-auto panel-scroll">
            <div className="p-3.5 bg-surface-container-low flex flex-col gap-2.5 sticky top-0 z-10 border-b border-outline-variant/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono-metric-md font-bold text-primary">
                    {selectedTicket.key}
                  </span>
                  <span className="font-mono-metric-sm text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                    {selectedTicket.region}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`px-2 py-0.5 rounded font-mono-metric-sm font-bold ${
                      selectedTicket.frozen
                        ? 'bg-primary-fixed text-primary'
                        : selectedTicket.severity === 'critical'
                        ? 'bg-error-container/60 text-on-error-container'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {selectedTicket.frozen ? 'FROZEN' : selectedTicket.statusLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInspectorOpen(false)}
                    aria-label="Close inspector panel"
                    className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>

              <h2 className="font-headline-sm text-on-surface font-bold leading-tight">
                {selectedTicket.title}
              </h2>

              <div className="grid grid-cols-3 gap-2 bg-surface-container-lowest p-2 rounded border border-outline-variant/20">
                <div>
                  <div className="font-label-md text-on-surface-variant">Score</div>
                  <div className="font-mono-metric-md font-bold text-on-surface">
                    {selectedTicket.riskScore.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="font-label-md text-on-surface-variant">Exposure</div>
                  <div className="font-mono-metric-md font-bold text-error">
                    ${selectedTicket.exposureM.toFixed(1)}M
                  </div>
                </div>
                <div>
                  <div className="font-label-md text-on-surface-variant">SLA</div>
                  <div className="font-mono-metric-md font-bold text-primary">
                    {selectedTicket.slaDisplay}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onFreezeTicket(selectedTicket)}
                  className={`flex-1 h-8 rounded font-label-md font-semibold flex items-center justify-center gap-1 shadow-sm ${
                    selectedTicket.frozen
                      ? 'bg-emerald-700 text-white'
                      : 'bg-error text-on-error hover:opacity-90'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {selectedTicket.frozen ? 'check_circle' : 'block'}
                  </span>
                  <span>{selectedTicket.frozen ? 'FROZEN' : 'Execute Freeze'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onEscalateTicket(selectedTicket)}
                  className="h-8 px-2.5 rounded bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-label-md font-medium hover:bg-surface-container whitespace-nowrap"
                >
                  {selectedTicket.escalated ? 'Escalated' : 'Escalate'}
                </button>
              </div>
            </div>

            <div className="p-3.5 flex flex-col gap-3.5">
              {/* Root Cause Summary */}
              <div className="p-2.5 rounded bg-surface-container-low flex flex-col gap-1.5 border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-primary font-bold uppercase tracking-wider">
                    Root Cause Summary
                  </span>
                  <button
                    type="button"
                    onClick={onInspectTopology}
                    className="font-label-md text-primary font-semibold hover:underline"
                  >
                    Forensic Flow →
                  </button>
                </div>
                <p className="font-body-sm text-on-surface leading-relaxed">
                  {selectedTicket.rootCauseSummary}
                </p>
              </div>

              {/* Compact Ownership & Jurisdiction */}
              <div className="grid grid-cols-2 gap-2 text-body-sm">
                <div className="p-2 rounded bg-surface-container-low">
                  <span className="font-label-md text-on-surface-variant block">Assignee</span>
                  <span className="font-label-md font-semibold text-on-surface">
                    {selectedTicket.assignee.name}
                  </span>
                </div>
                <div className="p-2 rounded bg-surface-container-low">
                  <span className="font-label-md text-on-surface-variant block">Jurisdiction</span>
                  <span className="font-mono-metric-sm font-bold text-on-surface">
                    {selectedTicket.jurisdiction}
                  </span>
                </div>
              </div>

              {/* Linked Sub-Tasks */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                    Sub-Tasks ({selectedTicket.subTasks.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddingSubTask((prev) => !prev)}
                    className="font-label-md text-primary hover:underline font-semibold"
                  >
                    + Add
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

                {selectedTicket.subTasks.length === 0 ? (
                  <div className="p-2 rounded bg-surface-container-low text-body-sm text-on-surface-variant">
                    No sub-tasks linked.
                  </div>
                ) : (
                  selectedTicket.subTasks.map((st) => (
                    <label
                      key={st.id}
                      className="p-2 rounded bg-surface-container-low flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => onToggleSubTask(selectedTicket.id, st.id)}
                          className="w-3.5 h-3.5 accent-primary shrink-0"
                        />
                        <span
                          className={`font-label-md truncate ${
                            st.completed ? 'line-through text-on-surface-variant' : 'text-on-surface'
                          }`}
                        >
                          {st.title}
                        </span>
                      </div>
                      <span className="font-mono-metric-sm text-[10px] font-semibold text-on-surface-variant shrink-0">
                        {st.completed ? 'DONE' : st.status}
                      </span>
                    </label>
                  ))
                )}
              </div>

              {/* Audit Trail */}
              <div className="flex flex-col gap-2 pt-2 border-t border-surface-container-highest">
                <span className="font-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
                  Audit Notes
                </span>
                {selectedTicket.auditTrail.slice(0, 2).map((entry) => (
                  <div key={entry.id} className="bg-surface-container-low p-2 rounded font-body-sm">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-on-surface">{entry.author}</span>
                      <span className="font-mono-metric-sm text-on-surface-variant">
                        {entry.timestamp}
                      </span>
                    </div>
                    <p className="text-on-surface mt-1 leading-snug">{entry.message}</p>
                  </div>
                ))}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!auditInput.trim()) return;
                    onAddAuditNote(selectedTicket.id, auditInput.trim());
                    setAuditInput('');
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    type="text"
                    value={auditInput}
                    onChange={(e) => setAuditInput(e.target.value)}
                    placeholder="Add audit note..."
                    className="flex-1 h-8 px-2.5 bg-surface-container-lowest border border-outline-variant/50 rounded text-body-sm focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 rounded bg-primary text-on-primary font-label-md font-medium"
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
