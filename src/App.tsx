import { useCallback, useEffect, useState } from 'react';
import { ClusterTopologyView } from './components/ClusterTopologyView';
import { CreateBubbleModal } from './components/CreateBubbleModal';
import { ExecutiveDirectivesView } from './components/ExecutiveDirectivesView';
import { GraphCanvasView } from './components/GraphCanvasView';
import { Header } from './components/Header';
import { RiskOpsKanbanView } from './components/RiskOpsKanbanView';
import { ToastContainer } from './components/ToastContainer';
import { INITIAL_ORBITS, INITIAL_TICKETS } from './data/initialRiskData';
import {
  ConfirmModalState,
  KanbanStage,
  RiskTicket,
  ScreenTab,
  ToastItem,
} from './types/risk';
import { exportRiskReportPdf } from './utils/pdfReport';

export default function App() {
  const [activeTab, setActiveTab] = useState<ScreenTab>('graph');
  const [tickets, setTickets] = useState<RiskTicket[]>(INITIAL_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('CRE-8942');
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [globalFreezeActive, setGlobalFreezeActive] = useState(false);
  const [nextTicketNumber, setNextTicketNumber] = useState(9210);

  const [activeOfficer, setActiveOfficer] = useState({
    name: 'Sir Julian Vance',
    role: 'Group CRO',
    initials: 'JV',
  });

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  const notify = useCallback(
    (
      title: string,
      message: string,
      tone: 'info' | 'success' | 'warning' | 'error' = 'info'
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, message, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  // Live countdown tick for CRE-8942 in Inspector
  useEffect(() => {
    const id = setInterval(() => {
      setTickets((prev) =>
        prev.map((t) => {
          if (t.frozen || t.stage === 'closed' || t.slaSeconds <= 0) return t;
          if (t.key !== 'CRE-8942') return t;
          const next = t.slaSeconds - 1;
          const h = String(Math.floor(next / 3600)).padStart(2, '0');
          const m = String(Math.floor((next % 3600) / 60)).padStart(2, '0');
          const s = String(next % 60).padStart(2, '0');
          return {
            ...t,
            slaSeconds: next,
            slaDisplay: `${h}:${m}:${s}`,
            badgeText: `${m}m:${s}s`,
          };
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleUpdateTicketPosition = (id: string, x: number, y: number) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)));
  };

  const handleToggleSubTask = (ticketId: string, subTaskId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          subTasks: t.subTasks.map((st) =>
            st.id === subTaskId
              ? {
                  ...st,
                  completed: !st.completed,
                  status: !st.completed ? 'DONE' : 'OPEN',
                }
              : st
          ),
        };
      })
    );
  };

  const handleAddSubTask = (ticketId: string, title: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        const subKey = `${t.key}-${t.subTasks.length + 1}`;
        return {
          ...t,
          subTasks: [
            ...t.subTasks,
            {
              id: `st-${Date.now()}`,
              key: subKey,
              title,
              meta: `Assigned by ${activeOfficer.name}`,
              status: 'OPEN',
              completed: false,
            },
          ],
        };
      })
    );
    notify('Sub-Task Linked', `Added sub-task to ${ticketId} and synced to Jira.`, 'success');
  };

  const handleAddAuditNote = (ticketId: string, message: string) => {
    const timestamp = new Date().toISOString().substring(11, 19) + ' GMT';
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          auditTrail: [
            {
              id: `au-${Date.now()}`,
              author: `${activeOfficer.name} (${activeOfficer.role})`,
              initials: activeOfficer.initials,
              timestamp,
              message,
            },
            ...t.auditTrail,
          ],
        };
      })
    );
    notify('SHA-256 Audit Entry Signed', `Appended verified audit note to ${ticketId}.`, 'success');
  };

  const handleFreezeTicket = (ticket: RiskTicket) => {
    if (ticket.frozen) {
      notify('Corridor Already Frozen', `${ticket.key} settlements are currently locked.`, 'info');
      return;
    }
    setConfirmModal({
      open: true,
      title: `Execute Cryptographic Freeze (${ticket.key})`,
      description: `Pause all outbound SWIFT MT103 & instant settlement corridors associated with ${ticket.key} (${ticket.corridor})? Dual-key audit stamp will be dispatched to ${ticket.jurisdiction}.`,
      confirmLabel: 'Execute Immediate Freeze',
      tone: 'error',
      onConfirm: () => {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticket.id
              ? {
                  ...t,
                  frozen: true,
                  statusLabel: 'CORRIDOR FROZEN',
                  stage: 'verification',
                  shaHash: `SHA256: ${Math.random().toString(16).slice(2, 6)}...${Math.random()
                    .toString(16)
                    .slice(2, 6)}`,
                  auditTrail: [
                    {
                      id: `au-freeze-${Date.now()}`,
                      author: `${activeOfficer.name} (${activeOfficer.role})`,
                      initials: activeOfficer.initials,
                      timestamp: new Date().toISOString().substring(11, 19) + ' GMT',
                      message: `Cryptographic transaction freeze dispatched to ${ticket.jurisdiction} clearing gateways.`,
                    },
                    ...t.auditTrail,
                  ],
                }
              : t
          )
        );
        if (ticket.key === 'CRE-8942') {
          setGlobalFreezeActive(true);
        }
        notify(
          'Cryptographic Lock Dispatched',
          `Corridor settlements frozen for ${ticket.key} across ${ticket.jurisdiction}.`,
          'success'
        );
      },
    });
  };

  const handleEscalateTicket = (ticket: RiskTicket) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, escalated: true } : t))
    );
    notify(
      'Escalated to Executive Board',
      `Board CRO and Internal Audit notified for ${ticket.key} (${ticket.corridor}).`,
      'warning'
    );
  };

  const handleSpawnBubble = (newTicket: RiskTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
    setNextTicketNumber((n) => n + 1);
    setSelectedTicketId(newTicket.id);
    setActiveTab('graph');
    notify(
      'Ticket Bubble Spawned',
      `${newTicket.key} ($${newTicket.exposureM.toFixed(1)}M · ${newTicket.region}) deployed on canvas and synced to Kanban.`,
      'success'
    );
  };

  const handleMoveTicketStage = (ticketId: string, newStage: KanbanStage) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              stage: newStage,
              statusLabel:
                newStage === 'closed'
                  ? 'IMMUTABLE'
                  : newStage === 'mitigation'
                  ? 'ACTIVE MITIGATION'
                  : newStage === 'verification'
                  ? 'VERIFICATION'
                  : newStage === 'triage'
                  ? 'IN TRIAGE'
                  : 'TRIGGERED',
              shaHash:
                newStage === 'closed' && !t.shaHash ? 'SHA256: 7f2c...9a10' : t.shaHash,
            }
          : t
      )
    );
    notify('Workflow Stage Updated', `Moved ${ticketId} to ${newStage.toUpperCase()}.`, 'info');
  };

  const handleExportPdfReport = useCallback(() => {
    const res = exportRiskReportPdf({
      tickets,
      orbits: INITIAL_ORBITS,
      globalFreezeActive,
      officerName: activeOfficer.name,
      officerRole: activeOfficer.role,
    });
    notify(
      'PDF Report Exported',
      `${res.filename} (${res.totalTicketCount} tickets, $${res.totalActiveExposureM.toFixed(1)}M exposure) downloaded.`,
      'success'
    );
  }, [tickets, globalFreezeActive, activeOfficer, notify]);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        tickets={tickets}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectTicketFromSearch={(ticket) => {
          setSelectedTicketId(ticket.id);
          setActiveTab('graph');
          notify('Ticket Focused', `Centered Risk Graph Inspector on ${ticket.key}.`, 'info');
        }}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onExportPdf={handleExportPdfReport}
        globalFreezeActive={globalFreezeActive}
        activeOfficer={activeOfficer}
        onSwitchOfficer={(officer) => {
          setActiveOfficer(officer);
          notify('Officer Session Switched', `Acting as ${officer.name} (${officer.role}).`, 'info');
        }}
      />

      <main className="w-full pt-24 bg-surface min-h-screen flex-1">
        {activeTab === 'graph' && (
          <GraphCanvasView
            tickets={tickets}
            orbits={INITIAL_ORBITS}
            selectedTicketId={selectedTicketId}
            onSelectTicket={setSelectedTicketId}
            onUpdateTicketPosition={handleUpdateTicketPosition}
            onToggleSubTask={handleToggleSubTask}
            onAddSubTask={handleAddSubTask}
            onAddAuditNote={handleAddAuditNote}
            onFreezeTicket={handleFreezeTicket}
            onEscalateTicket={handleEscalateTicket}
            onInspectTopology={() => setActiveTab('topology')}
            onExportPdf={handleExportPdfReport}
            onNotify={notify}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === 'topology' && (
          <ClusterTopologyView
            globalFreezeActive={globalFreezeActive}
            onToggleGlobalFreeze={() => {
              const next = !globalFreezeActive;
              setGlobalFreezeActive(next);
              notify(
                next ? 'Global Wire Cap Engaged' : 'Global Wire Cap Lifted',
                next
                  ? '$10,000 cap enforced across APAC, US, UK, Europe & Middle East gateways.'
                  : 'Corridors restored to baseline threshold monitoring.',
                next ? 'success' : 'warning'
              );
            }}
            onExportPdf={handleExportPdfReport}
            onNotify={notify}
          />
        )}

        {activeTab === 'kanban' && (
          <RiskOpsKanbanView
            tickets={tickets}
            onMoveTicketStage={handleMoveTicketStage}
            onSelectTicketForGraph={(ticketId) => {
              setSelectedTicketId(ticketId);
              setActiveTab('graph');
            }}
            onFreezeTicket={handleFreezeTicket}
            onCreateTicket={handleSpawnBubble}
            onToggleSubTask={handleToggleSubTask}
            onSwitchToGraph={() => setActiveTab('graph')}
            onExportPdf={handleExportPdfReport}
            onNotify={notify}
            nextTicketNumber={nextTicketNumber}
          />
        )}

        {activeTab === 'directives' && (
          <ExecutiveDirectivesView
            onLaunchSandbox={() => {
              setActiveTab('graph');
              notify('Sandbox Canvas Active', 'Returned to live Risk Ticket Graph Canvas.', 'info');
            }}
            onExportPdf={handleExportPdfReport}
            onNotify={notify}
          />
        )}
      </main>

      <CreateBubbleModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        nextTicketNumber={nextTicketNumber}
        onSpawnBubble={handleSpawnBubble}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
        confirmModal={confirmModal}
        onCloseConfirm={() => setConfirmModal(null)}
      />
    </div>
  );
}
