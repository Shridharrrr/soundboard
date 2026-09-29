import type { SemanticLayer, Filter, Granularity, MetricDefinition } from '@vd/shared';
import type { ResolvedTimeRange } from './time.js';

export interface CompiledQuery {
  sql: string;
  params: unknown[];
  displaySql: string;
  columns: string[];
}

export interface CompileOptions {
  metricId: string;
  metricDef: MetricDefinition;
  timeColumn: string;
  sourceTable: string;
  timeRange: ResolvedTimeRange;
  groupBy?: string;
  dimensionColumn?: string;
  timeGranularity?: Granularity;
  resolvedFilters: Filter[];
  dimensionColumnMap: Record<string, string>; // dimKey -> colName
}

/**
 * Compiles a parameterized SQL query using allowlisted identifiers from semantic.yaml only.
 */
export function compileSql(opts: CompileOptions): CompiledQuery {
  const selectCols: string[] = [];
  const groupIndices: string[] = [];
  const columns: string[] = [];
  let colIndex = 1;

  if (opts.timeGranularity) {
    selectCols.push(`date_trunc('${opts.timeGranularity}', ${opts.timeColumn})::date AS period`);
    groupIndices.push(String(colIndex++));
    columns.push('period');
  }

  if (opts.groupBy && opts.dimensionColumn) {
    selectCols.push(`${opts.dimensionColumn} AS grp`);
    groupIndices.push(String(colIndex++));
    columns.push('grp');
  }

  selectCols.push(`${opts.metricDef.sql} AS value`);
  columns.push('value');

  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  whereClauses.push(`${opts.timeColumn} >= $${paramIdx++}`);
  params.push(opts.timeRange.start);

  whereClauses.push(`${opts.timeColumn} < $${paramIdx++}`);
  params.push(opts.timeRange.end_exclusive);

  for (const f of opts.resolvedFilters) {
    const colName = opts.dimensionColumnMap[f.dimension.toLowerCase()];
    if (colName) {
      whereClauses.push(`${colName} = ANY($${paramIdx++})`);
      params.push(f.values);
    }
  }

  let sql = `SELECT ${selectCols.join(', ')}\nFROM ${opts.sourceTable}\nWHERE ${whereClauses.join(' AND ')}`;

  if (groupIndices.length > 0) {
    sql += `\nGROUP BY ${groupIndices.join(', ')}\nORDER BY ${groupIndices.join(', ')}`;
  }

  sql += `\nLIMIT 500`;

  // Display SQL with params inlined (strictly for UI display/Metabase export)
  let displaySql = sql;
  displaySql = displaySql.replace('$1', `'${opts.timeRange.start}'`);
  displaySql = displaySql.replace('$2', `'${opts.timeRange.end_exclusive}'`);

  let pOffset = 3;
  for (const f of opts.resolvedFilters) {
    const arrayStr = `ARRAY[${f.values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ')}]`;
    displaySql = displaySql.replace(`$${pOffset++}`, arrayStr);
  }

  return {
    sql,
    params,
    displaySql,
    columns,
  };
}
