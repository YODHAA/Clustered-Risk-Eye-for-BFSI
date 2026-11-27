import React, { useEffect, useState } from 'react';
import { RiskSeverity, RiskTicket } from '../types/risk';

interface CreateBubbleModalProps {
  open: boolean;
  onClose: () => void;
  nextTicketNumber: number;
  onSpawnBubble: (ticket: RiskTicket) => void;
}

const PARENT_CLUSTERS = [
  { label: 'CRE-8942: APAC Synthetic ID Ring ($77.7M)', orbitId: 'alpha' as const, parentKey: 'CRE-8942', cx: 480, cy: 420 },
  { label: 'CRE-8911: TBML Customs Invoice ($42.3M)', orbitId: 'beta' as const, parentKey: 'CRE-8911', cx: 1180, cy: 340 },
  { label: 'CRE-8705: UK Retail Smurfing ($18.4M)', orbitId: 'gamma' as const, parentKey: 'CRE-8705', cx: 560, cy: 980 },
  { label: 'CRE-9008: Crypto Liquidity Leak ($11.2M)', orbitId: 'delta' as const, parentKey: 'CRE-9008', cx: 1240, cy: 880 },
];

const TYPOLOGY_OPTIONS: {
  label: string;
  mapped: RiskTicket['typology'];
}[] = [
  { label: 'Synthetic Identity', mapped: 'Synthetic ID' },
  { label: 'APP Fraud', mapped: 'Micro-Smurfing' },
  { label: 'TBML', mapped: 'TBML' },
  { label: 'Smurfing', mapped: 'Micro-Smurfing' },
  { label: 'Crypto On-Ramp', mapped: 'Crypto Gateway' },
];

export const CreateBubbleModal: React.FC<CreateBubbleModalProps> = ({
  open,
  onClose,
  nextTicketNumber,
  onSpawnBubble,
}) => {
  const [issueType, setIssueType] = useState('Cluster Epic');
  const [title, setTitle] = useState('Abnormal Cross-Corridor Wire Smurfing - Zurich to Cayman');
  const [parentIndex, setParentIndex] = useState(0);
  const [amountUsd, setAmountUsd] = useState(16500000);
  const [selectedTypologies, setSelectedTypologies] = useState<string[]>([
    'Synthetic Identity',
    'TBML',
    'Smurfing',
  ]);
  const [slaTier, setSlaTier] = useState<'within' | 'approaching' | 'critical'>('critical');
  const [corridorTags, setCorridorTags] = useState<string[]>(['HKG', 'CHE', 'CYM', 'SGP']);
  const [addingTag, setAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  const ticketKey = `CRE-${nextTicketNumber}`;
  const exposureM = Math.max(0.5, amountUsd / 1_000_000);
  const diameterPx = Math.round(Math.min(168, Math.max(54, 48 + exposureM * 1.2)));
  const repulsionN = (28 + exposureM * 0.98).toFixed(1);

  const toggleTypology = (label: string) => {
    setSelectedTypologies((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleSpawn = () => {
    const parent = PARENT_CLUSTERS[parentIndex] ?? PARENT_CLUSTERS[0];
    const severity: RiskSeverity =
      slaTier === 'critical' ? 'critical' : slaTier === 'approaching' ? 'warning' : 'nominal';
    const primaryTypology =
      TYPOLOGY_OPTIONS.find((opt) => selectedTypologies.includes(opt.label))?.mapped ??
      'Synthetic ID';

    const angle = ((nextTicketNumber * 47) % 360) * (Math.PI / 180);
    const offsetDist = 145;
    const x = Math.round(parent.cx + Math.cos(angle) * offsetDist);
    const y = Math.round(parent.cy + Math.sin(angle) * offsetDist);

    const slaSeconds = slaTier === 'critical' ? 1800 : slaTier === 'approaching' ? 14400 : 86400;
    const slaDisplay = slaTier === 'critical' ? '00:30:00' : slaTier === 'approaching' ? '04:00:00' : '24:00:00';

    const newTicket: RiskTicket = {
      id: ticketKey,
      key: ticketKey,
      title: title.trim() || 'Untitled Risk Cluster Trigger',
      shortTitle: (title.trim() || 'New Risk Trigger').slice(0, 32),
      orbitId: parent.orbitId,
      typology: primaryTypology,
      corridor: corridorTags.join(' / ') || 'Global Corridor',
      jurisdiction: corridorTags.slice(0, 2).join(' / ') || 'MAS / FINMA',
      severity,
      statusLabel:
        slaTier === 'critical'
          ? 'DEFCON 1: BREACH'
          : slaTier === 'approaching'
          ? 'AT-RISK LIMIT'
          : 'WITHIN APPETITE',
      badgeText: slaTier === 'critical' ? 'Defcon 1' : slaTier === 'approaching' ? 'Warning' : 'Review',
      riskScore: slaTier === 'critical' ? 94.2 : slaTier === 'approaching' ? 76.4 : 48.0,
      exposureM: Number(exposureM.toFixed(2)),
      limitM: 10.0,
      txVelocity: Number((8 + exposureM * 0.9).toFixed(1)),
      slaSeconds,
      slaDisplay,
      assignee: { name: 'Elena Rostova', initials: 'ER', role: 'Lead Risk Ops' },
      reporter: `Manual Dispatch (${issueType})`,
      density: Math.max(2, selectedTypologies.length * 2),
      stage: slaTier === 'critical' ? 'mitigation' : slaTier === 'approaching' ? 'triage' : 'triggered',
      priority: slaTier === 'critical' ? 'P1' : slaTier === 'approaching' ? 'P2' : 'P3',
      rootCauseSummary: `Spawned on ${parent.parentKey} orbit (${corridorTags.join(', ')}). Active typologies: ${selectedTypologies.join(', ') || primaryTypology}.`,
      confidence: 92.5,
      rules: ['CRE-SPAWN-LIVE', `${primaryTypology.toUpperCase().replace(/\s+/g, '-')}`],
      x,
      y,
      radiusPx: Math.min(168, Math.max(96, diameterPx + 36)),
      parentKey: parent.parentKey,
      subTasks: [
        {
          id: `st-${ticketKey}-1`,
          key: `${ticketKey}-A`,
          title: 'Verify corridor entity settlement logs',
          meta: 'Auto-dispatched to Risk Ops',
          status: 'OPEN',
          completed: false,
        },
      ],
      auditTrail: [
        {
          id: `au-${ticketKey}-1`,
          author: 'Sir Julian Vance (Group CRO)',
          initials: 'JV',
          timestamp: 'Just now',
          message: `Spawned ticket bubble ${ticketKey} anchored to ${parent.parentKey} with $${exposureM.toFixed(1)}M exposure.`,
        },
      ],
    };

    onSpawnBubble(newTicket);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSpawn();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!open) return null;

  const tierAccent =
    slaTier === 'critical'
      ? { ring: '#ba1a1a', badgeBg: 'bg-error text-on-error', text: 'text-error', label: 'DEFCON 1' }
      : slaTier === 'approaching'
      ? { ring: '#f59e0b', badgeBg: 'bg-amber-500 text-white', text: 'text-amber-800', label: 'AT-RISK' }
      : { ring: '#006194', badgeBg: 'bg-primary text-on-primary', text: 'text-primary', label: 'NOMINAL' };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-on-surface"
      >
        {/* Header */}
        <div className="px-4 py-2.5 bg-surface-container-low border-b border-outline-variant/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-primary text-on-primary flex items-center justify-center font-bold text-xs shadow-sm">
              J
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm font-bold text-on-surface">
                  Create Risk Ticket &amp; Spawn Graph Bubble
                </span>
                <span className="font-mono-metric-sm text-secondary bg-surface-container px-2 py-0.5 rounded font-semibold">
                  {ticketKey} [DRAFT]
                </span>
              </div>
              <span className="font-body-sm text-on-surface-variant">
                Institutional Risk Engine • DBSCAN Cluster Node Dispatcher
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded text-body-sm">
              <span className="font-label-md text-on-surface-variant font-medium">Type:</span>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="bg-transparent font-mono-metric-sm font-semibold text-primary focus:outline-none cursor-pointer"
              >
                <option>Cluster Epic</option>
                <option>Anomaly Incident</option>
                <option>Typology Control Gap</option>
                <option>Regulatory Breach</option>
              </select>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 panel-scroll">
          {/* Left 7 Columns */}
          <div className="lg:col-span-7 flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="font-label-md font-semibold text-on-surface uppercase tracking-wide">
                Summary / Risk Incident Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Abnormal Cross-Corridor Wire Smurfing - Zurich to Cayman"
                className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/60 rounded text-body-md text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container-lowest transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-md font-semibold text-on-surface uppercase tracking-wide">
                  Orbit Anchor / Parent Cluster
                </label>
                <select
                  value={parentIndex}
                  onChange={(e) => setParentIndex(Number(e.target.value))}
                  className="w-full h-9 px-2.5 bg-surface-container-low border border-outline-variant/60 rounded text-body-sm font-mono-metric-sm text-on-surface focus:outline-none focus:border-primary"
                >
                  {PARENT_CLUSTERS.map((p, idx) => (
                    <option key={p.parentKey} value={idx}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-md font-semibold text-on-surface uppercase tracking-wide">
                  Financial Exposure Amount ($)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-mono-metric-sm text-on-surface-variant">
                    $
                  </span>
                  <input
                    type="number"
                    step={500000}
                    min={500000}
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(Math.max(500000, Number(e.target.value) || 500000))}
                    className="w-full h-9 pl-7 pr-3 bg-surface-container-low border border-outline-variant/60 rounded font-mono-metric-md font-bold text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Computed Physics Readout */}
            <div className="p-2.5 bg-surface-container-low rounded border border-outline-variant/30 flex items-center justify-between text-body-sm">
              <div className="flex flex-col">
                <span className="font-label-md text-on-surface-variant">Bubble Spatial Weight:</span>
                <span className="font-mono-metric-md font-bold text-primary">
                  {diameterPx}px Diameter
                </span>
              </div>
              <div className="h-6 w-px bg-outline-variant/40" />
              <div className="flex flex-col">
                <span className="font-label-md text-on-surface-variant">Repulsion Force:</span>
                <span className="font-mono-metric-md font-bold text-on-surface">{repulsionN} N</span>
              </div>
              <div className="h-6 w-px bg-outline-variant/40" />
              <div className="flex flex-col">
                <span className="font-label-md text-on-surface-variant">
                  Institutional Risk Tier:
                </span>
                <span
                  className={`font-mono-metric-sm font-bold px-2 py-0.5 rounded ${
                    slaTier === 'critical'
                      ? 'text-error bg-error-container/40'
                      : slaTier === 'approaching'
                      ? 'text-amber-900 bg-amber-100'
                      : 'text-primary bg-primary-fixed'
                  }`}
                >
                  {slaTier === 'critical'
                    ? 'High Tier 1'
                    : slaTier === 'approaching'
                    ? 'Elevated Tier 2'
                    : 'Nominal Tier 3'}
                </span>
              </div>
            </div>

            {/* Typology Taxonomy */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md font-semibold text-on-surface uppercase tracking-wide">
                Risk Typology Taxonomy
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TYPOLOGY_OPTIONS.map((opt) => {
                  const active = selectedTypologies.includes(opt.label);
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => toggleTypology(opt.label)}
                      className={`px-2.5 py-1 rounded font-label-md transition-colors ${
                        active
                          ? 'bg-secondary text-on-secondary font-semibold shadow-sm'
                          : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SLA Urgency Tier */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label-md font-semibold text-on-surface uppercase tracking-wide">
                Appetite Breach &amp; SLA Urgency Tier
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                    slaTier === 'within'
                      ? 'bg-primary-fixed/40 border-primary/50'
                      : 'bg-surface-container-low border-outline-variant/40 hover:bg-surface-container'
                  }`}
                >
                  <input
                    type="radio"
                    name="slaTier"
                    checked={slaTier === 'within'}
                    onChange={() => setSlaTier('within')}
                    className="accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="font-label-md font-semibold text-emerald-900">
                      Within Limit
                    </span>
                    <span className="font-mono-metric-sm text-on-surface-variant">SLA: 24h</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                    slaTier === 'approaching'
                      ? 'bg-amber-50 border-amber-400'
                      : 'bg-surface-container-low border-outline-variant/40 hover:bg-surface-container'
                  }`}
                >
                  <input
                    type="radio"
                    name="slaTier"
                    checked={slaTier === 'approaching'}
                    onChange={() => setSlaTier('approaching')}
                    className="accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="font-label-md font-semibold text-amber-900">
                      At-Risk Limit
                    </span>
                    <span className="font-mono-metric-sm text-on-surface-variant">SLA: 04h</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                    slaTier === 'critical'
                      ? 'bg-error-container/40 border-error/40'
                      : 'bg-surface-container-low border-outline-variant/40 hover:bg-surface-container'
                  }`}
                >
                  <input
                    type="radio"
                    name="slaTier"
                    checked={slaTier === 'critical'}
                    onChange={() => setSlaTier('critical')}
                    className="accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="font-label-md font-bold text-on-error-container flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                      Defcon 1 Breach
                    </span>
                    <span className="font-mono-metric-sm text-error font-semibold">SLA: 30m</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Jurisdictional Corridor Tags */}
            <div className="flex flex-col gap-1">
              <label className="font-label-md font-semibold text-on-surface uppercase tracking-wide">
                Jurisdictional Corridor Tags
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {corridorTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded bg-surface-container font-mono-metric-sm font-semibold text-on-surface border border-outline-variant/40 flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setCorridorTags((prev) => prev.filter((t) => t !== tag))}
                      className="text-on-surface-variant hover:text-error"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {addingTag ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const clean = newTagInput.trim().toUpperCase();
                      if (clean && !corridorTags.includes(clean)) {
                        setCorridorTags((prev) => [...prev, clean]);
                      }
                      setNewTagInput('');
                      setAddingTag(false);
                    }}
                    className="inline-flex items-center gap-1"
                  >
                    <input
                      autoFocus
                      type="text"
                      maxLength={6}
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="MAS"
                      className="w-16 h-6 px-1.5 rounded bg-surface-container-low border border-primary font-mono-metric-sm uppercase focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Add
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTag(true)}
                    className="text-body-sm font-label-md text-primary font-semibold hover:underline"
                  >
                    + Add Entity
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Live Spatial Bubble Simulation */}
          <div className="lg:col-span-5 flex flex-col gap-3 bg-surface-container-low p-4 rounded-lg border border-outline-variant/40">
            <div className="flex items-center justify-between">
              <span className="font-label-md font-bold text-on-surface uppercase tracking-wide flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  bubble_chart
                </span>
                Spatial Bubble Simulation
              </span>
              <span className="font-mono-metric-sm text-secondary bg-surface-container-lowest px-1.5 py-0.5 rounded font-semibold">
                Canvas Preview
              </span>
            </div>

            <div
              className="relative w-full h-60 bg-surface rounded-lg border border-outline-variant/30 flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
                backgroundSize: '16px 16px',
              }}
            >
              <div className="absolute w-44 h-44 rounded-full border border-dashed border-error/50 bg-error/5 flex items-center justify-center pointer-events-none">
                <span className="font-mono-metric-sm text-[10px] text-error font-semibold absolute top-2 uppercase tracking-wide">
                  Orbit Anchor Radius
                </span>
              </div>
              <div className="absolute w-28 h-0.5 border-b border-dashed border-error/60 transform -rotate-12 pointer-events-none" />

              <div
                className="relative z-10 w-32 h-32 rounded-full bg-surface-container-lowest shadow-xl flex flex-col items-center justify-center p-2 text-center transition-all"
                style={{
                  boxShadow: `0 0 0 2.5px ${tierAccent.ring}, 0 10px 25px -4px rgba(11, 28, 48, 0.18)`,
                }}
              >
                <div
                  className={`absolute -top-2.5 px-2 py-0.5 rounded font-mono-metric-sm text-[10px] font-bold shadow-sm uppercase ${tierAccent.badgeBg}`}
                >
                  {tierAccent.label}
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-secondary" />
                  <span className="font-mono-metric-sm font-bold text-primary">{ticketKey}</span>
                </div>
                <span className="font-label-md text-on-surface font-semibold line-clamp-2 mt-0.5 leading-tight">
                  {title || 'Untitled Risk Bubble'}
                </span>
                <span className={`font-mono-metric-md font-bold mt-0.5 ${tierAccent.text}`}>
                  ${exposureM.toFixed(1)}M
                </span>
              </div>

              <div className="absolute bottom-2 left-2 bg-surface-container-lowest/90 px-2 py-0.5 rounded font-mono-metric-sm text-[10px] text-on-surface-variant font-medium border border-outline-variant/30">
                Vector: &lt;{PARENT_CLUSTERS[parentIndex]?.cx ?? 480},{' '}
                {PARENT_CLUSTERS[parentIndex]?.cy ?? 420}&gt;
              </div>
            </div>

            <div className="flex flex-col gap-1 text-body-sm">
              <div className="flex items-center justify-between font-mono-metric-sm">
                <span className="text-on-surface-variant">Parent Cluster Link:</span>
                <span className="font-semibold text-primary">
                  {PARENT_CLUSTERS[parentIndex]?.parentKey}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono-metric-sm">
                <span className="text-on-surface-variant">Physics Collision Margin:</span>
                <span className="font-semibold text-on-surface">Safe (&gt;18px separation)</span>
              </div>
              <div className="flex items-center justify-between font-mono-metric-sm">
                <span className="text-on-surface-variant">Automated Jira Sync:</span>
                <span className="font-semibold text-secondary">Bidirectional Webhook OK</span>
              </div>
            </div>

            <div className="p-2 rounded bg-primary/10 border border-primary/25 flex items-start gap-2 mt-auto">
              <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                info
              </span>
              <p className="font-body-sm text-on-surface leading-snug">
                Spawning this bubble creates an active node on the canvas, links it to the parent
                orbit, and syncs it into the RiskOps Kanban pipeline.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-surface-container-low border-t border-outline-variant/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono-metric-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">keyboard</span>
            <span>
              Press <strong className="text-on-surface font-semibold">Ctrl/Cmd + Enter</strong> to
              instant-spawn
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded bg-surface-container-lowest text-on-surface font-label-md font-semibold border border-outline-variant/60 hover:bg-surface-container transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSpawn}
              className="h-8 px-4 rounded bg-primary text-on-primary font-label-md font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-95 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add_task</span>
              <span>Spawn Ticket Bubble on Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
