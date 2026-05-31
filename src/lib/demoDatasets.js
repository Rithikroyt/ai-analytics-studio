// OmniData v2.0 — Realistic Demo Datasets with intentional data quality issues

export const DEMO_DATASETS = [
  {
    id: 'sales_revenue',
    name: 'Sales & Revenue',
    domain: 'sales',
    description: 'Multi-region sales orders with product, customer, and revenue data',
    rowCount: 500,
    tags: ['sales', 'revenue', 'customers', 'products'],
    icon: '📊',
    color: 'cyan'
  },
  {
    id: 'marketing_campaigns',
    name: 'Marketing Campaigns',
    domain: 'marketing',
    description: 'Digital marketing campaigns with impressions, clicks, conversions',
    rowCount: 300,
    tags: ['marketing', 'campaigns', 'ads', 'funnel'],
    icon: '📣',
    color: 'pink'
  },
  {
    id: 'supply_chain',
    name: 'Supply Chain Operations',
    domain: 'supply_chain',
    description: 'Orders, inventory, suppliers, transportation and delivery data',
    rowCount: 400,
    tags: ['supply chain', 'inventory', 'logistics', 'suppliers'],
    icon: '🚚',
    color: 'amber'
  },
  {
    id: 'hr_workforce',
    name: 'HR Workforce',
    domain: 'hr',
    description: 'Employee records, departments, salaries, performance scores',
    rowCount: 250,
    tags: ['hr', 'employees', 'payroll', 'performance'],
    icon: '👥',
    color: 'purple'
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Orders',
    domain: 'sales',
    description: 'Online orders with product categories, customers, shipping status',
    rowCount: 600,
    tags: ['ecommerce', 'orders', 'products', 'shipping'],
    icon: '🛒',
    color: 'green'
  },
  {
    id: 'finance_costs',
    name: 'Finance & Costs',
    domain: 'finance',
    description: 'P&L data with revenue, cost, expenses by department and period',
    rowCount: 200,
    tags: ['finance', 'costs', 'profit', 'expenses'],
    icon: '💰',
    color: 'teal'
  },
  {
    id: 'healthcare',
    name: 'Healthcare Appointments',
    domain: 'healthcare',
    description: 'Patient appointments, departments, wait times, no-show rates',
    rowCount: 350,
    tags: ['healthcare', 'patients', 'appointments', 'no-show'],
    icon: '🏥',
    color: 'red'
  },
  {
    id: 'saas_subscriptions',
    name: 'SaaS Subscriptions',
    domain: 'operations',
    description: 'Subscription plans, MRR, churn, renewals, customer tiers',
    rowCount: 280,
    tags: ['saas', 'subscriptions', 'mrr', 'churn'],
    icon: '💻',
    color: 'blue'
  }
];

function randBetween(min, max) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function maybeNull(val, prob = 0.05) { return Math.random() < prob ? null : val; }
function maybeDuplicate(rows, prob = 0.03) {
  const extras = [];
  rows.forEach(r => { if (Math.random() < prob) extras.push({ ...r }); });
  return [...rows, ...extras];
}

function generateDates(n, startYear = 2023) {
  const dates = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(startYear, Math.floor(Math.random() * 24), Math.floor(Math.random() * 28) + 1);
    // Intentionally mix date formats
    const fmt = Math.random();
    if (fmt < 0.33) dates.push(d.toISOString().split('T')[0]);
    else if (fmt < 0.66) dates.push(`${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`);
    else dates.push(`${d.getDate()}-${d.toLocaleString('en', { month: 'short' })}-${d.getFullYear()}`);
  }
  return dates;
}

export function generateDemoData(datasetId) {
  switch (datasetId) {
    case 'sales_revenue': return generateSalesData();
    case 'marketing_campaigns': return generateMarketingData();
    case 'supply_chain': return generateSupplyChainData();
    case 'hr_workforce': return generateHRData();
    case 'ecommerce': return generateEcommerceData();
    case 'finance_costs': return generateFinanceData();
    case 'healthcare': return generateHealthcareData();
    case 'saas_subscriptions': return generateSaaSData();
    default: return generateSalesData();
  }
}

function generateSalesData() {
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const categories = ['Electronics', 'Clothing', 'Food', 'Home', 'Sports'];
  const reps = ['Alice Johnson', 'Bob Smith', 'Carol Lee', 'Dave Wilson', 'Eve Martinez', 'Frank Brown'];
  const statuses = ['Completed', 'Completed', 'Completed', 'Pending', 'Cancelled', 'COMPLETED', 'completed'];
  const dates = generateDates(500);

  let rows = Array.from({ length: 500 }, (_, i) => ({
    order_id: `ORD-${1000 + i}`,
    order_date: dates[i],
    customer_id: `CUST-${Math.floor(Math.random() * 200) + 1}`,
    customer_name: maybeNull(`Customer ${Math.floor(Math.random() * 200) + 1}`, 0.03),
    product_category: pick(categories),
    region: maybeNull(pick(regions), 0.04),
    sales_rep: pick(reps),
    revenue: maybeNull(pick([`$${randBetween(50, 5000)}`, randBetween(50, 5000), `${randBetween(50, 5000)}.00`]), 0.02),
    cost: maybeNull(randBetween(20, 3000), 0.03),
    quantity: Math.floor(randBetween(1, 20)),
    discount_pct: maybeNull(`${randBetween(0, 30)}%`, 0.05),
    status: pick(statuses),
    payment_method: pick(['Credit Card', 'PayPal', 'Bank Transfer', 'Cash', 'credit card']),
    city: maybeNull(pick(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia']), 0.06)
  }));

  // Add some negative revenues (data quality issue)
  rows.slice(0, 8).forEach(r => { r.revenue = -randBetween(10, 100); });
  // Add repeated header row
  rows.splice(50, 0, { order_id: 'order_id', order_date: 'order_date', customer_id: 'customer_id', revenue: 'revenue', cost: 'cost' });

  return maybeDuplicate(rows);
}

function generateMarketingData() {
  const channels = ['Google Ads', 'Facebook', 'Instagram', 'Email', 'LinkedIn', 'TikTok', 'Organic'];
  const campaigns = ['Q1 Launch', 'Summer Sale', 'Black Friday', 'Brand Awareness', 'Retargeting', 'Lead Gen'];
  const dates = generateDates(300);

  let rows = Array.from({ length: 300 }, (_, i) => ({
    campaign_id: `CAM-${100 + i}`,
    campaign_name: pick(campaigns),
    channel: pick(channels),
    start_date: dates[i],
    impressions: maybeNull(Math.floor(randBetween(1000, 500000)), 0.03),
    clicks: Math.floor(randBetween(50, 15000)),
    spend: maybeNull(`$${randBetween(100, 10000)}`, 0.04),
    revenue: maybeNull(randBetween(500, 50000), 0.05),
    conversions: Math.floor(randBetween(5, 500)),
    new_customers: Math.floor(randBetween(1, 100)),
    leads: Math.floor(randBetween(10, 1000)),
    ctr: maybeNull(`${randBetween(0.5, 8)}%`, 0.06),
    region: pick(['North America', 'Europe', 'Asia Pacific', 'Latin America', null])
  }));

  return maybeDuplicate(rows, 0.02);
}

function generateSupplyChainData() {
  const suppliers = ['Supplier A', 'Supplier B', 'Supplier C', 'Supplier D', 'Supplier E'];
  const categories = ['Raw Materials', 'Packaging', 'Electronics', 'Textiles', 'Chemicals'];
  const statuses = ['Delivered', 'In Transit', 'Delayed', 'Cancelled', 'Processing'];
  const dates = generateDates(400);

  let rows = Array.from({ length: 400 }, (_, i) => ({
    order_id: `PO-${2000 + i}`,
    supplier_id: `SUP-${Math.floor(Math.random() * 5) + 1}`,
    supplier_name: pick(suppliers),
    product_category: pick(categories),
    order_date: dates[i],
    delivery_date: maybeNull(dates[Math.min(i + 5, 399)], 0.05),
    quantity_ordered: Math.floor(randBetween(10, 500)),
    quantity_received: maybeNull(Math.floor(randBetween(8, 500)), 0.04),
    unit_cost: maybeNull(randBetween(5, 200), 0.03),
    transportation_cost: maybeNull(randBetween(50, 2000), 0.04),
    lead_time_days: maybeNull(Math.floor(randBetween(1, 30)), 0.03),
    on_time_delivery: pick([1, 1, 1, 0, 1, 'Yes', 'No', 'yes', null]),
    defect_rate: maybeNull(`${randBetween(0, 10)}%`, 0.05),
    warehouse: pick(['East Hub', 'West Hub', 'Central Hub', 'South Hub']),
    region: pick(['North America', 'Europe', 'Asia', 'Latin America'])
  }));

  // Supplier D underperforms
  rows.filter(r => r.supplier_name === 'Supplier D').forEach(r => {
    r.on_time_delivery = Math.random() < 0.25 ? 0 : 1;
  });

  return maybeDuplicate(rows, 0.025);
}

function generateHRData() {
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Legal'];
  const titles = ['Manager', 'Senior Analyst', 'Analyst', 'Director', 'VP', 'Associate', 'Specialist'];
  const statuses = ['Active', 'Active', 'Active', 'Resigned', 'On Leave', 'active', null];
  const dates = generateDates(250, 2020);

  let rows = Array.from({ length: 250 }, (_, i) => ({
    employee_id: `EMP-${3000 + i}`,
    name: maybeNull(`Employee ${i + 1}`, 0.02),
    department: pick(departments),
    job_title: pick(titles),
    hire_date: dates[i],
    salary: maybeNull(pick([`$${Math.floor(randBetween(40000, 200000))}`, Math.floor(randBetween(40000, 200000))]), 0.04),
    performance_score: maybeNull(randBetween(1, 5), 0.06),
    age: maybeNull(Math.floor(randBetween(22, 65)), 0.03),
    gender: pick(['Male', 'Female', 'M', 'F', null, 'Non-Binary']),
    location: pick(['New York', 'San Francisco', 'Chicago', 'Austin', 'Remote']),
    status: pick(statuses),
    years_experience: maybeNull(Math.floor(randBetween(0, 30)), 0.05),
    training_hours: maybeNull(Math.floor(randBetween(0, 200)), 0.04)
  }));

  return maybeDuplicate(rows, 0.02);
}

function generateEcommerceData() {
  const categories = ['Electronics', 'Books', 'Clothing', 'Sports', 'Home & Garden', 'Toys', 'Beauty'];
  const statuses = ['Shipped', 'Delivered', 'Returned', 'Processing', 'Cancelled'];
  const dates = generateDates(600);

  let rows = Array.from({ length: 600 }, (_, i) => ({
    order_id: `EORD-${5000 + i}`,
    order_date: dates[i],
    customer_id: `ECUST-${Math.floor(Math.random() * 300) + 1}`,
    product_name: `Product ${Math.floor(Math.random() * 100) + 1}`,
    category: pick(categories),
    quantity: Math.floor(randBetween(1, 10)),
    unit_price: maybeNull(randBetween(5, 500), 0.03),
    discount: maybeNull(`${Math.floor(randBetween(0, 50))}%`, 0.05),
    shipping_cost: maybeNull(randBetween(0, 50), 0.04),
    revenue: maybeNull(randBetween(10, 2000), 0.02),
    status: pick(statuses),
    return_flag: pick([0, 0, 0, 1, 'Yes', 'No', null]),
    city: maybeNull(pick(['New York', 'Los Angeles', 'Chicago', 'Seattle', 'Boston']), 0.05),
    state: pick(['NY', 'CA', 'IL', 'WA', 'MA', null]),
    country: 'USA'
  }));

  return maybeDuplicate(rows, 0.03);
}

function generateFinanceData() {
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Operations', 'R&D'];
  const categories = ['Salaries', 'Marketing Spend', 'COGS', 'SG&A', 'R&D', 'Depreciation'];
  const dates = generateDates(200, 2022);

  return Array.from({ length: 200 }, (_, i) => ({
    period: dates[i],
    department: pick(departments),
    expense_category: pick(categories),
    budget: maybeNull(randBetween(10000, 500000), 0.03),
    actual_cost: maybeNull(randBetween(8000, 520000), 0.03),
    revenue: maybeNull(randBetween(50000, 2000000), 0.02),
    gross_profit: maybeNull(randBetween(5000, 800000), 0.04),
    headcount: Math.floor(randBetween(5, 100)),
    variance_pct: maybeNull(`${randBetween(-20, 30)}%`, 0.05),
    quarter: pick(['Q1', 'Q2', 'Q3', 'Q4']),
    year: pick([2022, 2023, 2024, 2025])
  }));
}

function generateHealthcareData() {
  const departments = ['Cardiology', 'Orthopedics', 'Neurology', 'Pediatrics', 'General Practice', 'Emergency'];
  const types = ['Routine', 'Follow-Up', 'Emergency', 'Specialist', 'Lab', 'Imaging'];
  const dates = generateDates(350);

  return Array.from({ length: 350 }, (_, i) => ({
    appointment_id: `APT-${6000 + i}`,
    patient_id: `PAT-${Math.floor(Math.random() * 200) + 1}`,
    appointment_date: dates[i],
    department: pick(departments),
    appointment_type: pick(types),
    doctor_id: `DOC-${Math.floor(Math.random() * 30) + 1}`,
    wait_time_minutes: maybeNull(Math.floor(randBetween(5, 120)), 0.05),
    duration_minutes: maybeNull(Math.floor(randBetween(15, 90)), 0.04),
    no_show: pick([0, 0, 0, 0, 1, 'Yes', 'No', null]),
    billing_amount: maybeNull(`$${randBetween(50, 5000)}`, 0.06),
    insurance_type: pick(['Private', 'Medicare', 'Medicaid', 'Uninsured', null]),
    satisfaction_score: maybeNull(randBetween(1, 5), 0.08),
    city: pick(['Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler'])
  }));
}

function generateSaaSData() {
  const plans = ['Starter', 'Professional', 'Enterprise', 'Enterprise Plus'];
  const statuses = ['Active', 'Active', 'Churned', 'Trial', 'Paused', 'active', null];
  const dates = generateDates(280, 2022);

  return Array.from({ length: 280 }, (_, i) => ({
    subscription_id: `SUB-${7000 + i}`,
    customer_id: `SCUST-${Math.floor(Math.random() * 200) + 1}`,
    company: `Company ${Math.floor(Math.random() * 200) + 1}`,
    plan: pick(plans),
    start_date: dates[i],
    renewal_date: maybeNull(dates[Math.min(i + 30, 279)], 0.04),
    mrr: maybeNull(pick([99, 299, 999, 2499, 4999, `$99`, `$299`]), 0.03),
    arr: maybeNull(randBetween(1000, 60000), 0.04),
    seats: maybeNull(Math.floor(randBetween(1, 500)), 0.03),
    status: pick(statuses),
    churn_date: maybeNull(dates[Math.floor(Math.random() * 280)], 0.85),
    nps_score: maybeNull(Math.floor(randBetween(0, 10)), 0.10),
    support_tickets: Math.floor(randBetween(0, 50)),
    industry: pick(['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', null])
  }));
}