import type { ChartSpec, ChartType, Granularity, CompareTo } from '@vd/shared';
import { resolveAutoChartType } from '@vd/shared';

export interface InterpretedToolCall {
  toolName: string;
  args: Record<string, any>;
  confirmation: string;
}

export function interpretUtteranceLocally(
  utterance: string,
  charts: ChartSpec[],
  lastTouched: string | null
): InterpretedToolCall | null {
  const u = utterance.trim().toLowerCase();

  // Control actions
  if (u === 'undo' || u.includes('undo last action') || u.includes('undo that')) {
    return {
      toolName: 'undo',
      args: {},
      confirmation: 'Undid the last dashboard action.',
    };
  }

  if (u.includes('clear dashboard') || u.includes('clear all charts') || u.includes('remove all charts')) {
    return {
      toolName: 'clear_dashboard',
      args: {},
      confirmation: 'Cleared all charts from the dashboard.',
    };
  }

  if (u.includes('clear filters') || u.includes('clear all filters') || u.includes('reset filters')) {
    return {
      toolName: 'clear_filters',
      args: {},
      confirmation: 'Cleared all global filters.',
    };
  }

  // Detect explicit chart types requested
  let explicitChartType: ChartType | undefined;
  if (u.includes('bar chart') || u.includes('as a bar') || u.includes('make it a bar')) {
    explicitChartType = 'bar';
  } else if (u.includes('line chart') || u.includes('as a line') || u.includes('make it a line')) {
    explicitChartType = 'line';
  } else if (u.includes('area chart') || u.includes('as an area') || u.includes('make it an area')) {
    explicitChartType = 'area';
  } else if (u.includes('donut') || u.includes('pie') || u.includes('as a donut')) {
    explicitChartType = 'donut';
  }

  // Follow-up chart modification (only if charts exist and phrase is clearly an edit)
  const isExplicitNew =
    u.includes('new chart') ||
    u.includes('add a chart') ||
    u.includes('add another chart') ||
    u.includes('another chart') ||
    u.includes('also show') ||
    u.includes('create a chart') ||
    u.includes('add component');

  const isFollowUp =
    charts.length > 0 &&
    !isExplicitNew &&
    (u.startsWith('make it') ||
      u.startsWith('display as') ||
      u.startsWith('switch to') ||
      u.startsWith('change to') ||
      u.startsWith('break out') ||
      u.startsWith('compare to') ||
      u.includes('not monthly') ||
      u.includes('not weekly'));

  if (isFollowUp) {
    const targetChart = charts.find((c) => c.id === lastTouched) || charts[charts.length - 1];
    const args: Record<string, any> = { chart_id: targetChart.id };

    if (explicitChartType) {
      args.chart_type = explicitChartType;
    }

    if (u.includes('weekly') || u.includes('by week')) {
      args.time_granularity = 'week';
      args.group_by = '';
    } else if (u.includes('monthly') || u.includes('by month')) {
      args.time_granularity = 'month';
      args.group_by = '';
    } else if (u.includes('daily') || u.includes('by day')) {
      args.time_granularity = 'day';
      args.group_by = '';
    }

    if (u.includes('last year') || u.includes('previous year')) {
      args.compare_to = 'previous_year';
    } else if (u.includes('previous period') || u.includes('last period')) {
      args.compare_to = 'previous_period';
    }

    if (u.includes('break out')) {
      if (u.includes('southeast')) {
        args.filters = [{ dimension: 'region', values: ['Southeast'] }];
        args.group_by = 'category';
      } else if (u.includes('northeast')) {
        args.filters = [{ dimension: 'region', values: ['Northeast'] }];
        args.group_by = 'category';
      } else if (u.includes('electronics')) {
        args.filters = [{ dimension: 'category', values: ['Electronics'] }];
        args.group_by = 'channel';
      }
    }

    return {
      toolName: 'update_chart',
      args,
      confirmation: `Updated chart "${targetChart.title}".`,
    };
  }

  // Detect metric
  let metric = 'revenue';
  if (u.includes('order') || u.includes('transaction')) {
    metric = 'orders';
  } else if (u.includes('average order') || u.includes('aov') || u.includes('basket size')) {
    metric = 'aov';
  } else if (u.includes('customer') || u.includes('buyer') || u.includes('shopper')) {
    metric = 'customers';
  } else if (u.includes('unit') || u.includes('items sold')) {
    metric = 'units';
  } else if (u.includes('revenue') || u.includes('sale') || u.includes('turnover') || u.includes('income')) {
    metric = 'revenue';
  }

  // Detect dimension / group by
  let groupBy: string | undefined;
  if (u.includes('by region') || (u.includes('region') && !u.includes('west') && !u.includes('southeast'))) {
    groupBy = 'region';
  } else if (u.includes('by category') || u.includes('category')) {
    groupBy = 'category';
  } else if (u.includes('by channel') || u.includes('channel')) {
    groupBy = 'channel';
  }

  // Detect granularity
  let granularity: Granularity | undefined;
  if (u.includes('monthly') || u.includes('by month')) {
    granularity = 'month';
    groupBy = undefined;
  } else if (u.includes('weekly') || u.includes('by week')) {
    granularity = 'week';
    groupBy = undefined;
  } else if (u.includes('daily') || u.includes('by day')) {
    granularity = 'day';
    groupBy = undefined;
  } else if (u.includes('quarterly') || u.includes('by quarter')) {
    granularity = 'quarter';
    groupBy = undefined;
  }

  // Detect time range
  let timeRange: any = { preset: 'this_quarter' };
  if (u.includes('q3')) {
    timeRange = { quarter: 3, year: 2026 };
  } else if (u.includes('q2')) {
    timeRange = { quarter: 2, year: 2026 };
  } else if (u.includes('q1')) {
    timeRange = { quarter: 1, year: 2026 };
  } else if (u.includes('q4')) {
    timeRange = { quarter: 4, year: 2026 };
  } else if (u.includes('this year') || u.includes('2026')) {
    timeRange = { preset: 'this_year' };
  } else if (u.includes('last month')) {
    timeRange = { preset: 'last_month' };
  } else if (u.includes('this month')) {
    timeRange = { preset: 'this_month' };
  } else if (u.includes('last 7 days') || u.includes('7 days')) {
    timeRange = { preset: 'last_7_days' };
  } else if (u.includes('last 30 days') || u.includes('30 days')) {
    timeRange = { preset: 'last_30_days' };
  } else if (u.includes('year to date') || u.includes('ytd')) {
    timeRange = { preset: 'year_to_date' };
  }

  // Detect filters
  const filters: any[] = [];
  if (u.includes('electronics')) filters.push({ dimension: 'category', values: ['Electronics'] });
  if (u.includes('apparel')) filters.push({ dimension: 'category', values: ['Apparel'] });
  if (u.includes('west')) filters.push({ dimension: 'region', values: ['West'] });
  if (u.includes('southeast')) filters.push({ dimension: 'region', values: ['Southeast'] });
  if (u.includes('northeast')) filters.push({ dimension: 'region', values: ['Northeast'] });
  if (u.includes('web')) filters.push({ dimension: 'channel', values: ['Web'] });
  if (u.includes('mobile')) filters.push({ dimension: 'channel', values: ['Mobile App'] });

  // Detect compare_to
  let compareTo: CompareTo = 'none';
  if (u.includes('last year') || u.includes('previous year')) {
    compareTo = 'previous_year';
  } else if (u.includes('previous period')) {
    compareTo = 'previous_period';
  }

  // Auto-resolve best chart type
  const chartType =
    explicitChartType ||
    resolveAutoChartType({
      metric,
      group_by: groupBy,
      time_granularity: granularity,
      compare_to: compareTo,
    });

  return {
    toolName: 'add_chart',
    args: {
      metric,
      group_by: groupBy,
      time_granularity: granularity,
      time_range: timeRange,
      filters,
      compare_to: compareTo,
      chart_type: chartType,
    },
    confirmation: `Added new ${chartType} chart for ${metric}${groupBy ? ` by ${groupBy}` : ''}.`,
  };
}
