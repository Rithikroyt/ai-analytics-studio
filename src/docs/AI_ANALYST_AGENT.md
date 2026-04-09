# AI Analyst Agent — Grounded Data Analytics AI

## Overview

The AI Analyst Agent is a **senior data analyst** that understands your data, explains trends, detects anomalies, forecasts outcomes, and recommends actions. Unlike a generic chatbot, it provides **grounded, evidence-based answers** with confidence levels and clear limitations.

---

## Agent Architecture

### 1. **Agent Configuration** (`agents/ai-analyst.json`)

Defines:
- **17 tools** for data analysis and reasoning
- **Structured workflow** (intent detection → context loading → tool selection → analysis → recommendations)
- **Mandatory response format** (answer → insights → evidence → root cause → actions → confidence)
- **Critical rules** (no blank fallbacks, always provide grounded answers)

### 2. **Tool Orchestration** (`lib/analystTools.js`)

Helper functions that structure analysis outputs into tool responses:

| Tool | Purpose |
|------|---------|
| `buildKPISummary()` | Primary/secondary KPIs, growth %, anomalies, quality score |
| `buildDescriptiveStory()` | What happened, why, where risk is, what to do |
| `buildQualityAudit()` | Missing values, duplicates, quality issues, fixes |
| `buildAnomalyResults()` | Detected anomalies, severity breakdown, business impact |
| `buildForecastResults()` | Trend direction, confidence band, key insight |
| `buildStatisticalInsights()` | Correlations, t-tests, significance explanations |
| `buildChartSpec()` | Generates relevant chart (line, bar, scatter, etc.) |
| `buildRecommendations()` | Prioritized next-step actions by impact |
| `assessConfidence()` | Overall confidence %, limiting factors |

### 3. **UI Components** (`components/workspace/analyst/AnalystUIComponents.jsx`)

- **StructuredResponse**: Renders expandable sections (Answer → Insights → Evidence → Actions → Confidence)
- **ThinkingIndicator**: Shows agent reasoning progress with step counter

---

## Agent Workflow

For **every question**, the agent follows this sequence:

### STEP 1: Intent Detection
Classify the question:
- KPI summary ("What's our primary metric?")
- Trend explanation ("Why did revenue drop?")
- Anomaly ("What's abnormal?")
- Forecast ("What's next month's forecast?")
- Data quality ("What's wrong with the data?")
- Statistical ("Is the difference significant?")
- SQL / Query ("Compare segments")
- Chart request ("Show me a chart")
- Recommendation ("What should we do?")
- Report ("Generate a memo")

### STEP 2: Context Loading
Load from workspace:
- Dataset name, row count, column profiles
- Selected KPI, date column
- Available analysis outputs
- Data quality score
- Uploaded context documents

### STEP 3: Tool Selection
Choose the right tools based on intent. Example:
- "Why did X change?" → `buildDescriptiveStory()` + `buildAnomalyResults()`
- "Is there missing data?" → `buildQualityAudit()`
- "What's the forecast?" → `buildForecastResults()`
- "Show a chart" → `buildChartSpec()` + chart render

### STEP 4: Analysis Retrieval
Execute or retrieve outputs from:
- Pre-computed KPI summary
- Descriptive analysis (from AnalystSection)
- Anomaly detection results
- Forecast data
- Statistical test results
- SQL query results
- Quality audit findings
- Evidence documents

### STEP 5: Chart Support
If user asks for a chart OR if a chart improves clarity:
- Generate chart spec (line, bar, scatter, donut, etc.)
- Include in response inline
- Label with title and interpretation

### STEP 6: Recommendation Synthesis
For analytical/diagnostic questions, provide:
- Likely cause or driver
- Business/operational impact
- 2-3 specific next-step actions, prioritized by impact and urgency
- Effort estimate where relevant

### STEP 7: Confidence & Limitations
Always state:
- Overall confidence %, with range 30-95%
- What is known (from data) vs inferred (from model)
- Data quality issues that reduce confidence
- What additional analysis would improve the answer

---

## Response Format (Mandatory)

Every answer must use this structure:

```
1. DIRECT ANSWER
   Brief, 1-2 sentence answer to the question

2. KEY INSIGHTS
   • 3-4 bullet points of important findings
   • Specific numbers from the data
   • Callouts of surprises or concerns

3. SUPPORTING EVIDENCE
   Specific data points, SQL results, or quoted evidence
   Example: "Q3 revenue was $45K, up 12% YoY"

4. CHART RECOMMENDATION or CHART RENDERED
   If helpful: chart spec or inline visual

5. ROOT CAUSE / INTERPRETATION
   Why did this happen?
   What does it mean operationally?

6. RECOMMENDED ACTIONS
   [CRITICAL] 2-3 specific, prioritized next steps
   • Top priority action
   • Secondary action
   • Follow-up investigation

7. CONFIDENCE & LIMITATIONS
   Confidence: 75%
   Limitations:
   - Data quality 68% may affect forecasts
   - Missing date column → no seasonality analysis
```

---

## Supported Question Types

### KPI & Overview
- "Give me a board summary"
- "What's our primary KPI?"
- "Show me the top performers"
- "What are the key metrics?"

### Trends & Changes
- "What changed this month?"
- "Why did revenue drop?"
- "Show me the trend"
- "Is growth accelerating?"

### Anomalies & Issues
- "Explain the anomalies"
- "What's abnormal in the data?"
- "Why is segment X underperforming?"
- "Are there data quality issues?"

### Data Quality
- "What missing values are affecting analysis?"
- "Which columns have bad data?"
- "How reliable is this analysis?"
- "What data should we clean?"

### Forecasting
- "What does the forecast suggest?"
- "What's next month's revenue?"
- "Is the trend sustainable?"

### Statistical
- "Is the difference significant?"
- "Are these variables correlated?"
- "Which segment performs best?"

### Segmentation & Comparison
- "Compare campus performance"
- "Show revenue by region"
- "Rank segments by growth"
- "Which group needs intervention?"

### SQL / Query-Like
- "Show top 10 segments"
- "Break down by category"
- "Rank by completion rate"

### Charts & Visuals
- "Show me a chart for satisfaction by course"
- "Visualize the trend"
- "Create a breakdown chart"

### Reports & Recommendations
- "Generate an executive memo"
- "Create a board summary"
- "What should we focus on?"
- "Give me top 3 recommendations"

---

## Example: Agent Response

**User:** "Why did completion rate drop last month?"

**Agent Response:**

**1. Direct Answer**
Completion rate dropped 8% last month (from 82% to 75%) primarily due to increased course load and reduced support resources.

**2. Key Insights**
• Completion rate fell 8 percentage points (82% → 75%) in the most recent period
• Drop was concentrated in 3 courses (Biology, Chemistry, Physics), which went from 88% → 77% average
• Support ticket response time increased 34%, correlating with the drop (r=0.76)
• Overall enrollment is up 12%, but support staff headcount flat

**3. Supporting Evidence**
- Q3 completion rate: 82% | Q4 completion rate: 75% (delta: -8%)
- Affected courses: Biology (-11%), Chemistry (-9%), Physics (-7%)
- Support response time: 4h → 5.4h (34% increase)
- Staff utilization: 87% (prev: 71%)

**[CHART: Line chart showing completion trend by course over 12 months, with support response time as reference line]**

**4. Root Cause / Interpretation**
The drop is driven by capacity strain: enrollment surged 12% but support team is unchanged. This longer response time correlates strongly with abandonment. Course difficulty hasn't changed; it's a support bottleneck.

**5. Recommended Actions**
• [CRITICAL] Hire 2 additional support staff to reduce response time to <3h (would likely recover 5-6% completion)
• [HIGH] Offer targeted tutoring for biology/chemistry cohorts (historical fix recovers 2-3%)
• [MEDIUM] Audit course load balance — consider pre-requisite realignment to reduce simultaneous enrollments

**6. Confidence & Limitations**
- Confidence: 82%
- Limitations:
  - Only 4 quarters of historical data; more history would improve trend confidence
  - Support response time is proxied; true cause may include student engagement factors not in this dataset
  - Hiring impact is estimated from historical correlation, not causal experiment

---

## Memory & Context

The agent remembers within a session:
- Currently selected workspace and KPI
- User's preferred analysis style (exploratory vs prescriptive)
- Follow-up interests (e.g., "always show me anomalies")

Memory does **not** override data or analysis results—it's context only.

---

## Confidence Scoring

Confidence ranges from **30% to 95%** based on:

- **Data Quality**: -15 if quality < 70%
- **Analysis Maturity**: -5 to -10 if key analyses not yet run (anomaly, forecast)
- **Data Completeness**: -10 if no date column for time-series questions
- **Sample Size**: -5 if limited data points

Example:
- High confidence (80-95%): Clean data, multiple analyses complete, good sample size
- Medium confidence (60-80%): Good data quality, some analyses missing
- Low confidence (30-60%): Quality issues, limited history, missing key analyses

---

## Never Do This

❌ Return schema dumps or column lists (unless user specifically asks for it)
❌ Say "I cannot help with that" without offering the closest valid answer
❌ Return blank charts or empty states
❌ Hide uncertainty — always state limitations
❌ Answer from guesswork when tools can provide evidence
❌ Use academic jargon without explanation
❌ Ignore missing values or data quality in conclusions

---

## Always Do This

✅ Provide direct, specific answers with numbers
✅ Cite evidence from data, SQL, or documents
✅ Explain "why" behind findings
✅ Recommend specific next-step actions
✅ State confidence level and limitations
✅ Use charts when they clarify
✅ Treat the user as a business decision-maker (not a data scientist)
✅ Provide fallback answers when exact computation unavailable

---

## Integration with Workspace

The AI Analyst integrates with:

- **PrepareSection**: Accesses cleaned tables and quality scores
- **AnalystSection**: Adds/reads chat messages in structured format
- **WorkbookSection**: References pre-computed analysis outputs
- **ReportsSection**: Can trigger memo/report generation from chat
- **StorySection**: Pulls dashboard KPI data for context

---

## Future Enhancements

1. **Backend Functions**: Wire up the 17 tools to Deno backend functions for production execution
2. **Custom Metrics**: Allow users to define derived metrics for the agent to analyze
3. **Comparative Analysis**: "Compare this month to last" across multiple dimensions
4. **Root Cause Reasoning**: Deeper causal analysis using regression feature importance
5. **Alerts from Chat**: "Alert me when completion rate drops below 75%"
6. **Multi-turn Memory**: Longer conversation context (currently session-only)
7. **Export Chat**: Turn chat analysis into reports or slide decks