import type { TimeRange, CompareTo } from '@vd/shared';

export interface ResolvedTimeRange {
  start: string; // YYYY-MM-DD
  end_exclusive: string; // YYYY-MM-DD for SQL <
  end_inclusive: string; // YYYY-MM-DD for API display
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d.getTime());
  res.setUTCDate(res.getUTCDate() + days);
  return res;
}

function parseDateUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

/**
 * Resolves a TimeRange object relative to asOfDate.
 */
export function resolveTimeRange(range: TimeRange, asOfDateStr: string): ResolvedTimeRange {
  const asOf = parseDateUtc(asOfDateStr);
  const currentYear = asOf.getUTCFullYear();
  const currentMonth = asOf.getUTCMonth(); // 0-indexed

  if ('quarter' in range) {
    const q = range.quarter;
    const y = range.year;
    const startMonth = (q - 1) * 3;
    const startDate = new Date(Date.UTC(y, startMonth, 1));
    const nextQDate = new Date(Date.UTC(y, startMonth + 3, 1));
    const inclusiveEnd = addDays(nextQDate, -1);

    return {
      start: formatDate(startDate),
      end_exclusive: formatDate(nextQDate),
      end_inclusive: formatDate(inclusiveEnd),
    };
  }

  if ('start' in range && 'end' in range) {
    const startDate = parseDateUtc(range.start);
    const inclusiveEnd = parseDateUtc(range.end);
    const exclusiveEnd = addDays(inclusiveEnd, 1);

    return {
      start: formatDate(startDate),
      end_exclusive: formatDate(exclusiveEnd),
      end_inclusive: formatDate(inclusiveEnd),
    };
  }

  // Preset
  const preset = range.preset;
  switch (preset) {
    case 'this_month': {
      const startDate = new Date(Date.UTC(currentYear, currentMonth, 1));
      const nextMonthDate = new Date(Date.UTC(currentYear, currentMonth + 1, 1));
      return {
        start: formatDate(startDate),
        end_exclusive: formatDate(nextMonthDate),
        end_inclusive: formatDate(addDays(nextMonthDate, -1)),
      };
    }
    case 'last_month': {
      const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
      const nextMonthDate = new Date(Date.UTC(currentYear, currentMonth, 1));
      return {
        start: formatDate(startDate),
        end_exclusive: formatDate(nextMonthDate),
        end_inclusive: formatDate(addDays(nextMonthDate, -1)),
      };
    }
    case 'this_quarter': {
      const q = Math.floor(currentMonth / 3) + 1;
      const startMonth = (q - 1) * 3;
      const startDate = new Date(Date.UTC(currentYear, startMonth, 1));
      const nextQDate = new Date(Date.UTC(currentYear, startMonth + 3, 1));
      return {
        start: formatDate(startDate),
        end_exclusive: formatDate(nextQDate),
        end_inclusive: formatDate(addDays(nextQDate, -1)),
      };
    }
    case 'last_quarter': {
      let q = Math.floor(currentMonth / 3) + 1 - 1;
      let y = currentYear;
      if (q === 0) {
        q = 4;
        y -= 1;
      }
      const startMonth = (q - 1) * 3;
      const startDate = new Date(Date.UTC(y, startMonth, 1));
      const nextQDate = new Date(Date.UTC(y, startMonth + 3, 1));
      return {
        start: formatDate(startDate),
        end_exclusive: formatDate(nextQDate),
        end_inclusive: formatDate(addDays(nextQDate, -1)),
      };
    }
    case 'this_year': {
      const startDate = new Date(Date.UTC(currentYear, 0, 1));
      const nextYearDate = new Date(Date.UTC(currentYear + 1, 0, 1));
      return {
        start: formatDate(startDate),
        end_exclusive: formatDate(nextYearDate),
        end_inclusive: formatDate(addDays(nextYearDate, -1)),
      };
    }
    case 'last_year': {
      const startDate = new Date(Date.UTC(currentYear - 1, 0, 1));
      const nextYearDate = new Date(Date.UTC(currentYear, 0, 1));
      return {
        start: formatDate(startDate),
        end_exclusive: formatDate(nextYearDate),
        end_inclusive: formatDate(addDays(nextYearDate, -1)),
      };
    }
    case 'year_to_date': {
      const startDate = new Date(Date.UTC(currentYear, 0, 1));
      const exclusiveEnd = addDays(asOf, 1);
      return {
        start: formatDate(startDate),
        end_exclusive: formatDate(exclusiveEnd),
        end_inclusive: formatDate(asOf),
      };
    }
    case 'last_7_days': {
      const startDate = addDays(asOf, -6);
      const exclusiveEnd = addDays(asOf, 1);
      return {
        start: formatDate(startDate),
        end_exclusive: formatDate(exclusiveEnd),
        end_inclusive: formatDate(asOf),
      };
    }
    case 'last_30_days': {
      const startDate = addDays(asOf, -29);
      const exclusiveEnd = addDays(asOf, 1);
      return {
        start: formatDate(startDate),
        end_exclusive: formatDate(exclusiveEnd),
        end_inclusive: formatDate(asOf),
      };
    }
    case 'last_90_days': {
      const startDate = addDays(asOf, -89);
      const exclusiveEnd = addDays(asOf, 1);
      return {
        start: formatDate(startDate),
        end_exclusive: formatDate(exclusiveEnd),
        end_inclusive: formatDate(asOf),
      };
    }
  }
}

/**
 * Shifts resolved time range for comparison:
 * - 'previous_period': shifts back by identical duration in days
 * - 'previous_year': shifts back by 1 calendar year
 */
export function getComparisonRange(
  base: ResolvedTimeRange,
  compareTo: CompareTo
): ResolvedTimeRange | null {
  if (compareTo === 'none') return null;

  const baseStart = parseDateUtc(base.start);
  const baseEndEx = parseDateUtc(base.end_exclusive);

  if (compareTo === 'previous_year') {
    const shiftYear = (d: Date): Date => {
      const res = new Date(d.getTime());
      res.setUTCFullYear(res.getUTCFullYear() - 1);
      return res;
    };

    const compStart = shiftYear(baseStart);
    const compEndEx = shiftYear(baseEndEx);
    const compEndInc = addDays(compEndEx, -1);

    return {
      start: formatDate(compStart),
      end_exclusive: formatDate(compEndEx),
      end_inclusive: formatDate(compEndInc),
    };
  }

  // previous_period
  const diffDays = Math.round((baseEndEx.getTime() - baseStart.getTime()) / (1000 * 60 * 60 * 24));
  const compEndEx = new Date(baseStart.getTime());
  const compStart = addDays(compEndEx, -diffDays);
  const compEndInc = addDays(compEndEx, -1);

  return {
    start: formatDate(compStart),
    end_exclusive: formatDate(compEndEx),
    end_inclusive: formatDate(compEndInc),
  };
}
