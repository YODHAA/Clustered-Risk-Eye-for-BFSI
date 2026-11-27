import React, { useEffect, useState } from 'react';
import { OrbitId, RiskRegion, RiskSeverity, RiskTicket } from '../types/risk';

interface CreateBubbleModalProps {
  open: boolean;
  onClose: () => void;
  nextTicketNumber: number;
  onSpawnBubble: (ticket: RiskTicket) => void;
}

const PARENT_CLUSTERS: {
  label: string;
  region: RiskRegion;
  orbitId: OrbitId;
  parentKey: string;
  cx: number;
  cy: number;
  defaultTag: string;
}[] = [
  { label: 'APAC · CRE-8942 Synthetic ID Ring', region: 'APAC', orbitId: 'apac', parentKey: 'CRE-8942', cx: 380, cy: 300, defaultTag: 'HKG' },
  { label: 'US · CRE-9104 Fedwire / CHIPS Drift', region: 'US', orbitId: 'us', parentKey: 'CRE-9104', cx: 960, cy: 260, defaultTag: 'NYC' },
  { label: 'UK · CRE-8705 Faster Payments Ring', region: 'UK', orbitId: 'uk', parentKey: 'CRE-8705', cx: 410, cy: 740, defaultTag: 'LON' },
  { label: 'Europe · CRE-8911 TARGET2 & VASP', region: 'Europe', orbitId: 'europe', parentKey: 'CRE-8911', cx: 960, cy: 720, defaultTag: 'FRA' },
  { label: 'Middle East · CRE-9201 DIFC Escrow', region: 'Middle East', orbitId: 'middle-east', parentKey: 'CRE-9201', cx: 1450, cy: 490, defaultTag: 'DXB' },
];

const TYPOLOGY_OPTIONS: {
  label: string;
  mapped: RiskTicket['typology'];
}[] = [
  { label: 'Synthetic ID', mapped: 'Synthetic ID' },
  { label: 'TBML', mapped: 'TBML' },
  { label: 'Micro-Smurfing', mapped: 'Micro-Smurfing' },
  { label: 'Crypto Gateway', mapped: 'Crypto Gateway' },
];

export const CreateBubbleModal: React.FC<CreateBubbleModalProps> = ({
  open,
  onClose,
  nextTicketNumber,
  onSpawnBubble,
}) => {
  const [title, setTitle] = useState('Cross-Corridor Liquidity Deviation');
  const [parentIndex, setParentIndex] = useState(0);
  const [amountUsd, setAmountUsd] = useState(14500000);
  const [selectedTypology, setSelectedTypology] = useState<RiskTicket['typology']>('Synthetic ID');
  const [slaTier, setSlaTier] = useState<'within' | 'approaching' | 'critical'>('critical');
  const [corridorTags, setCorridorTags] = useState<string[]>(['HKG', 'SGP']);
  const [addingTag, setAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  const ticketKey = `CRE-${nextTicketNumber}`;
  const exposureM = Math.max(0.5, amountUsd / 1_000_000);
  const diameterPx = Math.round(Math.min(148, Math.max(82, 72 + exposureM * 1.4)));

  const handleSelectParent = (idx: number) => {
    setParentIndex(idx);
    const chosen = PARENT_CLUSTERS[idx];
    if (chosen) {
      setCorridorTags([chosen.defaultTag]);
    }
  };

  const handleSpawn = () => {
    const parent = PARENT_CLUSTERS[parentIndex] ?? PARENT_CLUSTERS[0];
    const severity: RiskSeverity =
      slaTier === 'critical' ? 'critical' : slaTier === 'approaching' ? 'warning' : 'nominal';

    const angle = ((nextTicketNumber * 47) % 360) * (Math.PI / 180);
    const offsetDist = 130;
    const x = Math.round(parent.cx + Math.cos(angle) * offsetDist);
    const y = Math.round(parent.cy + Math.sin(angle) * offsetDist);

    const slaSeconds = slaTier === 'critical' ? 1800 : slaTier === 'approaching' ? 14400 : 86400;
    const slaDisplay =
      slaTier === 'critical' ? '00:30:00' : slaTier === 'approaching' ? '04:00:00' : '24:00:00';

    const newTicket: RiskTicket = {
      id: ticketKey,
      key: ticketKey,
      title: title.trim() || 'Untitled Risk Cluster Trigger',
      shortTitle: (title.trim() || 'New Risk Trigger').slice(0, 28),
      region: parent.region,
      orbitId: parent.orbitId,
      typology: selectedTypology,
      corridor: corridorTags.join(' / ') || parent.region,
      jurisdiction: parent.region,
      severity,
      statusLabel:
        slaTier === 'critical'
          ? 'DEFCON 1: BREACH'
          : slaTier === 'approaching'
          ? 'AT-RISK LIMIT'
          : 'WITHIN APPETITE',
      badgeText: slaTier === 'critical' ? 'Defcon 1' : slaTier === 'approaching' ? 'Warning' : 'Review',
      riskScore: slaTier === 'critical' ? 92.4 : slaTier === 'approaching' ? 75.0 : 48.0,
      exposureM: Number(exposureM.toFixed(2)),
      limitM: 10.0,
      txVelocity: Number((8 + exposureM * 0.8).toFixed(1)),
      slaSeconds,
      slaDisplay,
      assignee: { name: 'Elena Rostova', initials: 'ER', role: 'Lead Risk Ops' },
      reporter: 'Manual Dispatch',
      density: 4,
      stage: slaTier === 'critical' ? 'mitigation' : slaTier === 'approaching' ? 'triage' : 'triggered',
      priority: slaTier === 'critical' ? 'P1' : slaTier === 'approaching' ? 'P2' : 'P3',
      rootCauseSummary: `Spawned in ${parent.region} (${parent.parentKey}) with $${exposureM.toFixed(1)}M exposure.`,
      confidence: 92.0,
      rules: ['CRE-SPAWN-LIVE'],
      x,
      y,
      radiusPx: diameterPx,
      parentKey: parent.parentKey,
      subTasks: [],
      auditTrail: [
        {
          id: `au-${ticketKey}-1`,
          author: 'Sir Julian Vance (Group CRO)',
          initials: 'JV',
          timestamp: 'Just now',
          message: `Spawned ${ticketKey} in ${parent.region} ($${exposureM.toFixed(1)}M exposure).`,
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden text-on-surface"
      >
        <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm font-bold text-on-surface">
              Create Risk Ticket Bubble
            </span>
            <span className="font-mono-metric-sm text-secondary bg-surface-container px-2 py-0.5 rounded font-semibold">
              {ticketKey}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-label-md font-semibold text-on-surface uppercase tracking-wide">
              Risk Incident Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/60 rounded text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-label-md font-semibold text-on-surface uppercase tracking-wide">
                Regional Cluster Orbit
              </label>
              <select
                value={parentIndex}
                onChange={(e) => handleSelectParent(Number(e.target.value))}
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
                Exposure Amount ($USD)
              </label>
              <input
                type="number"
                step={500000}
                min={500000}
                value={amountUsd}
                onChange={(e) => setAmountUsd(Math.max(500000, Number(e.target.value) || 500000))}
                className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/60 rounded font-mono-metric-md font-bold text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-md font-semibold text-on-surface uppercase tracking-wide">
              Risk Typology
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TYPOLOGY_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSelectedTypology(opt.mapped)}
                  className={`px-2.5 py-1 rounded font-label-md transition-colors ${
                    selectedTypology === opt.mapped
                      ? 'bg-secondary text-on-secondary font-semibold shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-md font-semibold text-on-surface uppercase tracking-wide">
              SLA Urgency Tier
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'within', label: 'Within Limit', sla: '24h' },
                  { id: 'approaching', label: 'At-Risk Limit', sla: '04h' },
                  { id: 'critical', label: 'Defcon 1 Breach', sla: '30m' },
                ] as const
              ).map((tier) => (
                <label
                  key={tier.id}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                    slaTier === tier.id
                      ? 'bg-primary-fixed/40 border-primary/50'
                      : 'bg-surface-container-low border-outline-variant/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="slaTier"
                    checked={slaTier === tier.id}
                    onChange={() => setSlaTier(tier.id)}
                    className="accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="font-label-md font-semibold text-on-surface">{tier.label}</span>
                    <span className="font-mono-metric-sm text-on-surface-variant">SLA: {tier.sla}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-label-md text-on-surface-variant uppercase">Tags:</span>
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
                <button type="submit" className="text-xs font-semibold text-primary hover:underline">
                  Add
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingTag(true)}
                className="text-body-sm font-label-md text-primary font-semibold hover:underline"
              >
                + Add Tag
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 bg-surface-container-low border-t border-outline-variant/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded bg-surface-container-lowest text-on-surface font-label-md font-semibold border border-outline-variant/60 hover:bg-surface-container"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSpawn}
            className="h-8 px-4 rounded bg-primary text-on-primary font-label-md font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-95"
          >
            <span className="material-symbols-outlined text-[16px]">add_task</span>
            <span>Spawn Ticket Bubble</span>
          </button>
        </div>
      </div>
    </div>
  );
};
