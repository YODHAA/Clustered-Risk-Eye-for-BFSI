import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExposureTimelineData } from './exposureTimeline';

test('pre-breach mode tracks unmitigated curve and exposes projected freeze simulation', () => {
  const { points, summary } = buildExposureTimelineData({
    globalFreezeActive: false,
    forensicState: 'pre',
    isolatedAccounts: false,
  });

  assert.equal(points.length, 8);
  assert.equal(summary.isMitigated, false);
  assert.equal(summary.currentExposureM, 48.2);

  const last = points[points.length - 1];
  assert.equal(last.time, '15:45');
  assert.equal(last.activeExposureM, last.unmitigatedM);
  assert.equal(last.simulatedFreezeM, 11.4);
});

test('global freeze active brings active exposure below $25M tolerance limit', () => {
  const { points, summary } = buildExposureTimelineData({
    globalFreezeActive: true,
    forensicState: 'pre',
    isolatedAccounts: false,
  });

  assert.equal(summary.isMitigated, true);
  assert.equal(summary.currentExposureM, 11.4);
  assert.equal(summary.curtailedFromPeakM, 36.8);
  assert.equal(summary.curtailedPct, 76.3);
  assert.equal(summary.avoidedBy1545M, 46.2);

  const last = points[points.length - 1];
  assert.equal(last.activeExposureM, 11.4);
  assert.ok(last.activeExposureM < last.limitM);
  assert.equal(last.unmitigatedM, 57.6);
  assert.equal(last.simulatedFreezeM, null);
});

test('account isolation accelerates post-freeze drop at 15:25', () => {
  const withoutIso = buildExposureTimelineData({
    globalFreezeActive: true,
    forensicState: 'post',
    isolatedAccounts: false,
  });
  const withIso = buildExposureTimelineData({
    globalFreezeActive: true,
    forensicState: 'post',
    isolatedAccounts: true,
  });

  const pWithout = withoutIso.points.find((p) => p.time === '15:25');
  const pWith = withIso.points.find((p) => p.time === '15:25');

  assert.ok(pWithout && pWith);
  assert.ok(pWith.activeExposureM < pWithout.activeExposureM);
});
