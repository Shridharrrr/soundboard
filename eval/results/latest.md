# Voice Agent Evaluation Results

**Date:** Tue, 29 Sep 2026 11:12:14 GMT  
**Overall State-Match Accuracy:** **100%** (30/30)  
**Latency:** Median: 44ms | P95: 97ms  

### Category Breakdown

| Category | Total | Passed | Accuracy |
| :--- | :--- | :--- | :--- |
| **basic** | 8 | 8 | 100% |
| **edit** | 6 | 6 | 100% |
| **correction** | 4 | 4 | 100% |
| **breakout** | 3 | 3 | 100% |
| **ambiguity** | 3 | 3 | 100% |
| **unknown_metric** | 3 | 3 | 100% |
| **control** | 3 | 3 | 100% |

### Detailed Case Results

| Case ID | Category | Utterances | Status |
| :--- | :--- | :--- | :--- |
| `basic-01` | basic | "show revenue by region for Q3" | ✅ PASS |
| `basic-02` | basic | "show orders monthly for Electronics" | ✅ PASS |
| `basic-03` | basic | "average order value by channel this year" | ✅ PASS |
| `basic-04` | basic | "how many unique customers in the West last month" | ✅ PASS |
| `basic-05` | basic | "units sold daily for the last 7 days" | ✅ PASS |
| `basic-06` | basic | "revenue by category for Q2 2026" | ✅ PASS |
| `basic-07` | basic | "show orders by channel for this month" | ✅ PASS |
| `basic-08` | basic | "total sales year to date" | ✅ PASS |
| `edit-01` | edit | "show revenue by region for Q3 → make it weekly" | ✅ PASS |
| `edit-02` | edit | "show revenue monthly for this year → display as a bar chart" | ✅ PASS |
| `edit-03` | edit | "revenue by region for this quarter → compare to last year" | ✅ PASS |
| `edit-04` | edit | "show orders by region this year → change metric to revenue" | ✅ PASS |
| `edit-05` | edit | "revenue by category this month → compare to previous period" | ✅ PASS |
| `edit-06` | edit | "orders by channel this year → change to quarterly" | ✅ PASS |
| `correction-01` | correction | "show revenue by region for Q3 → no, weekly not monthly" | ✅ PASS |
| `correction-02` | correction | "show orders for Electronics → actually I meant Apparel" | ✅ PASS |
| `correction-03` | correction | "revenue by category for last quarter → no make that this quarter" | ✅ PASS |
| `correction-04` | correction | "units sold in the Midwest → scratch that, make it West" | ✅ PASS |
| `breakout-01` | breakout | "show revenue by region for Q3 → break out the Southeast" | ✅ PASS |
| `breakout-02` | breakout | "revenue by category this year → break out Electronics" | ✅ PASS |
| `breakout-03` | breakout | "orders by channel this month → break out Web" | ✅ PASS |
| `ambiguity-01` | ambiguity | "show revenue for the south" | ✅ PASS |
| `ambiguity-02` | ambiguity | "show orders in the store" | ✅ PASS |
| `ambiguity-03` | ambiguity | "revenue for east" | ✅ PASS |
| `unknown-01` | unknown_metric | "what is our customer churn rate this quarter" | ✅ PASS |
| `unknown-02` | unknown_metric | "calculate gross profit margin for Electronics" | ✅ PASS |
| `unknown-03` | unknown_metric | "what is the weather like in New York today" | ✅ PASS |
| `control-01` | control | "show revenue by region → filter everything to Mobile App" | ✅ PASS |
| `control-02` | control | "show revenue by region → now remove that chart" | ✅ PASS |
| `control-03` | control | "show revenue by region → make it monthly → undo" | ✅ PASS |
