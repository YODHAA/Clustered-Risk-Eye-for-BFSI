import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { INITIAL_CHRONOLOGY } from '../data/initialRiskData';
import { buildExposureTimelineData, ExposureTimelinePoint } from '../utils/exposureTimeline';

interface ClusterTopologyViewProps {
  globalFreezeActive: boolean;
  onToggleGlobalFreeze: () => void;
  onExportPdf: () => void;
  onNotify: (title: string, message: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

type FlowNodeId = 'origin' | 'relay' | 'sinkA' | 'sinkB';

export const ClusterTopologyView: React.FC<ClusterTopologyViewProps> = ({
  globalFreezeActive,
  onToggleGlobalFreeze,
  onExportPdf,
  onNotify,
}) => {
  const [forensicState, setForensicState] = useState<'pre' | 'post'>(
    globalFreezeActive ? 'post' : 'pre'
  );
  const [selectedFlowNode, setSelectedFlowNode] = useState<FlowNodeId>('origin');
  const [isolatedAccounts, setIsolatedAccounts] = useState(false);
  const [chronology, setChronology] = useState(INITIAL_CHRONOLOGY);

  const isPre = forensicState === 'pre' && !globalFreezeActive;

  const exposureTimeline = useMemo(
    () =>
      buildExposureTimelineData({
        globalFreezeActive,
        forensicState,
        isolatedAccounts,
      }),
    [globalFreezeActive, forensicState, isolatedAccounts]
  );

  const flowNodeDetails: Record<
    FlowNodeId,
    { title: string; role: string; telemetry: string; actionNote: string }
  > = {
    origin: {
      title: 'HK-Central-Branch-04',
      role: '1. Origin Node • SIM-Ring Ingestion',
      telemetry: isPre
        ? '$21.40M Outflow across 44 synthetic mule accounts'
        : '$0.00 Outflow — Biometric lock & SIM-Ring quarantine enforced',
      actionNote: 'Exploited legacy SMS 2FA rate limits during burst account provisioning.',
    },
    relay: {
      title: 'Tokyo-Fintech-Gateway',
      role: '2. Funnel Relay • API Aggregator',
      telemetry: isPre
        ? '$36.10M Routed at 1,490 tx/hr via unthrottled API tunnel'
        : '$0.00 Routed — API tunnel blocked under $10k emergency wire cap',
      actionNote: 'Structured transfers calibrated at $9,800 to evade FATF $10k travel rules.',
    },
    sinkA: {
      title: 'SG-Raffles-Retail',
      role: '3a. Retail Sink • ATM Liquidation',
      telemetry: isPre
        ? '$14.20M Sunk via synchronized OTC cash withdrawals'
        : '$11.40M Frozen In-Transit • Clawback issued via HKMA/MAS',
      actionNote: 'Hardware ATM withdrawal limits triggered across 12 Singapore retail nodes.',
    },
    sinkB: {
      title: 'Cayman Trust #8491',
      role: '3b. Vault Escrow • Shell Real Estate',
      telemetry: isPre
        ? '$12.60M Held with beneficial ownership KYC deficit'
        : '$0.00 Inflow — Court injunction & asset freeze registered',
      actionNote: 'Shared 38 unique device fingerprints across 4 common UBO records.',
    },
  };

  const handleEnactGlobalWireCap = () => {
    onToggleGlobalFreeze();
    setForensicState((prev) => (prev === 'pre' ? 'post' : 'pre'));
    const now = new Date().toISOString().substring(11, 16) + ' UTC';
    setChronology((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        title: !globalFreezeActive
          ? 'Global Wire Limit ($10k Cap) Enacted'
          : 'Emergency Wire Limit Lifted',
        time: now,
        tone: 'primary',
        desc: !globalFreezeActive
          ? 'Instant $10k wire cap distributed across APAC, US, UK, Europe & Middle East gateways.'
          : 'Corridor returned to standard monitoring posture.',
      },
    ]);
  };

  const handleIsolateAccounts = () => {
    setIsolatedAccounts(true);
    setForensicState('post');
    const now = new Date().toISOString().substring(11, 16) + ' UTC';
    setChronology((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        title: '142 Synthetic Accounts Quarantined',
        time: now,
        tone: 'secondary',
        desc: 'All inbound/outbound SWIFT and local FAST rails gated into escrow review.',
      },
    ]);
    onNotify(
      'Subnet Quarantine Executed',
      '142 synthetic mule accounts isolated across HK, Tokyo, and Singapore rails.',
      'success'
    );
  };

  const handleDownloadDossier = () => {
    const content = {
      epic: 'CRE-8942',
      cluster: 'CL-APAC-09',
      state: isPre ? 'Active Breach' : 'Post-Mitigation Controlled',
      merkleRoot: '0x9e3f810a449dB3',
      exposure: isPre ? '$48.20M' : '$11.40M',
      chronology,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CRE-8942-Basel-III-Forensic-Dossier.json';
    a.click();
    URL.revokeObjectURL(url);
    onNotify(
      'Basel III Dossier Generated',
      'Forensic dossier with Merkle proof 0x9e3f...B3 downloaded.',
      'success'
    );
  };

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Cluster Context & Command Bar */}
      <div className="bg-surface-container-lowest shadow-sm px-4 py-4 mb-4 border-b border-outline-variant/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-mono-metric-sm text-tertiary">
              <span className="text-primary font-bold">CRE-8942</span>
              <span className="text-outline-variant">/</span>
              <span>CL-APAC-09</span>
              <span className="text-outline-variant">/</span>
              <span className={`font-semibold ${isPre ? 'text-error' : 'text-primary'}`}>
                {isPre ? 'BREACH (+192.8%)' : 'CONTAINED (DEFCON 4)'}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-headline-lg text-on-surface font-bold tracking-tight">
                Cross-Border Synthetic ID &amp; Mule Network
              </h1>
              <span
                className={`px-2 py-0.5 rounded font-mono-metric-sm font-semibold flex items-center gap-1 ${
                  isPre
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-primary-fixed text-on-primary-fixed'
                }`}
              >
                {isPre ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                    Critical Root Cause Alert
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[14px] text-primary">
                      verified_user
                    </span>
                    Mitigation Policy Enforced
                  </>
                )}
              </span>
            </div>
            <p className="font-body-md text-on-surface-variant max-w-3xl mt-1">
              <strong className="text-on-surface font-semibold">Root Cause Thesis:</strong>{' '}
              Automated burst account opening bypassed Tier-2 identity verification via spoofed IP
              blocks, enabling high-velocity smurfing into cross-border relay channels.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 self-start lg:self-center">
            {/* Segmented Switcher */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-mono-metric-sm text-[10px] text-tertiary uppercase tracking-wider font-semibold">
                <span>Simulation / State Model</span>
                <span className={`font-bold ${isPre ? 'text-error' : 'text-primary'}`}>
                  {isPre ? 'Active Breach' : 'Mitigated & Secured'}
                </span>
              </div>
              <div
                className="inline-flex p-1 rounded-lg bg-surface-container-high/60 border border-outline-variant/40 shadow-inner"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={isPre}
                  onClick={() => setForensicState('pre')}
                  className={`px-3 py-1.5 rounded font-label-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isPre
                      ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPre ? 'bg-error animate-pulse' : 'bg-error/40'
                    }`}
                  />
                  <span>Pre-Breach (T-0 Baseline)</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isPre}
                  onClick={() => setForensicState('post')}
                  className={`px-3 py-1.5 rounded font-label-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    !isPre
                      ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${!isPre ? 'bg-primary' : 'bg-primary/40'}`}
                  />
                  <span>Post-Mitigation (Controlled)</span>
                </button>
              </div>
            </div>

            {/* Exposure Cards */}
            <div className="flex items-center gap-4 bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant/30">
              <div className="flex flex-col">
                <span className="font-mono-metric-sm text-[10px] text-on-surface-variant uppercase">
                  Total Exposure / Tolerance
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`font-mono-metric-lg font-bold ${
                      isPre ? 'text-on-surface' : 'text-primary'
                    }`}
                  >
                    {isPre ? '$48.20M' : '$11.40M'}
                  </span>
                  <span className="font-mono-metric-sm text-tertiary">/ $25.00M limit</span>
                </div>
              </div>
              <div className="h-8 w-px bg-outline-variant/40" />
              <div className="flex flex-col">
                <span
                  className={`font-mono-metric-sm text-[10px] uppercase font-semibold ${
                    isPre ? 'text-error' : 'text-primary'
                  }`}
                >
                  {isPre ? 'Net Policy Deficit' : 'Reserve Buffer Intact'}
                </span>
                <span
                  className={`font-mono-metric-lg font-bold ${
                    isPre ? 'text-error' : 'text-primary'
                  }`}
                >
                  {isPre ? '+$23.20M' : '+$13.60M Safe'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Forensic Workspace */}
      <div className="px-4 grid grid-cols-12 gap-3 items-start">
        {/* LEFT PANEL (3 cols) */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-3">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-surface-container-high/40">
              <span className="font-label-md text-tertiary uppercase tracking-wider font-semibold">
                Root Cause Anatomy
              </span>
              <span
                className={`px-2 py-0.5 rounded font-mono-metric-sm text-[10px] font-bold ${
                  isPre
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-primary-fixed text-on-primary-fixed'
                }`}
              >
                {isPre ? 'POLICY DEFICIT' : 'CONTAINED'}
              </span>
            </div>

            <div className="mt-3">
              <span className="font-mono-metric-sm text-[10px] text-on-surface-variant uppercase">
                Primary Failure Vector
              </span>
              <div className="font-headline-sm font-bold text-on-surface mt-0.5">
                Identity Verification Bypass &amp; Smurfing Proxy
              </div>
              <p className="font-body-sm text-on-surface-variant mt-1 leading-normal">
                Automated SIM farm gateway #09 exploited legacy rate limits on regional synthetic ID
                generation.
              </p>
            </div>

            <div className="mt-3 p-2 bg-surface-container-low rounded-lg border border-outline-variant/30">
              <div className="flex items-center justify-between font-mono-metric-sm mb-1">
                <span className="text-on-surface-variant">Corridor Contagion</span>
                <span className={`font-semibold ${isPre ? 'text-error' : 'text-primary'}`}>
                  {isPre ? '$48.2M Total ($23.2M Breach)' : '$11.4M Frozen'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden flex">
                <div
                  className="h-full bg-secondary transition-all duration-300"
                  style={{ width: isPre ? '51.8%' : '100%' }}
                />
                {isPre && <div className="h-full bg-error" style={{ width: '48.2%' }} />}
              </div>
            </div>

            <div className="mt-3">
              <span className="font-label-md text-tertiary uppercase tracking-wider font-semibold block mb-2">
                Key Root Cause Drivers
              </span>
              <div className="space-y-2 font-body-sm">
                <div className="flex items-start gap-2 p-2 rounded bg-surface-container-low">
                  <span className="w-5 h-5 rounded-full bg-error/10 text-error flex items-center justify-center font-mono-metric-sm text-[10px] font-bold shrink-0">
                    1
                  </span>
                  <div>
                    <div className="font-semibold text-on-surface">
                      Synthetic Account Generation Burst
                    </div>
                    <div className="text-on-surface-variant text-[11px]">
                      88 accounts generated in 12m from Tor-exit cluster.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-surface-container-low">
                  <span className="w-5 h-5 rounded-full bg-error/10 text-error flex items-center justify-center font-mono-metric-sm text-[10px] font-bold shrink-0">
                    2
                  </span>
                  <div>
                    <div className="font-semibold text-on-surface">
                      Micro-Threshold Structuring
                    </div>
                    <div className="text-on-surface-variant text-[11px]">
                      Wires calibrated at $9,800 to bypass AML automated triage.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-md text-tertiary uppercase tracking-wider font-semibold">
                Investigator On-Call
              </span>
              <span className="w-2 h-2 rounded-full bg-secondary" title="Active" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono-metric-sm font-bold">
                AT
              </div>
              <div>
                <div className="font-label-md text-on-surface font-semibold">Dr. Aris Thorne</div>
                <div className="font-mono-metric-sm text-[10px] text-on-surface-variant">
                  Lead Forensic Graph Scientist
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER PANEL (6 cols) */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-6 flex flex-col gap-3">
          {/* Interactive Root Cause Flow Canvas */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col">
            <div className="h-11 px-3.5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  account_tree
                </span>
                <span className="font-label-md text-on-surface font-bold">
                  Root Cause Flow: Origin → Gateway → Sink Attribution
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono-metric-sm text-[10px] px-2 py-0.5 rounded border font-semibold ${
                    isPre
                      ? 'text-error bg-error-container/40 border-error/30'
                      : 'text-primary bg-primary-fixed/40 border-primary/30'
                  }`}
                >
                  {isPre ? 'LIVE ATTACK VECTORS' : 'CONTAINMENT ACTIVE (QUARANTINED)'}
                </span>
                <span className="font-mono-metric-sm text-[10px] text-on-surface-variant px-2 py-0.5 rounded bg-surface-container-high font-semibold">
                  CRE-8942-ROOT
                </span>
              </div>
            </div>

            <div className="relative w-full min-h-[380px] bg-surface-bright overflow-hidden p-5 select-none flex flex-col justify-between">
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 760 340"
                preserveAspectRatio="none"
              >
                <path
                  d="M 190 170 C 245 170, 275 170, 325 170"
                  fill="none"
                  stroke={isPre ? '#ba1a1a' : '#006194'}
                  strokeDasharray="4 4"
                  strokeWidth="2.5"
                />
                <path
                  d="M 480 150 C 525 150, 540 90, 580 90"
                  fill="none"
                  stroke={isPre ? '#0051d5' : '#707881'}
                  strokeDasharray="4 4"
                  strokeWidth="2"
                />
                <path
                  d="M 480 190 C 525 190, 540 250, 580 250"
                  fill="none"
                  stroke={isPre ? '#545c72' : '#707881'}
                  strokeDasharray="4 4"
                  strokeWidth="2"
                />
              </svg>

              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 my-auto">
                {/* Node 1: Origin */}
                <button
                  type="button"
                  onClick={() => setSelectedFlowNode('origin')}
                  className={`w-full sm:w-48 bg-surface-container-lowest rounded-xl p-3 shadow-sm text-left transition-all border ${
                    selectedFlowNode === 'origin'
                      ? 'ring-2 ring-primary border-primary'
                      : isPre
                      ? 'border-error/40 hover:border-error'
                      : 'border-primary/40 hover:border-primary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`font-mono-metric-sm text-[10px] font-bold uppercase ${
                        isPre ? 'text-error' : 'text-primary'
                      }`}
                    >
                      {isPre ? '1. Origin Node' : '1. Origin Isolated'}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isPre ? 'bg-error animate-pulse' : 'bg-primary'
                      }`}
                    />
                  </div>
                  <div className="font-label-lg font-bold text-on-surface">
                    HK-Central-Branch-04
                  </div>
                  <div
                    className={`font-mono-metric-md font-bold mt-1 ${
                      isPre ? 'text-error' : 'text-primary'
                    }`}
                  >
                    {isPre ? '$21.40M Outflow' : '$0.00 Outflow'}
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-1">
                    {isPre ? '44 Mules • SIM-Ring' : '44 Accounts Frozen • Biometrics Locked'}
                  </div>
                </button>

                {/* Node 2: Funnel Relay */}
                <button
                  type="button"
                  onClick={() => setSelectedFlowNode('relay')}
                  className={`w-full sm:w-52 bg-surface-container-lowest rounded-xl p-3 shadow-sm text-left transition-all border ${
                    selectedFlowNode === 'relay'
                      ? 'ring-2 ring-primary border-primary'
                      : 'border-primary/40 hover:border-primary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono-metric-sm text-[10px] text-primary font-bold uppercase">
                      2. Funnel Relay
                    </span>
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="font-label-lg font-bold text-on-surface">
                    Tokyo-Fintech-Gateway
                  </div>
                  <div className="font-mono-metric-md text-primary font-bold mt-1">
                    {isPre ? '$36.10M Routed' : '$0.00 Routed'}
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-1">
                    {isPre ? '1,490 tx/hr • API-Tunnel' : '0 tx/hr • Relay Blocked'}
                  </div>
                </button>

                {/* Nodes 3a & 3b: Sinks */}
                <div className="flex flex-col gap-5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedFlowNode('sinkA')}
                    className={`w-full sm:w-48 bg-surface-container-lowest rounded-xl p-3 shadow-sm text-left transition-all border ${
                      selectedFlowNode === 'sinkA'
                        ? 'ring-2 ring-primary border-primary'
                        : isPre
                        ? 'border-secondary/40 hover:border-secondary'
                        : 'border-outline-variant/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-metric-sm text-[10px] text-secondary font-bold uppercase">
                        3a. Retail Sink
                      </span>
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                    </div>
                    <div className="font-label-lg font-bold text-on-surface">
                      SG-Raffles-Retail
                    </div>
                    <div className="font-mono-metric-md text-secondary font-bold mt-1">
                      {isPre ? '$14.20M Sunk' : '$11.40M Frozen In-Transit'}
                    </div>
                    <div className="text-[11px] text-on-surface-variant mt-1">
                      {isPre ? 'OTC Cash Withdrawals' : 'Clawback Issued via HKMA/MAS'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedFlowNode('sinkB')}
                    className={`w-full sm:w-48 bg-surface-container-lowest rounded-xl p-3 shadow-sm text-left transition-all border ${
                      selectedFlowNode === 'sinkB'
                        ? 'ring-2 ring-primary border-primary'
                        : isPre
                        ? 'border-tertiary/40 hover:border-tertiary'
                        : 'border-outline-variant/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono-metric-sm text-[10px] text-tertiary font-bold uppercase">
                        3b. Vault Escrow
                      </span>
                      <span className="w-2 h-2 rounded-full bg-tertiary" />
                    </div>
                    <div className="font-label-lg font-bold text-on-surface">
                      Cayman Trust #8491
                    </div>
                    <div className="font-mono-metric-md text-on-surface font-bold mt-1">
                      {isPre ? '$12.60M Held' : '$0.00 Inflow'}
                    </div>
                    <div
                      className={`text-[11px] font-semibold mt-1 ${
                        isPre ? 'text-error' : 'text-primary'
                      }`}
                    >
                      {isPre ? 'KYC Deficit • Shell Real Estate' : 'Court Injunction Registered'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Selected Node Inline Diagnostic Bar */}
              <div className="mt-3 p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-mono-metric-sm text-primary font-bold">
                    SELECTED: {flowNodeDetails[selectedFlowNode].title} ·{' '}
                    <span className="text-on-surface-variant font-normal">
                      {flowNodeDetails[selectedFlowNode].role}
                    </span>
                  </div>
                  <div className="font-body-sm text-on-surface mt-0.5">
                    {flowNodeDetails[selectedFlowNode].telemetry} —{' '}
                    <span className="text-on-surface-variant">
                      {flowNodeDetails[selectedFlowNode].actionNote}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-outline-variant/30 pt-2 mt-2 flex flex-wrap items-center justify-between text-tertiary font-mono-metric-sm gap-2">
                <span>
                  Hop Velocity: <strong className="text-on-surface">1.2s avg</strong>
                </span>
                <span>
                  Topology State:{' '}
                  <strong className={`font-semibold ${isPre ? 'text-error' : 'text-primary'}`}>
                    {isPre ? 'Compromised (Active)' : 'Corridor Isolated (Quarantined)'}
                  </strong>
                </span>
                <span>
                  Anchor Hash: <strong className="text-on-surface">0x9e3f...B3</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Total Risk Exposure Over Time (Recharts Line Chart) */}
          <div
            data-testid="exposure-timeline-card"
            className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  show_chart
                </span>
                <div>
                  <h2 className="font-label-lg text-on-surface font-bold leading-tight">
                    Total Risk Exposure Over Time
                  </h2>
                  <p className="font-mono-metric-sm text-[10px] text-on-surface-variant">
                    {isPre
                      ? 'Unmitigated corridor trajectory vs. modeled $10k global freeze impact'
                      : `Global freeze impact: -$${exposureTimeline.summary.curtailedFromPeakM.toFixed(2)}M (-${exposureTimeline.summary.curtailedPct}%) curtailed from $48.20M peak`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded font-mono-metric-sm text-[10px] font-bold ${
                    isPre
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-primary-fixed text-on-primary-fixed'
                  }`}
                >
                  {isPre
                    ? `ACTIVE BREACH: $${exposureTimeline.summary.currentExposureM.toFixed(2)}M`
                    : `CONTAINED: $${exposureTimeline.summary.currentExposureM.toFixed(2)}M`}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container-low border border-outline-variant/40 font-mono-metric-sm text-[10px] text-on-surface font-semibold">
                  {isPre
                    ? `15:45 Avoidable: -$${exposureTimeline.summary.avoidedBy1545M.toFixed(1)}M`
                    : `Avoided by 15:45: $${exposureTimeline.summary.avoidedBy1545M.toFixed(1)}M`}
                </span>
                <button
                  type="button"
                  onClick={onExportPdf}
                  className="px-2 py-0.5 rounded bg-primary text-on-primary font-label-md font-semibold flex items-center gap-1 hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[13px]">picture_as_pdf</span>
                  <span>PDF</span>
                </button>
              </div>
            </div>

            <div className="w-full h-64" data-testid="exposure-timeline-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={exposureTimeline.points}
                  margin={{ top: 14, right: 18, left: 2, bottom: 4 }}
                >
                  <CartesianGrid stroke="#dce9ff" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: '#545c72', fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={{ stroke: '#bfc7d2' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 65]}
                    width={46}
                    tickFormatter={(value: number) => `$${value}M`}
                    tick={{ fontSize: 11, fill: '#545c72', fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const pt = payload[0]?.payload as ExposureTimelinePoint | undefined;
                      return (
                        <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-lg shadow-lg p-2.5 text-left min-w-[210px]">
                          <div className="flex items-center justify-between font-mono-metric-sm font-bold text-on-surface border-b border-outline-variant/30 pb-1 mb-1.5">
                            <span>{label} UTC</span>
                            <span className="text-tertiary">Cap: $25.00M</span>
                          </div>
                          <div className="space-y-1 font-mono-metric-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className={isPre ? 'text-error' : 'text-primary'}>
                                {isPre ? 'Live Exposure:' : 'Post-Freeze Exposure:'}
                              </span>
                              <span
                                className={`font-bold ${isPre ? 'text-error' : 'text-primary'}`}
                              >
                                ${pt?.activeExposureM.toFixed(2)}M
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-on-surface-variant">
                              <span>Unmitigated Path:</span>
                              <span className="font-semibold text-error">
                                ${pt?.unmitigatedM.toFixed(2)}M
                              </span>
                            </div>
                            {pt?.simulatedFreezeM !== null && pt?.simulatedFreezeM !== undefined && (
                              <div className="flex items-center justify-between gap-3 text-primary">
                                <span>With Global Freeze:</span>
                                <span className="font-bold">${pt.simulatedFreezeM.toFixed(2)}M</span>
                              </div>
                            )}
                          </div>
                          {pt?.milestone && (
                            <div className="mt-1.5 pt-1 border-t border-outline-variant/30 font-body-sm text-[11px] text-on-surface-variant">
                              {pt.milestone}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                      paddingTop: '6px',
                    }}
                  />
                  <ReferenceLine
                    y={25}
                    stroke="#707881"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Risk Appetite Cap ($25.00M)',
                      position: 'insideTopLeft',
                      dy: -14,
                      dx: 4,
                      fill: '#3f4850',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <ReferenceLine
                    x="15:18"
                    stroke={isPre ? '#ba1a1a' : '#006194'}
                    strokeDasharray="3 3"
                    label={{
                      value: isPre ? 'Breach $48.2M' : 'Freeze Action',
                      position: 'insideTopLeft',
                      dx: 6,
                      fill: isPre ? '#ba1a1a' : '#006194',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  {!isPre && (
                    <Line
                      type="monotone"
                      dataKey="unmitigatedM"
                      name="Unmitigated Trajectory ($M)"
                      stroke="#ba1a1a"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={{ r: 3, fill: '#ba1a1a' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="activeExposureM"
                    name={isPre ? 'Live Exposure ($M)' : 'Post-Freeze Exposure ($M)'}
                    stroke={isPre ? '#ba1a1a' : '#006194'}
                    strokeWidth={2.75}
                    dot={{ r: 4, fill: isPre ? '#ba1a1a' : '#006194', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                  {isPre && (
                    <Line
                      type="monotone"
                      dataKey="simulatedFreezeM"
                      name="Projected Freeze Impact ($M)"
                      stroke="#006194"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      connectNulls={false}
                      dot={{ r: 3.5, fill: '#006194' }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sub-Node Impact Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-tertiary">
                  table_chart
                </span>
                <span className="font-label-lg text-on-surface font-bold">
                  Sub-Node Impact &amp; Root Cause Attribution
                </span>
              </div>
              <span className="font-mono-metric-sm text-tertiary">Basel CRE20</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-md uppercase tracking-wider">
                    <th className="py-2 px-3">Sub-Node Entity</th>
                    <th className="py-2 px-3">Attribution Role</th>
                    <th className="py-2 px-3 text-right">Exposure</th>
                    <th className="py-2 px-3 text-right">Remediation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/30">
                  <tr
                    onClick={() => setSelectedFlowNode('origin')}
                    className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono-metric-sm font-semibold text-on-surface">
                      HK-Central-Branch-04
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      SIM-Ring Origin Ingestion
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-metric-sm text-error font-bold">
                      {isPre ? '$21.40M' : '$0.00'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded font-mono-metric-sm text-[10px] font-semibold ${
                          isPre && !isolatedAccounts
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-primary-fixed text-on-primary-fixed'
                        }`}
                      >
                        {isPre && !isolatedAccounts ? 'Quarantine Active' : 'Accounts Isolated'}
                      </span>
                    </td>
                  </tr>
                  <tr
                    onClick={() => setSelectedFlowNode('relay')}
                    className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono-metric-sm font-semibold text-on-surface">
                      Tokyo-Fintech-Gateway
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      High-Velocity Smurfing Aggregator
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-metric-sm text-on-surface font-semibold">
                      {isPre ? '$36.10M' : '$0.00'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-mono-metric-sm text-[10px]">
                        {isPre ? 'Throttled (5 tx/m)' : '$10k Cap Enforced'}
                      </span>
                    </td>
                  </tr>
                  <tr
                    onClick={() => setSelectedFlowNode('sinkA')}
                    className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono-metric-sm font-semibold text-on-surface">
                      SG-Raffles-Retail-12
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      Rapid ATM Smurfing Liquidation
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-metric-sm text-error font-bold">
                      {isPre ? '$14.20M' : '$11.40M'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-mono-metric-sm text-[10px] font-semibold">
                        Hardware Locked
                      </span>
                    </td>
                  </tr>
                  <tr
                    onClick={() => setSelectedFlowNode('sinkB')}
                    className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 font-mono-metric-sm font-semibold text-on-surface">
                      Cayman Trust #8491
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      Beneficiary Shell Escrow
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-metric-sm text-on-surface font-semibold">
                      {isPre ? '$12.60M' : '$0.00'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-mono-metric-sm text-[10px] font-semibold">
                        Asset Freeze Filed
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (3 cols) */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-3">
          {/* Critical Incident Milestones */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-label-md text-tertiary uppercase tracking-wider font-semibold">
                Incident Milestones
              </span>
              <span className="font-mono-metric-sm text-[10px] text-tertiary">UTC</span>
            </div>
            <div className="space-y-3 relative before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-surface-container-high">
              {chronology.map((item) => (
                <div key={item.id} className="relative pl-6">
                  <span
                    className={`absolute left-1 top-1 w-2 h-2 rounded-full ${
                      item.tone === 'error'
                        ? 'bg-error'
                        : item.tone === 'secondary'
                        ? 'bg-secondary'
                        : 'bg-primary'
                    }`}
                  />
                  <div className="flex items-center justify-between font-mono-metric-sm">
                    <span
                      className={`font-bold ${
                        item.tone === 'error' ? 'text-error' : 'text-on-surface'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span
                      className={
                        item.tone === 'error' ? 'text-error font-semibold' : 'text-tertiary'
                      }
                    >
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* C-Suite Remediation Actions */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-3.5 flex flex-col gap-2">
            <span className="font-label-md text-tertiary uppercase tracking-wider font-semibold">
              Remediation &amp; Reporting
            </span>
            <button
              type="button"
              onClick={handleEnactGlobalWireCap}
              className={`w-full py-2 px-3 rounded font-label-md hover:opacity-90 active:scale-[0.99] transition-all text-center font-semibold ${
                globalFreezeActive ? 'bg-secondary text-on-secondary' : 'bg-error text-on-error'
              }`}
            >
              {globalFreezeActive
                ? 'Global Wire Limit Engaged ($10k Cap Live)'
                : 'Enact Global Wire Limit ($10k Cap)'}
            </button>
            <button
              type="button"
              onClick={handleIsolateAccounts}
              className="w-full py-2 px-3 rounded bg-primary text-on-primary font-label-md hover:bg-primary/90 active:scale-[0.99] transition-all text-center font-semibold"
            >
              {isolatedAccounts
                ? '142 Synthetic Accounts Quarantined'
                : 'Isolate 142 Synthetic Accounts'}
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              className="w-full py-2 px-3 rounded bg-surface-container-low border border-outline-variant/50 text-on-surface font-label-md hover:bg-surface-container transition-all text-center font-semibold flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">
                picture_as_pdf
              </span>
              <span>Export Risk &amp; Chart PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadDossier}
              className="w-full py-2 px-3 rounded bg-surface-container-high text-on-surface font-label-md hover:bg-surface-container-highest active:scale-[0.99] transition-all text-center font-medium"
            >
              Download JSON Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
