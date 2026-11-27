export interface ExposureTimelinePoint {
  time: string;
  unmitigatedM: number;
  activeExposureM: number;
  simulatedFreezeM: number | null;
  limitM: number;
  milestone?: string;
}

export interface ExposureTimelineSummary {
  currentExposureM: number;
  peakExposureM: number;
  limitM: number;
  avoidedBy1545M: number;
  curtailedFromPeakM: number;
  curtailedPct: number;
  isMitigated: boolean;
}

export function buildExposureTimelineData(options: {
  globalFreezeActive: boolean;
  forensicState: 'pre' | 'post';
  isolatedAccounts: boolean;
}): { points: ExposureTimelinePoint[]; summary: ExposureTimelineSummary } {
  const { globalFreezeActive, forensicState, isolatedAccounts } = options;
  const isPre = forensicState === 'pre' && !globalFreezeActive;
  const limitM = 25.0;

  const baseSeries: Array<{ time: string; unmitigatedM: number; milestone?: string }> = [
    { time: '14:15', unmitigatedM: 4.2, milestone: 'Baseline Telemetry' },
    { time: '14:32', unmitigatedM: 8.9, milestone: 'Rapid Anomaly Inception (88 SIM IDs)' },
    { time: '14:50', unmitigatedM: 18.5, milestone: 'Tokyo Gateway Velocity Surge' },
    { time: '15:05', unmitigatedM: 31.4, milestone: 'Tolerance Cap Crossed ($25.00M)' },
    { time: '15:18', unmitigatedM: 48.2, milestone: 'Peak Breach (192.8% of Cap)' },
    { time: '15:25', unmitigatedM: 51.4 },
    { time: '15:35', unmitigatedM: 54.8 },
    { time: '15:45', unmitigatedM: 57.6 },
  ];

  // Post-freeze trajectory drops sharply after 15:18 intervention.
  // Account isolation accelerates the immediate 15:25-15:35 drop while settling at $11.40M residual frozen in-transit.
  const freezeStep1525 = isolatedAccounts ? 19.2 : 24.6;
  const freezeStep1535 = isolatedAccounts ? 12.1 : 14.8;
  const freezeStep1545 = 11.4;

  const points: ExposureTimelinePoint[] = baseSeries.map((entry) => {
    let postFreezeVal: number | null = null;
    if (entry.time === '15:18') postFreezeVal = 48.2;
    if (entry.time === '15:25') postFreezeVal = freezeStep1525;
    if (entry.time === '15:35') postFreezeVal = freezeStep1535;
    if (entry.time === '15:45') postFreezeVal = freezeStep1545;

    const activeExposureM = isPre
      ? entry.unmitigatedM
      : postFreezeVal !== null
      ? postFreezeVal
      : entry.unmitigatedM;

    const milestone =
      !isPre && entry.time === '15:25'
        ? globalFreezeActive
          ? 'Global Wire Cap ($10k) Engaged'
          : 'Containment Policy Applied'
        : !isPre && entry.time === '15:45'
        ? 'Residual Frozen In-Transit ($11.40M)'
        : entry.milestone;

    return {
      time: entry.time,
      unmitigatedM: entry.unmitigatedM,
      activeExposureM,
      simulatedFreezeM: isPre ? postFreezeVal : null,
      limitM,
      milestone,
    };
  });

  const currentExposureM = isPre ? 48.2 : freezeStep1545;
  const peakExposureM = 48.2;
  const curtailedFromPeakM = Number((peakExposureM - freezeStep1545).toFixed(2));
  const curtailedPct = Number(((curtailedFromPeakM / peakExposureM) * 100).toFixed(1));
  const avoidedBy1545M = Number((57.6 - freezeStep1545).toFixed(2));

  return {
    points,
    summary: {
      currentExposureM,
      peakExposureM,
      limitM,
      avoidedBy1545M,
      curtailedFromPeakM,
      curtailedPct,
      isMitigated: !isPre,
    },
  };
}
