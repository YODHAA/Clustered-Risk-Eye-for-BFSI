export type ScreenTab =
  | 'graph'
  | 'topology'
  | 'kanban'
  | 'directives';

export type RiskRegion = 'APAC' | 'US' | 'UK' | 'Europe' | 'Middle East';

export type OrbitId = 'apac' | 'us' | 'uk' | 'europe' | 'middle-east';

export type RiskSeverity = 'critical' | 'warning' | 'nominal' | 'crypto';

export type KanbanStage =
  | 'triggered'
  | 'triage'
  | 'mitigation'
  | 'verification'
  | 'closed';

export type ClusterAxis = 'Region' | 'Typology' | 'Jira Workflow';

export interface SubTask {
  id: string;
  key: string;
  title: string;
  meta: string;
  status: 'DONE' | 'IN REVIEW' | 'OPEN' | 'QUEUED';
  completed: boolean;
}

export interface AuditEntry {
  id: string;
  author: string;
  initials: string;
  isSystem?: boolean;
  timestamp: string;
  message: string;
  highlightKey?: string;
}

export interface RiskTicket {
  id: string;
  key: string;
  title: string;
  shortTitle: string;
  epicBadge?: string;
  isCore?: boolean;
  region: RiskRegion;
  orbitId: OrbitId;
  typology: 'Synthetic ID' | 'TBML' | 'Micro-Smurfing' | 'Crypto Gateway';
  corridor: string;
  jurisdiction: string;
  severity: RiskSeverity;
  statusLabel: string;
  badgeText?: string;
  riskScore: number;
  exposureM: number;
  limitM: number;
  txVelocity: number; // tx/min
  slaSeconds: number;
  slaDisplay: string;
  assignee: {
    name: string;
    initials: string;
    role: string;
  };
  reporter: string;
  density: number;
  stage: KanbanStage;
  priority: 'P1' | 'P2' | 'P3';
  rootCauseSummary: string;
  confidence: number;
  rules: string[];
  frozen?: boolean;
  escalated?: boolean;
  x: number;
  y: number;
  radiusPx: number;
  parentKey?: string;
  subTasks: SubTask[];
  auditTrail: AuditEntry[];
  shaHash?: string;
  remediatedAgo?: string;
  slaMetDuration?: string;
  dualKeyState?: string;
  checklistSteps?: string;
}

export interface GraphOrbit {
  id: OrbitId;
  region: RiskRegion;
  label: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  stroke: string;
  textColor: string;
  gradientId: string;
  totalExposureLabel: string;
}

export interface SettlementNode {
  code: string;
  region: RiskRegion;
  cap: string;
  status: 'enforced' | 'syncing';
  progress?: number;
}

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

export interface ConfirmModalState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'error' | 'primary';
  onConfirm: () => void;
}
