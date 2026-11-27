import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GraphOrbit, KanbanStage, RiskRegion, RiskTicket } from '../types/risk';
import {
  buildExposureTimelineData,
  ExposureTimelinePoint,
  ExposureTimelineSummary,
} from './exposureTimeline';

export interface RegionalReportRow {
  region: RiskRegion;
  ticketCount: number;
  criticalCount: number;
  activeExposureM: number;
  status: string;
}

export interface StageCountRow {
  stage: KanbanStage;
  label: string;
  count: number;
  exposureM: number;
}

export interface RiskReportData {
  generatedAt: string;
  globalFreezeActive: boolean;
  officerLabel: string;
  totalActiveExposureM: number;
  openTicketCount: number;
  totalTicketCount: number;
  criticalCount: number;
  frozenCount: number;
  regionalRows: RegionalReportRow[];
  stageRows: StageCountRow[];
  timelinePoints: ExposureTimelinePoint[];
  timelineSummary: ExposureTimelineSummary;
  tickets: RiskTicket[];
}

const REGIONS_ORDER: RiskRegion[] = ['APAC', 'US', 'UK', 'Europe', 'Middle East'];

const STAGE_LABELS: Record<KanbanStage, string> = {
  triggered: 'Triggered',
  triage: 'In Triage',
  mitigation: 'Active Mitigation',
  verification: 'Verification & QA',
  closed: 'Closed & Resolved',
};

export function buildRiskReportData(options: {
  tickets: RiskTicket[];
  globalFreezeActive: boolean;
  officerName: string;
  officerRole: string;
  forensicState?: 'pre' | 'post';
  isolatedAccounts?: boolean;
}): RiskReportData {
  const {
    tickets,
    globalFreezeActive,
    officerName,
    officerRole,
    forensicState = globalFreezeActive ? 'post' : 'pre',
    isolatedAccounts = false,
  } = options;

  const openTickets = tickets.filter((t) => t.stage !== 'closed');
  const totalActiveExposureM = Number(
    openTickets.reduce((sum, t) => sum + t.exposureM, 0).toFixed(2)
  );
  const criticalCount = tickets.filter((t) => t.severity === 'critical' && !t.frozen).length;
  const frozenCount = tickets.filter((t) => t.frozen).length;

  const regionalRows: RegionalReportRow[] = REGIONS_ORDER.map((region) => {
    const regionTickets = tickets.filter((t) => t.region === region);
    const activeExposureM = Number(
      regionTickets
        .filter((t) => t.stage !== 'closed')
        .reduce((sum, t) => sum + t.exposureM, 0)
        .toFixed(2)
    );
    const regionCritical = regionTickets.filter(
      (t) => t.severity === 'critical' && !t.frozen
    ).length;
    const allFrozen = regionTickets.length > 0 && regionTickets.every((t) => t.frozen || t.stage === 'closed');

    let status = 'NOMINAL';
    if (globalFreezeActive || allFrozen) {
      status = 'CONTAINED';
    } else if (regionCritical > 0) {
      status = 'BREACHED';
    } else if (regionTickets.some((t) => t.severity === 'warning' || t.severity === 'crypto')) {
      status = 'ELEVATED';
    }

    return {
      region,
      ticketCount: regionTickets.length,
      criticalCount: regionCritical,
      activeExposureM,
      status,
    };
  });

  const stageOrder: KanbanStage[] = ['triggered', 'triage', 'mitigation', 'verification', 'closed'];
  const stageRows: StageCountRow[] = stageOrder.map((stage) => {
    const stageTickets = tickets.filter((t) => t.stage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage],
      count: stageTickets.length,
      exposureM: Number(stageTickets.reduce((sum, t) => sum + t.exposureM, 0).toFixed(2)),
    };
  });

  const { points: timelinePoints, summary: timelineSummary } = buildExposureTimelineData({
    globalFreezeActive,
    forensicState,
    isolatedAccounts,
  });

  return {
    generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    globalFreezeActive,
    officerLabel: `${officerName} (${officerRole})`,
    totalActiveExposureM,
    openTicketCount: openTickets.length,
    totalTicketCount: tickets.length,
    criticalCount,
    frozenCount,
    regionalRows,
    stageRows,
    timelinePoints,
    timelineSummary,
    tickets,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function exportRiskReportPdf(options: {
  tickets: RiskTicket[];
  orbits: GraphOrbit[];
  globalFreezeActive: boolean;
  officerName: string;
  officerRole: string;
  forensicState?: 'pre' | 'post';
  isolatedAccounts?: boolean;
}): { filename: string; totalActiveExposureM: number; totalTicketCount: number } {
  const report = buildRiskReportData(options);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth(); // ~841.89
  const margin = 32;

  // =========================================================================
  // PAGE 1: EXECUTIVE SUMMARY, RISK GRAPH TOPOLOGY & REGIONAL BREAKDOWN
  // =========================================================================
  doc.setFillColor(11, 28, 48); // #0b1c30
  doc.rect(0, 0, pageW, 62, 'F');
  doc.setFillColor(0, 97, 148); // #006194
  doc.rect(0, 60, pageW, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Clustered Risk Eye — Risk Graph & Ticketing Status Report', margin, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(204, 229, 255);
  doc.text(
    `Generated: ${report.generatedAt}   |   Officer: ${report.officerLabel}   |   Regions: APAC, US, UK, Europe, Middle East`,
    margin,
    46
  );

  // Status badge on header right
  const badgeText = report.globalFreezeActive ? 'DEFCON 4: GLOBAL FREEZE LIVE' : 'DEFCON 2: ACTIVE MONITORING';
  const badgeColor: [number, number, number] = report.globalFreezeActive ? [0, 97, 148] : [186, 26, 26];
  doc.setFillColor(...badgeColor);
  doc.roundedRect(pageW - margin - 175, 18, 175, 24, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(badgeText, pageW - margin - 87.5, 33, { align: 'center' });

  // KPI Strip (4 cards)
  const kpiTop = 76;
  const kpiGap = 12;
  const kpiW = (pageW - margin * 2 - kpiGap * 3) / 4;
  const kpis = [
    { label: 'TOTAL CAPITAL AT RISK', value: `$${report.totalActiveExposureM.toFixed(2)}M`, sub: `${report.openTicketCount} open tickets` },
    { label: 'CRITICAL BREACHES', value: String(report.criticalCount), sub: `${report.frozenCount} frozen hubs` },
    { label: 'FREEZE IMPACT (15:45)', value: report.timelineSummary.isMitigated ? `-$${report.timelineSummary.curtailedFromPeakM.toFixed(1)}M` : `$${report.timelineSummary.currentExposureM.toFixed(1)}M`, sub: report.timelineSummary.isMitigated ? `-${report.timelineSummary.curtailedPct}% curtailed` : 'Unmitigated peak' },
    { label: 'TICKETS IN PIPELINE', value: String(report.totalTicketCount), sub: 'Across 5 global regions' },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (kpiW + kpiGap);
    doc.setFillColor(239, 244, 255);
    doc.setDrawColor(191, 199, 210);
    doc.roundedRect(x, kpiTop, kpiW, 48, 5, 5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(84, 92, 114);
    doc.text(kpi.label, x + 10, kpiTop + 14);
    doc.setFontSize(14);
    doc.setTextColor(11, 28, 48);
    doc.text(kpi.value, x + 10, kpiTop + 31);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(63, 72, 80);
    doc.text(kpi.sub, x + 10, kpiTop + 42);
  });

  // Left section: Current Risk Graph Vector Map
  const contentTop = 138;
  const graphW = 468;
  const graphH = 380;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(11, 28, 48);
  doc.text('Current Risk Graph Topology Snapshot (5 Regional Orbits)', margin, contentTop);

  const mapY = contentTop + 8;
  doc.setFillColor(248, 249, 255);
  doc.setDrawColor(191, 199, 210);
  doc.roundedRect(margin, mapY, graphW, graphH, 6, 6, 'FD');

  // Normalize world coordinates from orbits + tickets into map box
  const worldMinX = 80;
  const worldMaxX = 1720;
  const worldMinY = 40;
  const worldMaxY = 1000;
  const toMapX = (wx: number) =>
    margin + 18 + ((wx - worldMinX) / (worldMaxX - worldMinX)) * (graphW - 36);
  const toMapY = (wy: number) =>
    mapY + 22 + ((wy - worldMinY) / (worldMaxY - worldMinY)) * (graphH - 44);
  const scaleX = (graphW - 36) / (worldMaxX - worldMinX);
  const scaleY = (graphH - 44) / (worldMaxY - worldMinY);

  // Draw Orbits
  options.orbits.forEach((orbit) => {
    const cx = toMapX(orbit.cx);
    const cy = toMapY(orbit.cy);
    const rx = orbit.rx * scaleX;
    const ry = orbit.ry * scaleY;
    const [r, g, b] = hexToRgb(orbit.stroke);
    doc.setDrawColor(r, g, b);
    doc.setLineDashPattern([3, 3], 0);
    doc.setLineWidth(0.9);
    doc.ellipse(cx, cy, rx, ry, 'S');
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(r, g, b);
    doc.text(`${orbit.region.toUpperCase()} (${orbit.totalExposureLabel})`, cx, cy - ry - 4, {
      align: 'center',
    });
  });

  // Draw Parent-Child Links
  report.tickets
    .filter((t) => t.parentKey)
    .forEach((sat) => {
      const parent = report.tickets.find((p) => p.key === sat.parentKey);
      if (!parent) return;
      doc.setDrawColor(140, 150, 165);
      doc.setLineWidth(0.8);
      doc.line(toMapX(parent.x), toMapY(parent.y), toMapX(sat.x), toMapY(sat.y));
    });

  // Draw Ticket Bubbles
  report.tickets.forEach((t) => {
    const bx = toMapX(t.x);
    const by = toMapY(t.y);
    const br = Math.max(9, Math.min(24, t.radiusPx * scaleX * 0.65));
    const colorHex = t.frozen
      ? '#006194'
      : t.severity === 'critical'
      ? '#ba1a1a'
      : t.severity === 'warning'
      ? '#d97706'
      : t.severity === 'crypto'
      ? '#7e22ce'
      : '#006194';
    const [r, g, b] = hexToRgb(colorHex);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(t.isCore ? 1.8 : 1.1);
    doc.circle(bx, by, br, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(r, g, b);
    doc.text(t.key, bx, by - 1, { align: 'center' });
    doc.setFontSize(5.8);
    doc.setTextColor(11, 28, 48);
    doc.text(`$${t.exposureM.toFixed(1)}M`, bx, by + 6, { align: 'center' });
  });

  // Right section: Regional Exposure & Stage Summary Tables
  const rightX = margin + graphW + 16;
  const rightW = pageW - margin - rightX;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(11, 28, 48);
  doc.text('Regional Risk Exposure Breakdown', rightX, contentTop);

  autoTable(doc, {
    startY: mapY,
    margin: { left: rightX, right: margin },
    tableWidth: rightW,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 97, 148],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [11, 28, 48],
      cellPadding: 4,
    },
    head: [['Region', 'Tickets', 'Crit', 'Exposure', 'Status']],
    body: report.regionalRows.map((row) => [
      row.region,
      String(row.ticketCount),
      String(row.criticalCount),
      `$${row.activeExposureM.toFixed(1)}M`,
      row.status,
    ]),
  });

  const stageTableStartY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(11, 28, 48);
  doc.text('Ticketing Status by Workflow Stage', rightX, stageTableStartY - 6);

  autoTable(doc, {
    startY: stageTableStartY,
    margin: { left: rightX, right: margin },
    tableWidth: rightW,
    theme: 'grid',
    headStyles: {
      fillColor: [33, 49, 69],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [11, 28, 48],
      cellPadding: 4,
    },
    head: [['Workflow Stage', 'Tickets', 'Exposure ($M)']],
    body: report.stageRows.map((row) => [
      row.label,
      String(row.count),
      `$${row.exposureM.toFixed(1)}M`,
    ]),
  });

  // Page 1 footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(112, 120, 129);
  doc.text('Clustered Risk Eye — Institutional Prudential Report | Page 1 of 2', margin, 574);

  // =========================================================================
  // PAGE 2: 'TOTAL RISK EXPOSURE OVER TIME' CHART DATA & TICKETING LEDGER
  // =========================================================================
  doc.addPage();

  doc.setFillColor(11, 28, 48);
  doc.rect(0, 0, pageW, 44, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text("Total Risk Exposure Over Time & Live Ticketing Status Ledger", margin, 27);

  // Top Left: Vector Line Chart of Total Risk Exposure Over Time
  const chartBoxY = 62;
  const chartBoxW = 390;
  const chartBoxH = 190;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(11, 28, 48);
  doc.text('Total Risk Exposure Over Time ($M)', margin, chartBoxY);

  const plotFrameY = chartBoxY + 8;
  doc.setFillColor(248, 249, 255);
  doc.setDrawColor(191, 199, 210);
  doc.roundedRect(margin, plotFrameY, chartBoxW, chartBoxH, 5, 5, 'FD');

  const padL = 40;
  const padR = 16;
  const padT = 22;
  const padB = 34;
  const plotX = margin + padL;
  const plotY = plotFrameY + padT;
  const plotW = chartBoxW - padL - padR;
  const plotH = chartBoxH - padT - padB;
  const maxY = 65;

  const pxForIdx = (i: number) =>
    plotX + (i / Math.max(1, report.timelinePoints.length - 1)) * plotW;
  const pyForVal = (val: number) => plotY + plotH - (val / maxY) * plotH;

  // Horizontal gridlines ($0M, $20M, $40M, $60M)
  [0, 20, 40, 60].forEach((tick) => {
    const gy = pyForVal(tick);
    doc.setDrawColor(220, 233, 255);
    doc.setLineWidth(0.6);
    doc.line(plotX, gy, plotX + plotW, gy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(84, 92, 114);
    doc.text(`$${tick}M`, plotX - 6, gy + 2.5, { align: 'right' });
  });

  // $25M Risk Appetite Cap line
  const capY = pyForVal(25);
  doc.setDrawColor(112, 120, 129);
  doc.setLineDashPattern([3, 3], 0);
  doc.setLineWidth(0.9);
  doc.line(plotX, capY, plotX + plotW, capY);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6.5);
  doc.setTextColor(63, 72, 80);
  doc.text('Policy Cap ($25.00M)', plotX + 4, capY - 4);

  // Unmitigated / Breach trajectory
  doc.setDrawColor(186, 26, 26);
  doc.setLineDashPattern(report.timelineSummary.isMitigated ? [3, 2] : [], 0);
  doc.setLineWidth(1.5);
  for (let i = 0; i < report.timelinePoints.length - 1; i++) {
    const p1 = report.timelinePoints[i];
    const p2 = report.timelinePoints[i + 1];
    doc.line(pxForIdx(i), pyForVal(p1.unmitigatedM), pxForIdx(i + 1), pyForVal(p2.unmitigatedM));
  }
  doc.setLineDashPattern([], 0);

  // Active / Projected Freeze Curve
  doc.setDrawColor(0, 97, 148);
  doc.setLineWidth(report.timelineSummary.isMitigated ? 1.8 : 1.3);
  doc.setLineDashPattern(report.timelineSummary.isMitigated ? [] : [3, 2], 0);
  for (let i = 0; i < report.timelinePoints.length - 1; i++) {
    const p1 = report.timelinePoints[i];
    const p2 = report.timelinePoints[i + 1];
    const v1 = report.timelineSummary.isMitigated ? p1.activeExposureM : p1.simulatedFreezeM;
    const v2 = report.timelineSummary.isMitigated ? p2.activeExposureM : p2.simulatedFreezeM;
    if (v1 !== null && v2 !== null) {
      doc.line(pxForIdx(i), pyForVal(v1), pxForIdx(i + 1), pyForVal(v2));
    }
  }
  doc.setLineDashPattern([], 0);

  // X-axis labels & points
  report.timelinePoints.forEach((pt, idx) => {
    const x = pxForIdx(idx);
    doc.setFontSize(6.8);
    doc.setTextColor(84, 92, 114);
    doc.text(pt.time, x, plotY + plotH + 11, { align: 'center' });

    doc.setFillColor(186, 26, 26);
    doc.circle(x, pyForVal(pt.unmitigatedM), 2, 'F');
    const blueVal = report.timelineSummary.isMitigated ? pt.activeExposureM : pt.simulatedFreezeM;
    if (blueVal !== null) {
      doc.setFillColor(0, 97, 148);
      doc.circle(x, pyForVal(blueVal), 2.2, 'F');
    }
  });

  // Chart legend inside frame bottom
  doc.setFontSize(7);
  doc.setTextColor(186, 26, 26);
  doc.text('— Unmitigated Trajectory', plotX + 4, plotFrameY + chartBoxH - 8);
  doc.setTextColor(0, 97, 148);
  doc.text(
    report.timelineSummary.isMitigated
      ? '— Post-Freeze Exposure ($11.40M)'
      : '--- Projected Freeze Impact ($11.40M)',
    plotX + 125,
    plotFrameY + chartBoxH - 8
  );

  // Top Right: Total Risk Exposure Over Time Data Table
  const tlTableX = margin + chartBoxW + 16;
  const tlTableW = pageW - margin - tlTableX;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(11, 28, 48);
  doc.text('Exposure Timeline Telemetry Data', tlTableX, chartBoxY);

  autoTable(doc, {
    startY: plotFrameY,
    margin: { left: tlTableX, right: margin },
    tableWidth: tlTableW,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 97, 148],
      textColor: 255,
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [11, 28, 48],
      cellPadding: 3.5,
    },
    head: [['UTC', 'Baseline', 'Active', 'w/ Freeze', 'Milestone']],
    body: report.timelinePoints.map((pt) => [
      pt.time,
      `$${pt.unmitigatedM.toFixed(1)}M`,
      `$${pt.activeExposureM.toFixed(1)}M`,
      pt.simulatedFreezeM !== null ? `$${pt.simulatedFreezeM.toFixed(1)}M` : `$${pt.activeExposureM.toFixed(1)}M`,
      pt.milestone ?? 'Monitoring',
    ]),
  });

  // Bottom: Complete Live Ticketing Status Ledger
  const ledgerStartY = Math.max(
    plotFrameY + chartBoxH + 22,
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(11, 28, 48);
  doc.text('Current Risk Ticketing Status Ledger', margin, ledgerStartY - 6);

  autoTable(doc, {
    startY: ledgerStartY,
    margin: { left: margin, right: margin },
    theme: 'striped',
    headStyles: {
      fillColor: [11, 28, 48],
      textColor: 255,
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [11, 28, 48],
      cellPadding: 3.5,
    },
    head: [['Key', 'Region', 'Incident Title', 'Typology', 'Exposure', 'Stage', 'Status', 'SLA', 'Owner']],
    body: report.tickets.map((t) => [
      t.key,
      t.region,
      t.title,
      t.typology,
      `$${t.exposureM.toFixed(1)}M`,
      STAGE_LABELS[t.stage],
      t.frozen ? 'CORRIDOR FROZEN' : t.statusLabel,
      t.slaDisplay,
      t.assignee.name,
    ]),
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(112, 120, 129);
  doc.text('Clustered Risk Eye — Institutional Prudential Report | Page 2 of 2', margin, 574);

  const filename = `clustered-risk-eye-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);

  return {
    filename,
    totalActiveExposureM: report.totalActiveExposureM,
    totalTicketCount: report.totalTicketCount,
  };
}
