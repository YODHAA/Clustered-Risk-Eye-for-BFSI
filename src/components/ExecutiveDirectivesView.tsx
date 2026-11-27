import React, { useEffect, useState } from 'react';
import { INITIAL_SETTLEMENT_NODES } from '../data/initialRiskData';
import { SettlementNode } from '../types/risk';

interface ExecutiveDirectivesViewProps {
  onLaunchSandbox: () => void;
  onNotify: (title: string, message: string, tone?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ExecutiveDirectivesView: React.FC<ExecutiveDirectivesViewProps> = ({
  onLaunchSandbox,
  onNotify,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(4 * 3600 + 12 * 60 + 9);
  const [autoSyncSec, setAutoSyncSec] = useState(4);
  const [nodes, setNodes] = useState<SettlementNode[]>(INITIAL_SETTLEMENT_NODES);
  const [wireCapUsd, setWireCapUsd] = useState(10000);
  const [directiveRef, setDirectiveRef] = useState('DIR-2025-04');
  const [directiveTitle, setDirectiveTitle] = useState(
    'Emergency Wire Cap ($10k Limit across APAC Instant Corridors)'
  );

  // Interactive modals
  const [showNewDirectiveModal, setShowNewDirectiveModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showArchModal, setShowArchModal] = useState(false);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftCap, setDraftCap] = useState(wireCapUsd);
  const [memoBody, setMemoBody] = useState(
    'All APAC clearing desks must enforce $10,000 instant rail cap pending Tokyo gateway reconciliation.'
  );
  const [phase2Tasks, setPhase2Tasks] = useState([
    { id: 'p1', label: 'FastAPI Stream Ingestion (1.4k trig/m)', done: true },
    { id: 'p2', label: 'Cytoscape GPU Render Node Canvas', done: true },
    { id: 'p3', label: 'Multi-Region Fallback Stress Validation', done: false },
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setAutoSyncSec((prev) => (prev <= 1 ? 15 : prev - 1));
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
      'Settlement Node Synchronized',
      `${code} handshake completed. Global ingestion convergence at 100%.`,
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
      `Emergency Wire Cap ($${(draftCap / 1000).toFixed(0)}k Limit across APAC Instant Corridors)`
    );
    setShowThresholdModal(false);
    onNotify(
      'Threshold Limit Updated',
      `Global corridor wire cap adjusted to $${draftCap.toLocaleString()} across all enforced nodes.`,
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
    const content = `Clustered Risk Eye — Prudential Compliance Artifact\nArtifact: ${name}\nDirective: ${directiveRef}\nConvergence: ${convergencePct}%\nTimestamp: ${new Date().toISOString()}\n`;
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
    <div className="flex flex-col w-full pb-16">
      {/* Top Global Alert Ribbon */}
      <div className="px-4 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2.5 h-2.5 rounded-full bg-error animate-ping" />
          <span className="font-mono-metric-sm uppercase tracking-wider text-error font-semibold">
            SOVEREIGN MANDATE ACTIVE
          </span>
          <span className="font-mono-metric-sm text-outline-variant">•</span>
          <span className="font-body-sm text-on-surface-variant font-medium">
            Mandatory Prudential Order {directiveRef}
          </span>
          <span className="bg-error-container text-on-error-container font-mono-metric-sm px-2 py-0.5 rounded font-medium">
            DEFCON 2 ENFORCEMENT
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono-metric-sm text-on-surface-variant">
          <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded">
            <span className="material-symbols-outlined text-[16px] text-primary">security</span>
            <span>
              LEGAL COUNSEL: <strong className="text-on-surface font-semibold">APPROVED (LEX-8821)</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-container px-2.5 py-1 rounded">
            <span className="material-symbols-outlined text-[16px] text-secondary">encrypted</span>
            <span>
              AUDIT HASH: <strong className="text-on-surface font-semibold">SHA256:7B88..CE10</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAutoSyncSec(15);
              onNotify('Telemetry Synced', 'All 19 APAC settlement relays polled.', 'info');
            }}
            className="flex items-center gap-1 text-primary hover:text-on-primary-fixed-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Auto-sync ({String(autoSyncSec).padStart(2, '0')}s)</span>
          </button>
        </div>
      </div>

      {/* Main 12-Column Grid */}
      <div className="px-4 pt-1 grid grid-cols-12 gap-3">
        {/* LEFT COLUMN: Executive Directives Dispatcher (Span 8) */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-3">
          {/* Primary Command Console Card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />

            {/* Header & Countdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-primary/10 text-primary font-mono-metric-sm px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                    Directive Reference
                  </span>
                  <span className="font-mono-metric-md text-on-surface font-semibold">
                    {directiveRef}
                  </span>
                </div>
                <h1 className="font-headline-lg text-on-surface font-bold tracking-tight">
                  {directiveTitle}
                </h1>
                <p className="font-body-md text-on-surface-variant mt-1">
                  Intervention enacted following abnormal DBSCAN velocity spikes across regional
                  high-frequency payment gateways.
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end bg-surface-container-low p-3 rounded-lg shadow-sm shrink-0">
                <span className="font-mono-metric-sm uppercase text-on-surface-variant font-medium">
                  REMAINDER SLA WINDOW
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-mono-metric-lg text-error font-bold tracking-tight">
                    {formatClock(secondsLeft)}
                  </span>
                  <span className="font-mono-metric-sm text-on-surface-variant">UTC</span>
                </div>
                <span className="font-label-md text-on-surface-variant mt-1">
                  Threshold Review: 18:00 ZULU
                </span>
              </div>
            </div>

            {/* Co-Signers & Issuance Ledger */}
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
                    Cryptographically Signed
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
                    19 Regional Nodes
                  </span>
                  <span className="bg-surface-container-high font-mono-metric-sm text-on-surface px-1.5 py-0.5 rounded">
                    SWIFT / MEPS+
                  </span>
                </div>
                <span className="font-body-sm text-on-surface-variant mt-0.5">
                  Automated Killswitch Armed
                </span>
              </div>
            </div>

            {/* Global Ingestion Compliance Status */}
            <div className="flex flex-col gap-1.5 mb-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm font-semibold text-on-surface">
                    Global Ingestion Compliance Status
                  </span>
                  <span className="font-mono-metric-sm text-primary font-bold bg-primary-fixed px-2 py-0.5 rounded">
                    {convergencePct}% CONVERGENCE
                  </span>
                </div>
                <span className="font-mono-metric-sm text-on-surface-variant">
                  {enforcedCount} of {nodes.length} Nodes Enforced
                </span>
              </div>
              <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex">
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

            {/* APAC Sovereign Settlement Nodes Matrix */}
            <div className="flex flex-col mb-5">
              <div className="flex items-center justify-between pb-2 mb-2 flex-wrap gap-2">
                <span className="font-label-lg uppercase tracking-wider text-on-surface-variant font-semibold">
                  APAC Sovereign Settlement Nodes
                </span>
                <span className="font-mono-metric-sm text-on-surface-variant flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-secondary" />
                    Synchronized
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-error animate-pulse" />
                    Handshake Pending (click to force sync)
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {nodes.map((node) => {
                  const isSyncing = node.status === 'syncing';
                  return (
                    <button
                      key={node.code}
                      type="button"
                      onClick={() => {
                        if (isSyncing) handleCompleteNodeHandshake(node.code);
                      }}
                      title={isSyncing ? 'Click to complete Tokyo handshake' : `${node.code} Enforced`}
                      className={`p-2 rounded flex items-center justify-between text-left transition-colors ${
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
                          {node.cap}
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
                <div className="p-2 bg-surface-container rounded flex items-center justify-center text-center">
                  <span className="font-mono-metric-sm text-on-surface-variant">
                    +0 Regional Inbounds
                  </span>
                </div>
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
                  <span>Issue New Executive Directive</span>
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
                  <span>Adjust Threshold Limits</span>
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
                  Directive Enforcement Telemetry (Past 6 Hours)
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
                  <span>08:00 (Directive Issued)</span>
                  <span>10:00 (Tokyo Sync)</span>
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
                <div className="bg-surface-container-low p-2 rounded">
                  <span className="font-label-md text-on-surface-variant uppercase">
                    Wires Intercepted
                  </span>
                  <span className="font-mono-metric-lg text-on-surface block font-bold">142</span>
                </div>
                <div className="bg-surface-container-low p-2 rounded">
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

        {/* RIGHT COLUMN: Regulatory Compliance & Technical Architecture HUD (Span 4) */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-3">
          {/* Regulatory Compliance Hub */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 flex flex-col">
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
                INSTITUTIONAL
              </span>
            </div>
            <p className="font-body-sm text-on-surface-variant mb-3">
              Prudential artifacts compiled for MAS, HKMA, and APRA cross-border compliance audits.
            </p>

            <div className="flex flex-col gap-2.5 mb-3">
              <div className="p-2.5 bg-surface-container-low rounded-lg flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-[14px] font-semibold text-on-surface">
                    Basel III / ISO 27001 OpRisk Pack
                  </span>
                  <span className="bg-primary/10 text-primary font-mono-metric-sm px-1.5 py-0.5 rounded font-semibold">
                    VERIFIED
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-on-surface-variant font-mono-metric-sm">
                  <span>Hash: #9A2F-2025</span>
                  <span>Auditor: Int-PWC-Q1</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadArtifact('Basel-III-OpRisk-Briefing', 'txt')}
                    className="flex-1 py-1.5 bg-surface-container-lowest hover:bg-surface-container-high rounded text-on-surface font-label-md flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">download</span>
                    PDF Briefing
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadArtifact('Basel-III-Ticket-Ledger', 'csv')}
                    className="flex-1 py-1.5 bg-surface-container-lowest hover:bg-surface-container-high rounded text-on-surface font-label-md flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">table_view</span>
                    Ticket CSV
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-surface-container-low rounded-lg flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-[14px] font-semibold text-on-surface">
                    Q1 Fraud Trajectory &amp; DBSCAN Audit
                  </span>
                  <span className="bg-secondary/10 text-secondary font-mono-metric-sm px-1.5 py-0.5 rounded font-semibold">
                    READY
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-on-surface-variant font-mono-metric-sm">
                  <span>Clustering Epsilon: 0.14</span>
                  <span>4,289 Nodes</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadArtifact('Q1-DBSCAN-Audit-Deck', 'txt')}
                    className="flex-1 py-1.5 bg-surface-container-lowest hover:bg-surface-container-high rounded text-on-surface font-label-md flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                    Audit Deck
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onNotify(
                        'Webhook Sync Triggered',
                        'Jira & ServiceNow compliance webhook dispatched (200 OK).',
                        'success'
                      )
                    }
                    className="flex-1 py-1.5 bg-surface-container-lowest hover:bg-surface-container-high rounded text-on-surface font-label-md flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">share</span>
                    Webhook Sync
                  </button>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-surface-container rounded-lg flex items-center justify-between">
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

          {/* Technical Telemetry Grid */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  monitor_heart
                </span>
                <h2 className="font-headline-sm font-semibold text-on-surface">
                  Technical Telemetry Grid
                </h2>
              </div>
              <span className="w-2 h-2 rounded-full bg-secondary" />
            </div>

            <div className="flex flex-col gap-1.5 font-mono-metric-sm">
              <div className="flex items-center justify-between p-2 bg-surface-container-low rounded">
                <span className="text-on-surface-variant font-medium">
                  Ingestion API (FastAPI)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-secondary font-semibold">200 OK</span>
                  <span className="text-on-surface font-medium">1,420 trig/m</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-surface-container-low rounded">
                <span className="text-on-surface-variant font-medium">
                  PostgreSQL State Machine
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-secondary font-semibold">Replica OK</span>
                  <span className="text-on-surface font-medium">14ms latency</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-surface-container-low rounded">
                <span className="text-on-surface-variant font-medium">
                  DBSCAN Engine Scheduler
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-semibold">15-min Batches</span>
                  <span className="text-on-surface-variant">Active</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-surface-container-low rounded">
                <span className="text-on-surface-variant font-medium">
                  SAML 2.0 / Keycloak RBAC
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-secondary font-semibold">Sovereign Fed</span>
                  <span className="text-on-surface-variant">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FULL WIDTH BOTTOM SECTION: 60-Day Enterprise GTM Roadmap */}
        <div className="col-span-12 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-6 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-secondary/10 text-secondary font-mono-metric-sm px-2 py-0.5 rounded font-semibold uppercase">
                  Execution Timeline
                </span>
                <span className="font-headline-md font-semibold text-on-surface">
                  60-Day Enterprise Production Launch HUD
                </span>
              </div>
              <p className="font-body-md text-on-surface-variant mt-1">
                Multi-branch phased deployment for Clustered Risk Eye across Global Corporate &amp;
                Investment Banking.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="font-mono-metric-sm text-on-surface-variant uppercase">
                  Current Status
                </span>
                <span className="font-headline-sm text-primary font-bold">
                  Week 4 of 8 (Phase 2 In-Flight)
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
              </div>
            </div>
          </div>

          {/* 3 Phase Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phase 1 */}
            <div className="bg-surface-container-low rounded-lg p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-metric-sm text-on-surface-variant font-semibold">
                  PHASE 01 • WEEKS 1–2
                </span>
                <span className="bg-secondary/15 text-secondary font-label-md px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span> 100%
                  DONE
                </span>
              </div>
              <h3 className="font-headline-sm font-semibold text-on-surface mb-1">
                UX Prototyping &amp; Schema Baseline
              </h3>
              <p className="font-body-sm text-on-surface-variant mb-4">
                Established institutional taxonomy, CRE ticket schema, and real-time WebSocket
                state channels.
              </p>
              <div className="flex flex-col gap-1.5 mt-auto pt-2 font-mono-metric-sm text-on-surface">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[16px]">check</span>
                  <span>12-Column Institutional Design System</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[16px]">check</span>
                  <span>PostgreSQL &amp; JSONB Audit Ledger</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[16px]">check</span>
                  <span>Executive Directives Protocol Signed</span>
                </div>
              </div>
            </div>

            {/* Phase 2 */}
            <div className="bg-surface-container-lowest rounded-lg p-4 flex flex-col border border-primary/25 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-metric-sm text-primary font-semibold">
                  PHASE 02 • WEEKS 3–5
                </span>
                <span className="bg-primary text-on-primary font-label-md px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">hourglass_top</span>{' '}
                  {phase2Progress}% ACTIVE
                </span>
              </div>
              <h3 className="font-headline-sm font-semibold text-on-surface mb-1">
                Micro-batch DBSCAN &amp; Cytoscape Canvas
              </h3>
              <p className="font-body-sm text-on-surface-variant mb-3">
                Live machine learning ingestion pipeline linking cross-account transaction graph
                topologies.
              </p>
              <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mb-3">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${phase2Progress}%` }}
                />
              </div>
              <div className="flex flex-col gap-1.5 mt-auto font-mono-metric-sm text-on-surface">
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

            {/* Phase 3 */}
            <div className="bg-surface-container-low rounded-lg p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-metric-sm text-on-surface-variant font-semibold">
                  PHASE 03 • WEEKS 6–8
                </span>
                <span className="bg-surface-container-high text-on-surface-variant font-label-md px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">schedule</span> SCHEDULED
                </span>
              </div>
              <h3 className="font-headline-sm font-semibold text-on-surface mb-1">
                Sandbox Portal &amp; Enterprise Pilot
              </h3>
              <p className="font-body-sm text-on-surface-variant mb-4">
                Final domain cutover (
                <code className="bg-surface-container px-1 py-0.5 rounded text-primary">
                  clusteredriskeye.com
                </code>
                ), user acceptance testing and production traffic routing.
              </p>
              <div className="flex flex-col gap-1.5 mt-auto pt-2 font-mono-metric-sm text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">pending</span>
                  <span>Keycloak Enterprise SAML SSO Cutover</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">pending</span>
                  <span>MAS / APRA Compliance Final Attestation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">pending</span>
                  <span>APAC Instant Payment Production Routing</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Milestone Callout Banner */}
          <div className="mt-5 p-3.5 bg-surface-container-low rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[24px]">hub</span>
              <div className="flex flex-col">
                <span className="font-label-md text-on-surface font-semibold uppercase">
                  Production Domain Endpoint Reserved
                </span>
                <span className="font-mono-metric-sm text-on-surface-variant">
                  Sovereign Tenant:{' '}
                  <strong className="text-on-surface">
                    https://auth.clusteredriskeye.com/gov/c-suite
                  </strong>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowArchModal(true)}
                className="px-3 py-1.5 bg-surface-container-lowest hover:bg-surface-container-high rounded text-on-surface font-body-sm font-medium transition-colors"
              >
                View Infrastructure Architecture
              </button>
              <button
                type="button"
                onClick={onLaunchSandbox}
                className="px-3 py-1.5 bg-primary text-on-primary hover:bg-primary-container rounded font-body-sm font-medium transition-colors shadow-sm"
              >
                Launch Sandbox Preview
              </button>
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
              placeholder="e.g. Freeze Cayman Escrow Settlement Corridors"
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
              Adjust APAC Wire Cap Threshold
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
                Enforce Across 19 Nodes
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

      {/* Infrastructure Architecture Modal */}
      {showArchModal && (
        <div className="fixed inset-0 z-[60] bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-5 shadow-2xl border border-outline-variant/60 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm font-bold text-on-surface">
                Sovereign Infrastructure Architecture
              </h3>
              <button
                type="button"
                onClick={() => setShowArchModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 font-mono-metric-sm">
              <div className="p-2.5 rounded bg-surface-container-low">
                <div className="text-primary font-bold">Edge Ingress</div>
                <div className="text-on-surface mt-1">FastAPI + Envoy mTLS</div>
              </div>
              <div className="p-2.5 rounded bg-surface-container-low">
                <div className="text-primary font-bold">Graph Clustering</div>
                <div className="text-on-surface mt-1">DBSCAN Micro-batch Worker</div>
              </div>
              <div className="p-2.5 rounded bg-surface-container-low">
                <div className="text-primary font-bold">Immutable Ledger</div>
                <div className="text-on-surface mt-1">PostgreSQL + SHA256 Merkle</div>
              </div>
              <div className="p-2.5 rounded bg-surface-container-low">
                <div className="text-primary font-bold">Identity Federation</div>
                <div className="text-on-surface mt-1">Keycloak SAML 2.0 RBAC</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
