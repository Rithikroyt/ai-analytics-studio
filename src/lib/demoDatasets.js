/**
 * Built-in Demo Datasets for OmniData AI Analytics Studio
 * 4 enterprise-grade datasets with realistic quality issues for testing
 */

// ── Helper: random pick ───────────────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rnd = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── Dataset 1: Sales & Revenue ────────────────────────────────────
const SALES_ROWS = (() => {
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const regionAliases = { North: ['NORTH', 'north', 'N. Region'], South: ['SOUTH', 'South Region', 'S.'], East: ['East'], West: ['West', 'WEST'], Central: ['Central', 'central', 'CTR'] };
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Food & Beverage'];
  const channels = ['Online', 'Retail', 'Partner', 'Direct'];
  const statuses = ['Completed', 'Returned', 'Pending', 'Cancelled'];
  const payments = ['Credit Card', 'Bank Transfer', 'Cash', 'PayPal'];
  const names = ['Alice Johnson', 'Bob Smith', 'Carol White', 'David Lee', 'Emma Davis', 'Frank Miller', 'Grace Wilson', 'Henry Brown'];
  const countries = ['USA', 'Canada', 'UK', 'Germany', 'France'];
  const states = ['California', 'Texas', 'New York', 'Florida', 'Illinois'];
  const cities = ['Los Angeles', 'Austin', 'New York City', 'Miami', 'Chicago'];
  const products = ['Laptop Pro', 'Wireless Mouse', 'Standing Desk', 'Running Shoes', 'SQL Mastery', 'Protein Bar Pack', 'Smart Watch', 'Coffee Maker'];
  const rows = [];

  for (let i = 0; i < 350; i++) {
    const monthIdx = i % 24;
    const year = monthIdx >= 12 ? 2024 : 2023;
    const mon = (monthIdx % 12) + 1;
    const day = rndInt(1, 28);
    const region = regions[i % regions.length];
    const unitPrice = rnd(20, 800);
    const quantity = rndInt(1, 50);
    const revenue = Math.round(unitPrice * quantity);
    const cost = Math.round(revenue * rnd(0.35, 0.60));
    const profit = revenue - cost;
    const discount = rndInt(0, 25);

    // Inject quality issues
    let regionVal = pick(regionAliases[region] || [region]);
    let customerName = pick(names);
    let revenueVal = revenue;
    let dateVal = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (i % 45 === 0) regionVal = null;           // missing region
    if (i % 37 === 0) customerName = null;         // missing customer name
    if (i % 60 === 0) revenueVal = 'N/A';          // revenue stored as text
    if (i % 80 === 0) revenueVal = 999999;         // extreme outlier
    if (i % 55 === 0) dateVal = `${day}/${mon}/${year}`;  // wrong date format
    if (i < 3) rows.push({ ...rows[i - 1 < 0 ? 0 : i - 1] || {} });  // duplicate rows early — skip if no prior row

    const row = {
      order_id: `ORD-${10000 + i}`,
      order_date: dateVal,
      customer_id: `CUST-${1000 + rndInt(0, 199)}`,
      customer_name: customerName,
      product_id: `PROD-${200 + (i % products.length)}`,
      product_name: pick(products),
      product_category: pick(categories),
      region: regionVal,
      country: pick(countries),
      state: pick(states),
      city: pick(cities),
      channel: pick(channels),
      quantity,
      unit_price: unitPrice,
      revenue: revenueVal,
      cost,
      profit,
      discount,
      payment_type: pick(payments),
      order_status: pick(statuses),
    };
    rows.push(row);
  }

  // Inject a few duplicate rows
  rows.push({ ...rows[10], order_id: rows[10]?.order_id });
  rows.push({ ...rows[25], order_id: rows[25]?.order_id });
  rows.push({ ...rows[50], order_id: rows[50]?.order_id });

  return rows;
})();

// ── Dataset 2: HR / Workforce ──────────────────────────────────────
const HR_ROWS = (() => {
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Support'];
  const roles = ['Analyst', 'Manager', 'Director', 'VP', 'Specialist', 'Associate', 'Lead'];
  const genders = ['Male', 'Female', 'Non-binary'];
  const locations = ['New York', 'Chicago', 'San Francisco', 'Austin', 'Remote'];
  const managerLevels = ['L1', 'L2', 'L3', 'L4', 'IC'];
  const overtimeVals = ['Y', 'N', 'Yes', 'No', 'TRUE', 'FALSE'];  // inconsistent on purpose
  const rows = [];

  for (let i = 0; i < 280; i++) {
    const tenure = rndInt(1, 180);
    const salary = rndInt(45000, 160000);
    const perf = Math.round(rnd(1, 5) * 10) / 10;
    const attrition = perf < 2.5 || tenure < 12 || Math.random() < 0.12 ? 'Yes' : 'No';
    const hireYear = 2024 - Math.floor(tenure / 12);
    const hireMon = rndInt(1, 12);
    let hireDate = `${hireYear}-${String(hireMon).padStart(2, '0')}-01`;

    let salaryVal = salary;
    let deptVal = pick(departments);
    let overtimeVal = pick(overtimeVals.slice(0, 2));  // default Y/N

    // Quality issues
    if (i % 30 === 0) salaryVal = null;                 // missing salary
    if (i % 50 === 0) deptVal = null;                   // missing department
    if (i % 7 === 0) overtimeVal = pick(overtimeVals);  // inconsistent overtime
    if (i % 65 === 0) hireDate = `${hireMon}/${1}/${hireYear}`;  // wrong date format

    rows.push({
      employee_id: `EMP-${1000 + i}`,
      department: deptVal,
      job_role: pick(roles),
      gender: pick(genders),
      age: rndInt(22, 58),
      salary: salaryVal,
      monthly_income: salaryVal ? Math.round(salaryVal / 12) : null,
      years_at_company: Math.round(tenure / 12 * 10) / 10,
      overtime: overtimeVal,
      performance_score: perf,
      attrition,
      hire_date: hireDate,
      location: pick(locations),
      manager_level: pick(managerLevels),
    });
  }

  // Inject duplicate employee IDs
  rows[10].employee_id = rows[5].employee_id;
  rows[20].employee_id = rows[15].employee_id;

  return rows;
})();

// ── Dataset 3: Finance / Operations ───────────────────────────────
const FINANCE_ROWS = (() => {
  const departments = ['Revenue', 'COGS', 'Marketing', 'R&D', 'G&A', 'Sales', 'Operations'];
  const deptAliases = { Revenue: ['Revenue', 'revenue', 'REV'], 'G&A': ['G&A', 'General & Admin', 'G and A', 'GA'] };
  const vendors = ['AWS', 'Salesforce', 'Stripe', 'HubSpot', 'Oracle', 'SAP', 'Zoom', 'Slack'];
  const statuses = ['Approved', 'Pending', 'Rejected', 'Accrued'];
  const expenseCategories = ['Infrastructure', 'Headcount', 'Marketing Spend', 'Travel', 'Software', 'Consulting'];
  const projects = ['Project Alpha', 'Project Beta', 'Q1 Growth', 'APAC Expansion', 'Digital Transformation'];
  const rows = [];

  for (let i = 0; i < 240; i++) {
    const monthIdx = i % 24;
    const year = monthIdx >= 12 ? 2024 : 2023;
    const mon = (monthIdx % 12) + 1;
    const revenue = rndInt(600000, 1400000);
    const cost = Math.round(revenue * rnd(0.45, 0.72));
    const budget = Math.round(revenue * rnd(0.90, 1.10));
    const actual = Math.round(revenue * rnd(0.85, 1.20));
    const dept = pick(departments);
    const deptDisplays = deptAliases[dept] || [dept];

    let costVal = cost;
    let txDateVal = `${year}-${String(mon).padStart(2, '0')}-01`;

    // Quality issues
    if (i % 40 === 0) costVal = null;          // missing cost
    if (i % 70 === 0) costVal = -Math.abs(cost); // negative cost anomaly
    if (i % 60 === 0) txDateVal = `${mon}-01-${year}`;  // text date format

    rows.push({
      transaction_id: `TXN-${20000 + i}`,
      transaction_date: txDateVal,
      department: pick(deptDisplays),
      account_type: pick(['Revenue', 'Expense', 'Asset', 'Liability']),
      revenue,
      cost: costVal,
      budget,
      actual,
      region: pick(['North America', 'EMEA', 'APAC', 'LATAM']),
      vendor: pick(vendors),
      status: pick(statuses),
      expense_category: pick(expenseCategories),
      project_name: pick(projects),
    });
  }

  // Inject duplicate transaction IDs
  rows[5].transaction_id = rows[0].transaction_id;
  rows[15].transaction_id = rows[10].transaction_id;

  return rows;
})();

// ── Dataset 4: Appointments / Healthcare ─────────────────────────
const APPOINTMENT_ROWS = (() => {
  const departments = ['Cardiology', 'Orthopedics', 'Pediatrics', 'General Practice', 'Oncology', 'Neurology'];
  const locations = ['Downtown Clinic', 'North Campus', 'South Campus', 'Telehealth', 'West Wing'];
  const genders = ['Male', 'Female', 'Other'];
  const statuses = ['Completed', 'No-Show', 'Cancelled', 'Rescheduled'];
  const rows = [];

  for (let i = 0; i < 320; i++) {
    const monthIdx = i % 12;
    const year = 2024;
    const mon = monthIdx + 1;
    const day = rndInt(1, 28);
    const age = rndInt(18, 85);
    const waitTime = rndInt(5, 90);
    const noShow = Math.random() < (age > 65 ? 0.25 : age < 25 ? 0.30 : 0.15) ? 1 : 0;
    const status = noShow ? 'No-Show' : pick(statuses.filter(s => s !== 'No-Show'));
    const incomeRank = rndInt(1, 10);

    rows.push({
      appointment_id: `APT-${30000 + i}`,
      patient_id: `PAT-${5000 + rndInt(0, 299)}`,
      appointment_date: `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      appointment_status: status,
      age,
      gender: pick(genders),
      income_rank: incomeRank,
      department: pick(departments),
      location: pick(locations),
      wait_time_minutes: waitTime,
      no_show_flag: noShow,
    });
  }
  return rows;
})();

// ── Dataset exports ───────────────────────────────────────────────
export const DEMO_DATASETS = [
  {
    id: 'sales_revenue',
    name: 'Sales & Revenue',
    emoji: '📊',
    color: '#00e5ff',
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-400/10',
    borderClass: 'border-cyan-400/20',
    description: '350 orders · 20 columns · 2023–2024 · Multi-region, multi-channel sales with realistic quality issues.',
    businessProblem: 'Which products, regions, and customer segments are driving revenue growth? Where is gross margin at risk?',
    rows: SALES_ROWS,
    columns: [
      { name: 'order_id', type: 'string' }, { name: 'order_date', type: 'date' },
      { name: 'customer_id', type: 'string' }, { name: 'customer_name', type: 'string' },
      { name: 'product_id', type: 'string' }, { name: 'product_name', type: 'string' },
      { name: 'product_category', type: 'string' }, { name: 'region', type: 'string' },
      { name: 'country', type: 'string' }, { name: 'state', type: 'string' },
      { name: 'city', type: 'string' }, { name: 'channel', type: 'string' },
      { name: 'quantity', type: 'numeric' }, { name: 'unit_price', type: 'numeric' },
      { name: 'revenue', type: 'numeric' }, { name: 'cost', type: 'numeric' },
      { name: 'profit', type: 'numeric' }, { name: 'discount', type: 'numeric' },
      { name: 'payment_type', type: 'string' }, { name: 'order_status', type: 'string' },
    ],
    qualityIssues: ['missing region (~8%)', 'missing customer_name (~3%)', 'revenue stored as text in some rows', 'extreme revenue outlier', 'wrong date formats (DD/MM/YYYY)', '3 duplicate rows'],
    kpis: ['Total Revenue', 'Gross Profit', 'Gross Margin %', 'Avg Order Value', 'Units Sold'],
    suggestedQuestions: [
      'What are the top revenue drivers by region?',
      'Which product categories have the highest gross margin?',
      'What is the monthly revenue trend for 2023–2024?',
      'Which channel drives the most profit?',
      'Forecast revenue for the next quarter.',
      'Run RFM analysis on customer segments.',
      'Which region has the highest discount rate?',
      'Generate a CFO financial review report.',
    ],
    suggestedCharts: [
      { title: 'Revenue by Region', type: 'bar', xAxis: 'region', yAxis: 'revenue' },
      { title: 'Monthly Revenue Trend', type: 'line', xAxis: 'order_date', yAxis: 'revenue' },
      { title: 'Profit by Category', type: 'bar', xAxis: 'product_category', yAxis: 'profit' },
      { title: 'Revenue by Channel', type: 'bar', xAxis: 'channel', yAxis: 'revenue' },
    ],
    suggestedReport: 'Executive Summary Report',
  },
  {
    id: 'hr_workforce',
    name: 'HR / Workforce',
    emoji: '👥',
    color: '#a855f7',
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-400/10',
    borderClass: 'border-purple-400/20',
    description: '280 employees · 14 columns · Attrition, salary, performance, tenure by department with realistic issues.',
    businessProblem: 'Why are employees leaving? Which departments have highest attrition risk? What is the cost of turnover?',
    rows: HR_ROWS,
    columns: [
      { name: 'employee_id', type: 'string' }, { name: 'department', type: 'string' },
      { name: 'job_role', type: 'string' }, { name: 'gender', type: 'string' },
      { name: 'age', type: 'numeric' }, { name: 'salary', type: 'numeric' },
      { name: 'monthly_income', type: 'numeric' }, { name: 'years_at_company', type: 'numeric' },
      { name: 'overtime', type: 'string' }, { name: 'performance_score', type: 'numeric' },
      { name: 'attrition', type: 'string' }, { name: 'hire_date', type: 'date' },
      { name: 'location', type: 'string' }, { name: 'manager_level', type: 'string' },
    ],
    qualityIssues: ['duplicate employee_id (2 cases)', 'missing salary (~3%)', 'missing department (~2%)', 'inconsistent overtime values: Y, N, Yes, No, TRUE, FALSE', 'wrong date formats in hire_date'],
    kpis: ['Attrition Rate', 'Avg Salary', 'Avg Performance Score', 'Avg Years at Company', 'Overtime Rate'],
    suggestedQuestions: [
      'Which department has the highest attrition rate?',
      'Is there a correlation between performance score and attrition?',
      'What is the average salary by department?',
      'How does overtime impact attrition?',
      'What is the average tenure of employees who left?',
      'Generate an HR attrition risk report.',
      'Which roles are most at risk of leaving?',
    ],
    suggestedCharts: [
      { title: 'Attrition by Department', type: 'bar', xAxis: 'department', yAxis: 'attrition' },
      { title: 'Avg Salary by Role', type: 'bar', xAxis: 'job_role', yAxis: 'salary' },
      { title: 'Performance Score Distribution', type: 'bar', xAxis: 'department', yAxis: 'performance_score' },
      { title: 'Tenure by Department', type: 'bar', xAxis: 'department', yAxis: 'years_at_company' },
    ],
    suggestedReport: 'HR Attrition Risk Report',
  },
  {
    id: 'finance_operations',
    name: 'Finance / Operations',
    emoji: '💰',
    color: '#4ade80',
    colorClass: 'text-green-400',
    bgClass: 'bg-green-400/10',
    borderClass: 'border-green-400/20',
    description: '240 transactions · 13 columns · P&L, budget vs actual, vendor spend, department costs with anomalies.',
    businessProblem: 'Is the business growing profitably? Where is budget variance highest? What are the top cost drivers?',
    rows: FINANCE_ROWS,
    columns: [
      { name: 'transaction_id', type: 'string' }, { name: 'transaction_date', type: 'date' },
      { name: 'department', type: 'string' }, { name: 'account_type', type: 'string' },
      { name: 'revenue', type: 'numeric' }, { name: 'cost', type: 'numeric' },
      { name: 'budget', type: 'numeric' }, { name: 'actual', type: 'numeric' },
      { name: 'region', type: 'string' }, { name: 'vendor', type: 'string' },
      { name: 'status', type: 'string' }, { name: 'expense_category', type: 'string' },
      { name: 'project_name', type: 'string' },
    ],
    qualityIssues: ['duplicate transaction_id (2 cases)', 'missing cost (~2%)', 'negative cost anomaly (~1%)', 'inconsistent department spelling (G&A vs General & Admin)', 'text date formats in some rows'],
    kpis: ['Total Revenue', 'Total Cost', 'Gross Profit', 'Gross Margin %', 'Budget Variance'],
    suggestedQuestions: [
      'What is the monthly revenue trend?',
      'Which department has the highest budget variance?',
      'What is the gross margin by department?',
      'Which vendor has the highest concentration risk?',
      'Forecast revenue for the next quarter.',
      'Where are cost anomalies?',
      'Generate a CFO financial review report.',
    ],
    suggestedCharts: [
      { title: 'Revenue vs Cost Trend', type: 'line', xAxis: 'transaction_date', yAxis: 'revenue' },
      { title: 'Budget vs Actual by Department', type: 'bar', xAxis: 'department', yAxis: 'budget' },
      { title: 'Cost by Expense Category', type: 'bar', xAxis: 'expense_category', yAxis: 'cost' },
      { title: 'Vendor Spend Concentration', type: 'bar', xAxis: 'vendor', yAxis: 'cost' },
    ],
    suggestedReport: 'CFO Financial Report',
  },
  {
    id: 'appointments_healthcare',
    name: 'Appointments / Healthcare',
    emoji: '🏥',
    color: '#60a5fa',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-400/10',
    borderClass: 'border-blue-400/20',
    description: '320 appointments · 11 columns · No-show analysis, wait time, department ops by age, gender, location.',
    businessProblem: 'What is driving the no-show rate? Which departments have the worst wait times? Who is most at risk of not showing?',
    rows: APPOINTMENT_ROWS,
    columns: [
      { name: 'appointment_id', type: 'string' }, { name: 'patient_id', type: 'string' },
      { name: 'appointment_date', type: 'date' }, { name: 'appointment_status', type: 'string' },
      { name: 'age', type: 'numeric' }, { name: 'gender', type: 'string' },
      { name: 'income_rank', type: 'numeric' }, { name: 'department', type: 'string' },
      { name: 'location', type: 'string' }, { name: 'wait_time_minutes', type: 'numeric' },
      { name: 'no_show_flag', type: 'numeric' },
    ],
    qualityIssues: ['no latitude/longitude for map (use location column)', 'income_rank is an ordinal — do not SUM'],
    kpis: ['No-Show Rate', 'Avg Wait Time', 'Appointment Completion Rate', 'No-Shows by Department', 'High-Risk Patient %'],
    suggestedQuestions: [
      'What is the no-show rate by department?',
      'Which age group has the highest no-show rate?',
      'What is the average wait time by location?',
      'Which departments have the worst throughput?',
      'What factors predict no-show risk?',
      'Generate an operations efficiency report.',
      'Which income group has the highest no-show rate?',
    ],
    suggestedCharts: [
      { title: 'No-Show Rate by Department', type: 'bar', xAxis: 'department', yAxis: 'no_show_flag' },
      { title: 'Avg Wait Time by Location', type: 'bar', xAxis: 'location', yAxis: 'wait_time_minutes' },
      { title: 'No-Shows by Age', type: 'scatter', xAxis: 'age', yAxis: 'no_show_flag' },
      { title: 'Appointment Status Distribution', type: 'bar', xAxis: 'appointment_status', yAxis: 'appointment_id' },
    ],
    suggestedReport: 'Operations Efficiency Report',
  },
];

// Legacy 4 datasets kept for backwards compatibility
export const LEGACY_DEMO_DATASETS = [
  {
    id: 'sales_ecommerce',
    name: 'Sales / E-Commerce',
    emoji: '📊', color: '#00e5ff', colorClass: 'text-cyan-400', bgClass: 'bg-cyan-400/10', borderClass: 'border-cyan-400/20',
    description: 'Multi-region B2B/B2C sales dataset with 300 orders across 4 customer segments, 6 product categories, and 4 channels.',
    businessProblem: 'Which products, regions, and segments are driving revenue growth? Where is gross margin declining?',
    rows: SALES_ROWS,
    columns: [
      { name: 'order_id', type: 'string' }, { name: 'order_date', type: 'date' }, { name: 'region', type: 'string' },
      { name: 'product_category', type: 'string' }, { name: 'channel', type: 'string' }, { name: 'revenue', type: 'numeric' },
      { name: 'cost', type: 'numeric' }, { name: 'profit', type: 'numeric' }, { name: 'quantity', type: 'numeric' },
      { name: 'customer_id', type: 'string' }, { name: 'discount', type: 'numeric' }, { name: 'order_status', type: 'string' },
    ],
    kpis: ['Total Revenue', 'Gross Profit Margin', 'Units Sold', 'Avg Order Value'],
    suggestedQuestions: ['What are the top revenue drivers?', 'Monthly revenue trend?', 'Generate executive summary.'],
    suggestedCharts: [{ title: 'Revenue by Region', type: 'bar', xAxis: 'region', yAxis: 'revenue' }],
    suggestedReport: 'Executive Summary Report',
  },
];

export default DEMO_DATASETS;