# Voice-Built Dashboards: Implementation Plan (for Claude Code)

**Project:** "Talk to your data." A user speaks; charts appear, filter, and rearrange on a live dashboard. Built for the AssemblyAI Voice Agent Hackathon (lablab.ai), submission deadline **Sep 30, 2026, 8:30 PM IST**.

**How to use this file:** Put it at the repo root as `PLAN.md`. Work phase by phase, in order. Do not start a phase until the previous phase's acceptance checks pass. Commit after each phase with message `phase N: <title>`.

---

## 0. Rules for Claude Code

1. **Every decision is already made in section 1.** Do not substitute libraries or change architecture. If something is genuinely missing, choose the simplest option, record it in `DECISIONS.md`, and continue.
2. **Do not invent AssemblyAI API details.** Section 5 lists the protocol as verified from the docs. For anything not listed, read the docs: index at `https://assemblyai.com/docs/llms.txt`, Voice Agent API at `https://www.assemblyai.com/docs/voice-agents/voice-agent-api`, events at `https://www.assemblyai.com/docs/voice-agents/voice-agent-api/events-reference`.
3. **Never let the LLM produce SQL.** The LLM only produces structured tool arguments. SQL is compiled by our code from an allowlisted semantic layer.
4. **Write tests as you go.** Each phase lists required tests. Run `pnpm test` before each commit.
5. **Package versions:** install latest stable at setup time, then commit the lockfile. Pin the Node version to 22 LTS in `.nvmrc` and `engines`.
6. **Language:** TypeScript everywhere, `strict: true`. No `any` without a comment explaining why.
7. **License:** MIT (`LICENSE` file at root). The hackathon requires an MIT-compliant, public repo.

---

## 1. Decisions (locked)

| Area               | Decision                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Voice              | AssemblyAI **Voice Agent API** (single WebSocket, speech-to-speech, tool calling). **Browser connects directly** to AssemblyAI using a short-lived token minted by our server.                       |
| Voice model config | Inline config via `session.update` (no stored agent), voice `ivy`.                                                                                                                                   |
| Tool execution     | **Client-side tools**: the browser receives `tool.call`, executes it (state change locally, data via our REST API), returns `tool.result`.                                                           |
| Runtime            | Node 22 LTS, npm workspaces                                                                                                                                                                          |
| Backend            | Fastify 5, zod, `pg` (node-postgres), `yaml`                                                                                                                                                         |
| Frontend           | React 18 + Vite + TypeScript, Tailwind CSS, Zustand (state), Recharts (charts), framer-motion (animation)                                                                                            |
| Database           | PostgreSQL 16 in Docker Compose                                                                                                                                                                      |
| Semantic layer     | Own YAML file + TypeScript compiler (no Cube/dbt)                                                                                                                                                    |
| Chart spec         | Own neutral `ChartSpec` (zod), rendered with Recharts, exportable to Vega-Lite JSON and to Metabase                                                                                                  |
| BI adapter         | **Metabase** (native-SQL cards via REST API), run in Docker Compose                                                                                                                                  |
| Tests              | Vitest (unit + integration). Playwright is **not** used.                                                                                                                                             |
| Deploy             | One Docker image (Fastify serves API + built frontend) on **Railway** with a Railway Postgres plugin. Metabase is local-only (demo video); the export button is hidden when `METABASE_URL` is unset. |
| Dashboard state    | Lives in the browser (Zustand). The server is stateless except for the database.                                                                                                                     |
| Demo data "today"  | Fixed by `AS_OF_DATE=2026-09-29` so demos and evals are deterministic.                                                                                                                               |

---

## 2. Repository layout

```
/
├─ PLAN.md  DECISIONS.md  README.md  LICENSE  .nvmrc  .env.example
├─ docker-compose.yml            # postgres, metabase
├─ Dockerfile                    # production image
├─ pnpm-workspace.yaml  package.json  tsconfig.base.json
├─ db/
│  ├─ init.sql                   # schema, view, read-only role
│  └─ seed.ts                    # deterministic data generator
├─ semantic/
│  └─ semantic.yaml              # metrics, dimensions, synonyms
├─ packages/shared/              # zod schemas + types shared by web/server/eval
│  └─ src/{semantic.ts, query.ts, chart.ts, dashboard.ts, tools.ts, index.ts}
├─ apps/server/
│  └─ src/{index.ts, config.ts, db.ts, semantic/{load.ts,resolve.ts,compile.ts,time.ts,insight.ts},
│          routes/{schema.ts,query.ts,token.ts,export.ts}, adapters/metabase.ts, prompt.ts}
├─ apps/web/
│  └─ src/{main.tsx, App.tsx, store/dashboard.ts, voice/{client.ts,audio-in.ts,audio-out.ts,
│          worklets/*.js}, tools/handlers.ts, components/*, lib/api.ts}
├─ eval/
│  ├─ cases.json                 # 30 test conversations
│  ├─ run.ts                     # runner
│  └─ results/                   # generated
├─ scripts/metabase-bootstrap.ts
└─ docs/{architecture.md, video-script.md, slides-outline.md}
```

`packages/shared` is imported as `@vd/shared`. Server is `@vd/server`, web is `@vd/web`.

---

## 3. Environment variables (`.env.example`)

```
ASSEMBLYAI_API_KEY=            # required, server + eval only. NEVER sent to the browser.
DATABASE_URL=postgres://postgres:postgres@localhost:5432/analytics      # admin, used by seed only
DATABASE_URL_RO=postgres://voice_ro:voice_ro@localhost:5432/analytics   # read-only, used by server
AS_OF_DATE=2026-09-29
PORT=3001
METABASE_URL=                  # e.g. http://localhost:3000 ; empty disables export
METABASE_USER=admin@example.com
METABASE_PASSWORD=ChangeMe-12345
METABASE_DB_ID=                # written by scripts/metabase-bootstrap.ts
```

`config.ts` validates these with zod at startup and fails fast with a readable error.

---

## 4. Data and semantic layer

### 4.1 Database (`db/init.sql`)

One table at **order grain** plus one view. The semantic layer only ever references the view.

```sql
CREATE SCHEMA analytics;
CREATE TABLE analytics.orders_raw (
  order_id     bigint PRIMARY KEY,
  order_date   date NOT NULL,
  customer_id  int  NOT NULL,
  region       text NOT NULL,   -- Northeast, Southeast, Southwest, Midwest, West
  category     text NOT NULL,   -- Electronics, Apparel, Home, Beauty, Sports, Grocery, Toys, Books
  channel      text NOT NULL,   -- Web, Mobile App, Retail Store, Marketplace
  units        int  NOT NULL,
  amount       numeric(12,2) NOT NULL
);
CREATE INDEX ON analytics.orders_raw (order_date);
CREATE VIEW analytics.fact_orders AS SELECT * FROM analytics.orders_raw;

CREATE ROLE voice_ro LOGIN PASSWORD 'voice_ro';
GRANT USAGE ON SCHEMA analytics TO voice_ro;
GRANT SELECT ON analytics.fact_orders TO voice_ro;   -- view only, not the raw table
ALTER ROLE voice_ro SET statement_timeout = '5s';
```

### 4.2 Seed (`db/seed.ts`)

- Deterministic PRNG (mulberry32, seed `42`). Range **2025-01-01 to 2026-09-28**, about 150,000 orders, 5,000 customers. Load with `COPY` for speed.
- Weights: West largest region overall, Midwest smallest; Electronics largest category; weekly seasonality (weekends higher for Retail Store and Apparel).
- **Planted story (required, used in the demo):**
  1. Southeast revenue Q3 2026 is **+10% to +14%** vs Q3 2025, with a visible spike in **August 2026**.
  2. Midwest has a clear revenue dip in **June 2026** (about -20% vs May).
  3. Electronics revenue grows steadily month over month through 2026.
- `pnpm db:seed` is idempotent (truncate then reload). `seed.test.ts` asserts (1) and (2) with the numeric bounds above.

### 4.3 Semantic layer (`semantic/semantic.yaml`)

```yaml
source: analytics.fact_orders
time_column: order_date
metrics:
  revenue:
    {
      label: Revenue,
      sql: "SUM(amount)",
      format: currency,
      synonyms: [sales, income, turnover],
    }
  orders:
    {
      label: Orders,
      sql: "COUNT(*)",
      format: integer,
      synonyms: [order count, transactions],
    }
  aov:
    {
      label: Average order value,
      sql: "SUM(amount)/NULLIF(COUNT(*),0)",
      format: currency,
      synonyms: [average order, basket size, ticket size],
    }
  customers:
    {
      label: Unique customers,
      sql: "COUNT(DISTINCT customer_id)",
      format: integer,
      synonyms: [buyers, shoppers],
    }
  units:
    {
      label: Units sold,
      sql: "SUM(units)",
      format: integer,
      synonyms: [volume, items sold],
    }
dimensions:
  region:
    {
      label: Region,
      column: region,
      values: [Northeast, Southeast, Southwest, Midwest, West],
      synonyms:
        {
          Northeast: [NE, north east],
          Southeast: [SE, south east],
          Southwest: [SW, south west],
          Midwest: [mid west, MW],
          West: [western],
        },
    }
  category:
    {
      label: Category,
      column: category,
      values:
        [Electronics, Apparel, Home, Beauty, Sports, Grocery, Toys, Books],
    }
  channel:
    {
      label: Channel,
      column: channel,
      values: [Web, Mobile App, Retail Store, Marketplace],
      synonyms:
        {
          "Mobile App": [app, mobile],
          "Retail Store": [store, retail, in-store],
          Web: [website, online],
        },
    }
granularities: [day, week, month, quarter]
default_breakout_order: [category, channel, region] # used by the "break out" rule (section 7.3)
```

Server loads and validates this at startup (zod schema in `@vd/shared/semantic.ts`). All identifiers used in SQL come **only** from this file.

---

## 5. AssemblyAI Voice Agent API: protocol reference (verified from docs)

- **Endpoint:** `wss://agents.assemblyai.com/v1/ws`
- **Auth from a server:** `Authorization: Bearer <API_KEY>` header on the upgrade request.
- **Auth from a browser (our case):** browsers cannot set WebSocket headers. The server mints a one-time token (`GET https://agents.assemblyai.com/v1/token?expires_in_seconds=600` with `Authorization: Bearer <API_KEY>`), and the browser connects to `wss://agents.assemblyai.com/v1/ws?token=<token>`. **Fetch a fresh token immediately before every connection attempt.** If the token call returns 401, check the "Browser integration" page via `llms.txt` and adjust the header format there.
- **Handshake:** connect, send `session.update` immediately, wait for `session.ready` (save `session_id`), and only then send `input.audio`.
- **Audio:** PCM16, mono, **24 kHz**, base64. Send at real-time speed (streaming faster errors with `audio_rate_violation`). Output `reply.audio` is also PCM16 24 kHz.
- **Client to server events:** `session.update`, `input.audio`, `tool.result`, `reply.create`, `conversation.message`, `session.resume`, `session.end`.
- **Server to client events:** `session.ready`, `session.updated`, `input.speech.started`, `input.speech.stopped`, `transcript.user.delta` (full text so far; **replace, do not append**), `transcript.user`, `reply.started`, `reply.audio`, `transcript.agent.delta`, `transcript.agent` (has `interrupted`), `reply.done` (`status`: `completed` or `interrupted`), `tool.call`, `session.error`, `session.ended`.
- **Tool definition format (flat):**
  ```json
  {
    "type": "function",
    "name": "add_chart",
    "description": "...",
    "parameters": { "type": "object", "properties": {}, "required": [] }
  }
  ```
- **Tool call flow:** server sends `tool.call` `{call_id, name, arguments (object)}`, then `reply.done`. **Send `tool.result` only after `reply.done` arrives**, as `{type:"tool.result", call_id, result: "<JSON string>", is_error: false}`. Accumulate results on `tool.call` and drain them inside the `reply.done` handler. The agent then produces a follow-up reply.
- **Interruption:** on `reply.done` with `status:"interrupted"`: flush the playback buffer, **discard pending `tool.result` accumulators for that reply**, restart the playback stream.
- **Mutability:** `system_prompt` and `tools` can change mid-session. `greeting`, `output.voice`, `output.format` are immutable after the first `session.update`.
- **Reconnect:** `session.resume` with the saved `session_id` within 30 seconds of a drop. If it errors with `session_not_found`/`session_forbidden`/`session_expired`, start fresh.
- **End:** send `session.end` (stops billing immediately) rather than only closing the socket.
- **Text injection (used by text box and eval):** send `conversation.message` `{role:"user", content}` then `reply.create`.
- **Retryable errors:** `at_capacity`, `concurrency_exceeded`, `internal_error` (reconnect with backoff, fresh token). All others are fatal: show the message in the UI.

---

## 6. Shared schemas (`packages/shared`)

Define with zod and export inferred types.

```ts
TimeRange = one of:
  { preset: 'last_7_days'|'last_30_days'|'last_90_days'|'this_month'|'last_month'|
            'this_quarter'|'last_quarter'|'this_year'|'last_year'|'year_to_date' }
| { quarter: 1|2|3|4, year: number }
| { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }   // end inclusive in the API, converted to exclusive in SQL

Filter = { dimension: string, values: string[] }          // values are raw spoken names, resolved server-side

QueryRequest = {
  metric: string,
  group_by?: string,                       // a dimension id (never a time dimension)
  time_granularity?: 'day'|'week'|'month'|'quarter',   // present => time series on x axis
  time_range: TimeRange,
  filters: Filter[],
  compare_to: 'none'|'previous_period'|'previous_year'
}

ChartType = 'bar'|'line'|'area'|'stacked_bar'|'donut'
ChartSpec = QueryRequest & { id: string, title: string, chart_type: ChartType }   // id like "c1","c2",...

DashboardState = { charts: ChartSpec[], global_filters: Filter[], last_touched: string|null, as_of: string }
```

**Auto chart type** (when the agent does not specify): time series (has `time_granularity`) means `line`; otherwise categorical means `bar`; a single-value request (no group, no granularity) means `bar` with one bar. `donut` only if requested; `stacked_bar` and `area` only if requested.

**Effective query for a chart** = its own `filters` merged with `global_filters` (same dimension: chart's own filter wins).

---

## 7. Server (`apps/server`)

### 7.1 Routes

| Route                       | Purpose                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `GET /api/schema`           | Returns metrics (id, label, synonyms), dimensions (id, label, values), granularities, `as_of`.                |
| `POST /api/query`           | Body `QueryRequest`. Returns `QueryResult` (below) or a structured error.                                     |
| `GET /api/voice-token`      | Mints AssemblyAI browser token (section 5). Returns `{ token, ws_url_base }`. Rate limit: 10/min/IP.          |
| `POST /api/export/metabase` | Body `{ dashboard_title, charts: ChartSpec[] }`. Returns `{ url }`. Returns 404 when `METABASE_URL` is unset. |
| `GET /api/health`           | `{ ok: true }`.                                                                                               |

In production Fastify also serves `apps/web/dist` at `/`.

### 7.2 Query pipeline (`semantic/*`)

1. **Validate** with zod. Unknown metric: `{ ok:false, error_code:'unknown_metric', message, available:[metric ids] }`.
2. **Resolve filter values** (`resolve.ts`) per dimension. Normalize lowercase and trim; try exact match on value or synonym; else substring/prefix match on values and synonyms.
   - Exactly one candidate: resolved.
   - More than one: return `{ ok:false, error_code:'ambiguous_value', dimension, input, candidates:[...] }`. **This is not `is_error`**; it is a normal result the agent must speak about.
   - Zero: `{ ok:false, error_code:'value_not_found', dimension, input, valid_values:[...] }`.
   - Example: input `"south"` matches both Southeast and Southwest, so it is ambiguous.
3. **Resolve time** (`time.ts`) using `AS_OF_DATE` as today. Output `{start, end_exclusive}`. Rules: `this_month` is the calendar month containing as-of; `last_month` the one before; `this_quarter`/`last_quarter` are calendar quarters; `this_year` starts Jan 1; `year_to_date` is Jan 1 to as-of inclusive; `last_N_days` ends at as-of inclusive. Weeks start Monday (Postgres default).
4. **Reject unsupported combos:** `compare_to != 'none'` together with **both** `group_by` and `time_granularity` returns `{ ok:false, error_code:'unsupported_combination', message:'Comparison works with either a breakdown or a time series, not both.' }`.
5. **Compile SQL** (`compile.ts`). Parameterized; identifiers only from YAML.
   ```sql
   SELECT date_trunc('month', order_date)::date AS period,   -- only when time_granularity
          region AS grp,                                      -- only when group_by
          SUM(amount) AS value                                -- metric.sql
   FROM analytics.fact_orders
   WHERE order_date >= $1 AND order_date < $2
     AND region = ANY($3)                                     -- one line per filter
   GROUP BY 1[,2] ORDER BY 1[,2] LIMIT 500
   ```
6. **Comparison:** run a second query over the shifted range (`previous_period` = immediately preceding range of equal length; `previous_year` = same dates minus 1 year). Merge:
   - Categorical (group_by, no granularity): join on group value; add `comparison_value`.
   - Time series (granularity, no group_by): align by **ordinal position** (nth bucket to nth bucket); add `comparison_value`.
   - Single value: one row with `value` and `comparison_value`.
7. **Insight facts** (`insight.ts`), deterministic: `{ total, comparison_total?, delta_pct?, top_group?, top_group_share?, peak_period?, trough_period? }`. For `aov` compute over the whole range using the metric SQL (not by averaging rows).

**Execution safety:** use `DATABASE_URL_RO`, `statement_timeout` 5s, max 500 rows, single statement. Query errors return `{ ok:false, error_code:'query_failed', message:'<safe message>' }` and are logged server-side with full detail.

### 7.3 `QueryResult`

```ts
{
  ok: true,
  columns: ['period'?, 'grp'?, 'value', 'comparison_value'?],
  rows: Array<Record<string, string|number|null>>,
  resolved: { time_range: {start, end_inclusive}, comparison_range?: {...}, filters: Filter[] /* with canonical values */ },
  sql: string,            // human-readable SQL with params inlined, for display only (never executed)
  insight_facts: {...},
  metric: { id, label, format }
}
```

### 7.4 System prompt (`prompt.ts`), final text

Generated at session start; `{{...}}` values come from `/api/schema`.

```
You are a voice analytics assistant that builds a live dashboard while the user talks. Today's date is {{as_of}}.
You have tools that change the dashboard. Never describe numbers you have not received from a tool.

Available metrics: {{metric labels with synonyms}}.
Available dimensions: {{dimension labels}}. Values: {{values per dimension}}.
Time granularities: day, week, month, quarter.

Rules:
1. Act first. When the request is clear, call the tool immediately, then speak one short confirmation. Speak at most two sentences per turn, no lists, never read tables.
2. Follow-ups edit the existing chart. "Make it weekly", "no, weekly not monthly", "as a bar chart", "compare to last year" all call update_chart on the most recently touched chart. Use add_chart only for a new chart. Never rebuild a chart from scratch to change one property.
3. "Break out X" where X is a value of a dimension (e.g. "break out the Southeast"): update the chart to filter that dimension to X, and if the chart is currently grouped by that same dimension, change group_by to the first dimension in this order that is not already used: category, channel, region. Say what you did in one sentence.
4. "Q3" with no year means Q3 of the current year. "Last year" as a comparison means compare_to previous_year. "Last quarter" means the last_quarter preset.
5. If a tool returns ok=false with error_code ambiguous_value, ask the user which of the candidates they mean, naming them. If value_not_found, name two or three valid values. If unknown_metric, say you do not have that metric and offer the closest available one. If unsupported_combination, explain briefly and offer the alternative. Do not retry until the user answers.
6. After a successful chart tool call you receive insight_facts. Give one plain-English insight (e.g. "Southeast is up 12 percent, peaking in August"). Round numbers; use "about". Do not read raw values.
7. If the user corrects themselves or interrupts, drop the old request and act on the new one.
8. If you are unsure what is currently on screen, call get_dashboard_state.
9. Stay in scope: dashboards and this dataset only. For anything else, say briefly that you can only help with the dashboard.
```

Greeting: `"Hi, I'm your data assistant. Ask me for any chart, like revenue by region for this quarter."`

---

## 8. Voice tools (schemas sent in `session.update.tools`)

`metric`, `group_by` and dimension ids use **dynamic enums** built from `/api/schema` at session start. Ten tools total. Chart tools return `insight_facts`; all return a compact JSON string.

| Tool                   | Parameters                                                                                                                                                          | Behavior                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `describe_schema`      | none                                                                                                                                                                | Returns metrics, dimensions, values. For "what can I ask?"                                                                                                                                                                                                             |
| `add_chart`            | `metric` (required), `group_by`, `time_granularity`, `time_range` (default `{preset:"this_year"}`), `filters`, `compare_to` (default `none`), `chart_type`, `title` | Runs query, appends chart, sets `last_touched`. Title auto-generated if omitted (e.g. "Revenue by region, Q3 2026").                                                                                                                                                   |
| `update_chart`         | `chart_id` (default `"last"`), plus any subset of the `add_chart` fields                                                                                            | Present fields **overwrite**. `filters`, if present, **replaces the whole list**. To remove comparison, pass `compare_to:"none"`. To remove grouping pass `group_by:""`. To remove time series pass `time_granularity:""`. Title regenerated unless the user named it. |
| `remove_chart`         | `chart_id` (default `"last"`)                                                                                                                                       | Removes chart.                                                                                                                                                                                                                                                         |
| `set_global_filter`    | `dimension`, `values[]`                                                                                                                                             | Applies to all charts (replace existing for that dimension).                                                                                                                                                                                                           |
| `clear_global_filters` | none                                                                                                                                                                | Clears all.                                                                                                                                                                                                                                                            |
| `undo`                 | none                                                                                                                                                                | Reverts the last state-changing tool call (stack depth 20).                                                                                                                                                                                                            |
| `clear_dashboard`      | none                                                                                                                                                                | Removes all charts and filters (undoable).                                                                                                                                                                                                                             |
| `get_dashboard_state`  | none                                                                                                                                                                | Returns compact list: id, title, metric, group_by, granularity, time_range, filters, compare_to, chart_type.                                                                                                                                                           |
| `export_dashboard`     | `title` (optional)                                                                                                                                                  | Only registered when Metabase is enabled. Pushes to Metabase; returns URL.                                                                                                                                                                                             |

**Tool result JSON shape (success):** `{"ok":true,"chart_id":"c2","title":"...","insight_facts":{...},"dashboard":[{"id":"c1","title":"..."}]}`.
**Failure:** the `{ok:false,error_code,...}` objects from section 7.2. `is_error:true` is set **only** for unexpected exceptions (network failure, 5xx), not for ambiguity or validation outcomes.

`"last"` resolves to `state.last_touched`; if null, return `{ok:false,error_code:'no_chart'}`.

---

## 9. Frontend (`apps/web`)

### 9.1 Layout (desktop first, min width 1100px)

- **Left column (360px):**
  1. State pill: `Idle | Listening | Thinking | Speaking | Interrupted` (driven by events: `input.speech.started` = Listening; `input.speech.stopped` until `reply.started` = Thinking; `reply.started` to `reply.done` = Speaking; `reply.done` with `interrupted` = flashes "Interrupted" for 800ms, then Listening).
  2. Waveform: mic level while Listening, output level while Speaking (AnalyserNode).
  3. Live transcript: user line updates from `transcript.user.delta` (**replace**), finalized on `transcript.user`; agent text from `transcript.agent.delta` words, finalized on `transcript.agent`.
  4. **Tool-call chips log:** one chip per `tool.call` showing name and a short args summary (e.g. `update_chart · granularity: week`), states pending, done, or error (with `error_code`).
  5. Text input (fallback and demo aid): sends `conversation.message` then `reply.create`.
  6. Buttons: Start/Stop (calls `session.end` on stop), Mute mic.
- **Right area:** top bar with global filter chips, Undo, Export to Metabase (hidden if disabled). Below, a 2-column responsive grid of chart cards.
- **Chart card:** title, chart, one-line insight under it, filter chips, "Show SQL" toggle (renders `sql` in a monospace block), delta badge when comparing (green/red arrow with `delta_pct`), `id` badge.
- **Animations (framer-motion):** new card fades and scales in; removed card fades out; a chart updated by voice gets a 800ms accent-colored border pulse and Recharts animation on data change; the changed property's chip (e.g. "Weekly") highlights briefly.
- **Empty state:** centered prompt with three clickable example phrases that use the text input path.

### 9.2 State (`store/dashboard.ts`)

Pure reducer functions (unit tested) for: `addChart`, `updateChart`, `removeChart`, `setGlobalFilter`, `clearGlobalFilters`, `clearDashboard`, `undo`. Each state-changing action pushes the previous state onto a history stack (max 20). Chart data (`QueryResult`) is cached per chart id in a separate map, refetched when the chart or global filters change.

### 9.3 Voice client (`voice/client.ts`)

- `connect()`: fetch `/api/voice-token`, open WebSocket, send `session.update` (system prompt, greeting, `output.voice:"ivy"`, tools, `input.turn_detection` defaults), wait for `session.ready`, start mic streaming.
- **Audio in:** `getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, channelCount:1}})`, `AudioContext({sampleRate:24000})`, AudioWorklet that emits 50 ms frames (1200 samples), converted Float32 to Int16 to base64, sent as `input.audio`.
- **Audio out:** AudioWorklet playback queue (ring buffer). `reply.audio` chunks decoded and enqueued; on interrupted `reply.done` call `flush()`.
- **Tool handling:** on `tool.call`, immediately run the handler (`tools/handlers.ts`), store `{call_id, promise}` in `pending[]`. State mutations apply **immediately**, so the UI updates while the agent is still talking. On `reply.done`: if `interrupted`, clear `pending[]` (mutations already applied stay) and flush audio; else `await Promise.all(pending)`, send one `tool.result` per call, clear `pending[]`.
- **Reconnect:** on unexpected close without `session.ended`, try `session.resume` once within 30s using a fresh token; on failure, start fresh (the dashboard state is kept in the browser; the agent gets a `conversation.message` role `system` summarizing current dashboard state via `get_dashboard_state` format).
- **Errors:** retryable codes retry 3 times with backoff (1s, 2s, 4s); fatal codes display a banner.
- Send `session.end` on Stop and on `beforeunload`.

---

## 10. Phases and acceptance checks

**Phase 1: Scaffold.** pnpm workspace, TS configs, ESLint + Prettier, Vitest, `docker-compose.yml` (postgres:16 + metabase with a pinned tag, chosen as the latest stable at setup time), `.env.example`, `config.ts`.
_Accept:_ `pnpm install && pnpm typecheck && pnpm test` pass; `docker compose up -d postgres` works.

**Phase 2: Database and seed.** `init.sql`, `seed.ts`, `seed.test.ts`.
_Accept:_ `pnpm db:seed` completes under 60s; planted-story assertions pass; `voice_ro` can `SELECT` from `analytics.fact_orders` and **cannot** select from `analytics.orders_raw` or write (tested).

**Phase 3: Semantic layer and query compiler.** Shared schemas, YAML loader, resolver, time resolver, compiler, comparison merge, insight facts.
_Accept (tests):_ at least 25 unit tests including: "south" is ambiguous; "SE" resolves to Southeast; Q3 2026 range is 2026-07-01 to 2026-10-01 exclusive; `previous_year` shift; ordinal alignment for time-series comparison; unsupported combination rejected; SQL injection strings in filter values return `value_not_found` and never reach SQL; identifiers are never taken from request input; golden-file SQL for 5 representative requests.

**Phase 4: Server API.** All routes in 7.1 except export; `/api/query` integration tests against the seeded DB.
_Accept:_ `curl` of "revenue by region, Q3 2026, compare to previous_year" returns Southeast delta between +10% and +14%; a 6s `pg_sleep`-style timeout test returns `query_failed` gracefully.

**Phase 5: Frontend without voice.** Store + reducer tests, layout, chart cards, tool handlers, **text input wired to a local "manual tool console"** (dev-only panel where you can paste tool JSON and run it) so the whole dashboard can be exercised without voice.
_Accept:_ running these tool JSONs in order produces the expected dashboard: (1) add revenue by region this_quarter, (2) update to Southeast filter + group_by category, (3) update granularity week with group_by cleared, (4) compare previous_year, (5) undo twice. Reducer tests cover all actions.

**Phase 6: Voice integration.** `voice/client.ts`, audio worklets, chips, transcript, state pill, text-injection path.
_Accept (manual, record results in `docs/manual-test.md`):_ say "show revenue by region for Q3": chart appears within 3s of finishing the sentence; say "now break out the Southeast": chart filters and regroups by category; say "no, weekly not monthly" after a monthly chart: **same chart id** updates; interrupt the agent mid-sentence: audio stops within 500ms and state pill shows Interrupted; say "show churn": agent says it has no such metric and offers alternatives; say "show the south": agent asks Southeast or Southwest.

**Phase 7: Polish.** Animations, delta badges, SQL toggle, example phrases, reconnect logic, error banners, loading skeletons, keyboard shortcut (Space to mute), dark theme, favicon, page title. Accessibility: chip and button labels, focus rings.
_Accept:_ no console errors during a 5-minute session; layout works at 1100px and 1440px; Lighthouse accessibility score of at least 90.

**Phase 8: Metabase adapter.** `scripts/metabase-bootstrap.ts` (first-run `/api/setup` with admin from env, adds the Postgres database via `/api/database`, writes `METABASE_DB_ID` to `.env`), `adapters/metabase.ts`, export route, export tool, button.
For each chart the adapter creates a **native-SQL card** (`POST /api/card` with `dataset_query.type = "native"`, the compiled SQL with literal values inlined from the already-validated resolved filters, `display` mapped from `chart_type`), then creates a dashboard and attaches the cards. **Verify exact endpoint shapes against the running Metabase instance's own API docs** (it serves them from the app) before coding; endpoint payloads differ across versions. Authenticate with `POST /api/session`, cache the session token in memory.
_Accept:_ say "export this to Metabase": a new Metabase dashboard exists with one card per chart, each card renders data, and the returned URL opens it. Tested by an integration test that is skipped when `METABASE_URL` is unset.

**Phase 9: Evaluation harness.** See section 11.
_Accept:_ `pnpm eval` runs all 30 cases and writes `eval/results/latest.json` and `eval/results/latest.md`; overall state-match accuracy is reported (the target is at least 85%, but report the real number honestly).

**Phase 10: Deploy.** Multi-stage `Dockerfile` (build web, build server, run with `node`). Railway: app service from Dockerfile + Postgres plugin; run `db/init.sql` and seed as a one-off release command; set env vars; `METABASE_URL` unset. Public URL must load, fetch a token, and work over HTTPS (mic requires it).
_Accept:_ the deployed URL completes the Phase 6 manual test from a different device and network.

**Phase 11: Submission assets.** See section 12.

---

## 11. Evaluation harness (`eval/`)

**Purpose:** report measured accuracy as a headline number for the Application of Technology and Business Value criteria.

**Mode A (all 30 cases, automated, no audio):** the runner opens a real Voice Agent session from Node (Bearer header auth, same `session.update` as the browser, generated by shared code), and for each case it sends utterances via `conversation.message` (role `user`) + `reply.create`. It executes tool calls against the **real backend** using the same reducer as the frontend (imported from shared/web logic), obeying the "send `tool.result` after `reply.done`" protocol. A fresh session per case.

**Case format (`cases.json`):**

```json
{
  "id": "followup-weekly-01",
  "category": "correction",
  "utterances": ["show revenue by region for Q3", "no, weekly not monthly"],
  "expect": {
    "type": "state", // "state" | "clarification" | "refusal"
    "charts": [
      {
        "metric": "revenue",
        "time_granularity": "week",
        "time_range": { "quarter": 3, "year": 2026 }
      }
    ]
  }
}
```

- `state` cases: after the last utterance, the final dashboard must **contain** a chart matching every expected field listed (partial match; unlisted fields ignored).
- `clarification` cases: the agent must **not** change the dashboard and its final `transcript.agent` must mention every candidate name (case-insensitive).
- `refusal` cases (unknown metric, off-topic): dashboard unchanged, and the agent transcript must not contain digits.

**Required 30 cases by category:** 8 basic requests (metric, dimension, time range variants), 6 follow-ups/edits (weekly, bar chart, add compare, change metric), 4 corrections ("no, I meant..."), 3 "break out X", 3 ambiguity ("south", "the store"), 3 unknown metric/out-of-scope, 3 global filter/undo/remove.

**Metrics reported:** overall state-match rate; rate per category; median and p95 time from `reply.create` to first `tool.call`; mean tool calls per case; count of `is_error` results (should be 0).
Run each case **once** by default; `--repeat 3` runs three times and reports the pass rate per case to show variance.

**Mode B (optional, manual):** record 8 utterances as WAV (24 kHz mono) with accents/noise, stream as `input.audio` at real time, compare against the same expectations. Report separately as "audio subset". Skip if there is no time; do not fake it.

The README shows the results table.

---

## 12. Submission assets (hackathon checklist)

Required by lablab.ai: project title, short description, long description, technology and category tags, cover image, video presentation, slide presentation, public GitHub repo, demo platform, application URL.

- **Title:** "Talk to Your Data" (subtitle: voice-built dashboards on AssemblyAI).
- **Tags:** AssemblyAI, Voice Agent API, Voice AI, Tool calling, Business Intelligence, PostgreSQL, React, TypeScript.
- **README:** one-line pitch, GIF of the demo, architecture diagram (Mermaid in `docs/architecture.md`), quickstart (`docker compose up`, `pnpm i`, `pnpm db:seed`, `pnpm dev`), eval results table, limitations, MIT license.
- **Video (2 to 3 min), `docs/video-script.md`:** 0:00 to 0:20 cold open: no intro, jump straight into speaking to a blank dashboard ("Show revenue by region for Q3"); 0:20 to 1:10 flow: break out Southeast, "no, weekly not monthly", compare to last year, **interrupt the agent mid-sentence**; 1:10 to 1:30 ambiguity: "show the south" and the clarification; 1:30 to 2:00 "Show SQL" and the tool-call chips, then export to Metabase live; 2:00 to 2:30 architecture slide + eval numbers + the one-line business value; end on the live URL. Screen-record at 1080p with system audio and mic.
- **Slides (`docs/slides-outline.md`), 7 slides:** problem (BI tools need clicks and analyst time); solution (talk to it); demo screenshot; architecture (voice agent, tools, semantic layer, adapters); technology use (turn-taking, barge-in, tool calling, client-side tools, token auth); eval results; business value and roadmap (more connectors: Snowflake, BigQuery, Looker, Power BI).
- **Cover image:** 16:9 screenshot of the dashboard mid-conversation with the tool chips visible.
- **Before submitting:** the live URL works in an incognito window; repo is public; `.env` is not committed; no API key in the frontend bundle (grep the build for the key prefix).

---

## 13. Security and quality checklist (verify at the end)

- API key is only in server env; browser receives only a short-lived token.
- SQL: parameterized values, identifiers from YAML only, read-only role, view-only grant, 5s timeout, 500-row cap.
- `/api/voice-token` is rate limited; CORS restricted to the app origin in production.
- All tool arguments are zod-validated on the server; unknown fields rejected.
- No PII in the dataset; logs never include the API key or tokens.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` all green in CI (add a minimal GitHub Actions workflow).

---

## 14. Out of scope (do not build)

Authentication or multi-user accounts, saved dashboards or persistence beyond the browser session, telephony, connectors other than Postgres and Metabase (mention them only in slides and README as roadmap), mobile layout, custom SQL by voice, forecasting.
