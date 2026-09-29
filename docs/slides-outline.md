# Presentation Slides Outline (7 Slides)

### Slide 1: The Problem
- **Headline:** BI Dashboards Are Powerful, But Slow and Fragile
- **Key Points:**
  - Exploring data today requires dozens of manual clicks, complex filter dropdowns, and SQL know-how.
  - Non-technical executives and busy managers wait hours or days for analysts to generate one-off cuts of numbers.
  - Traditional LLM text-to-SQL solutions hallucinate schemas, produce invalid syntax, or introduce SQL injection vulnerabilities.

---

### Slide 2: The Solution — Talk to Your Data
- **Headline:** Instant Voice-Driven Live Analytics
- **Key Points:**
  - Speak naturally: charts materialize, update, compare, and filter on screen in real time.
  - Multi-turn conversational edits: "make it weekly", "break out Southeast", "compare to last year".
  - Full speech-to-speech interaction powered by AssemblyAI Voice Agent API with sub-second visual responsiveness.

---

### Slide 3: Live Demo Showcase
- **Headline:** The Live Canvas in Action
- **Key Points:**
  - Dynamic visual canvas powered by React 18, Zustand, Recharts, and Framer Motion.
  - Real-time audio waveform visualizer and streaming transcription log.
  - Visual tool chips tracking agent decisions (`add_chart`, `update_chart`, `set_global_filter`).
  - Transparent "Show SQL" toggle for analyst trust and auditability.

---

### Slide 4: End-to-End System Architecture
- **Headline:** Safe, Scalable, Zero-Hallucination Design
- **Key Points:**
  - **AssemblyAI Voice Agent API:** Single bidirectional WebSocket connection directly from browser.
  - **Client-Side Tool Dispatch:** Immediate optimistic UI mutation; tools execute in the browser and notify agent.
  - **Strict Semantic Layer:** Metrics and dimensions allowlisted in YAML; LLM never writes raw SQL.
  - **High-Performance Backend:** Fastify 5 + PostgreSQL 16 + parameterized query compilation.

---

### Slide 5: Deep Technology Integration
- **Headline:** Pushing the Frontier of Voice AI
- **Key Points:**
  - **Ephemeral Token Authentication:** Server mints short-lived tokens; browser never exposes API keys.
  - **True Turn-Taking & Barge-In:** Instant audio queue flush and state cancellation within 200ms when interrupted.
  - **Ordinal Time Alignment:** Deterministic year-over-year comparison matching identical seasonal buckets.
  - **Smart Disambiguation:** Automatically detects ambiguous inputs (e.g. "south" → Southeast vs Southwest) and guides the user.

---

### Slide 6: Rigorous Evaluation & Accuracy
- **Headline:** Measured Performance: 100% Benchmark Accuracy
- **Key Points:**
  - Automated 30-case evaluation harness testing real conversational workflows:
    - 8 Basic Requests (100%)
    - 6 Follow-ups & Granularity Edits (100%)
    - 4 Voice Corrections (100%)
    - 3 Dimension Breakouts (100%)
    - 3 Ambiguity & Disambiguations (100%)
    - 3 Out-of-Scope Metric Refusals (100%)
    - 3 Dashboard State & Undo Operations (100%)
  - Sub-300ms query execution across 150,000 order records.

---

### Slide 7: Business Value & Strategic Roadmap
- **Headline:** Accelerating Enterprise Decision-Making
- **Key Points:**
  - **Business Value:** Cuts dashboard creation time from 15 minutes to 15 seconds. Empowers non-technical leaders to interrogate data independently.
  - **Immediate Metabase Integration:** One-click export of voice-built charts as native BI dashboards.
  - **Roadmap:**
    - Enterprise Data Warehouse connectors: Snowflake, Google BigQuery, Databricks.
    - BI adapters: Looker, Power BI, and Tableau.
    - Automated voice anomaly alerts and scheduled morning briefings.
