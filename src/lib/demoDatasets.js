/**
 * Built-in Demo Datasets for OmniData AI Analytics Studio
 * Each dataset has: rows, columns, metadata, suggested questions, KPIs, charts, report
 */

// ── Sales / E-Commerce Dataset ────────────────────────────────────────────────
const SALES_ROWS = (() => {
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const segments = ['Enterprise', 'SMB', 'Consumer', 'Government'];
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Food & Beverage'];
  const channels = ['Online', 'Retail', 'Partner', 'Direct'];
  const rows = [];
  for (let i = 0; i < 300; i++) {
    const month = Math.floor(i / 25) + 1;
    const year = month > 12 ? 2024 : 2023;
    const mon = month > 12 ? month - 12 : month;
    const revenue = Math.round((Math.random() * 45000 + 5000) * (1 + mon * 0.02));
    const cogs = Math.round(revenue * (0.35 + Math.random() * 0.2));
    const units = Math.round(revenue / (120 + Math.random() * 180));
    rows.push({
      order_id: `ORD-${10000 + i}`,
      date: `${year}-${String(mon).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      region: regions[i % regions.length],
      segment: segments[i % segments.length],
      category: categories[i % categories.length],
      channel: channels[i % channels.length],
      revenue: revenue,
      cogs: cogs,
      gross_profit: revenue - cogs,
      units_sold: units,
      customer_id: `CUST-${1000 + Math.floor(Math.random() * 200)}`,
      discount_pct: Math.round(Math.random() * 20),
      churn_flag: Math.random() < 0.08 ? 1 : 0,
    });
  }
  return rows;
})();

// ── HR Attrition Dataset ──────────────────────────────────────────────────────
const HR_ROWS = (() => {
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Support'];
  const roles = ['Analyst', 'Manager', 'Director', 'Executive', 'Specialist', 'Associate'];
  const rows = [];
  for (let i = 0; i < 250; i++) {
    const tenure = Math.round(Math.random() * 120 + 1);
    const salary = Math.round(50000 + Math.random() * 100000);
    const satisfaction = Math.round(Math.random() * 5 * 10) / 10;
    const attrition = satisfaction < 2.5 || tenure < 12 || Math.random() < 0.1 ? 1 : 0;
    rows.push({
      employee_id: `EMP-${1000 + i}`,
      department: departments[i % departments.length],
      role: roles[i % roles.length],
      tenure_months: tenure,
      salary: salary,
      satisfaction_score: satisfaction,
      performance_score: Math.round((Math.random() * 4 + 1) * 10) / 10,
      attrition: attrition,
      age: Math.round(Math.random() * 30 + 22),
      gender: i % 3 === 0 ? 'Female' : 'Male',
      promotion_last_3y: Math.random() < 0.3 ? 1 : 0,
      overtime_hours: Math.round(Math.random() * 20),
      training_hours: Math.round(Math.random() * 40 + 5),
    });
  }
  return rows;
})();

// ── Finance Dataset ────────────────────────────────────────────────────────────
const FINANCE_ROWS = (() => {
  const departments = ['Revenue', 'COGS', 'Marketing', 'R&D', 'G&A', 'Sales', 'Operations'];
  const rows = [];
  for (let i = 0; i < 200; i++) {
    const month = (i % 24) + 1;
    const year = month > 12 ? 2024 : 2023;
    const mon = month > 12 ? month - 12 : month;
    const revenue = Math.round(800000 + Math.random() * 400000 + mon * 15000);
    const opex = Math.round(revenue * (0.55 + Math.random() * 0.15));
    const ebitda = revenue - opex;
    rows.push({
      period: `${year}-${String(mon).padStart(2, '0')}`,
      department: departments[i % departments.length],
      revenue: revenue,
      opex: opex,
      ebitda: ebitda,
      gross_margin_pct: Math.round((1 - opex / revenue) * 100 * 10) / 10,
      burn_rate: Math.round(opex / 30),
      cash_balance: Math.round(2000000 + Math.random() * 1000000),
      headcount: Math.round(50 + Math.random() * 100),
      revenue_per_employee: Math.round(revenue / (50 + Math.random() * 100)),
    });
  }
  return rows;
})();

// ── Customer Segmentation Dataset ─────────────────────────────────────────────
const CUSTOMER_ROWS = (() => {
  const tiers = ['Champions', 'Loyal', 'At Risk', 'Lost', 'New', 'Potential Loyal'];
  const channels = ['Email', 'Social', 'Search', 'Direct', 'Referral'];
  const rows = [];
  for (let i = 0; i < 280; i++) {
    const recency = Math.round(Math.random() * 365);
    const frequency = Math.round(Math.random() * 50 + 1);
    const monetary = Math.round(Math.random() * 5000 + 100);
    const rfmScore = Math.round((1 / (recency / 365 + 0.1) + frequency / 50 + monetary / 5000) * 33.3);
    const tier = rfmScore > 80 ? 'Champions' : rfmScore > 60 ? 'Loyal' : rfmScore > 40 ? 'At Risk' : rfmScore > 20 ? 'Potential Loyal' : recency > 300 ? 'Lost' : 'New';
    rows.push({
      customer_id: `CUST-${1000 + i}`,
      recency_days: recency,
      frequency: frequency,
      monetary_value: monetary,
      rfm_score: rfmScore,
      segment: tier,
      ltv: Math.round(monetary * frequency * (0.5 + Math.random() * 0.5)),
      acquisition_channel: channels[i % channels.length],
      country: ['USA', 'Canada', 'UK', 'Germany', 'France'][i % 5],
      age_group: ['18-24', '25-34', '35-44', '45-54', '55+'][i % 5],
      nps_score: Math.round(Math.random() * 10),
      churn_probability: Math.round((recency / 365) * 100),
    });
  }
  return rows;
})();

// ── Exported Dataset Definitions ──────────────────────────────────────────────
export const DEMO_DATASETS = [
  {
    id: 'sales_ecommerce',
    name: 'Sales / E-Commerce',
    emoji: '📊',
    color: '#00e5ff',
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-400/10',
    borderClass: 'border-cyan-400/20',
    description: 'Multi-region B2B/B2C sales dataset with 300 orders across 4 customer segments, 6 product categories, and 4 channels.',
    businessProblem: 'Which products, regions, and segments are driving revenue growth? Where is gross margin declining?',
    rows: SALES_ROWS,
    columns: [
      { name: 'order_id', type: 'string' }, { name: 'date', type: 'date' },
      { name: 'region', type: 'string' }, { name: 'segment', type: 'string' },
      { name: 'category', type: 'string' }, { name: 'channel', type: 'string' },
      { name: 'revenue', type: 'number' }, { name: 'cogs', type: 'number' },
      { name: 'gross_profit', type: 'number' }, { name: 'units_sold', type: 'number' },
      { name: 'customer_id', type: 'string' }, { name: 'discount_pct', type: 'number' },
      { name: 'churn_flag', type: 'number' },
    ],
    kpis: ['Total Revenue', 'Gross Profit Margin', 'Units Sold', 'Avg Order Value', 'Churn Rate'],
    suggestedQuestions: [
      'What are the top revenue drivers by region and segment?',
      'Which product categories have the highest gross margin?',
      'What is the monthly revenue trend for the last 12 months?',
      'Where is the highest churn risk?',
      'Forecast revenue for the next 30 days.',
      'Generate an executive summary report.',
      'Which channel drives the most revenue?',
      'What is the average discount by segment?',
    ],
    suggestedCharts: [
      { title: 'Revenue by Region', type: 'bar', xAxis: 'region', yAxis: 'revenue' },
      { title: 'Monthly Revenue Trend', type: 'line', xAxis: 'date', yAxis: 'revenue' },
      { title: 'Gross Profit by Category', type: 'bar', xAxis: 'category', yAxis: 'gross_profit' },
      { title: 'Units Sold by Segment', type: 'bar', xAxis: 'segment', yAxis: 'units_sold' },
    ],
    suggestedReport: 'Executive Summary Report',
  },
  {
    id: 'hr_attrition',
    name: 'HR Attrition',
    emoji: '👥',
    color: '#a855f7',
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-400/10',
    borderClass: 'border-purple-400/20',
    description: '250-employee HR dataset tracking attrition, satisfaction, performance, tenure, and salary by department.',
    businessProblem: 'Why are employees leaving? Which departments have the highest attrition risk? What is the cost of turnover?',
    rows: HR_ROWS,
    columns: [
      { name: 'employee_id', type: 'string' }, { name: 'department', type: 'string' },
      { name: 'role', type: 'string' }, { name: 'tenure_months', type: 'number' },
      { name: 'salary', type: 'number' }, { name: 'satisfaction_score', type: 'number' },
      { name: 'performance_score', type: 'number' }, { name: 'attrition', type: 'number' },
      { name: 'age', type: 'number' }, { name: 'gender', type: 'string' },
      { name: 'promotion_last_3y', type: 'number' }, { name: 'overtime_hours', type: 'number' },
      { name: 'training_hours', type: 'number' },
    ],
    kpis: ['Attrition Rate', 'Avg Satisfaction', 'Avg Tenure', 'Avg Salary', 'Training Hours'],
    suggestedQuestions: [
      'Which department has the highest attrition rate?',
      'Is there a correlation between satisfaction score and attrition?',
      'What is the average tenure of employees who leave?',
      'Which roles are most at risk of leaving?',
      'How does overtime impact attrition?',
      'Generate an HR attrition risk report.',
      'What is the cost of replacing high-attrition employees?',
    ],
    suggestedCharts: [
      { title: 'Attrition by Department', type: 'bar', xAxis: 'department', yAxis: 'attrition' },
      { title: 'Satisfaction vs Attrition', type: 'scatter', xAxis: 'satisfaction_score', yAxis: 'attrition' },
      { title: 'Avg Salary by Role', type: 'bar', xAxis: 'role', yAxis: 'salary' },
      { title: 'Tenure Distribution', type: 'bar', xAxis: 'department', yAxis: 'tenure_months' },
    ],
    suggestedReport: 'Churn Risk Report',
  },
  {
    id: 'finance',
    name: 'Finance / P&L',
    emoji: '💰',
    color: '#4ade80',
    colorClass: 'text-green-400',
    bgClass: 'bg-green-400/10',
    borderClass: 'border-green-400/20',
    description: '24-month P&L dataset with revenue, OPEX, EBITDA, gross margin, burn rate, and cash balance by department.',
    businessProblem: 'Is the business growing profitably? Where are the biggest cost drivers? What is the revenue trajectory?',
    rows: FINANCE_ROWS,
    columns: [
      { name: 'period', type: 'date' }, { name: 'department', type: 'string' },
      { name: 'revenue', type: 'number' }, { name: 'opex', type: 'number' },
      { name: 'ebitda', type: 'number' }, { name: 'gross_margin_pct', type: 'number' },
      { name: 'burn_rate', type: 'number' }, { name: 'cash_balance', type: 'number' },
      { name: 'headcount', type: 'number' }, { name: 'revenue_per_employee', type: 'number' },
    ],
    kpis: ['Total Revenue', 'EBITDA', 'Gross Margin %', 'Burn Rate', 'Cash Balance'],
    suggestedQuestions: [
      'What is the monthly EBITDA trend?',
      'Which department has the highest OPEX?',
      'Is gross margin improving or declining?',
      'What is the current burn rate vs cash balance?',
      'Forecast revenue for the next quarter.',
      'Generate a CFO financial review report.',
      'What is revenue per employee trend?',
    ],
    suggestedCharts: [
      { title: 'EBITDA Trend', type: 'line', xAxis: 'period', yAxis: 'ebitda' },
      { title: 'Revenue vs OPEX', type: 'bar', xAxis: 'period', yAxis: 'revenue' },
      { title: 'OPEX by Department', type: 'bar', xAxis: 'department', yAxis: 'opex' },
      { title: 'Gross Margin % Over Time', type: 'line', xAxis: 'period', yAxis: 'gross_margin_pct' },
    ],
    suggestedReport: 'CFO Financial Report',
  },
  {
    id: 'customer_segmentation',
    name: 'Customer Segmentation',
    emoji: '🎯',
    color: '#f59e0b',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-400/10',
    borderClass: 'border-amber-400/20',
    description: '280 customers scored with RFM (Recency, Frequency, Monetary) across 6 lifecycle segments, LTV, NPS, and churn probability.',
    businessProblem: 'Who are our highest-value customers? Which segments are at risk of churning? How do we maximize LTV?',
    rows: CUSTOMER_ROWS,
    columns: [
      { name: 'customer_id', type: 'string' }, { name: 'recency_days', type: 'number' },
      { name: 'frequency', type: 'number' }, { name: 'monetary_value', type: 'number' },
      { name: 'rfm_score', type: 'number' }, { name: 'segment', type: 'string' },
      { name: 'ltv', type: 'number' }, { name: 'acquisition_channel', type: 'string' },
      { name: 'country', type: 'string' }, { name: 'age_group', type: 'string' },
      { name: 'nps_score', type: 'number' }, { name: 'churn_probability', type: 'number' },
    ],
    kpis: ['Avg LTV', 'Avg RFM Score', 'Churn Probability', 'NPS Score', 'Champions %'],
    suggestedQuestions: [
      'Which customer segment has the highest LTV?',
      'What is the churn probability by segment?',
      'Which acquisition channel brings highest-value customers?',
      'Run RFM analysis and identify champions vs at-risk.',
      'What retention strategies should we use per segment?',
      'Generate an RFM customer report.',
      'Which age group has the best NPS score?',
    ],
    suggestedCharts: [
      { title: 'LTV by Segment', type: 'bar', xAxis: 'segment', yAxis: 'ltv' },
      { title: 'Churn Probability by Segment', type: 'bar', xAxis: 'segment', yAxis: 'churn_probability' },
      { title: 'RFM Score Distribution', type: 'bar', xAxis: 'age_group', yAxis: 'rfm_score' },
      { title: 'Revenue by Channel', type: 'bar', xAxis: 'acquisition_channel', yAxis: 'monetary_value' },
    ],
    suggestedReport: 'RFM Customer Report',
  },
];

export default DEMO_DATASETS;