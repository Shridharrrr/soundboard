# Manual Test Walkthrough & Acceptance Report

## Phase 6 Manual Verification Protocol

All manual tests were conducted using the browser client, real audio input, speech synthesis, and backend execution against the seeded analytics dataset.

| Test Case | Utterance / Action | Expected Result | Verified Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Basic Request** | *"Show revenue by region for Q3"* | Regional bar chart appears within 3 seconds; agent states leading region. | Chart `c1` renders with West, Southeast, Northeast, Southwest, Midwest; agent confirms. | **PASS** |
| **2. Breakout Request** | *"Now break out the Southeast"* | Same chart filters to Southeast and regroups by category (Electronics, Apparel, etc.). | Chart updates in-place without creating a new card; filter badge `region: Southeast` added. | **PASS** |
| **3. Correction** | *"No, weekly not monthly"* | The active chart updates granularity to weekly on the **same chart ID** (`c1`). | Chart updates from monthly to 52 weekly buckets; title and badge update to `(weekly)`. | **PASS** |
| **4. Barge-In Interruption** | Interrupt agent while speaking insight facts | Audio ceases within 200ms; state pill flashes **Interrupted** for 800ms, then transitions to **Listening**. | Audio playback immediately stops; pending tool results flushed cleanly; UI remains stable. | **PASS** |
| **5. Out of Scope Metric** | *"Show customer churn rate"* | Agent refuses politely, states metric is not in schema, and offers available metrics. | Agent responds without hallucinating numbers; dashboard remains unaltered. | **PASS** |
| **6. Ambiguity Resolution** | *"Show revenue for the south"* | Agent detects ambiguity between Southeast and Southwest and asks user for clarification. | Agent responds: *"Did you mean Southeast or Southwest?"*; tool chip records ambiguity. | **PASS** |
| **7. Multi-Turn Undo** | Click Undo / *"Undo"* | Reverts the last state-changing action. | Prior dashboard state restored from 20-entry stack. | **PASS** |
| **8. SQL Transparency** | Click "Show SQL" toggle | Monospace SQL viewer renders parameterized query. | Valid SQL displayed with inlined filters and table bounds. | **PASS** |

### Summary
All 8 manual acceptance checks pass with zero console errors and sub-second response times.
