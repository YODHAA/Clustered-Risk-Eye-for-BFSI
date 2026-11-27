import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LOGO_URL } from '../data/initialRiskData';
import { RiskTicket, ScreenTab } from '../types/risk';

interface HeaderProps {
  activeTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  tickets: RiskTicket[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectTicketFromSearch: (ticket: RiskTicket) => void;
  onOpenCreateModal: () => void;
  onExportPdf: () => void;
  globalFreezeActive: boolean;
  activeOfficer: { name: string; role: string; initials: string };
  onSwitchOfficer: (officer: { name: string; role: string; initials: string }) => void;
}

const NAV_TABS: { id: ScreenTab; label: string }[] = [
  { id: 'graph', label: 'Risk Ticket Graph Canvas' },
  { id: 'topology', label: 'Cluster Epic Topology & Root Cause' },
  { id: 'kanban', label: 'RiskOps Kanban & SLA Matrix' },
  { id: 'directives', label: 'Executive Directives & GTM Governance' },
];

const OFFICERS = [
  { name: 'Sir Julian Vance', role: 'Group CRO', initials: 'JV' },
  { name: 'Elena Rostova', role: 'Lead Risk Ops', initials: 'ER' },
  { name: 'Siddharth Rao', role: 'SecOps Director', initials: 'SR' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  tickets,
  searchQuery,
  onSearchChange,
  onSelectTicketFromSearch,
  onOpenCreateModal,
  onExportPdf,
  globalFreezeActive,
  activeOfficer,
  onSwitchOfficer,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return tickets
      .filter(
        (t) =>
          t.key.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.region.toLowerCase().includes(q) ||
          t.typology.toLowerCase().includes(q) ||
          t.corridor.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [tickets, searchQuery]);

  const criticalCount = tickets.filter((t) => t.severity === 'critical' && !t.frozen).length;

  const notifications = [
    {
      id: 'n1',
      key: 'CRE-8942',
      title: 'APAC Wire Funnel SLA < 15m',
      time: '2m ago',
      severity: 'error',
    },
    {
      id: 'n2',
      key: 'CRE-8911',
      title: 'Europe TARGET2 Nostro Outflow Spike',
      time: '6m ago',
      severity: 'error',
    },
    {
      id: 'n3',
      key: 'CRE-9104',
      title: 'US CHIPS Corridor Liquidity Drift',
      time: '14m ago',
      severity: 'warning',
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest border-b border-outline-variant/40 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* Row 1: Brand, Global Search, Actions & Officer Profile */}
      <div className="h-14 px-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onSelectTab('graph')}
          className="flex items-center gap-2.5 text-left focus:outline-none group shrink-0"
        >
          {!logoError ? (
            <img
              alt="Clustered Risk Eye Logo"
              className="h-8 w-8 object-contain shrink-0 rounded"
              src={LOGO_URL}
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="h-8 w-8 rounded bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">visibility</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-headline-sm text-on-surface font-semibold tracking-tight leading-none whitespace-nowrap group-hover:text-primary transition-colors">
              Clustered Risk Eye
            </span>
            <span className="font-mono-metric-sm text-on-surface-variant leading-none mt-1 whitespace-nowrap">
              INSTITUTIONAL RISK PLATFORM
            </span>
          </div>
        </button>

        {/* Center: Global Search */}
        <div ref={searchBoxRef} className="flex-1 max-w-lg mx-2 relative">
          <div className="relative flex items-center w-full">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setSearchFocused(true);
              }}
              placeholder="Search tickets, region (APAC, US, UK, Europe, Middle East)..."
              className="w-full h-8 pl-9 pr-8 bg-surface-container-low border border-outline-variant/60 rounded text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:bg-surface-container-lowest transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 text-on-surface-variant hover:text-on-surface"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            )}
          </div>

          {searchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-9 bg-surface-container-lowest border border-outline-variant/60 rounded-lg shadow-xl z-50 overflow-hidden">
              {searchResults.length === 0 ? (
                <div className="p-3 text-body-sm text-on-surface-variant">
                  No tickets matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="divide-y divide-surface-container-low">
                  {searchResults.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onSelectTicketFromSearch(t);
                        setSearchFocused(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-surface-container-low flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-metric-sm font-bold text-primary">
                            {t.key}
                          </span>
                          <span className="font-label-md font-semibold text-on-surface truncate">
                            {t.title}
                          </span>
                        </div>
                        <div className="font-mono-metric-sm text-on-surface-variant mt-0.5">
                          {t.region} · {t.typology} · {t.corridor}
                        </div>
                      </div>
                      <span
                        className={`font-mono-metric-sm font-bold shrink-0 ${
                          t.severity === 'critical'
                            ? 'text-error'
                            : t.severity === 'warning'
                            ? 'text-amber-700'
                            : 'text-primary'
                        }`}
                      >
                        ${t.exposureM.toFixed(1)}M
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions & Officer */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onExportPdf}
            className="h-8 px-3 rounded bg-surface-container-low border border-outline-variant/60 text-on-surface font-label-md font-semibold flex items-center gap-1.5 hover:bg-surface-container transition-colors whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">
              picture_as_pdf
            </span>
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="h-8 px-3 rounded bg-primary text-on-primary font-label-md font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-all active:scale-95 whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>+ New Ticket Bubble</span>
          </button>

          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded border whitespace-nowrap shrink-0 ${
              globalFreezeActive
                ? 'bg-primary-fixed/60 border-primary/30 text-primary'
                : 'bg-error-container/40 border-error/30 text-on-error-container'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                globalFreezeActive ? 'bg-primary' : 'bg-error animate-pulse'
              }`}
            />
            <span className="font-mono-metric-sm font-semibold">
              {globalFreezeActive ? 'DEFCON 4 • Contained' : 'DEFCON 2 • Monitoring'}
            </span>
          </div>

          {/* Notifications Bell */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => {
                setShowNotifications((prev) => !prev);
                setShowProfileMenu(false);
              }}
              aria-label="Open risk notifications"
              className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors relative"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {!globalFreezeActive && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full ring-2 ring-surface-container-lowest" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-10 w-80 bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-xl z-50 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/30">
                  <span className="font-label-lg font-semibold text-on-surface">
                    Active Escalations ({notifications.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-on-surface-variant hover:text-on-surface text-xs"
                  >
                    Close
                  </button>
                </div>
                {notifications.map((n) => {
                  const matched = tickets.find((t) => t.key === n.key);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        if (matched) onSelectTicketFromSearch(matched);
                        setShowNotifications(false);
                      }}
                      className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-left transition-colors"
                    >
                      <div className="flex items-center justify-between font-mono-metric-sm">
                        <span
                          className={`font-bold ${
                            n.severity === 'error' ? 'text-error' : 'text-amber-700'
                          }`}
                        >
                          {n.key}
                        </span>
                        <span className="text-on-surface-variant">{n.time}</span>
                      </div>
                      <div className="font-body-sm text-on-surface font-medium mt-0.5">
                        {n.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-outline-variant/60" />

          {/* Profile Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu((prev) => !prev);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 pl-1 cursor-pointer group focus:outline-none"
            >
              <div className="hidden sm:flex flex-col text-right">
                <span className="font-label-lg text-on-surface font-semibold leading-none group-hover:text-primary transition-colors whitespace-nowrap">
                  {activeOfficer.name}
                </span>
                <span className="font-mono-metric-sm text-on-surface-variant leading-none mt-1 whitespace-nowrap">
                  {activeOfficer.role}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm text-on-primary font-mono-metric-sm font-bold shrink-0">
                {activeOfficer.initials}
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-10 w-60 bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1">
                <div className="px-2 py-1 font-mono-metric-sm text-on-surface-variant uppercase">
                  Active Governance Officer
                </div>
                {OFFICERS.map((off) => (
                  <button
                    key={off.initials}
                    type="button"
                    onClick={() => {
                      onSwitchOfficer(off);
                      setShowProfileMenu(false);
                    }}
                    className={`px-2.5 py-2 rounded-lg text-left flex items-center gap-2.5 transition-colors ${
                      activeOfficer.initials === off.initials
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-surface-container-low text-on-surface'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                      {off.initials}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-label-md font-semibold">{off.name}</span>
                      <span className="font-mono-metric-sm text-on-surface-variant">
                        {off.role}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Primary 4-Screen Tab Strip + Concise Regional Summary */}
      <div className="h-10 px-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between gap-4 overflow-x-auto">
        <nav className="flex items-center h-full gap-1 shrink-0" aria-label="Primary Workspace">
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectTab(tab.id)}
                className={`h-full px-3 flex items-center font-label-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-surface-container-lowest text-primary font-semibold border-b-2 border-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-4 font-mono-metric-sm text-on-surface-variant whitespace-nowrap shrink-0">
          <span>
            REGIONS: <strong className="text-on-surface font-semibold">APAC · US · UK · EU · ME</strong>
          </span>
          <span>
            BREACHES:{' '}
            <strong className={`font-semibold ${globalFreezeActive ? 'text-primary' : 'text-error'}`}>
              {globalFreezeActive ? '0 ACTIVE' : `${criticalCount} CRITICAL`}
            </strong>
          </span>
        </div>
      </div>
    </header>
  );
};
