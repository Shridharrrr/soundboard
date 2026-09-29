import type { InsightFacts } from '@vd/shared';

export interface RowData {
  period?: string | null;
  grp?: string | null;
  value: string | number | null;
  comparison_value?: string | number | null;
  [key: string]: unknown;
}

export function computeInsightFacts(
  rows: RowData[],
  metricId: string,
  totalOverride?: { baseTotal: number; compTotal?: number }
): InsightFacts {
  if (rows.length === 0) {
    return { total: 0 };
  }

  let total = 0;
  let compTotal = 0;
  let hasComparison = false;

  if (totalOverride) {
    total = totalOverride.baseTotal;
    if (totalOverride.compTotal !== undefined) {
      compTotal = totalOverride.compTotal;
      hasComparison = true;
    }
  } else {
    for (const r of rows) {
      const val = Number(r.value) || 0;
      total += val;
      if (r.comparison_value !== undefined && r.comparison_value !== null) {
        hasComparison = true;
        compTotal += Number(r.comparison_value) || 0;
      }
    }
  }

  total = Math.round(total * 100) / 100;
  compTotal = Math.round(compTotal * 100) / 100;

  const facts: InsightFacts = { total };

  if (hasComparison) {
    facts.comparison_total = compTotal;
    if (compTotal > 0) {
      facts.delta_pct = Math.round(((total - compTotal) / compTotal) * 1000) / 10;
    }
  }

  // Top group & share (for categorical queries)
  const groupRows = rows.filter(r => r.grp !== undefined && r.grp !== null);
  if (groupRows.length > 0) {
    let topGrp: string | undefined;
    let topVal = -Infinity;
    for (const r of groupRows) {
      const v = Number(r.value) || 0;
      if (v > topVal) {
        topVal = v;
        topGrp = String(r.grp);
      }
    }
    if (topGrp && total > 0) {
      facts.top_group = topGrp;
      facts.top_group_share = Math.round((topVal / total) * 1000) / 10;
    }
  }

  // Peak and trough period (for time series)
  const timeRows = rows.filter(r => r.period !== undefined && r.period !== null);
  if (timeRows.length > 1) {
    let peakPeriod: string | undefined;
    let troughPeriod: string | undefined;
    let maxVal = -Infinity;
    let minVal = Infinity;

    for (const r of timeRows) {
      const v = Number(r.value) || 0;
      const pStr = String(r.period);
      if (v > maxVal) {
        maxVal = v;
        peakPeriod = pStr;
      }
      if (v < minVal) {
        minVal = v;
        troughPeriod = pStr;
      }
    }

    if (peakPeriod) facts.peak_period = peakPeriod;
    if (troughPeriod) facts.trough_period = troughPeriod;
  }

  return facts;
}
