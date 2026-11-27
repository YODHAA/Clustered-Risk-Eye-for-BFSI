import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRiskReportData } from './pdfReport';
import { INITIAL_TICKETS, RISK_REGIONS } from '../data/initialRiskData';

test('buildRiskReportData summarizes all 5 regions and ticketing stages', () => {
  const report = buildRiskReportData({
    tickets: INITIAL_TICKETS,
    globalFreezeActive: false,
    officerName: 'Sir Julian Vance',
    officerRole: 'Group CRO',
  });

  assert.equal(report.totalTicketCount, INITIAL_TICKETS.length);
  assert.equal(report.regionalRows.length, 5);
  assert.deepEqual(
    report.regionalRows.map((r) => r.region),
    RISK_REGIONS
  );
  assert.equal(report.timelinePoints.length, 8);
  assert.equal(report.timelineSummary.isMitigated, false);
});

test('buildRiskReportData reflects global freeze state in timeline and regional status', () => {
  const report = buildRiskReportData({
    tickets: INITIAL_TICKETS,
    globalFreezeActive: true,
    officerName: 'Sir Julian Vance',
    officerRole: 'Group CRO',
  });

  assert.equal(report.timelineSummary.isMitigated, true);
  assert.equal(report.timelineSummary.currentExposureM, 11.4);
  for (const row of report.regionalRows) {
    assert.equal(row.status, 'CONTAINED');
  }
});
