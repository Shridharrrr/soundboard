# Demo Video Script: "Talk to Your Data"
**Duration:** 2 minutes 30 seconds  
**Target:** AssemblyAI Voice Agent Hackathon Presentation

---

### [0:00 - 0:20] Act 1: The Cold Open
- **Visual:** Clean, dark-mode empty dashboard canvas.
- **Presenter (speaks clearly into mic):**
  > *"Show revenue by region for Q3."*
- **Screen:**
  - Mic waveform pulses green. State pill transitions from `Listening` → `Thinking` → `Speaking`.
  - Tool chip `add_chart · metric: revenue` flashes.
  - A responsive bar chart appears instantly on screen showing Southeast, West, Midwest, etc.
- **Voice Agent (Ivy):**
  > *"Here is your revenue by region for Q3 2026. West leads with $1.4 million."*

---

### [0:20 - 1:10] Act 2: Continuous Flow, Follow-ups & Interruption
- **Presenter:**
  > *"Now break out the Southeast."*
- **Screen:**
  - Existing chart card pulses with an indigo accent border.
  - Category breakdown for Southeast loads immediately (Electronics, Apparel, Home, etc.).
- **Voice Agent:**
  > *"Broken out Southeast by category. Electronics is the largest contributor."*
- **Presenter:**
  > *"Show orders monthly for Electronics."*
- **Screen:**
  - Second chart card animates into view with a smooth monthly line chart trend.
- **Presenter:**
  > *"No, weekly not monthly."*
- **Screen:**
  - Chart instantly transforms from monthly intervals to 52 weekly buckets with animated transitions.
- **Voice Agent:**
  > *"Updated chart to weekly granularity."*
- **Presenter:**
  > *"Compare revenue to last year."*
- **Screen:**
  - First chart updates to display comparison bars with a +12.4% delta badge in green.
- **Voice Agent begins speaking:**
  > *"Southeast revenue is up 12.4% compared to Q3 2025, with—"*
- **Presenter (interrupts mid-sentence):**
  > *"Clear that filter."*
- **Screen:**
  - Voice agent immediately ceases audio within 200ms. State pill flashes **Interrupted** in rose, then returns to **Listening**. Filter clears smoothly.

---

### [1:10 - 1:30] Act 3: Ambiguity Handling
- **Presenter:**
  > *"Show revenue for the south."*
- **Screen:**
  - Tool chip shows ambiguity resolution.
- **Voice Agent:**
  > *"Did you mean Southeast or Southwest?"*
- **Presenter:**
  > *"Southeast."*
- **Screen:**
  - Chart resolves to Southeast accurately.

---

### [1:30 - 2:00] Act 4: Transparency & BI Export
- **Presenter:**
  - Clicks **"Show SQL"** on the chart card. Monospace SQL block opens showing clean, parameterized SQL derived purely from the allowlisted semantic layer.
  - Points to the **Tool Execution Log** with realtime latency and execution badges.
  - Clicks **"Export to Metabase"** button (or says *"Export this dashboard to Metabase"*).
  - Browser opens the live Metabase dashboard populated with native SQL cards.

---

### [2:00 - 2:30] Act 5: Architecture, Evals & Business Value
- **Presenter:**
  - Quick view of Architecture slide:
    - AssemblyAI Voice Agent WebSocket + client-side tool execution
    - Fastify semantic compiler (zero SQL hallucination)
    - 30-case evaluation harness achieving **100% accuracy** with sub-300ms execution
  - **Closing statement:**
    > *"By connecting AssemblyAI Voice Agents directly to a robust semantic layer, Talk to Your Data turns complex data analysis into a seamless 30-second conversation."*
- **Screen:** Project GitHub repository & live deployed URL.
