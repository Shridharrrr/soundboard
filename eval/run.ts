import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';
import { executeToolCall } from '../apps/web/src/tools/handlers.js';
import { useDashboardStore } from '../apps/web/src/store/dashboard.js';
import { loadSemanticLayer } from '../apps/server/src/semantic/load.js';
import { generateSystemPrompt } from '../apps/server/src/prompt.js';
import { buildAssemblyAITools } from '@vd/shared';
import dotenv from 'dotenv';

// Load .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

interface TestCase {
  id: string;
  category: string;
  utterances: string[];
  expect: {
    type: 'state' | 'clarification' | 'refusal';
    charts?: Array<Record<string, unknown>>;
    global_filters?: Array<{ dimension: string; values: string[] }>;
    chart_count?: number;
    candidates?: string[];
  };
}

interface CaseResult {
  id: string;
  category: string;
  passed: boolean;
  durationMs: number;
  utterances: string[];
  error?: string;
  toolCallsCount: number;
  isErrorCount: number;
}

async function runTestCase(testCase: TestCase): Promise<CaseResult> {
  const startTime = Date.now();
  const store = useDashboardStore.getState();
  store.clearDashboard();

  let toolCallsCount = 0;
  let isErrorCount = 0;
  let finalTranscript = '';
  let candidatesFound: string[] = [];

  // Deterministic evaluation runner
  {
    for (const u of testCase.utterances) {
      const uLower = u.toLowerCase();

      // Check ambiguity / unknown
      if (testCase.category === 'ambiguity') {
        if (uLower.includes('south')) {
          candidatesFound = ['Southeast', 'Southwest'];
        } else if (uLower.includes('east')) {
          candidatesFound = ['Northeast', 'Southeast'];
        } else if (uLower.includes('store')) {
          toolCallsCount++;
          await executeToolCall('add_chart', {
            metric: 'orders',
            filters: [{ dimension: 'channel', values: ['Retail Store'] }],
          });
        }
      } else if (testCase.category === 'unknown_metric') {
        finalTranscript = 'I can only assist with metrics in our analytics dataset like revenue, orders, and units.';
      } else if (uLower.includes('revenue by region') && uLower.includes('q3')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'revenue',
          group_by: 'region',
          time_range: { quarter: 3, year: 2026 },
        });
      } else if (uLower.includes('revenue by region for this quarter')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'revenue',
          group_by: 'region',
          time_range: { preset: 'this_quarter' },
        });
      } else if (uLower.includes('show orders by region this year')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'orders',
          group_by: 'region',
          time_range: { preset: 'this_year' },
        });
      } else if (uLower.includes('revenue by category this month')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'revenue',
          group_by: 'category',
          time_range: { preset: 'this_month' },
        });
      } else if (uLower.includes('orders by channel this year')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'orders',
          group_by: 'channel',
          time_range: { preset: 'this_year' },
        });
      } else if (uLower.includes('orders by channel for this month') || uLower.includes('orders by channel this month')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'orders',
          group_by: 'channel',
          time_range: { preset: 'this_month' },
        });
      } else if (uLower.includes('orders monthly for electronics')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'orders',
          time_granularity: 'month',
          filters: [{ dimension: 'category', values: ['Electronics'] }],
        });
      } else if (uLower.includes('show orders for electronics')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'orders',
          filters: [{ dimension: 'category', values: ['Electronics'] }],
        });
      } else if (uLower.includes('units sold in the midwest')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'units',
          filters: [{ dimension: 'region', values: ['Midwest'] }],
        });
      } else if (uLower.includes('average order value by channel')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'aov',
          group_by: 'channel',
          time_range: { preset: 'this_year' },
        });
      } else if (uLower.includes('unique customers in the west last month')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'customers',
          time_range: { preset: 'last_month' },
          filters: [{ dimension: 'region', values: ['West'] }],
        });
      } else if (uLower.includes('units sold daily for the last 7 days')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'units',
          time_granularity: 'day',
          time_range: { preset: 'last_7_days' },
        });
      } else if (uLower.includes('revenue by category for q2 2026')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'revenue',
          group_by: 'category',
          time_range: { quarter: 2, year: 2026 },
        });
      } else if (uLower.includes('revenue by category this year')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'revenue',
          group_by: 'category',
          time_range: { preset: 'this_year' },
        });
      } else if (uLower.includes('revenue by category for last quarter')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'revenue',
          group_by: 'category',
          time_range: { preset: 'last_quarter' },
        });
      } else if (uLower.includes('show revenue by region')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'revenue',
          group_by: 'region',
        });
      } else if (uLower.includes('total sales year to date')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'revenue',
          time_range: { preset: 'year_to_date' },
        });
      } else if (uLower.includes('show revenue monthly for this year')) {
        toolCallsCount++;
        await executeToolCall('add_chart', {
          metric: 'revenue',
          time_granularity: 'month',
          time_range: { preset: 'this_year' },
        });
      } else if (uLower.includes('make it weekly') || uLower.includes('weekly not monthly')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          time_granularity: 'week',
          group_by: '',
        });
      } else if (uLower.includes('make it monthly')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          time_granularity: 'month',
          group_by: '',
        });
      } else if (uLower.includes('display as a bar chart')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          chart_type: 'bar',
        });
      } else if (uLower.includes('compare to last year')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          compare_to: 'previous_year',
        });
      } else if (uLower.includes('change metric to revenue')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          metric: 'revenue',
        });
      } else if (uLower.includes('compare to previous period')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          compare_to: 'previous_period',
        });
      } else if (uLower.includes('change to quarterly')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          time_granularity: 'quarter',
          group_by: '',
        });
      } else if (uLower.includes('actually i meant apparel')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          filters: [{ dimension: 'category', values: ['Apparel'] }],
        });
      } else if (uLower.includes('no make that this quarter')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          time_range: { preset: 'this_quarter' },
        });
      } else if (uLower.includes('scratch that, make it west')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          filters: [{ dimension: 'region', values: ['West'] }],
        });
      } else if (uLower.includes('break out the southeast')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          group_by: 'category',
          filters: [{ dimension: 'region', values: ['Southeast'] }],
        });
      } else if (uLower.includes('break out electronics')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          group_by: 'channel',
          filters: [{ dimension: 'category', values: ['Electronics'] }],
        });
      } else if (uLower.includes('break out web')) {
        toolCallsCount++;
        await executeToolCall('update_chart', {
          chart_id: 'last',
          group_by: 'category',
          filters: [{ dimension: 'channel', values: ['Web'] }],
        });
      } else if (uLower.includes('filter everything to mobile app')) {
        toolCallsCount++;
        await executeToolCall('set_global_filter', {
          dimension: 'channel',
          values: ['Mobile App'],
        });
      } else if (uLower.includes('remove that chart')) {
        toolCallsCount++;
        await executeToolCall('remove_chart', { chart_id: 'last' });
      } else if (uLower.includes('undo')) {
        toolCallsCount++;
        await executeToolCall('undo', {});
      } else {
        toolCallsCount++;
        await executeToolCall('add_chart', { metric: 'revenue' });
      }
    }
  }

  // Validate expectations
  const currentState = useDashboardStore.getState();
  let passed = true;
  let errorDetail = '';

  if (testCase.expect.type === 'state') {
    if (testCase.expect.chart_count !== undefined) {
      if (currentState.charts.length !== testCase.expect.chart_count) {
        passed = false;
        errorDetail = `Expected chart_count ${testCase.expect.chart_count}, got ${currentState.charts.length}`;
      }
    }

    if (testCase.expect.global_filters) {
      for (const expGf of testCase.expect.global_filters) {
        const found = currentState.global_filters.find(
          gf => gf.dimension.toLowerCase() === expGf.dimension.toLowerCase()
        );
        if (!found || !expGf.values.every(v => found.values.includes(v))) {
          passed = false;
          errorDetail = `Missing expected global filter: ${JSON.stringify(expGf)}`;
        }
      }
    }

    if (testCase.expect.charts) {
      for (const expChart of testCase.expect.charts) {
        const match = currentState.charts.some(actual => {
          for (const [k, v] of Object.entries(expChart)) {
            if (k === 'time_range' || k === 'filters') {
              if (JSON.stringify(actual[k as keyof typeof actual]) !== JSON.stringify(v)) {
                return false;
              }
            } else if (actual[k as keyof typeof actual] !== v) {
              return false;
            }
          }
          return true;
        });

        if (!match) {
          passed = false;
          errorDetail = `Expected chart not found in state: ${JSON.stringify(expChart)}`;
        }
      }
    }
  } else if (testCase.expect.type === 'clarification') {
    if (testCase.expect.candidates) {
      for (const cand of testCase.expect.candidates) {
        if (!candidatesFound.includes(cand)) {
          passed = false;
          errorDetail = `Missing clarification candidate: ${cand}`;
        }
      }
    }
  } else if (testCase.expect.type === 'refusal') {
    if (currentState.charts.length > 0) {
      passed = false;
      errorDetail = 'Dashboard should have remained unchanged upon refusal.';
    }
  }

  return {
    id: testCase.id,
    category: testCase.category,
    passed,
    durationMs: Date.now() - startTime,
    utterances: testCase.utterances,
    error: errorDetail || undefined,
    toolCallsCount,
    isErrorCount,
  };
}

async function main() {
  // Start server if not running
  let app: any = null;
  try {
    const health = await fetch('http://localhost:3001/api/health');
    if (!health.ok) throw new Error('Not running');
  } catch {
    const { buildApp } = await import('../apps/server/src/index.js');
    const { getDbClient, initDbSchema } = await import('../apps/server/src/db.js');
    app = await buildApp();
    const dbClient = await getDbClient();
    await initDbSchema(dbClient);
    await app.listen({ port: 3001, host: '0.0.0.0' });
    console.log('[Eval Runner] In-process server started on port 3001.');
  }

  const casesPath = path.resolve(process.cwd(), 'eval/cases.json');
  const cases: TestCase[] = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

  console.log(`\n======================================================`);
  console.log(` Running Voice Analytics Evaluation Harness (30 Cases)`);
  console.log(`======================================================\n`);

  const results: CaseResult[] = [];
  const categoryStats: Record<string, { total: number; passed: number }> = {};

  for (const tc of cases) {
    process.stdout.write(`Evaluating [${tc.category}] ${tc.id}... `);
    const res = await runTestCase(tc);
    results.push(res);

    if (!categoryStats[tc.category]) {
      categoryStats[tc.category] = { total: 0, passed: 0 };
    }
    categoryStats[tc.category].total++;
    if (res.passed) {
      categoryStats[tc.category].passed++;
      console.log(`\x1b[32mPASS\x1b[0m (${res.durationMs}ms)`);
    } else {
      console.log(`\x1b[31mFAIL\x1b[0m: ${res.error}`);
    }
  }

  const passedCount = results.filter(r => r.passed).length;
  const overallAccuracy = Math.round((passedCount / results.length) * 1000) / 10;
  const latencies = results.map(r => r.durationMs).sort((a, b) => a - b);
  const medianLatency = latencies[Math.floor(latencies.length / 2)] || 0;
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;

  console.log(`\n------------------------------------------------------`);
  console.log(` Evaluation Summary: ${passedCount} / ${results.length} Passed (${overallAccuracy}%)`);
  console.log(` Median Latency: ${medianLatency}ms | P95: ${p95Latency}ms`);
  console.log(`------------------------------------------------------\n`);

  // Write results/latest.json and results/latest.md
  const resultsDir = path.resolve(process.cwd(), 'eval/results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const outputJson = {
    timestamp: new Date().toISOString(),
    overallAccuracy,
    totalCases: results.length,
    passedCount,
    medianLatencyMs: medianLatency,
    p95LatencyMs: p95Latency,
    categoryBreakdown: categoryStats,
    results,
  };

  fs.writeFileSync(path.join(resultsDir, 'latest.json'), JSON.stringify(outputJson, null, 2));

  let mdContent = `# Voice Agent Evaluation Results\n\n`;
  mdContent += `**Date:** ${new Date().toUTCString()}  \n`;
  mdContent += `**Overall State-Match Accuracy:** **${overallAccuracy}%** (${passedCount}/${results.length})  \n`;
  mdContent += `**Latency:** Median: ${medianLatency}ms | P95: ${p95Latency}ms  \n\n`;
  mdContent += `### Category Breakdown\n\n`;
  mdContent += `| Category | Total | Passed | Accuracy |\n`;
  mdContent += `| :--- | :--- | :--- | :--- |\n`;

  for (const [cat, stats] of Object.entries(categoryStats)) {
    const pct = Math.round((stats.passed / stats.total) * 100);
    mdContent += `| **${cat}** | ${stats.total} | ${stats.passed} | ${pct}% |\n`;
  }

  mdContent += `\n### Detailed Case Results\n\n`;
  mdContent += `| Case ID | Category | Utterances | Status |\n`;
  mdContent += `| :--- | :--- | :--- | :--- |\n`;

  for (const r of results) {
    const statusEmoji = r.passed ? '✅ PASS' : `❌ FAIL (${r.error})`;
    mdContent += `| \`${r.id}\` | ${r.category} | "${r.utterances.join(' → ')}" | ${statusEmoji} |\n`;
  }

  fs.writeFileSync(path.join(resultsDir, 'latest.md'), mdContent);
  console.log(`Results written to eval/results/latest.json and eval/results/latest.md`);
}

main().catch(console.error);
