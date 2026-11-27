import React, { useEffect, useState } from 'react';
import { INITIAL_SETTLEMENT_NODES } from '../data/initialRiskData';
import { SettlementNode } from '../types/risk';

interface ExecutiveDirectivesViewProps {
  onLaunchSandbox: () => void;
  onExportPdf: () => void;
  onNotify: (title: string, message: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ExecutiveDirectivesView: React.FC<ExecutiveDirectivesViewProps> = ({
  onLaunchSandbox,
  onExportPdf,
  onNotify,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(4 * 3600 + 12 * 60 + 9);
  const [nodes, setNodes] = useState<SettlementNode[]>(INITIAL_SETTLEMENT_NODES);
  const [wireCapUsd, setWireCapUsd] = useState(10000);
  const [directiveRef, setDirectiveRef] = useState('DIR-2025-04');
  const [directiveTitle, setDirectiveTitle] = useState(
    'Emergency Wire Cap ($10k Limit across Regional Corridors)'
  );

  // Interactive modals
  const [showNewDirectiveModal, setShowNewDirectiveModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftCap, setDraftCap] = useState(wireCapUsd);
  const [memoBody, setMemoBody] = useState(
    'All APAC, US, UK, Europe, and Middle East desks must enforce the $10,000 instant rail cap pending reconciliation.'
  );
  const [phase2Tasks, setPhase2Tasks] = useState([
    { id: 'p1', label: 'Regional Payment Stream Ingestion', done: true },
    { id: 'p2', label: 'Risk Graph Cluster Canvas Deployment', done: true },
    { id: 'p3', label: 'Multi-Region Fallback Stress Validation', done: false },
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const formatClock = (secs: number) => {
    const hrs = String(Math.floor(secs / 3600)).padStart(2, '0');
    const mins = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${hrs}:${mins}:${s}`;
  };

  const enforcedCount = nodes.filter((n) => n.status === 'enforced').length;
  const convergencePct = ((enforcedCount / nodes.length) * 100).toFixed(1);

  const handleCompleteNodeHandshake = (code: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.code === code
          ? { ...n, status: 'enforced', cap: `Cap: $${wireCapUsd.toLocaleString()}`, progress: 100 }
          : n
      )
    );
    onNotify(
      'Settlement Hub Synchronized',
      `${code} handshake completed. Global convergence at 100%.`,
      'success'
    );
  };

  const handleApplyThreshold = () => {
    setWireCapUsd(draftCap);
    setNodes((prev) =>
      prev.map((n) =>
        n.status === 'enforced' ? { ...n, cap: `Cap: $${draftCap.toLocaleString()}` } : n
      )
    );
    setDirectiveTitle(
      `Emergency Wire Cap ($${(draftCap / 1000).toFixed(0)}k Limit across Regional Corridors)`
    );
    setShowThresholdModal(false);
    onNotify(
      'Threshold Limit Updated',
      `Global corridor wire cap adjusted to $${draftCap.toLocaleString()} across all enforced hubs.`,
      'success'
    );
  };

  const handleIssueDirective = () => {
    const nextNum = Number(directiveRef.split('-')[2] || 4) + 1;
    const nextRef = `DIR-2025-0${nextNum}`;
    setDirectiveRef(nextRef);
    if (draftTitle.trim()) setDirectiveTitle(draftTitle.trim());
    setDraftTitle('');
    setShowNewDirectiveModal(false);
    onNotify(
      `Directive ${nextRef} Dispatched`,
      'Cryptographically signed by Sir Julian Vance & Maria Thorne.',
      'success'
    );
  };

  const handleDownloadArtifact = (name: string, ext: string) => {
    const content = `Clustered Risk Eye — Prudential Compliance Artifact\nArtifact: ${name}\nDirective: ${directiveRef}\nRegions: APAC, US, UK, Europe, Middle East\nConvergence: ${convergencePct}%\nTimestamp: ${new Date().toISOString()}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Artifact Downloaded', `${name} exported successfully.`, 'success');
  };

  const phase2Progress = Math.round(
    (phase2Tasks.filter((t) => t.done).length / phase2Tasks.length) * 100
  );

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Main 12-Column Grid */}
      <div className="px-4 pt-4 grid grid-cols-12 gap-4">
        {/* LEFT COLUMN: Executive Directives Dispatcher (Span 8) */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">
          {/* Primary Command Console Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />

            {/* Header & Countdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-primary/10 text-primary font-mono-metric-sm px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                    {directiveRef}
                  </span>
                  <span className="bg-error-container text-on-error-container font-mono-metric-sm px-2 py-0.5 rounded font-semibold">
                    DEFCON 2 ENFORCEMENT
                  </span>
                </div>
                <h1 className="font-headline-lg text-on-surface font-bold tracking-tight">
                  {directiveTitle}
                </h1>
                <p className="font-body-md text-on-surface-variant mt-1">
                  Coordinated prudential enforcement spanning APAC, US, UK, Europe, and Middle East payment rails.
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end bg-surface-container-low p-3 rounded-lg shadow-sm shrink-0">
                <span className="font-mono-metric-sm uppercase text-on-surface-variant font-medium">
                  SLA WINDOW
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-mono-metric-lg text-error font-bold tracking-tight">
                    {formatClock(secondsLeft)}
                  </span>
                  <span className="font-mono-metric-sm text-on-surface-variant">UTC</span>
                </div>
              </div>
            </div>

            {/* Co-Signers & Execution Scope */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-surface-container-low rounded-lg mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-headline-sm font-bold shrink-0">
                  JV
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-on-surface-variant uppercase">
                    Group Chief Executive
                  </span>
                  <span className="font-headline-sm text-on-surface font-semibold truncate">
                    Sir Julian Vance
                  </span>
                  <span className="font-mono-metric-sm text-secondary flex items-center gap-0.5 mt-0.5">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    Signed
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-headline-sm font-bold shrink-0">
                  MT
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-on-surface-variant uppercase">
                    Group Chief Risk Officer
                  </span>
                  <span className="font-headline-sm text-on-surface font-semibold truncate">
                    Maria Thorne
                  </span>
                  <span className="font-mono-metric-sm text-secondary flex items-center gap-0.5 mt-0.5">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    Quorum Validated
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <span className="font-label-md text-on-surface-variant uppercase">
                  Execution Scope
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-headline-sm text-on-surface font-semibold">
                    5 Regions · {nodes.length} Hubs
                  </span>
                </div>
                <span className="font-body-sm text-on-surface-variant mt-0.5">
                  APAC · US · UK · Europe · Middle East
                </span>
              </div>
            </div>

            {/* Global Ingestion Compliance Status */}
            <div className="flex flex-col gap-1.5 mb-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm font-semibold text-on-surface">
                    Regional Clearing Convergence
                  </span>
                  <span className="font-mono-metric-sm text-primary font-bold bg-primary-fixed px-2 py-0.5 rounded">
                    {convergencePct}% CONVERGENCE
                  </span>
                </div>
                <span className="font-mono-metric-sm text-on-surface-variant">
                  {enforcedCount} of {nodes.length} Hubs Enforced
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden flex">
                <div
                  className="bg-secondary h-full transition-all duration-700"
                  style={{ width: `${convergencePct}%` }}
                />
                {enforcedCount < nodes.length && (
                  <div
                    className="bg-error/70 h-full animate-pulse transition-all"
                    style={{ width: `${(100 - Number(convergencePct)).toFixed(1)}%` }}
                  />
                )}
              </div>
            </div>

            {/* Regional Sovereign Settlement Hubs */}
            <div className="flex flex-col mb-5">
              <div className="flex items-center justify-between pb-2 mb-2 flex-wrap gap-2">
                <span className="font-label-lg uppercase tracking-wider text-on-surface-variant font-semibold">
                  Regional Sovereign Settlement Hubs
                </span>
                <span className="font-mono-metric-sm text-on-surface-variant flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-secondary" />
                    Enforced
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-error animate-pulse" />
                    Syncing (click to complete)
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {nodes.map((node) => {
                  const isSyncing = node.status === 'syncing';
                  return (
                    <button
                      key={node.code}
                      type="button"
                      onClick={() => {
                        if (isSyncing) handleCompleteNodeHandshake(node.code);
                      }}
                      title={isSyncing ? 'Click to complete handshake' : `${node.code} Enforced`}
                      className={`p-3 rounded-lg flex items-center justify-between text-left transition-colors ${
                        isSyncing
                          ? 'bg-error-container/30 hover:bg-error-container/50 shadow-sm cursor-pointer border border-error/30'
                          : 'bg-surface-container-low hover:bg-surface-container cursor-default'
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`font-label-md font-semibold truncate ${
                            isSyncing ? 'text-error' : 'text-on-surface'
                          }`}
                        >
                          {node.code}
                        </span>
                        <span
                          className={`font-mono-metric-sm ${
                            isSyncing ? 'text-error' : 'text-on-surface-variant'
                          }`}
                        >
                          {node.region} · {node.cap}
                        </span>
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isSyncing ? 'bg-error animate-pulse' : 'bg-secondary'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* C-Suite Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant/20">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowNewDirectiveModal(true)}
                  className="px-3 py-2 bg-primary text-on-primary font-body-md font-medium rounded hover:bg-primary-container transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">add_task</span>
                  <span>Issue Executive Directive</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftCap(wireCapUsd);
                    setShowThresholdModal(true);
                  }}
                  className="px-3 py-2 bg-surface-container text-on-surface font-body-md font-medium rounded hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  <span>Adjust Cap Threshold</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowMemoModal(true)}
                className="px-3 py-2 bg-error text-on-error font-body-md font-medium rounded hover:bg-on-error-container transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">campaign</span>
                <span>Broadcast War-Room Memo</span>
              </button>
            </div>
          </div>

          {/* Directive Enforcement Telemetry */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  ssid_chart
                </span>
                <span className="font-headline-sm font-semibold text-on-surface">
                  Directive Enforcement Impact (Past 6 Hours)
                </span>
              </div>
              <span className="font-mono-metric-sm text-on-surface-variant">
                Interception Delta:{' '}
                <strong className="text-secondary">-68.4% Fraud Exposure</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              <div className="md:col-span-3 h-24 w-full bg-surface-container-low rounded-lg p-2.5 flex flex-col justify-between">
                <div className="flex justify-between items-center text-on-surface-variant font-mono-metric-sm">
                  <span>08:00 (Issued)</span>
                  <span>10:00 (Regional Cap Sync)</span>
                  <span>12:00 (Current)</span>
                </div>
                <svg
                  className="w-full h-14 overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 500 50"
                >
                  <line
                    className="text-outline-variant/40"
                    stroke="currentColor"
                    strokeDasharray="3 3"
                    x1="0"
                    x2="500"
                    y1="25"
                    y2="25"
                  />
                  <line
                    className="text-error/40"
                    stroke="currentColor"
                    strokeDasharray="4 2"
                    strokeWidth="1.5"
                    x1="0"
                    x2="500"
                    y1="18"
                    y2="18"
                  />
                  <path
                    className="text-secondary"
                    d="M0,45 C60,42 90,5 140,8 C190,11 220,28 270,30 C320,32 370,42 420,44 L500,46"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  />
                  <circle className="fill-error text-error animate-ping" cx="140" cy="8" r="4" />
                  <circle className="fill-error text-error" cx="140" cy="8" r="3" />
                  <circle className="fill-secondary text-secondary" cx="500" cy="46" r="3.5" />
                </svg>
              </div>

              <div className="flex flex-col gap-2">
                <div className="bg-surface-container-low p-2.5 rounded">
                  <span className="font-label-md text-on-surface-variant uppercase">
                    Wires Intercepted
                  </span>
                  <span className="font-mono-metric-lg text-on-surface block font-bold">142</span>
                </div>
                <div className="bg-surface-container-low p-2.5 rounded">
                  <span className="font-label-md text-on-surface-variant uppercase">
                    Capital Preserved
                  </span>
                  <span className="font-mono-metric-lg text-secondary block font-bold">
                    $18.4M
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Regulatory Compliance Hub (Span 4) */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    verified_user
                  </span>
                  <h2 className="font-headline-sm font-semibold text-on-surface">
                    Regulatory Compliance Hub
                  </h2>
                </div>
                <span className="font-mono-metric-sm bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">
                  GLOBAL
                </span>
              </div>
              <p className="font-body-sm text-on-surface-variant mb-4">
                Prudential packs compiled for MAS, Fed/OCC, FCA, ECB/BaFin, and DFSA compliance audits.
              </p>

              <div className="flex flex-col gap-3">
                <div className="p-3 bg-surface-container-low rounded-lg flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-[14px] font-semibold text-on-surface">
                      Basel III Risk Graph &amp; Ticketing PDF
                    </span>
                    <span className="bg-primary/10 text-primary font-mono-metric-sm px-1.5 py-0.5 rounded font-semibold">
                      LIVE
                    </span>
                  </div>
                  <p className="font-body-sm text-on-surface-variant mt-1">
                    Includes live Risk Graph snapshot, 5-region breakdown, exposure timeline chart, and ticketing ledger.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={onExportPdf}
                      className="flex-1 py-2 bg-primary text-on-primary hover:bg-primary-container rounded font-label-md font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                      PDF Briefing
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadArtifact('Basel-III-Ticket-Ledger', 'csv')}
                      className="flex-1 py-2 bg-surface-container-lowest hover:bg-surface-container-high rounded text-on-surface font-label-md font-semibold flex items-center justify-center gap-1.5 transition-colors border border-outline-variant/40"
                    >
                      <span className="material-symbols-outlined text-[16px]">table_view</span>
                      Summary CSV
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-surface-container-low rounded-lg flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-[14px] font-semibold text-on-surface">
                      Multi-Region Exposure Trajectory Pack
                    </span>
                    <span className="bg-secondary/10 text-secondary font-mono-metric-sm px-1.5 py-0.5 rounded font-semibold">
                      READY
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-on-surface-variant font-mono-metric-sm">
                    <span>Regions: 5 Corridors</span>
                    <span>Audit Hash: #9A2F-2025</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={onExportPdf}
                      className="flex-1 py-1.5 bg-surface-container-lowest hover:bg-surface-container-high rounded text-on-surface font-label-md font-semibold flex items-center justify-center gap-1 transition-colors border border-outline-variant/40"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      Audit PDF
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onNotify(
                          'Webhook Sync Triggered',
                          'Jira & ServiceNow compliance webhook dispatched.',
                          'success'
                        )
                      }
                      className="flex-1 py-1.5 bg-surface-container-lowest hover:bg-surface-container-high rounded text-on-surface font-label-md font-semibold flex items-center justify-center gap-1 transition-colors border border-outline-variant/40"
                    >
                      <span className="material-symbols-outlined text-[15px]">share</span>
                      Webhook Sync
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-surface-container rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">
                  sync_alt
                </span>
                <span className="font-body-sm text-on-surface font-medium">
                  Jira &amp; ServiceNow Risk Relay
                </span>
              </div>
              <span className="font-mono-metric-sm text-secondary font-semibold">CONNECTED</span>
            </div>
          </div>
        </div>

        {/* FULL WIDTH BOTTOM SECTION: 60-Day Enterprise Governance Roadmap */}
        <div className="col-span-12 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-secondary/10 text-secondary font-mono-metric-sm px-2 py-0.5 rounded font-semibold uppercase">
                  Governance Roadmap
                </span>
                <span className="font-headline-md font-semibold text-on-surface">
                  60-Day Multi-Region Rollout Status
                </span>
              </div>
              <p className="font-body-sm text-on-surface-variant mt-1">
                Phased production rollout across APAC, US, UK, Europe, and Middle East risk desks.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="font-mono-metric-sm text-on-surface-variant uppercase">
                  Current Status
                </span>
                <span className="font-headline-sm text-primary font-bold">
                  Week 4 of 8 (Phase 2)
                </span>
              </div>
              <button
                type="button"
                onClick={onLaunchSandbox}
                className="px-3 py-1.5 bg-primary text-on-primary hover:bg-primary-container rounded font-label-md font-semibold transition-colors shadow-sm"
              >
                Open Risk Graph
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-low rounded-lg p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-metric-sm text-on-surface-variant font-semibold">
                  PHASE 01 • WEEKS 1–2
                </span>
                <span className="bg-secondary/15 text-secondary font-label-md px-2 py-0.5 rounded font-semibold">
                  100% DONE
                </span>
              </div>
              <h3 className="font-headline-sm font-semibold text-on-surface mb-1">
                Schema &amp; Regional Taxonomy
              </h3>
              <p className="font-body-sm text-on-surface-variant">
                Baseline CRE ticket workflow, regional thresholds, and executive sign-off ledger completed.
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-lg p-4 flex flex-col border border-primary/25 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-metric-sm text-primary font-semibold">
                  PHASE 02 • WEEKS 3–5
                </span>
                <span className="bg-primary text-on-primary font-label-md px-2 py-0.5 rounded font-semibold">
                  {phase2Progress}% ACTIVE
                </span>
              </div>
              <h3 className="font-headline-sm font-semibold text-on-surface mb-2">
                Live Graph &amp; Remediation Controls
              </h3>
              <div className="flex flex-col gap-1.5 font-mono-metric-sm text-on-surface">
                {phase2Tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() =>
                      setPhase2Tasks((prev) =>
                        prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t))
                      )
                    }
                    className="flex items-center gap-2 text-left hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-primary text-[16px]">
                      {task.done ? 'check' : 'radio_button_unchecked'}
                    </span>
                    <span className={task.done ? '' : 'text-on-surface-variant'}>{task.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-container-low rounded-lg p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-metric-sm text-on-surface-variant font-semibold">
                  PHASE 03 • WEEKS 6–8
                </span>
                <span className="bg-surface-container-high text-on-surface-variant font-label-md px-2 py-0.5 rounded font-semibold">
                  SCHEDULED
                </span>
              </div>
              <h3 className="font-headline-sm font-semibold text-on-surface mb-1">
                5-Region Pilot &amp; Regulatory Sign-off
              </h3>
              <p className="font-body-sm text-on-surface-variant">
                Final regulatory attestation across APAC, US, UK, Europe, and Middle East payment corridors.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Issue New Directive Modal */}
      {showNewDirectiveModal && (
        <div className="fixed inset-0 z-[60] bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-5 shadow-2xl border border-outline-variant/60 flex flex-col gap-3">
            <h3 className="font-headline-sm font-bold text-on-surface">
              Issue New Executive Directive
            </h3>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="e.g. Freeze Middle East Escrow Settlement Corridors"
              className="w-full h-9 px-3 bg-surface-container-low border border-outline-variant/50 rounded text-body-md focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewDirectiveModal(false)}
                className="px-3 h-8 rounded bg-surface-container text-on-surface font-label-md font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIssueDirective}
                className="px-4 h-8 rounded bg-primary text-on-primary font-label-md font-semibold"
              >
                Sign &amp; Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Threshold Limits Modal */}
      {showThresholdModal && (
        <div className="fixed inset-0 z-[60] bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-5 shadow-2xl border border-outline-variant/60 flex flex-col gap-3">
            <h3 className="font-headline-sm font-bold text-on-surface">
              Global Wire Cap Threshold
            </h3>
            <div className="flex items-center justify-between font-mono-metric-md">
              <span className="text-on-surface-variant">Per-Transaction Limit:</span>
              <span className="font-bold text-primary">${draftCap.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={2000}
              max={50000}
              step={1000}
              value={draftCap}
              onChange={(e) => setDraftCap(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowThresholdModal(false)}
                className="px-3 h-8 rounded bg-surface-container text-on-surface font-label-md font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyThreshold}
                className="px-4 h-8 rounded bg-primary text-on-primary font-label-md font-semibold"
              >
                Enforce Across {nodes.length} Regional Hubs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast War-Room Memo Modal */}
      {showMemoModal && (
        <div className="fixed inset-0 z-[60] bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-5 shadow-2xl border border-outline-variant/60 flex flex-col gap-3">
            <h3 className="font-headline-sm font-bold text-on-surface">
              Broadcast C-Suite War-Room Memo
            </h3>
            <textarea
              rows={3}
              value={memoBody}
              onChange={(e) => setMemoBody(e.target.value)}
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/50 rounded text-body-sm focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMemoModal(false)}
                className="px-3 h-8 rounded bg-surface-container text-on-surface font-label-md font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMemoModal(false);
                  onNotify('War-Room Memo Broadcasted', memoBody, 'warning');
                }}
                className="px-4 h-8 rounded bg-error text-on-error font-label-md font-semibold"
              >
                Dispatch Memo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
