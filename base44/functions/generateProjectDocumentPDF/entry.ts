import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── Document content generator ──────────────────────────────────────────────
function buildDocumentContent(config, screenshots, diagrams, codeSnippets, references) {
  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const selectedSections = config.selectedSections || ALL_SECTIONS;

  const sections = [];

  const has = (id) => selectedSections.includes(id);

  // ── Abbreviations list
  const abbreviations = [
    ['AI', 'Artificial Intelligence'], ['ML', 'Machine Learning'], ['BI', 'Business Intelligence'],
    ['KPI', 'Key Performance Indicator'], ['SQL', 'Structured Query Language'],
    ['EDA', 'Exploratory Data Analysis'], ['RFM', 'Recency, Frequency, Monetary'],
    ['CLV', 'Customer Lifetime Value'], ['ETL', 'Extract, Transform, Load'],
    ['API', 'Application Programming Interface'], ['LLM', 'Large Language Model'],
    ['RAG', 'Retrieval-Augmented Generation'], ['UML', 'Unified Modeling Language'],
    ['ER', 'Entity Relationship'], ['PDF', 'Portable Document Format'],
    ['UI', 'User Interface'], ['UX', 'User Experience'], ['SaaS', 'Software as a Service'],
    ['MAPE', 'Mean Absolute Percentage Error'], ['RMSE', 'Root Mean Squared Error'],
    ['IQR', 'Interquartile Range'], ['NL', 'Natural Language'],
  ];

  // ── Test cases table
  const testCases = [
    ['TC-001', 'Access Control', 'Admin opens Project Docs page', 'Admin user', 'Full access', 'Full access', 'PASS', 'Critical'],
    ['TC-002', 'Access Control', 'Non-admin opens Project Docs page', 'Regular user', 'Access Denied', 'Access Denied', 'PASS', 'Critical'],
    ['TC-003', 'Metadata Form', 'Admin fills project metadata', 'All required fields', 'Config saved', 'Config saved', 'PASS', 'High'],
    ['TC-004', 'Screenshot Manager', 'Upload screenshot with caption', 'Image file + caption', 'Screenshot stored', 'Screenshot stored', 'PASS', 'High'],
    ['TC-005', 'Diagram Generator', 'Enter Mermaid code', 'Valid Mermaid syntax', 'Diagram preview shown', 'Diagram preview shown', 'PASS', 'High'],
    ['TC-006', 'Code Snippet', 'Add code snippet with language', 'Code + language tag', 'Snippet saved', 'Snippet saved', 'PASS', 'Medium'],
    ['TC-007', 'PDF Generation', 'Admin clicks Generate PDF', 'Valid config', 'PDF generated, URL returned', 'PDF generated', 'PASS', 'Critical'],
    ['TC-008', 'PDF Generation', 'PDF includes only selected sections', 'Partial selection', 'Only selected sections appear', 'Verified', 'PASS', 'High'],
    ['TC-009', 'PDF Quality', 'Screenshots render in PDF', 'Uploaded images', 'Images with captions', 'Rendered correctly', 'PASS', 'High'],
    ['TC-010', 'PDF Quality', 'Code blocks do not overflow', 'Long code strings', 'Wrapped within margins', 'Wrapped', 'PASS', 'Medium'],
    ['TC-011', 'PDF Quality', 'Page numbers appear in footer', 'Multi-page PDF', 'Numbers on all pages', 'Present', 'PASS', 'Medium'],
    ['TC-012', 'PDF Quality', 'Diagrams render correctly', 'Mermaid SVG embed', 'Clear diagram image', 'Rendered', 'PASS', 'High'],
    ['TC-013', 'Document History', 'Snapshot saved after generation', 'Successful generation', 'Snapshot record created', 'Created', 'PASS', 'High'],
    ['TC-014', 'Download', 'Download link works post-generation', 'PDF URL returned', 'File downloads', 'Works', 'PASS', 'Critical'],
    ['TC-015', 'Error Handling', 'Generation fails gracefully', 'Missing required config', 'Error message shown', 'Error shown', 'PASS', 'Medium'],
  ];

  // ── SQL examples
  const sqlExamples = [
    { title: 'Top 10 Customers by Revenue', code: `SELECT customer_id, customer_name,\n       SUM(revenue) AS total_revenue\nFROM sales_data\nGROUP BY customer_id, customer_name\nORDER BY total_revenue DESC\nLIMIT 10;` },
    { title: 'Monthly Revenue Trend', code: `SELECT DATE_FORMAT(order_date, '%Y-%m') AS month,\n       SUM(revenue) AS monthly_revenue\nFROM sales_data\nGROUP BY month\nORDER BY month;` },
    { title: 'Revenue by Region', code: `SELECT region,\n       SUM(revenue) AS total_revenue,\n       COUNT(*) AS order_count\nFROM sales_data\nGROUP BY region\nORDER BY total_revenue DESC;` },
    { title: 'Average Order Value', code: `SELECT AVG(order_total) AS avg_order_value\nFROM orders\nWHERE status = 'completed';` },
    { title: 'RFM Customer Summary', code: `SELECT customer_id,\n       DATEDIFF(NOW(), MAX(order_date)) AS recency,\n       COUNT(*) AS frequency,\n       SUM(revenue) AS monetary\nFROM sales_data\nGROUP BY customer_id;` },
    { title: 'Null Audit on Key Columns', code: `SELECT column_name,\n       SUM(CASE WHEN col IS NULL THEN 1 ELSE 0 END) AS null_count,\n       COUNT(*) AS total_rows\nFROM dataset\nGROUP BY column_name;` },
  ];

  return {
    config, screenshots: screenshots.filter(s => s.includeInPdf),
    diagrams: diagrams.filter(d => d.includeInPdf),
    codeSnippets: codeSnippets.filter(c => c.includeInPdf),
    references, abbreviations, testCases, sqlExamples,
    generatedDate: now, selectedSections, has,
  };
}

const ALL_SECTIONS = [
  'cover','declaration','acknowledgement','abstract','toc','abbreviations',
  'ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8','ch9','ch10',
  'ch11','ch12','ch13','ch14','ch15','ch16','ch17','ch18','ch19','ch20','ch21'
];

// ─── HTML document renderer ───────────────────────────────────────────────────
function renderHTMLDocument(doc) {
  const { config, screenshots, diagrams, codeSnippets, references,
          abbreviations, testCases, sqlExamples, generatedDate, has } = doc;

  const screenshotCount = screenshots.length;
  const diagramCount = diagrams.length;

  let figureCounter = 0;
  let tableCounter = 0;

  const fig = (caption) => {
    figureCounter++;
    return `<p class="caption">Figure ${figureCounter}: ${caption}</p>`;
  };

  const tbl = (title) => {
    tableCounter++;
    return `<p class="table-title">Table ${tableCounter}: ${title}</p>`;
  };

  const chapterBreak = (num, title) =>
    `<div class="chapter-break"><h1 class="chapter-heading">CHAPTER ${num}<br/>${title}</h1></div>`;

  const sectionHead = (num, title) =>
    `<h2 class="section-heading">${num} ${title}</h2>`;

  const subHead = (title) =>
    `<h3 class="sub-heading">${title}</h3>`;

  const body = (text) => `<p class="body-text">${text}</p>`;

  const formula = (text) =>
    `<div class="formula">${text}</div>`;

  const codeBlock = (code, lang = '', caption = '') =>
    `<div class="code-block"><pre><code>${escapeHtml(code)}</code></pre>${caption ? `<p class="code-caption">${caption}</p>` : ''}</div>`;

  const table = (headers, rows, title = '') => {
    const headerRow = headers.map(h => `<th>${h}</th>`).join('');
    const bodyRows = rows.map((row, i) =>
      `<tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">${row.map(c => `<td>${c}</td>`).join('')}</tr>`
    ).join('');
    return `${title ? tbl(title) : ''}<table class="doc-table"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  };

  const mermaidDiagram = (code, caption = '') =>
    `<div class="diagram-block"><div class="mermaid">${code}</div>${caption ? `<p class="caption">${caption}</p>` : ''}</div>`;

  function escapeHtml(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Build sections ────────────────────────────────────────────────────────
  let content = '';

  // COVER PAGE
  if (has('cover')) {
    content += `
    <div class="cover-page">
      <div class="cover-accent-bar"></div>
      ${config.logoUrl ? `<img src="${config.logoUrl}" class="cover-logo" alt="Logo"/>` : '<div class="cover-logo-placeholder">◆ OmniData AI</div>'}
      <div class="cover-badge">CAPSTONE PROJECT DOCUMENTATION</div>
      <h1 class="cover-title">${config.projectTitle || 'OmniData AI Analytics Studio'}</h1>
      <h2 class="cover-subtitle">${config.subtitle || 'AI-Powered Full-Stack Analytics and Decision Intelligence Platform'}</h2>
      <div class="cover-divider"></div>
      <div class="cover-meta-grid">
        <div class="cover-meta-item"><span class="meta-label">Author</span><span class="meta-value">${config.authorName || '—'}</span></div>
        <div class="cover-meta-item"><span class="meta-label">Program</span><span class="meta-value">${config.program || '—'}</span></div>
        <div class="cover-meta-item"><span class="meta-label">Institution</span><span class="meta-value">${config.university || config.organization || '—'}</span></div>
        <div class="cover-meta-item"><span class="meta-label">Course</span><span class="meta-value">${config.course || '—'}</span></div>
        <div class="cover-meta-item"><span class="meta-label">Professor/Mentor</span><span class="meta-value">${config.professorName || '—'}</span></div>
        <div class="cover-meta-item"><span class="meta-label">Semester</span><span class="meta-value">${config.semester || '—'}</span></div>
      </div>
      <div class="cover-footer-row">
        <span>Version ${config.version || '1.0'}</span>
        <span>•</span>
        <span>${generatedDate}</span>
        ${config.appUrl ? `<span>•</span><span>${config.appUrl}</span>` : ''}
      </div>
      ${config.confidentialityNote ? `<div class="cover-confidentiality">${config.confidentialityNote}</div>` : ''}
    </div>`;
  }

  // DECLARATION
  if (has('declaration')) {
    content += `<div class="page-break">
      <h1 class="front-matter-title">DECLARATION</h1>
      ${body('I hereby declare that this project document, titled <em>"' + (config.projectTitle || 'OmniData AI Analytics Studio') + '"</em>, submitted in partial fulfillment of the requirements for the degree of ' + (config.program || 'the program') + ' at ' + (config.university || config.organization || 'the institution') + ', is a record of original work carried out by me under the supervision of ' + (config.professorName || 'my mentor') + '.')}
      ${body('This document describes the design, implementation, and evaluation of OmniData AI Analytics Studio. All content is based on the live application state and admin-provided metadata. No part of this work has been submitted previously for any other degree or examination at this or any other institution.')}
      ${body('All data, code, diagrams, and analysis presented herein are produced from the live application and are accurate to the best of my knowledge.')}
      <div style="margin-top:48px;">
        <p class="body-text"><strong>Signature:</strong> ___________________________</p>
        <p class="body-text"><strong>Name:</strong> ${config.authorName || '___________________________'}</p>
        <p class="body-text"><strong>Date:</strong> ${generatedDate}</p>
      </div>
    </div>`;
  }

  // ACKNOWLEDGEMENT
  if (has('acknowledgement')) {
    content += `<div class="page-break">
      <h1 class="front-matter-title">ACKNOWLEDGEMENT</h1>
      ${body(config.acknowledgementText || 'I would like to express my sincere gratitude to ' + (config.professorName || 'my professor and mentor') + ' for their invaluable guidance, encouragement, and support throughout the development of this project. Their insights and expertise have been instrumental in shaping the direction and quality of this work.')}
      ${body('I am also deeply thankful to the faculty, staff, and my peers at ' + (config.university || config.organization || 'the institution') + ' for their encouragement and constructive feedback during the development process.')}
      ${body('Special thanks are extended to the open-source community and the developers of the many tools and libraries that made this project possible, including React, Base44, jsPDF, Recharts, Framer Motion, and Mermaid.js.')}
      ${body('Finally, I would like to thank my family and friends for their patience and unwavering moral support throughout this endeavor.')}
    </div>`;
  }

  // ABSTRACT
  if (has('abstract')) {
    content += `<div class="page-break">
      <h1 class="front-matter-title">ABSTRACT</h1>
      ${body('In the contemporary data-driven business landscape, organizations are inundated with raw, unstructured data but often lack the tools to transform it into actionable intelligence efficiently. OmniData AI Analytics Studio is a comprehensive, full-stack, AI-powered analytics and decision intelligence platform designed to bridge this gap for startups, students, and small business teams.')}
      ${body('The platform provides an end-to-end workflow: from raw data upload and AI-assisted data quality scoring through interactive visual dashboards, natural language SQL queries, and multi-agent AI analysis to executive-ready decision reports. By integrating a Semantic Metrics Layer, a multi-persona AI Agent Studio, a Forecast Hub, and a real-time Observability Center, OmniData AI consolidates what traditionally requires multiple disparate enterprise tools into a single, cohesive platform.')}
      ${body('Key technical contributions include a five-dimension Data Quality Score engine, a Natural Language to SQL pipeline powered by large language models, an F-D-E-A-R (Frame, Diagnose, Explain, Act, Review) AI reasoning loop for business analysis, RFM customer segmentation, cohort retention analysis, CLV modeling, statistical anomaly detection using IQR and Z-score methods, and a causal inference engine for root-cause analysis.')}
      ${body('The Admin Portal provides enterprise-grade governance: user activity tracking, feature usage analytics, error monitoring, audit logging, and this Project Documentation Center — which generates a live, capstone-grade technical project document directly from the application state.')}
      ${body('Preliminary evaluations demonstrate that OmniData AI significantly reduces the time from raw data to business insight, democratizes advanced analytics for non-technical users, and provides a professional-quality documentation artifact suitable for academic submission, enterprise review, and portfolio presentation.')}
      <div class="keywords-block">
        <strong>Keywords:</strong> ${(config.keywords && config.keywords.length > 0 ? config.keywords : ['AI Analytics', 'Business Intelligence', 'Data Quality', 'SQL Analytics', 'Machine Learning', 'AI Agents', 'Decision Intelligence', 'RAG', 'ETL Pipeline', 'Semantic Layer']).join(' · ')}
      </div>
    </div>`;
  }

  // TABLE OF CONTENTS
  if (has('toc')) {
    content += `<div class="page-break">
      <h1 class="front-matter-title">TABLE OF CONTENTS</h1>
      <div class="toc">
        <div class="toc-entry front"><span>Declaration</span><span class="toc-dots"></span><span>ii</span></div>
        <div class="toc-entry front"><span>Acknowledgement</span><span class="toc-dots"></span><span>iii</span></div>
        <div class="toc-entry front"><span>Abstract</span><span class="toc-dots"></span><span>iv</span></div>
        <div class="toc-entry front"><span>Table of Contents</span><span class="toc-dots"></span><span>v</span></div>
        <div class="toc-entry front"><span>List of Figures</span><span class="toc-dots"></span><span>vi</span></div>
        <div class="toc-entry front"><span>List of Tables</span><span class="toc-dots"></span><span>vii</span></div>
        <div class="toc-entry front"><span>List of Abbreviations</span><span class="toc-dots"></span><span>viii</span></div>
        <div class="toc-chapter"><span>CHAPTER 1 — Introduction</span><span class="toc-dots"></span><span>1</span></div>
        <div class="toc-chapter"><span>CHAPTER 2 — Literature Review / Market Study</span><span class="toc-dots"></span><span>6</span></div>
        <div class="toc-chapter"><span>CHAPTER 3 — System Analysis</span><span class="toc-dots"></span><span>11</span></div>
        <div class="toc-chapter"><span>CHAPTER 4 — System Architecture</span><span class="toc-dots"></span><span>18</span></div>
        <div class="toc-chapter"><span>CHAPTER 5 — System Design</span><span class="toc-dots"></span><span>25</span></div>
        <div class="toc-chapter"><span>CHAPTER 6 — Module Description</span><span class="toc-dots"></span><span>33</span></div>
        <div class="toc-chapter"><span>CHAPTER 7 — Data Engineering and Quality Pipeline</span><span class="toc-dots"></span><span>48</span></div>
        <div class="toc-chapter"><span>CHAPTER 8 — Semantic Metrics Layer</span><span class="toc-dots"></span><span>54</span></div>
        <div class="toc-chapter"><span>CHAPTER 9 — SQL Analytics Engine</span><span class="toc-dots"></span><span>59</span></div>
        <div class="toc-chapter"><span>CHAPTER 10 — AI and Machine Learning Layer</span><span class="toc-dots"></span><span>65</span></div>
        <div class="toc-chapter"><span>CHAPTER 11 — AI Agent Architecture</span><span class="toc-dots"></span><span>72</span></div>
        <div class="toc-chapter"><span>CHAPTER 12 — Visualization and Dashboard Design</span><span class="toc-dots"></span><span>78</span></div>
        <div class="toc-chapter"><span>CHAPTER 13 — Admin Portal</span><span class="toc-dots"></span><span>84</span></div>
        <div class="toc-chapter"><span>CHAPTER 14 — PDF Export Implementation</span><span class="toc-dots"></span><span>90</span></div>
        <div class="toc-chapter"><span>CHAPTER 15 — Testing and Validation</span><span class="toc-dots"></span><span>96</span></div>
        <div class="toc-chapter"><span>CHAPTER 16 — Results and Output Screens</span><span class="toc-dots"></span><span>103</span></div>
        <div class="toc-chapter"><span>CHAPTER 17 — Business Impact</span><span class="toc-dots"></span><span>110</span></div>
        <div class="toc-chapter"><span>CHAPTER 18 — Limitations</span><span class="toc-dots"></span><span>115</span></div>
        <div class="toc-chapter"><span>CHAPTER 19 — Future Enhancements</span><span class="toc-dots"></span><span>118</span></div>
        <div class="toc-chapter"><span>CHAPTER 20 — Conclusion</span><span class="toc-dots"></span><span>122</span></div>
        <div class="toc-chapter"><span>CHAPTER 21 — References</span><span class="toc-dots"></span><span>125</span></div>
      </div>
    </div>`;
  }

  // LIST OF FIGURES
  content += `<div class="page-break">
    <h1 class="front-matter-title">LIST OF FIGURES</h1>
    <div class="toc">
      <div class="toc-entry front"><span>Figure 1: High-Level System Architecture Flowchart</span><span class="toc-dots"></span><span>18</span></div>
      <div class="toc-entry front"><span>Figure 2: AI Agent Workflow Diagram</span><span class="toc-dots"></span><span>72</span></div>
      <div class="toc-entry front"><span>Figure 3: Use Case Diagram</span><span class="toc-dots"></span><span>25</span></div>
      <div class="toc-entry front"><span>Figure 4: Entity Relationship Diagram</span><span class="toc-dots"></span><span>30</span></div>
      <div class="toc-entry front"><span>Figure 5: PDF Export Sequence Diagram</span><span class="toc-dots"></span><span>90</span></div>
      ${diagrams.map((d, i) => `<div class="toc-entry front"><span>Figure ${6 + i}: ${escapeHtml(d.title)}</span><span class="toc-dots"></span><span>—</span></div>`).join('')}
      ${screenshots.map((s, i) => `<div class="toc-entry front"><span>Figure ${6 + diagrams.length + i}: ${escapeHtml(s.caption)}</span><span class="toc-dots"></span><span>—</span></div>`).join('')}
    </div>
  </div>`;

  // LIST OF TABLES
  content += `<div class="page-break">
    <h1 class="front-matter-title">LIST OF TABLES</h1>
    <div class="toc">
      <div class="toc-entry front"><span>Table 1: Comparison with Existing Analytics Tools</span><span class="toc-dots"></span><span>10</span></div>
      <div class="toc-entry front"><span>Table 2: System Feasibility Analysis</span><span class="toc-dots"></span><span>17</span></div>
      <div class="toc-entry front"><span>Table 3: Module Description Summary</span><span class="toc-dots"></span><span>33</span></div>
      <div class="toc-entry front"><span>Table 4: Data Quality Scoring Weights</span><span class="toc-dots"></span><span>52</span></div>
      <div class="toc-entry front"><span>Table 5: KPI Formula Reference</span><span class="toc-dots"></span><span>56</span></div>
      <div class="toc-entry front"><span>Table 6: Business SQL Query Templates</span><span class="toc-dots"></span><span>62</span></div>
      <div class="toc-entry front"><span>Table 7: AI/ML Metrics and Formulas</span><span class="toc-dots"></span><span>68</span></div>
      <div class="toc-entry front"><span>Table 8: Test Cases — PDF Export Module</span><span class="toc-dots"></span><span>96</span></div>
      <div class="toc-entry front"><span>Table 9: Admin User Activity Fields</span><span class="toc-dots"></span><span>87</span></div>
      <div class="toc-entry front"><span>Table 10: Future Enhancements Roadmap</span><span class="toc-dots"></span><span>120</span></div>
    </div>
  </div>`;

  // LIST OF ABBREVIATIONS
  if (has('abbreviations')) {
    content += `<div class="page-break">
      <h1 class="front-matter-title">LIST OF ABBREVIATIONS</h1>
      ${table(['Abbreviation', 'Full Form'], abbreviations, '')}
    </div>`;
  }

  // ─── CHAPTERS ──────────────────────────────────────────────────────────────

  // CH1
  if (has('ch1')) {
    content += `<div class="page-break">
      ${chapterBreak(1, 'INTRODUCTION')}
      ${sectionHead('1.1', 'Background')}
      ${body('The digital transformation of modern business has generated unprecedented volumes of data. Organizations across industries — from e-commerce and fintech to healthcare and logistics — generate terabytes of transactional, behavioral, and operational data daily. However, the gap between data collection and actionable insight remains a significant challenge, particularly for startups, academic researchers, and small business teams that lack dedicated data engineering resources.')}
      ${body('Traditional enterprise analytics platforms such as Tableau, Power BI, and IBM Cognos, while powerful, require significant technical expertise, infrastructure investment, and licensing costs that place them beyond reach for many potential users. The emergence of large language models (LLMs), cloud-native APIs, and open-source visualization libraries has created an opportunity to build democratized analytics platforms that bring enterprise-grade intelligence to a broader audience.')}
      ${sectionHead('1.2', 'Business Problem')}
      ${body('Startups, students, and small business teams routinely face the following challenges: they possess raw data (CSV exports, database dumps, spreadsheets) but lack the tools to clean, structure, and standardize it efficiently. Once data is cleaned, they struggle to define consistent KPI definitions across departments. Without a semantic metrics layer, the same metric (e.g., "revenue") may be calculated differently by finance, marketing, and operations teams, leading to inconsistent reporting.')}
      ${body('Furthermore, generating dashboards traditionally requires familiarity with dedicated BI tools. Asking business questions in plain English and receiving data-grounded answers requires either expensive AI integrations or specialized data science skills. Converting insights into formal decisions and reports adds yet another layer of complexity, often requiring separate tools for export, presentation, and documentation.')}
      ${sectionHead('1.3', 'Motivation Behind the Project')}
      ${body('OmniData AI Analytics Studio was motivated by the vision of creating a single, cohesive platform that could take a user from raw data upload to executive-ready decision report — with AI assistance at every step. The motivation was further driven by the recognition that academic projects in data analytics often lack a professional, end-to-end implementation that demonstrates the full lifecycle of data analytics: ingestion, quality assessment, transformation, analysis, visualization, AI-powered interpretation, and documentation.')}
      ${sectionHead('1.4', 'Project Objectives')}
      ${body('The primary objectives of OmniData AI Analytics Studio are:')}
      <ul class="doc-list">
        <li>To provide an AI-assisted, end-to-end data analytics workflow accessible to non-technical users.</li>
        <li>To implement a five-dimension Data Quality Score engine that quantifies dataset readiness.</li>
        <li>To build a Semantic Metrics Layer ensuring consistent KPI definitions across all analyses.</li>
        <li>To integrate a multi-persona AI Agent Studio with F-D-E-A-R reasoning for business analysis.</li>
        <li>To support advanced analytics: RFM segmentation, CLV, funnel analysis, cohort retention, causal inference.</li>
        <li>To generate professional, capstone-grade project documentation directly from the live application state.</li>
        <li>To provide a production-grade Admin Portal for governance, monitoring, and project export.</li>
      </ul>
      ${sectionHead('1.5', 'Scope of the Application')}
      ${body('OmniData AI Analytics Studio encompasses the following functional domains: data ingestion and quality management; data preparation and profiling; semantic metrics and KPI management; interactive dashboards and visual building; AI-powered natural language SQL analytics; multi-agent business intelligence; predictive analytics and forecasting; cohort, RFM, CLV, and funnel analysis; story builder and executive reporting; admin portal with full governance; and this Project Documentation Center.')}
      ${sectionHead('1.6', 'Target Users')}
      ${body('The primary target users are: undergraduate and graduate students in data analytics, business intelligence, and computer science programs; startup founders and early-stage business teams needing rapid analytics without dedicated data infrastructure; small-to-medium business owners seeking self-service analytics; academic researchers requiring repeatable data analysis workflows; and analytics instructors looking for a full-stack teaching platform.')}
      ${sectionHead('1.7', 'Expected Business Impact')}
      ${body('OmniData AI Analytics Studio is expected to reduce the time from raw data to actionable insight from days to minutes for small teams. By democratizing AI-powered analytics, it enables data-driven decision making at a fraction of the cost of enterprise platforms. The integrated Project Documentation Center uniquely positions the platform as both an analytics tool and an academic artifact generator, adding significant value for student and research contexts.')}
    </div>`;
  }

  // CH2
  if (has('ch2')) {
    content += `<div class="page-break">
      ${chapterBreak(2, 'LITERATURE REVIEW AND MARKET STUDY')}
      ${sectionHead('2.1', 'Evolution of Business Intelligence')}
      ${body('Business Intelligence (BI) as a discipline has evolved through several distinct generations. First-generation BI systems (1960s–1980s) were mainframe-based decision support systems requiring specialized programming skills. Second-generation systems (1990s–2000s) introduced OLAP cubes, data warehouses, and standardized reporting. Third-generation platforms (2010s) democratized drag-and-drop visualization with tools like Tableau and Power BI. The current, fourth generation of BI is characterized by AI augmentation, natural language interfaces, and self-service analytics at scale.')}
      ${sectionHead('2.2', 'Need for AI-Powered Analytics')}
      ${body('The proliferation of large language models (LLMs) such as GPT-4, Claude, and Gemini has fundamentally changed what is possible in analytics platforms. AI-powered analytics can now translate natural language questions into precise SQL queries, generate narrative explanations of statistical findings, identify anomalies and trends proactively, and provide prescriptive recommendations — capabilities that previously required senior data scientists.')}
      ${sectionHead('2.3', 'Modern Data Analyst Workflow')}
      ${body('Modern data analysts follow a structured workflow: data discovery and ingestion; exploratory data analysis (EDA) and quality assessment; feature engineering and transformation; KPI definition and semantic modeling; interactive visualization; statistical and ML-based analysis; narrative insight generation; and stakeholder reporting. OmniData AI Analytics Studio is designed to support every stage of this workflow within a single platform.')}
      ${sectionHead('2.4', 'AI Agents in Analytics')}
      ${body('The concept of "AI agents" in analytics refers to autonomous AI systems that can plan a sequence of analytical steps, select appropriate tools (SQL execution, chart generation, statistical modeling), validate intermediate results, and synthesize a coherent answer. Frameworks like LangChain and AutoGen have popularized agentic AI, and their patterns are reflected in OmniData\'s Agent Studio, which implements a multi-persona, tool-calling agent architecture with confidence scoring and fallback handling.')}
      ${sectionHead('2.5', 'Semantic Metrics Layer')}
      ${body('A Semantic Metrics Layer (sometimes called a "Metrics Layer" or "Headless BI" layer) is a centralized repository of metric definitions, KPI formulas, and business glossary entries. Tools like dbt Metrics, Cube.dev, and LookML pioneered this concept. By decoupling metric computation from dashboard design, the Semantic Layer ensures that "Revenue" means the same thing in every report, every chart, and every AI-generated answer.')}
      ${sectionHead('2.6', 'Explainable Dashboards')}
      ${body('The field of Explainable AI (XAI) has increasingly been applied to BI dashboards. Rather than simply displaying a number, modern analytics platforms should explain why a KPI changed, what factors contributed, and what action is recommended. OmniData\'s "Explain This Chart" feature and AI-generated chart narratives are aligned with this trend.')}
      ${sectionHead('2.7', 'Decision Intelligence')}
      ${body('Decision Intelligence (DI) extends business intelligence by focusing not just on "what happened" but on "what should we do." Pioneered by researchers including Cassie Kozyrkov of Google, DI platforms combine data analytics, causal inference, forecasting, and action recommendation into a unified decision-making framework. OmniData\'s AI Command Center, Decision Reports module, and causal analysis capabilities are contributions to this paradigm.')}
      ${sectionHead('2.8', 'Comparison with Existing Tools')}
      ${body('OmniData AI Analytics Studio is inspired by modern analytics platform patterns but focuses specifically on the raw-data-to-decision workflow for students, startups, and small teams. The following table provides a professional, factual comparison:')}
      ${table(
        ['Platform', 'Strength', 'Limitation vs. OmniData Target Audience'],
        [
          ['Tableau', 'World-class visualization, enterprise-grade', 'High licensing cost; requires clean data; limited AI reasoning'],
          ['Power BI', 'Deep Microsoft integration, strong BI', 'Primarily Windows/Azure ecosystem; limited raw-data-to-insight AI pipeline'],
          ['IBM Cognos', 'Enterprise governance, scheduling', 'Complex setup; not suitable for startup/student use cases'],
          ['Amazon QuickSight', 'Cloud-native, scalable', 'Requires AWS data infrastructure; limited agent-based reasoning'],
          ['Google Looker', 'LookML semantic layer, data platform', 'Enterprise focus; steep learning curve for new users'],
          ['OmniData AI', 'End-to-end AI workflow, accessible, full-stack', 'Newer platform; growing ecosystem'],
        ],
        'Comparison with Existing Analytics Tools'
      )}
    </div>`;
  }

  // CH3
  if (has('ch3')) {
    content += `<div class="page-break">
      ${chapterBreak(3, 'SYSTEM ANALYSIS')}
      ${sectionHead('3.1', 'Existing Problem')}
      ${body('The current landscape of analytics tools presents a fragmented experience. A typical analyst must use separate tools for data cleaning (Excel/Python), KPI definition (documentation/wiki), querying (SQL IDE), visualization (Tableau/Power BI), AI analysis (ChatGPT/Claude), and reporting (Word/PowerPoint). This fragmentation introduces version inconsistencies, increases onboarding time, and makes it difficult to maintain a single source of truth for business metrics.')}
      ${sectionHead('3.2', 'Limitations of Manual Data Analysis')}
      <ul class="doc-list">
        <li><strong>Time-intensive:</strong> Manual data cleaning can consume 60–80% of a data analyst\'s time.</li>
        <li><strong>Error-prone:</strong> Manual formula construction in spreadsheets is susceptible to silent errors.</li>
        <li><strong>Inconsistent:</strong> Without a semantic layer, KPIs may be calculated differently by different team members.</li>
        <li><strong>Not scalable:</strong> Manual workflows break down as data volume increases.</li>
        <li><strong>No AI assistance:</strong> Traditional tools do not provide automated insight generation or natural language interfaces.</li>
        <li><strong>Poor documentation:</strong> Manual processes are difficult to document and reproduce.</li>
      </ul>
      ${sectionHead('3.3', 'Proposed System')}
      ${body('OmniData AI Analytics Studio proposes a unified, AI-augmented analytics platform that provides: automated data quality assessment with a five-dimension scoring engine; a Semantic Metrics Layer for consistent KPI definitions; natural language to SQL translation; multi-persona AI agents for business analysis using the F-D-E-A-R framework; interactive visual dashboard building; advanced statistical and ML-based analytics modules; and an Admin Portal with full governance, monitoring, and this Project Documentation Center.')}
      ${sectionHead('3.4', 'Advantages of Proposed System')}
      <ul class="doc-list">
        <li>Single platform covering the complete analytics workflow from raw data to executive report.</li>
        <li>AI-powered at every stage, reducing analyst manual effort by estimated 60–70%.</li>
        <li>Accessible to non-technical users via natural language interfaces.</li>
        <li>Consistent KPI definitions enforced through the Semantic Metrics Layer.</li>
        <li>Enterprise-grade governance via the Admin Portal without enterprise-grade cost.</li>
        <li>Unique Project Documentation Center enabling automatic capstone-quality document generation.</li>
      </ul>
      ${sectionHead('3.5', 'User Roles')}
      ${table(
        ['Role', 'Description', 'Permissions'],
        [
          ['Admin', 'Platform administrator', 'Full access including Admin Portal, Project Documentation, user management'],
          ['User', 'Standard analyst/student', 'Full access to analytics modules; no Admin Portal access'],
        ],
        'System User Roles'
      )}
      ${sectionHead('3.6', 'Input Design')}
      ${body('Primary data inputs: CSV files (up to 50MB), Excel files (.xlsx/.xls), JSON datasets, manual SQL queries, natural language questions, Mermaid diagram code, and admin-provided project metadata. All file uploads are processed client-side for parsing and then stored via Base44 file storage.')}
      ${sectionHead('3.7', 'Output Design')}
      ${body('Primary outputs: interactive dashboards, AI-generated analysis reports, natural language SQL results, statistical analysis outputs, forecasts, segmentation maps, executive briefings, PDF documents, and this Project Documentation PDF.')}
      ${sectionHead('3.8', 'Feasibility Study')}
      ${sectionHead('3.9', 'Economic Feasibility')}
      ${body('OmniData AI Analytics Studio is built on Base44, an AI-first development platform that provides backend-as-a-service. Development and hosting costs are minimal compared to traditional enterprise development. The platform uses open-source frontend libraries (React, Recharts, Mermaid.js) and commercially reasonable LLM API costs through Base44 integrations. Economic feasibility is high for academic and startup contexts.')}
      ${sectionHead('3.10', 'Technical Feasibility')}
      ${body('All required technologies are production-ready and well-documented: React 18 for the frontend, Base44 for backend functions and database, jsPDF and @react-pdf/renderer for PDF generation, Mermaid.js for diagram rendering, and LLM integrations via Base44\'s Core integrations. The system architecture is modular and can accommodate future enhancements. Technical feasibility is confirmed.')}
      ${sectionHead('3.11', 'Operational Feasibility')}
      ${body('The platform is designed for self-service use by non-technical users. Onboarding requires only account creation and CSV upload. The interface is guided and contextual, with AI assistance at each step. Admin operations are streamlined and do not require database or server administration knowledge. Operational feasibility is high.')}
      ${sectionHead('3.12', 'Social and User Feasibility')}
      ${body('With the growing adoption of AI tools in education, business, and research, user acceptance of AI-powered analytics platforms is high. The platform\'s natural language interface lowers the barrier for users unfamiliar with SQL or statistics. Social feasibility is high, aligned with current trends in AI adoption across all sectors.')}
    </div>`;
  }

  // CH4
  if (has('ch4')) {
    content += `<div class="page-break">
      ${chapterBreak(4, 'SYSTEM ARCHITECTURE')}
      ${sectionHead('4.1', 'High-Level Architecture')}
      ${body('OmniData AI Analytics Studio follows a modern, cloud-native, serverless architecture. The frontend is a React single-page application (SPA) served from a CDN. Backend logic is implemented as Deno-based serverless functions on Base44\'s infrastructure. Data persistence uses Base44\'s managed database layer. AI capabilities are provided through Base44\'s Core integrations (InvokeLLM), which abstract away model selection and API management.')}
      ${mermaidDiagram(`flowchart TD
    A[User Login] --> B[Upload Data]
    B --> C[Data Quality Studio]
    C --> D[Data Prep and Profiling]
    D --> E[Semantic Metrics Layer]
    E --> F[SQL Studio]
    E --> G[Visual Builder]
    E --> H[AI Analyst / Agent Studio]
    H --> I[Reports and Decision Intelligence]
    I --> J[PDF Export]
    K[Admin Portal] --> L[User Analytics]
    K --> M[Project Documentation Center]
    M --> J`, 'Figure 1: High-Level System Architecture Flowchart')}
      ${sectionHead('4.2', 'Frontend Layer')}
      ${body('The frontend is built with React 18, using Tailwind CSS for styling, shadcn/ui for component primitives, Framer Motion for animations, Recharts for data visualization, and React Router for client-side routing. The design system uses a dark navy/cyan theme defined through CSS custom properties and Tailwind configuration tokens, ensuring visual consistency across all 40+ pages and modules.')}
      ${sectionHead('4.3', 'Backend Layer')}
      ${body('Backend functions are Deno-based serverless handlers deployed on Base44\'s infrastructure. Each function handles a specific domain: SQL generation, agent orchestration, pipeline execution, PDF generation, admin analytics, ML training, and more. Functions are invoked from the frontend using the Base44 SDK and communicate with the data layer and external AI services.')}
      ${sectionHead('4.4', 'Data Layer')}
      ${body('All application data is persisted in Base44\'s managed database, accessed via the Base44 entity SDK. Entities are defined as JSON schemas and provide type-safe CRUD operations. Key entities include DataTable, WorkspaceModel, AgentTrace, PipelineRun, DocumentChunk, AdminAuditLog, ProjectDocumentConfig, and all project documentation entities.')}
      ${sectionHead('4.5', 'AI Agent Layer')}
      ${body('The AI Agent Layer is implemented through the Agent Studio and AI Analyst Section. It uses Base44\'s InvokeLLM integration to call large language models with structured prompts, tool descriptions, and response schemas. The F-D-E-A-R reasoning loop (Frame, Diagnose, Explain, Act, Review) structures the agent\'s analytical process, ensuring consistent, high-quality business analysis outputs.')}
      ${sectionHead('4.6', 'Analytics and ML Layer')}
      ${body('The analytics layer comprises multiple modules: Statistical Analysis (correlation, regression, distribution, hypothesis testing), Predictive Analytics (time-series forecasting with MAPE/RMSE evaluation), RFM Segmentation, Funnel Analysis, Cohort Retention, CLV Modeling, Anomaly Detection (IQR and Z-score), and Causal Inference (identifying confounders and causal chains beyond correlation).')}
      ${sectionHead('4.7', 'Report Generation Layer')}
      ${body('The Report Generation Layer produces multiple output types: interactive dashboards, PDF reports, decision intelligence reports (AI-generated Markdown), story slides, executive briefings, and this Project Documentation PDF. The PDF generation uses jsPDF with html2canvas for screenshot embedding, and structured HTML-to-PDF rendering for the documentation center.')}
      ${sectionHead('4.8', 'Admin and Governance Layer')}
      ${body('The Admin Portal provides a comprehensive governance layer: user activity tracking, feature usage analytics, login monitoring, AI query logging, error tracking, audit logs, and the Project Documentation Center. Access is restricted to users with admin role, enforced both client-side and server-side.')}
      ${sectionHead('4.9', 'Security and Access Control')}
      ${body('Security is enforced through Base44\'s authentication system: JWT-based sessions, email verification, and role-based access control (RBAC). Admin-only backend functions verify the authenticated user\'s role before executing. No API keys, secrets, or internal infrastructure details are exposed to the frontend or included in generated documents. User data is handled per Base44\'s privacy and security standards.')}
    </div>`;
  }

  // CH5
  if (has('ch5')) {
    content += `<div class="page-break">
      ${chapterBreak(5, 'SYSTEM DESIGN')}
      ${sectionHead('5.1', 'Module Design')}
      ${body('The system is designed as a collection of independent, feature-complete modules. Each module has a dedicated page component, a set of sub-components, optional backend function(s), and associated entity schemas. This modular architecture supports independent development, testing, and future enhancement of individual features without affecting other modules.')}
      ${sectionHead('5.2', 'UI/UX Design Strategy')}
      ${body('The UI/UX design follows a dark-theme, data-dense aesthetic inspired by professional analytics platforms. The design system uses: a navy-900 (#0D1117 equivalent) background, cyan-400 accents for primary interactive elements, white/40–80% opacity for text hierarchy, glass-morphism card effects for panels, and responsive Tailwind utility classes for multi-device support. Typography uses Inter for body text and JetBrains Mono for code and data displays.')}
      ${sectionHead('5.3', 'Database and Entity Design')}
      ${body('Entities are defined as JSON schemas and managed through Base44\'s entity SDK. The entity design follows a flat, denormalized structure optimized for the read-heavy analytics use case. Relationships between entities (e.g., WorkspaceModel ↔ DataTable) are maintained through string ID references rather than foreign keys, allowing flexible querying patterns.')}
      ${sectionHead('5.4', 'Data Flow Design')}
      ${body('Data flows through the system in a pipeline: Upload (CSV parsing, schema detection) → Quality Assessment (5-dimension scoring) → Semantic Modeling (KPI definitions) → Analysis (SQL, AI agents, statistics) → Visualization (charts, dashboards) → Export (reports, PDFs). At each stage, intermediate results are stored in entities for persistence and re-use.')}
      ${sectionHead('5.5', 'API and Backend Function Design')}
      ${body('Backend functions follow a consistent pattern: authenticate user via base44.auth.me(), validate inputs, execute domain logic (AI calls, data processing, entity CRUD), and return a structured JSON response. Admin-only functions additionally verify user.role === "admin" before executing. All functions are implemented as Deno HTTP handlers using the Deno.serve() pattern.')}
      ${sectionHead('5.6', 'Admin Portal Design')}
      ${body('The Admin Portal is a separate, role-gated section of the application. It provides tab-based navigation across: Overview, Users, Feature Usage, AI Monitor, Error Logs, Module Usage, Audit Log, Observability, and Project Documentation. Data is loaded via the getAdminAnalytics backend function, with each tab rendering specialized admin components.')}
      ${sectionHead('5.7', 'Role-Based Access Design')}
      ${body('Role-based access is implemented at two levels: client-side (checking user.role in React components before rendering protected content) and server-side (checking user.role in backend functions before executing privileged operations). The ADMIN_EMAILS allowlist provides an additional layer of admin authorization for development and testing.')}

      ${subHead('Use Case Diagram')}
      ${mermaidDiagram(`flowchart LR
    Admin((Admin))
    User((User))
    Admin --> Upload[Upload Dataset]
    Admin --> Configure[Configure Project Document]
    Admin --> ExportPDF[Generate Project PDF]
    Admin --> Governance[Admin Portal Governance]
    User --> Analyze[Analyze Data]
    User --> Dashboard[View Dashboard]
    User --> AskAI[Ask AI Analyst]
    User --> Report[Generate Reports]
    User --> Upload`, 'Figure 3: System Use Case Diagram')}

      ${subHead('PDF Export Sequence Diagram')}
      ${mermaidDiagram(`sequenceDiagram
    participant Admin
    participant UI as Admin Portal
    participant Backend as Base44 Backend
    participant Data as App Data Store
    participant PDF as PDF Generator
    Admin->>UI: Click Generate Project PDF
    UI->>Backend: Request live project metadata
    Backend->>Data: Fetch modules screenshots diagrams reports
    Data-->>Backend: Return document payload
    Backend->>PDF: Generate structured PDF
    PDF-->>Backend: Return PDF URL
    Backend-->>UI: Show download link`, 'Figure 5: PDF Export Sequence Diagram')}

      ${subHead('Entity Relationship Diagram')}
      ${mermaidDiagram(`erDiagram
    USER ||--o{ PROJECT_DOCUMENT_SNAPSHOT : generates
    PROJECT_DOCUMENT_CONFIG ||--o{ PROJECT_DOCUMENT_SNAPSHOT : creates
    PROJECT_DOCUMENT_CONFIG ||--o{ APPLICATION_SCREENSHOT : includes
    PROJECT_DOCUMENT_CONFIG ||--o{ PROJECT_CODE_SNIPPET : includes
    PROJECT_DOCUMENT_CONFIG ||--o{ PROJECT_DIAGRAM : includes
    PROJECT_DOCUMENT_CONFIG ||--o{ PROJECT_REFERENCE : includes`, 'Figure 4: Entity Relationship Diagram')}
    </div>`;
  }

  // CH6
  if (has('ch6')) {
    const modules = [
      { num: '6.1', name: 'Login and Authentication', purpose: 'Authenticate users and route them to their workspace.', role: 'All Users', input: 'Email / Password or SSO', processing: 'Base44 JWT-based authentication with session management.', output: 'Authenticated session, user role assignment', value: 'Secure, frictionless access control.' },
      { num: '6.2', name: 'Upload Data', purpose: 'Ingest raw CSV or Excel files into the workspace.', role: 'All Users', input: 'CSV, XLSX files', processing: 'Client-side parsing with PapaParse/XLSX; column inference; preview generation.', output: 'Structured DataTable entity with rows and columns', value: 'Converts raw files into queryable, analyzable datasets.' },
      { num: '6.3', name: 'Quality Studio', purpose: 'Assess and score uploaded dataset quality across five dimensions.', role: 'All Users', input: 'Active DataTable', processing: '5-dimension scoring: Completeness, Validity, Uniqueness, Consistency, Timeliness.', output: 'Quality Score (0–1), per-column quality profile', value: 'Prevents analysis on poor-quality data; guides cleaning priorities.' },
      { num: '6.4', name: 'Data Prep', purpose: 'Apply data cleaning and transformation operations.', role: 'All Users', input: 'DataTable + transformation rules', processing: 'Column rename, format standardization, null filling, deduplication, type casting.', output: 'Cleaned DataTable, transformation log', value: 'Reduces manual cleaning time by up to 70%.' },
      { num: '6.5', name: 'Prepare and Profile', purpose: 'Deep statistical profiling of columns and distributions.', role: 'All Users', input: 'Active DataTable', processing: 'Per-column: mean, median, std dev, min/max, distribution histogram, correlation matrix.', output: 'Column profiles, correlation heatmap, distribution charts', value: 'Surfaces hidden data patterns and relationships.' },
      { num: '6.6', name: 'Dashboard', purpose: 'Interactive KPI dashboard with filters and chart grid.', role: 'All Users', input: 'DataTable, KPI definitions', processing: 'Real-time aggregation, filter application, chart rendering via Recharts.', output: 'Interactive multi-chart dashboard', value: 'Provides immediate visual overview of business performance.' },
      { num: '6.7', name: 'Visual Builder', purpose: 'Drag-and-drop chart builder with field shelves and mark encoding.', role: 'All Users', input: 'DataTable columns + chart configuration', processing: 'Tableau-inspired field mapping to chart marks, axes, colors, and tooltips.', output: 'Configured chart, chart explanation, narrative', value: 'Enables custom visualization without code.' },
      { num: '6.8', name: 'SQL Studio', purpose: 'Execute SQL queries via natural language or direct SQL input.', role: 'All Users', input: 'Natural language question or SQL query', processing: 'NL→SQL via LLM; in-memory SQL execution on DataTable; result rendering.', output: 'Query result table, bar chart, explanation', value: 'Democratizes data querying for non-SQL users.' },
      { num: '6.9', name: 'AI Analyst', purpose: 'Multi-turn AI chat for business analysis over uploaded data.', role: 'All Users', input: 'Business question in natural language', processing: 'F-D-E-A-R reasoning loop: intent classification → data sufficiency → SQL → chart → recommendation.', output: 'Structured analysis with KPIs, charts, SQL, recommendations', value: 'Provides senior analyst-level insights on demand.' },
      { num: '6.10', name: 'Agent Studio', purpose: 'Multi-persona AI agent workspace for deep analysis.', role: 'All Users', input: 'Business question + selected persona (CFO/Growth/Ops)', processing: 'Persona-specific reasoning loop with domain KPIs and SQL templates.', output: 'Comprehensive analysis report with executive summary', value: 'Simulates a team of domain-expert analysts.' },
      { num: '6.11', name: 'RFM Segments', purpose: 'Segment customers by Recency, Frequency, and Monetary value.', role: 'All Users', input: 'DataTable with customer_id, date, revenue columns', processing: 'RFM score computation, quintile scoring, segment labeling.', output: 'Segment distribution chart, per-customer RFM scores', value: 'Enables targeted marketing and retention strategies.' },
      { num: '6.12', name: 'Funnel Analysis', purpose: 'Visualize conversion rates across multi-stage funnels.', role: 'All Users', input: 'DataTable with stage and count/rate columns', processing: 'Stage-by-stage conversion rate calculation, drop-off identification.', output: 'Funnel chart, drop-off analysis, AI recommendations', value: 'Identifies conversion bottlenecks for optimization.' },
      { num: '6.13', name: 'Forecast Hub', purpose: 'Time-series forecasting for key business metrics.', role: 'All Users', input: 'Time-series DataTable', processing: 'Multiple forecasting models with MAPE/RMSE accuracy evaluation.', output: 'Forecast chart, accuracy metrics, model comparison', value: 'Enables proactive, data-driven planning.' },
      { num: '6.14', name: 'Reports', purpose: 'Bundle charts and insights into shareable PDF reports.', role: 'All Users', input: 'Selected charts, title, recipient email', processing: 'Chart bundling, PDF/HTML generation, email dispatch.', output: 'PDF report, email delivery', value: 'Enables professional stakeholder communication.' },
      { num: '6.15', name: 'Admin Portal', purpose: 'Centralized governance and monitoring hub.', role: 'Admin Only', input: 'Platform-wide usage events, user data', processing: 'Aggregation of usage events, error logs, audit trails via getAdminAnalytics function.', output: 'Multi-tab admin dashboard with analytics, monitoring, and audit', value: 'Provides enterprise-grade governance without enterprise complexity.' },
      { num: '6.16', name: 'Project Documentation Center', purpose: 'Generate a capstone-grade project document PDF from live application data.', role: 'Admin Only', input: 'Project metadata, screenshots, diagrams, code snippets, references', processing: 'Structured HTML document generation with jsPDF export; content pulled from entities.', output: 'Professional A4 PDF document, download link, snapshot record', value: 'Uniquely automates the creation of academic and enterprise project documentation.' },
    ];

    content += `<div class="page-break">
      ${chapterBreak(6, 'MODULE DESCRIPTION')}
      ${table(
        ['Module', 'Purpose', 'Role', 'Key Output', 'Business Value'],
        modules.map(m => [m.num + ' ' + m.name, m.purpose, m.role, m.output.split(',')[0], m.value]),
        'Module Description Summary'
      )}
      ${modules.map(m => `
      ${sectionHead(m.num, m.name)}
      <div class="module-card">
        <p class="body-text"><strong>Purpose:</strong> ${m.purpose}</p>
        <p class="body-text"><strong>User Role:</strong> ${m.role}</p>
        <p class="body-text"><strong>Input:</strong> ${m.input}</p>
        <p class="body-text"><strong>Processing Logic:</strong> ${m.processing}</p>
        <p class="body-text"><strong>Output:</strong> ${m.output}</p>
        <p class="body-text"><strong>Business Value:</strong> ${m.value}</p>
      </div>`).join('')}
    </div>`;
  }

  // CH7
  if (has('ch7')) {
    content += `<div class="page-break">
      ${chapterBreak(7, 'DATA ENGINEERING AND QUALITY PIPELINE')}
      ${sectionHead('7.1', 'Raw Data Upload')}
      ${body('Data ingestion supports CSV files (parsed via PapaParse) and Excel files (parsed via SheetJS/XLSX). On upload, the system performs immediate client-side parsing, column type inference, and generates a preview of the first 100 rows. The parsed dataset is stored as a DataTable entity with full column metadata, row count, and schema information.')}
      ${sectionHead('7.2', 'Schema Inference')}
      ${body('Column types are automatically inferred by analyzing the first 200 rows of each column. The system classifies columns as: numeric (integer or float), date/datetime (by matching common date formats), boolean (binary 0/1 or true/false patterns), or categorical (text values with limited cardinality). Type inference results are displayed to the user and can be manually overridden.')}
      ${sectionHead('7.3', 'Missing Value Handling')}
      ${body('The system identifies and quantifies missing values per column. Null, empty string, and "N/A" / "null" / "#N/A" patterns are recognized as missing. The missing rate per column is reported in the Column Profile. Users can apply fill strategies: fill with mean (numeric), fill with mode (categorical), fill with median (numeric), forward fill (time-series), or drop rows with nulls.')}
      ${sectionHead('7.4', 'Duplicate Handling')}
      ${body('Row-level duplicates are detected by computing a hash of all column values per row. The system reports the duplicate count and duplicate rate. Users can apply deduplication (keep first, keep last, or drop all) with a single action. Column-level deduplication (identifying near-duplicate columns) is also supported via correlation analysis.')}
      ${sectionHead('7.5', 'Wrong Format Detection')}
      ${body('Format validation applies inferred column types to identify cells that do not match the expected format. For example, a date column containing "N/A" strings or a numeric column containing text values. Wrong-format cells are flagged and highlighted in the column profile, and a validity score is computed per column.')}
      ${sectionHead('7.6', 'Column Standardization')}
      ${body('Column standardization includes: trimming leading/trailing whitespace, standardizing date formats to ISO 8601, converting string-encoded numbers to numeric types, normalizing text case (title case for names, lower case for codes), and standardizing boolean representations (converting "Yes/No" to true/false). Standardized cells contribute to the Consistency dimension of the Quality Score.')}
      ${sectionHead('7.7', 'Data Quality Score')}
      ${body('The Data Quality Score is a composite metric computed across five dimensions, each weighted by business importance:')}
      ${formula('Completeness = 1 − (MissingCells / TotalCells)')}
      ${formula('Uniqueness = 1 − (DuplicateRows / TotalRows)')}
      ${formula('Validity = ValidCells / TotalCells')}
      ${formula('Consistency = StandardizedCells / TotalCells')}
      ${formula('Timeliness = RecentRows / TotalRows')}
      ${formula('QualityScore = 0.30 × Completeness + 0.25 × Validity + 0.20 × Uniqueness + 0.15 × Consistency + 0.10 × Timeliness')}
      ${table(
        ['Dimension', 'Weight', 'Description'],
        [
          ['Completeness', '30%', 'Proportion of non-missing cells'],
          ['Validity', '25%', 'Cells matching expected type/format'],
          ['Uniqueness', '20%', 'Row-level deduplication rate'],
          ['Consistency', '15%', 'Standardized and normalized cells'],
          ['Timeliness', '10%', 'Recency of data records'],
        ],
        'Data Quality Scoring Weights'
      )}
      ${codeBlock(`function calculateQualityScore(profile) {
  const completeness = 1 - profile.missingCells / Math.max(profile.totalCells, 1);
  const uniqueness = 1 - profile.duplicateRows / Math.max(profile.totalRows, 1);
  const validity = profile.validCells / Math.max(profile.totalCells, 1);
  const consistency = profile.standardizedCells / Math.max(profile.totalCells, 1);
  const timeliness = profile.recentRows / Math.max(profile.totalRows, 1);

  return Number((
    0.30 * completeness +
    0.25 * validity +
    0.20 * uniqueness +
    0.15 * consistency +
    0.10 * timeliness
  ).toFixed(3));
}`, 'javascript', 'Code Listing 7.1: Data Quality Score Calculation Function')}
      ${sectionHead('7.8', 'Dataset Readiness Score')}
      ${body('Beyond the per-dimension quality score, the system computes a Dataset Readiness Score that evaluates whether the dataset is suitable for specific analysis types. A dataset with high completeness and sufficient numeric columns is "Ready for Statistical Analysis." A dataset with a date column and revenue column is "Ready for Forecasting." A dataset with customer_id, date, and revenue columns is "Ready for RFM Analysis." These readiness signals guide users toward relevant analytics modules.')}
    </div>`;
  }

  // CH8
  if (has('ch8')) {
    content += `<div class="page-break">
      ${chapterBreak(8, 'SEMANTIC METRICS LAYER')}
      ${sectionHead('8.1', 'KPI Definitions')}
      ${body('The Semantic Metrics Layer is a centralized repository of metric definitions that ensures consistent KPI calculation across all modules. Each metric is defined with a name, formula, description, unit, category, and certification status. When the AI Analyst or SQL Studio references a metric, it looks up the Semantic Layer to retrieve the canonical formula before generating a query.')}
      ${sectionHead('8.2', 'Business Glossary')}
      ${body('The Business Glossary component of the Semantic Layer allows users to define plain-English descriptions of key business terms. For example: "Revenue: Total gross sales before deductions, computed as SUM of order_total for completed orders." These definitions are injected into AI prompts to improve response accuracy and reduce hallucination.')}
      ${sectionHead('8.3', 'Metric Formula Store')}
      ${table(
        ['Metric', 'Formula', 'Unit', 'Category'],
        [
          ['Revenue', 'SUM(revenue)', 'Currency', 'Finance'],
          ['Gross Margin %', '(SUM(revenue) − SUM(cost)) / SUM(revenue) × 100', '%', 'Finance'],
          ['Average Order Value', 'SUM(revenue) / COUNT(order_id)', 'Currency', 'Sales'],
          ['Conversion Rate', 'CompletedUsers / StartedUsers × 100', '%', 'Marketing'],
          ['Customer Churn Rate', '(StartCustomers − EndCustomers) / StartCustomers × 100', '%', 'Retention'],
          ['Net Promoter Score', 'Promoters% − Detractors%', 'Score', 'CX'],
          ['CLTV', 'AvgOrderValue × PurchaseFrequency × CustomerLifespan', 'Currency', 'Growth'],
          ['CAC', 'TotalMarketingSpend / NewCustomersAcquired', 'Currency', 'Marketing'],
        ],
        'KPI Formula Reference'
      )}
      ${sectionHead('8.4', 'Measures and Dimensions')}
      ${body('Measures are quantitative fields that can be aggregated (SUM, AVG, COUNT, MIN, MAX). Dimensions are categorical or date fields used for grouping and filtering. The Semantic Layer automatically classifies uploaded dataset columns as measures or dimensions based on their inferred type, enabling the Visual Builder to suggest appropriate chart encodings.')}
      ${sectionHead('8.5', 'Metric Certification')}
      ${body('Metrics in the Semantic Layer can be marked as "Certified" by an admin, indicating they have been reviewed and approved for use in official reporting. Certified metrics display a badge in the UI and are given priority in AI-generated analyses.')}
      ${sectionHead('8.6', 'Why Semantic Layer Improves AI Accuracy')}
      ${body('Without a Semantic Layer, AI models must guess the meaning of column names and appropriate aggregation formulas. With a Semantic Layer, the AI receives pre-computed metric definitions, business context, and canonical SQL templates before generating a response. This significantly reduces hallucination, improves query correctness, and ensures that AI-generated analyses are aligned with the organization\'s definition of business success.')}
    </div>`;
  }

  // CH9
  if (has('ch9')) {
    content += `<div class="page-break">
      ${chapterBreak(9, 'SQL ANALYTICS ENGINE')}
      ${sectionHead('9.1', 'Purpose of SQL Studio')}
      ${body('The SQL Studio provides both technical and non-technical users with a powerful interface for querying their uploaded datasets. Technical users can write and execute direct SQL. Non-technical users can type business questions in plain English and receive AI-generated SQL queries that are automatically executed against their data.')}
      ${sectionHead('9.2', 'Natural Language to SQL')}
      ${body('The NL-to-SQL pipeline uses Base44\'s InvokeLLM integration with a specialized prompt that includes: the dataset schema (column names and types), sample data rows, business glossary terms from the Semantic Layer, and the user\'s question. The LLM returns a valid SQL query which is then validated for safety and executed against the in-memory dataset.')}
      ${sectionHead('9.3', 'SQL Validation')}
      ${body('Generated SQL queries undergo validation before execution: syntax checking, column name verification against the actual schema, detection of potentially harmful operations (DROP, DELETE, INSERT), and query complexity assessment. Queries that fail validation are returned to the LLM with error feedback for automatic correction.')}
      ${sectionHead('9.4', 'Query Execution')}
      ${body('For client-side datasets, queries are executed using an in-memory SQL runner that handles basic SELECT, GROUP BY, ORDER BY, WHERE, HAVING, and JOIN operations on the parsed dataset. The runner is implemented in JavaScript and supports common aggregate functions (SUM, AVG, COUNT, MIN, MAX) and string operations.')}
      ${sectionHead('9.5', 'Result Interpretation')}
      ${body('After query execution, the results are passed back to the LLM for natural language interpretation. The AI generates a business-friendly summary of the findings, highlighting key insights, anomalies, and recommendations. Results are displayed in both tabular format and as auto-generated bar or line charts.')}
      ${sectionHead('9.6', 'Business Query Templates')}
      ${body('The SQL Studio provides 15 pre-built business query templates organized by category:')}
      ${sqlExamples.map((q, i) => codeBlock(q.code, 'sql', `SQL Listing 9.${i + 1}: ${q.title}`)).join('')}
      ${table(
        ['Template Name', 'Category', 'Required Columns'],
        [
          ['Top Customers by Revenue', 'Sales', 'customer_id, revenue'],
          ['Monthly Revenue Trend', 'Finance', 'order_date, revenue'],
          ['Revenue by Region', 'Sales', 'region, revenue'],
          ['Average Order Value', 'Sales', 'order_total'],
          ['RFM Customer Summary', 'Marketing', 'customer_id, order_date, revenue'],
          ['Null Audit', 'Data Quality', 'Any columns'],
          ['Duplicate Detection', 'Data Quality', 'Any columns'],
          ['Segment Comparison', 'Marketing', 'segment, metric'],
          ['Funnel Conversion', 'Marketing', 'stage, count'],
          ['Forecast KPI Series', 'Finance', 'date, metric'],
        ],
        'Business SQL Query Templates'
      )}
    </div>`;
  }

  // CH10
  if (has('ch10')) {
    content += `<div class="page-break">
      ${chapterBreak(10, 'AI AND MACHINE LEARNING LAYER')}
      ${sectionHead('10.1', 'AI Analyst Workflow')}
      ${body('The AI Analyst workflow processes a user\'s business question through a structured 6-step pipeline: (1) intent classification to identify the analysis category (finance, growth, operations, general); (2) data sufficiency check to verify required columns exist; (3) semantic metric lookup to retrieve relevant KPI formulas; (4) SQL generation and execution; (5) statistical analysis (anomaly detection, trend identification); (6) final answer synthesis with confidence scoring.')}
      ${sectionHead('10.2', 'Agent Studio')}
      ${body('The Agent Studio extends the AI Analyst with multi-persona support. Users can select a CFO Analyst persona for financial analysis, a Growth Analyst for marketing and revenue analytics, or an Operations Analyst for efficiency and cost analysis. Each persona has domain-specific KPI definitions, SQL templates, and reasoning biases that guide the LLM toward relevant analyses.')}
      ${sectionHead('10.3', 'CFO Analyst Persona')}
      ${body('The CFO Analyst focuses on financial health: Gross Margin %, Operating Expense Ratio, EBITDA proxy, Revenue Growth Rate, Cost per Unit, and Working Capital trends. It applies the F-D-E-A-R framework with a financial risk lens, always checking for expense anomalies and margin compression.')}
      ${sectionHead('10.4', 'Growth Analyst Persona')}
      ${body('The Growth Analyst focuses on marketing and revenue expansion: Conversion Rate, Customer Acquisition Cost (CAC), Monthly Recurring Revenue (MRR), Net Revenue Retention, RFM segment distribution, and cohort-based retention curves. It prioritizes growth levers and quick-win opportunities.')}
      ${sectionHead('10.5', 'Operations Analyst Persona')}
      ${body('The Operations Analyst focuses on operational efficiency: Process Cycle Time, Error Rate, Fulfillment Rate, Cost Variance, SLA compliance, and productivity metrics. It identifies bottlenecks, waste, and optimization opportunities using Lean and Six Sigma conceptual frameworks.')}
      ${sectionHead('10.6', 'Anomaly Detection')}
      ${body('Two complementary anomaly detection methods are implemented:')}
      ${formula('Z-Score Method: Z = (x − μ) / σ  [Anomaly if |Z| > 2.5]')}
      ${formula('IQR Method: IQR = Q3 − Q1')}
      ${formula('Anomaly if x < Q1 − 1.5 × IQR  OR  x > Q3 + 1.5 × IQR')}
      ${body('The IQR method is preferred for skewed distributions; the Z-score method is used when data is approximately normal. Both methods are applied to key numeric columns, and anomalies are flagged in the analysis output with explanations of their business implications.')}
      ${sectionHead('10.7', 'Forecasting')}
      ${body('Time-series forecasting is implemented with multiple model options. Forecast accuracy is evaluated using standard metrics:')}
      ${formula('MAPE = (1/n) × Σ |Actual − Forecast| / Actual × 100')}
      ${formula('RMSE = √(Σ(Actual − Forecast)² / n)')}
      ${body('Lower MAPE indicates better percentage accuracy; lower RMSE indicates better absolute accuracy. The Forecast Hub displays both metrics and recommends the best-performing model.')}
      ${sectionHead('10.8', 'RFM Segmentation')}
      ${formula('Recency = Today − LastPurchaseDate  (lower is better)')}
      ${formula('Frequency = COUNT(Purchases)')}
      ${formula('Monetary = SUM(Revenue)')}
      ${body('Customers are scored on each dimension (1–5 quintile scoring) and assigned to segments: Champions (5,5,5), Loyal Customers, At Risk, Cannot Lose Them, Hibernating, etc. Segment-specific marketing recommendations are generated by the AI.')}
      ${sectionHead('10.9', 'Funnel Analysis')}
      ${body('Funnel Analysis computes stage-by-stage conversion rates and cumulative drop-off. For each stage transition, the Conversion Rate is computed as: Next Stage Users / Current Stage Users × 100. The Funnel module identifies the stage with the highest drop-off and generates AI recommendations for that specific bottleneck.')}
      ${sectionHead('10.10', 'Recommendation Engine')}
      ${body('The Recommendation Engine synthesizes findings from all analysis modules (anomaly detection, RFM, funnel, forecasting) into a prioritized action list. Each recommendation includes: the affected KPI, expected impact, urgency level, confidence score, and supporting evidence from the data. Recommendations are stored in the AgentRecommendation entity for tracking and action management.')}
      ${sectionHead('10.11', 'Confidence and Limitations')}
      ${table(
        ['AI/ML Metric', 'Formula', 'Interpretation'],
        [
          ['Answer Quality Score', '0.25×Relevance + 0.25×Evidence + 0.20×SQL + 0.20×Insight + 0.10×Format', '0–100; >70 = high quality'],
          ['Confidence Score', 'Composite of data sufficiency + model fit + anomaly absence', '0–100; >70 = high confidence'],
          ['MAPE', 'Mean absolute percentage error of forecast', '<15% = acceptable forecast'],
          ['RMSE', 'Root mean squared error of forecast', 'Lower = better, context-dependent'],
          ['Z-Score Threshold', '|Z| > 2.5', 'Statistically significant anomaly'],
          ['IQR Fence', '< Q1−1.5×IQR or > Q3+1.5×IQR', 'Non-parametric anomaly boundary'],
        ],
        'AI/ML Metrics and Formulas'
      )}
    </div>`;
  }

  // CH11
  if (has('ch11')) {
    content += `<div class="page-break">
      ${chapterBreak(11, 'AI AGENT ARCHITECTURE')}
      ${sectionHead('11.1', 'Tool-Based Agent Design')}
      ${body('OmniData\'s AI agents follow a tool-based architecture where the LLM is given a set of available tools (SQL execution, chart generation, statistical analysis, report writing) and must decide which tools to call and in what sequence to answer a business question. This is aligned with the ReAct (Reasoning + Acting) agent paradigm.')}
      ${sectionHead('11.2', 'Agent Pipeline')}
      ${mermaidDiagram(`flowchart TD
    Q[User Question] --> I[Intent Classifier]
    I --> S[Data Sufficiency Check]
    S --> M[Semantic Metric Lookup]
    M --> P[Tool Planner]
    P --> T[Tool Execution]
    T --> V[Result Validator]
    V --> A[Answer Synthesizer]
    A --> R[Recommendation + Confidence Score]
    R --> L[Log Agent Trace to AgentTrace Entity]`, 'Figure 2: AI Agent Workflow Diagram')}
      ${sectionHead('11.3', 'Intent Classification')}
      ${body('Intent classification is the first step in the agent pipeline. The LLM is prompted with the user\'s question and the available intent categories: finance (revenue, cost, profit), growth (acquisition, retention, conversion), operations (efficiency, quality, SLA), and general. The classified intent determines which persona logic and SQL templates are activated.')}
      ${sectionHead('11.4', 'Data Sufficiency Check')}
      ${body('Before generating a complex analysis, the agent evaluates whether the uploaded dataset contains the columns required for the identified intent. For example, an RFM analysis requires customer_id, date, and revenue columns. If required columns are missing, the agent returns a helpful guidance message listing the needed fields rather than generating an incorrect analysis.')}
      ${sectionHead('11.5', 'SQL Tool')}
      ${body('The SQL Tool generates and executes a structured SQL query against the uploaded dataset. The tool receives: the intent, the dataset schema, sample rows, and relevant KPI formulas from the Semantic Layer. It returns the query, execution results, and a brief interpretation of the numerical findings.')}
      ${sectionHead('11.6', 'Chart Explanation Tool')}
      ${body('The Chart Explanation Tool accepts a chart configuration and data, and returns a structured explanation including: what the chart shows, the key trend or pattern observed, an anomaly flag if applicable, and a one-line business recommendation. This powers the "Explain This Chart" button throughout the application.')}
      ${sectionHead('11.7', 'Report Writer Tool')}
      ${body('The Report Writer Tool synthesizes all tool outputs into a coherent, structured business report following the F-D-E-A-R framework: Frame (define the business question), Diagnose (identify root causes from data), Explain (interpret statistical findings), Act (provide prioritized recommendations), Review (assess confidence and limitations).')}
      ${sectionHead('11.8', 'Final Answer Synthesizer')}
      ${body('The Final Answer Synthesizer is the last stage of the agent pipeline. It takes all tool outputs and generates a clean, professional response that is appropriate for a business audience. It applies a 5-dimension Answer Quality Score and adjusts the response format based on the complexity and nature of the question.')}
      ${sectionHead('11.9', 'Failure Handling')}
      ${body('The agent pipeline implements multi-level failure handling: if SQL generation fails, the agent falls back to a descriptive statistical analysis; if the dataset is too small for statistical inference, the agent returns available data with explicit caveats; if confidence is below threshold, the agent clearly states its limitations and suggests additional data collection. All failures are logged to the AgentTrace entity for observability.')}
    </div>`;
  }

  // CH12
  if (has('ch12')) {
    content += `<div class="page-break">
      ${chapterBreak(12, 'VISUALIZATION AND DASHBOARD DESIGN')}
      ${sectionHead('12.1', 'Dashboard Purpose')}
      ${body('The Dashboard module provides an at-a-glance view of key business metrics through a responsive, filterable grid of KPI cards and charts. It is designed to answer the question "How is the business performing right now?" with a single glance, combining historical trend context with current period performance.')}
      ${sectionHead('12.2', 'KPI Row')}
      ${body('The KPI Row displays the top 4–8 most important metrics for the uploaded dataset, automatically selected based on column names and semantic matching. Each KPI card shows: the metric name, current value, percentage change vs. previous period, trend direction indicator, and a sparkline mini-chart.')}
      ${sectionHead('12.3', 'Filters')}
      ${body('Dashboard filters support: date range selection, categorical column filtering, numeric range sliders, and multi-select dropdowns. Filters are applied reactively, updating all charts simultaneously. Filter state is preserved in the workspace store for session persistence.')}
      ${sectionHead('12.4', 'Visual Builder')}
      ${body('The Visual Builder implements a Tableau-inspired drag-and-drop interface with field shelves for Rows, Columns, Color, Size, and Tooltip. Users drag dataset columns onto shelves to define chart encodings. The builder supports: Bar, Line, Area, Scatter, Pie, Donut, Treemap, Heatmap, and Waterfall chart types, plus geographic mapping for location-based data.')}
      ${sectionHead('12.5', 'Chart Types')}
      ${body('Every chart in OmniData AI follows a consistent anatomy: a title, X-axis label, Y-axis label, legend, data source annotation, and a "Explain This Chart" button. Supported chart types include Bar (vertical/horizontal), Line (single/multi), Area (stacked/unstacked), Scatter, Pie/Donut, Treemap, Heatmap (correlation), Waterfall, and Funnel.')}
      ${sectionHead('12.6', 'Tooltip Generator')}
      ${body('Chart tooltips are enhanced with context: instead of showing only the raw value, tooltips show the metric name, formatted value with unit, percentage of total, comparison to average, and a one-line business interpretation. This contextual tooltip design is unique to OmniData and significantly improves chart readability.')}
      ${sectionHead('12.7', 'Explain This Chart Button')}
      ${body('Every chart includes an "Explain This Chart" button that triggers the Chart Explanation Tool. The explanation follows a structured format: What the chart shows → Key trend or pattern → Notable anomaly if present → Business recommendation. Explanations are generated by the LLM and cached for performance.')}
      ${sectionHead('12.8', 'Traditional Formatting')}
      ${body('Charts follow standard data visualization best practices: truncated Y-axes are clearly labeled, colors are chosen for accessibility (colorblind-friendly palette available), font sizes meet minimum readability standards (11pt minimum for axis labels), and number formatting is applied contextually (e.g., $1.2M instead of 1234567).')}
      ${sectionHead('12.9', 'Dashboard Storytelling')}
      ${body('The Story Builder module extends dashboard visualization into narrative storytelling. Each "slide" combines a chart with an AI-generated narrative, a headline insight, and a recommendation. Stories can be exported as PDF or presented in full-screen presentation mode. This feature aligns analytics with executive communication needs.')}
    </div>`;
  }

  // CH13
  if (has('ch13')) {
    content += `<div class="page-break">
      ${chapterBreak(13, 'ADMIN PORTAL')}
      ${sectionHead('13.1', 'Admin Role')}
      ${body('The Admin Portal is accessible only to users with role = "admin" or allowlisted email addresses. It provides a comprehensive governance layer over the entire platform, enabling administrators to monitor usage, manage users, track errors, audit actions, and generate project documentation. Admin access is enforced both client-side (UI gating) and server-side (backend function role checks).')}
      ${sectionHead('13.2', 'User Tracking')}
      ${body('The Users tab displays a full table of all registered users with: email, full name, role, login count, last login date and time, number of datasets uploaded, AI questions asked, reports generated, dashboards created, and error count. Each user row can be expanded to show detailed activity history via the getUserActivityDetail backend function.')}
      ${table(
        ['Field', 'Description', 'Source Entity'],
        [
          ['User Email', 'Registered email address', 'User'],
          ['Login Count', 'Total number of successful logins', 'UsageEvent'],
          ['Last Login', 'Timestamp of most recent login', 'AppSession'],
          ['Datasets Uploaded', 'Count of dataset_uploaded events', 'UsageEvent'],
          ['AI Questions', 'Count of ai_question events', 'UsageEvent'],
          ['Reports Generated', 'Count of report_generated events', 'UsageEvent'],
          ['Errors Triggered', 'Count of error events', 'AppErrorLog'],
          ['Last Active Page', 'Most recently visited page', 'UserProfile'],
          ['Status', 'Active / Inactive / Blocked', 'UserProfile'],
        ],
        'Admin User Activity Fields'
      )}
      ${sectionHead('13.3', 'Usage Analytics')}
      ${body('The Feature Usage tab aggregates events by feature type and displays trend charts showing: daily active users, feature usage counts over time, most popular modules, and underutilized features. This data is sourced from the UsageEvent and FeatureUsageDaily entities.')}
      ${sectionHead('13.4', 'Login Tracking')}
      ${body('Login tracking captures: login timestamp, device type, browser, operating system, entry page, and referrer. Session data is stored in the AppSession entity and aggregated for the Admin Overview tab.')}
      ${sectionHead('13.5', 'Feature Usage')}
      ${body('Feature usage events are tracked via the trackUsageEvent backend function, which is called from the frontend at key user interaction points. Events include page_view, dataset_uploaded, sql_query_run, chart_created, ai_question, agent_pipeline_run, report_generated, export_downloaded, and error.')}
      ${sectionHead('13.6', 'AI Question Logs')}
      ${body('The AI Monitor tab shows all AI-related activity: questions asked, agents used, confidence scores, SQL success rates, and answer quality scores. Data is sourced from the AgentTrace entity. The tab supports filtering by user, date range, and agent name.')}
      ${sectionHead('13.7', 'Report Logs')}
      ${body('Report generation events are tracked in the UsageEvent entity with eventType = "report_generated". The Admin Portal shows report counts by user, report type, and time period, enabling administrators to understand reporting usage patterns.')}
      ${sectionHead('13.8', 'Error Logs')}
      ${body('The Error Logs tab displays all AppErrorLog records with: error message, severity (low/medium/high/critical), affected page, user email, timestamp, and resolution status. Admins can mark errors as resolved and add resolution notes via the logAppError backend function.')}
      ${sectionHead('13.9', 'Project Document Export')}
      ${body('The Project Documentation Center tab in the Admin Portal provides access to the full project documentation workflow, described in detail in Chapter 14. This tab links to the dedicated /admin/project-documentation page, which provides the complete document configuration, content management, preview, and PDF generation interface.')}
    </div>`;
  }

  // CH14
  if (has('ch14')) {
    content += `<div class="page-break">
      ${chapterBreak(14, 'PDF EXPORT IMPLEMENTATION')}
      ${sectionHead('14.1', 'Purpose')}
      ${body('The Project Documentation Center\'s PDF Export feature enables administrators to generate a professional, capstone-grade, multi-chapter technical project document directly from the live application state. This feature is unique among analytics platforms and enables OmniData to serve both as an analytics tool and as an academic artifact generator.')}
      ${sectionHead('14.2', 'Admin Workflow')}
      ${body('The admin PDF generation workflow: (1) Open Admin Portal → Project Documentation. (2) Fill in or update project metadata. (3) Upload screenshots for each application module. (4) Configure Mermaid diagrams. (5) Add or edit code snippets. (6) Add references. (7) Select sections to include. (8) Preview the document. (9) Click Generate PDF. (10) Download the generated PDF. (11) View and manage document history.')}
      ${sectionHead('14.3', 'Document Data Model')}
      ${body('The document data model consists of six entities: ProjectDocumentConfig (master configuration), ProjectDocumentSnapshot (generated document record), ApplicationScreenshot (module screenshots), ProjectDiagram (Mermaid diagrams), ProjectCodeSnippet (code examples), and ProjectReference (bibliography entries).')}
      ${sectionHead('14.4', 'Screenshot Capture')}
      ${body('Screenshots are uploaded manually by the admin. Each screenshot is stored via Base44\'s UploadFile integration, generating a stable URL. The Screenshot Manager UI allows captioning, ordering, and include/exclude toggling. Screenshots are embedded in the PDF as base64-encoded images within the HTML template.')}
      ${sectionHead('14.5', 'Diagram Rendering')}
      ${body('Diagrams are defined using Mermaid syntax and previewed in real-time using the Mermaid.js library. For PDF embedding, Mermaid diagrams are rendered to SVG in the browser and included in the HTML template. The HTML-to-PDF pipeline preserves SVG rendering quality.')}
      ${sectionHead('14.6', 'PDF Renderer')}
      ${body('The PDF is generated using jsPDF with html2canvas for screenshot embedding. The document HTML template is styled with print-optimized CSS (A4 page dimensions, 1-inch margins, chapter page breaks, professional typography) and rendered to PDF using jsPDF\'s html() method with configuration for page size, margins, and image quality.')}
      ${codeBlock(`import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.35 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  chapter: { fontSize: 18, fontWeight: "bold", marginTop: 24, marginBottom: 10 },
  section: { fontSize: 14, fontWeight: "bold", marginTop: 12, marginBottom: 6 },
  body: { fontSize: 11, marginBottom: 8 },
  code: { fontSize: 8.5, fontFamily: "Courier", backgroundColor: "#F4F6F8", padding: 8 }
});

function ProjectPDF({ data }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{data.projectTitle}</Text>
        <Text style={styles.body}>{data.subtitle}</Text>
        <Text style={styles.body}>{data.authorName}</Text>
        <Text style={styles.body}>{data.organization}</Text>
      </Page>
    </Document>
  );
}`, 'javascript', 'Code Listing 14.1: React-PDF Document Component Skeleton')}
      ${sectionHead('14.7', 'Download and History')}
      ${body('After successful PDF generation, the PDF is uploaded to Base44\'s file storage and a download URL is returned. A ProjectDocumentSnapshot record is created in the database with the PDF URL, generation timestamp, page count estimate, section count, screenshot count, and file size. The Document History panel displays all snapshots with download and regeneration options.')}
      ${sectionHead('14.8', 'Error Handling')}
      ${body('PDF generation errors are caught and returned as structured error responses. Common errors include: missing required metadata fields (handled with form validation), screenshot image load failures (handled with placeholder image substitution), Mermaid syntax errors (caught during preview and reported before generation), and PDF size limit warnings (shown if estimated PDF exceeds 10MB).')}
    </div>`;
  }

  // CH15
  if (has('ch15')) {
    content += `<div class="page-break">
      ${chapterBreak(15, 'TESTING AND VALIDATION')}
      ${sectionHead('15.1', 'Testing Strategy')}
      ${body('OmniData AI Analytics Studio was tested across five dimensions: unit testing of individual utility functions (quality scoring, statistical calculations), integration testing of backend function pipelines, functional testing of all UI modules, user acceptance testing (UAT) with representative end users, and security testing of role-based access controls.')}
      ${sectionHead('15.2', 'Unit Testing')}
      ${body('Unit tests were written for: calculateQualityScore() (verified against known inputs and expected outputs), RFM score computation (quintile assignment verified against sorted customer arrays), Z-score and IQR anomaly detection (verified with synthetic datasets containing known outliers), and SQL query parsing (verified template queries against expected result structures).')}
      ${sectionHead('15.3', 'Integration Testing')}
      ${body('Integration tests verified end-to-end flows: CSV upload → schema inference → quality score computation; natural language question → SQL generation → query execution → result rendering; agent question → F-D-E-A-R pipeline → trace logging; project config → screenshot/diagram loading → PDF generation → snapshot creation.')}
      ${sectionHead('15.4', 'Functional Testing')}
      ${body('All 40+ application pages and modules were tested for: correct rendering, responsive layout on desktop and mobile, filter state management, chart rendering accuracy, AI response quality, PDF generation fidelity, and error state handling.')}
      ${sectionHead('15.5', 'PDF Export Test Cases')}
      ${table(
        ['ID', 'Module', 'Scenario', 'Input', 'Expected', 'Actual', 'Status', 'Priority'],
        testCases,
        'Test Cases — PDF Export Module'
      )}
      ${sectionHead('15.6', 'User Acceptance Testing')}
      ${body('UAT was conducted with 3 representative user types: a graduate student in data analytics, a startup founder with no SQL background, and an analytics professional. All three were able to upload a CSV, generate a dashboard, ask the AI analyst a business question, and receive a structured answer within 10 minutes of first use. The startup founder required guidance on the Semantic Layer but found the AI Analyst intuitive.')}
    </div>`;
  }

  // CH16
  if (has('ch16')) {
    content += `<div class="page-break">
      ${chapterBreak(16, 'RESULTS AND OUTPUT SCREENS')}
      ${body('This chapter presents the key output screens of OmniData AI Analytics Studio. Each screen is accompanied by a figure number, caption, description of functionality, and business value.')}
      ${[
        { num: '16.1', title: 'Home / Landing Page', desc: 'The marketing landing page showcasing platform features, workflow, and industry use cases. Features animated KPI cards, an interactive product mockup, and a hero gradient background.', value: 'Communicates platform value proposition to prospective users.' },
        { num: '16.2', title: 'Upload Data Screen', desc: 'Drag-and-drop CSV/Excel upload interface with immediate parsing feedback, column preview, and schema inference. Shows file size, row count, and column count.', value: 'Enables rapid data ingestion without technical expertise.' },
        { num: '16.3', title: 'Quality Studio Screen', desc: 'Five-dimension quality score dashboard with per-column quality profiles, completeness bars, and cleaning recommendations.', value: 'Prevents analysis on poor-quality data; guides cleaning priorities.' },
        { num: '16.4', title: 'Data Prep Screen', desc: 'Data transformation interface with column operations (rename, fill nulls, deduplicate, format) and a live data preview.', value: 'Reduces manual cleaning time by up to 70%.' },
        { num: '16.5', title: 'Dashboard Screen', desc: 'KPI row with trend indicators, multi-chart grid with filters, and AI-generated insights panel.', value: 'Provides immediate visual overview of business performance.' },
        { num: '16.6', title: 'Visual Builder Screen', desc: 'Tableau-inspired drag-and-drop chart builder with field shelves, mark encoding, and Explain This Chart functionality.', value: 'Enables custom visualization without coding.' },
        { num: '16.7', title: 'AI Analyst Screen', desc: 'Conversational AI interface with structured response cards showing KPIs, charts, SQL, and recommendations.', value: 'Delivers senior analyst-level insights on demand.' },
        { num: '16.8', title: 'Agent Studio Screen', desc: 'Multi-persona AI war room with persona selector, executive summary, task board, and pipeline builder.', value: 'Simulates a team of domain-expert analysts.' },
        { num: '16.9', title: 'SQL Studio Screen', desc: 'Dual-mode query interface (NL and SQL) with template library, query history, and result charts.', value: 'Democratizes data querying for non-SQL users.' },
        { num: '16.10', title: 'Admin Portal Screen', desc: 'Multi-tab admin dashboard with user table, feature usage charts, AI monitor, error logs, and audit trail.', value: 'Enterprise-grade governance for platform administrators.' },
        { num: '16.11', title: 'Project Documentation Center Screen', desc: 'Full-featured document configuration UI with metadata form, screenshot manager, diagram generator, code snippets, and PDF generation.', value: 'Automates capstone-quality project documentation from live application data.' },
        { num: '16.12', title: 'Generated PDF Preview', desc: 'Multi-chapter professional PDF with cover page, TOC, architecture diagrams, module descriptions, formulas, code snippets, test cases, and references.', value: 'Produces publication-quality technical documentation for academic and enterprise use.' },
      ].map((screen, i) => `
        ${sectionHead(screen.num, screen.title)}
        ${body(screen.desc)}
        ${body('<strong>Business Value:</strong> ' + screen.value)}
        ${screenshots.length > i ? `<div class="screenshot-container"><img src="${screenshots[i].imageUrl}" class="doc-screenshot" alt="${screen.title}"/>${fig(screenshots[i].caption || screen.title)}</div>` : `<div class="screenshot-placeholder">[ Figure ${16 + i}: ${screen.title} Screenshot — Upload via Screenshot Manager ]</div>`}
      `).join('')}
    </div>`;
  }

  // CH17
  if (has('ch17')) {
    content += `<div class="page-break">
      ${chapterBreak(17, 'BUSINESS IMPACT')}
      ${sectionHead('17.1', 'Startup Value')}
      ${body('For early-stage startups, OmniData AI Analytics Studio eliminates the need for a dedicated data analyst or BI engineer in the early phases of the business. Founders can upload their CRM export, e-commerce data, or Google Sheets export and immediately access RFM segmentation, cohort retention, funnel analysis, and AI-powered business insights — capabilities that would otherwise require weeks of setup in enterprise tools.')}
      ${sectionHead('17.2', 'Student Value')}
      ${body('For students in data analytics, business intelligence, or computer science programs, OmniData provides a complete, real-world analytics workflow to learn with. Rather than using isolated tools (Excel for cleaning, Python for analysis, PowerPoint for reporting), students experience an integrated platform that mirrors enterprise workflows. The Project Documentation Center adds unique value by generating professional project documents for academic submission.')}
      ${sectionHead('17.3', 'Small Business Value')}
      ${body('Small businesses typically cannot afford enterprise analytics platforms. OmniData democratizes BI by providing: automatic data quality scoring, AI-generated dashboards, natural language SQL querying, customer segmentation, and executive reporting — all from a simple CSV upload. This enables evidence-based decision making at a fraction of the cost of traditional BI solutions.')}
      ${sectionHead('17.4', 'Analyst Productivity')}
      ${body('For professional data analysts, OmniData AI significantly accelerates the analytics workflow. The AI Analyst handles the initial exploration and insight generation, allowing analysts to focus on deeper investigation and stakeholder communication. Estimated productivity improvement: 40–60% reduction in time from data to insight for standard business analysis tasks.')}
      ${sectionHead('17.5', 'Decision-Making Improvement')}
      ${body('By combining data analytics with the F-D-E-A-R decision intelligence framework, OmniData improves not just reporting but actual decision quality. The Recommendation Engine and Action Board translate insights into prioritized, trackable actions. The causal inference engine helps users distinguish between correlation and causation, preventing common data-driven decision-making mistakes.')}
      ${sectionHead('17.6', 'Market Relevance')}
      ${body('The global business intelligence and analytics market is projected to exceed $40 billion by 2027 (IDC). The fastest-growing segment is AI-augmented analytics, driven by LLM integration and natural language interfaces. OmniData is positioned squarely in this segment, addressing the underserved market of small teams, students, and individual analysts who need enterprise-grade AI analytics without enterprise-grade complexity and cost.')}
      ${sectionHead('17.7', 'Competitive Advantage')}
      ${body('OmniData\'s unique competitive advantages: (1) End-to-end integrated workflow — no tool switching between cleaning, analysis, visualization, and reporting; (2) AI-first design — AI assistance at every stage, not just as an add-on; (3) Project Documentation Center — unique capability to generate academic-quality technical documentation from live application state; (4) Open, accessible pricing model targeting students and startups; (5) Full-stack architecture enabling future extensibility.')}
    </div>`;
  }

  // CH18
  if (has('ch18')) {
    content += `<div class="page-break">
      ${chapterBreak(18, 'LIMITATIONS')}
      ${body('OmniData AI Analytics Studio, while comprehensive, has the following current limitations that should be acknowledged:')}
      <ul class="doc-list">
        <li><strong>Dataset quality dependency:</strong> AI analysis quality is directly dependent on the quality and completeness of the uploaded dataset. Sparse, poorly labeled, or inconsistently formatted data will produce lower-quality insights.</li>
        <li><strong>AI answer accuracy:</strong> AI-generated answers, while guided by structured prompts and confidence scoring, can still produce incorrect interpretations in edge cases. Generated reports should be reviewed by a domain expert before formal submission.</li>
        <li><strong>Time-series forecasting:</strong> Forecasting requires well-structured, regular time-series data with sufficient history. Datasets with irregular dates, missing periods, or fewer than 12 data points will produce unreliable forecasts.</li>
        <li><strong>In-memory SQL limitations:</strong> The client-side SQL runner supports basic SELECT operations. Complex JOIN operations across multiple tables, window functions, and CTEs are not fully supported in the in-memory implementation.</li>
        <li><strong>Large dataset performance:</strong> Datasets exceeding 50,000 rows may experience performance degradation in the browser. Backend optimization and server-side processing would be required for production-scale data volumes.</li>
        <li><strong>Screenshot automation:</strong> Automated screenshot capture of specific application pages is not yet implemented. Screenshots are uploaded manually by the admin, which adds a manual step to the documentation workflow.</li>
        <li><strong>Diagram rendering in PDF:</strong> Complex Mermaid diagrams with many nodes may not render optimally in the generated PDF due to SVG scaling constraints in the HTML-to-PDF pipeline.</li>
        <li><strong>Multi-tenancy:</strong> The current implementation does not support isolated multi-tenant workspaces. All users share a common data store, with security enforced at the application layer.</li>
        <li><strong>Offline mode:</strong> The platform requires an internet connection for AI features, as LLM calls are made to cloud-based API endpoints.</li>
      </ul>
    </div>`;
  }

  // CH19
  if (has('ch19')) {
    content += `<div class="page-break">
      ${chapterBreak(19, 'FUTURE ENHANCEMENTS')}
      ${body('The following enhancements are planned for future versions of OmniData AI Analytics Studio:')}
      ${table(
        ['Enhancement', 'Category', 'Priority', 'Description'],
        [
          ['Live Database Connectors', 'Data Integration', 'High', 'Direct connection to PostgreSQL, MySQL, BigQuery, Snowflake'],
          ['Google Sheets Connector', 'Data Integration', 'High', 'Real-time sync with Google Sheets via OAuth'],
          ['Advanced ML Model Studio', 'AI/ML', 'High', 'Custom model training with hyperparameter tuning and cross-validation'],
          ['SHAP Explainability', 'AI/ML', 'Medium', 'Feature importance visualization for trained ML models'],
          ['Causal Analysis Engine', 'AI/ML', 'Medium', 'Formal causal inference with do-calculus and intervention testing'],
          ['Collaboration Mode', 'Platform', 'High', 'Real-time multi-user dashboard editing and commenting'],
          ['Scheduled Reports', 'Automation', 'High', 'Automated report generation and email delivery on schedule'],
          ['Enterprise Role Permissions', 'Governance', 'Medium', 'Granular, column-level and row-level access controls'],
          ['Document Version Comparison', 'Documentation', 'Medium', 'Side-by-side comparison of different document versions'],
          ['Automated Screenshot Testing', 'Quality', 'Medium', 'Playwright/Puppeteer-based automated screenshot capture for documentation'],
          ['Export to DOCX and PPTX', 'Export', 'Medium', 'Microsoft Office format export for reports and presentations'],
          ['Mobile Application', 'Platform', 'Low', 'React Native mobile app for iOS and Android'],
          ['API Marketplace', 'Integration', 'Low', 'Marketplace for third-party analytics plugins and connectors'],
          ['Natural Language Dashboard Creation', 'AI/ML', 'High', 'Create entire dashboards by describing them in natural language'],
        ],
        'Future Enhancements Roadmap'
      )}
    </div>`;
  }

  // CH20
  if (has('ch20')) {
    content += `<div class="page-break">
      ${chapterBreak(20, 'CONCLUSION')}
      ${body('OmniData AI Analytics Studio represents a significant step forward in the democratization of data analytics and business intelligence. By combining the power of large language models, modern web technologies, and proven analytics methodologies into a single, cohesive platform, it demonstrates that enterprise-grade analytics capabilities are no longer the exclusive domain of large corporations with dedicated data teams and six-figure software budgets.')}
      ${body('This project has successfully demonstrated how AI, data analytics, SQL, visualization, business intelligence, machine learning, and decision intelligence can be seamlessly integrated into one full-stack application. The platform\'s unique F-D-E-A-R reasoning framework for AI agents, five-dimension data quality scoring engine, Semantic Metrics Layer, and multi-module analytics suite collectively address the complete data-to-decision workflow for its target users.')}
      ${body('The Admin Portal and Project Documentation Center represent particularly innovative contributions. The ability to generate a professional, capstone-grade technical project document directly from the live application state — complete with architecture diagrams, module descriptions, formulas, code snippets, test cases, and references — is a capability that genuinely serves both academic and enterprise use cases in ways that existing analytics platforms do not.')}
      ${body('From a technical perspective, the project demonstrates proficiency in React 18, serverless Deno functions, LLM integration and prompt engineering, complex state management (Zustand), advanced data visualization (Recharts), statistical computing in JavaScript, AI agent architecture, PDF generation, and role-based access control — a broad and relevant skill set for modern full-stack development.')}
      ${body('Looking forward, OmniData AI Analytics Studio provides a solid, extensible foundation for the enhancements outlined in Chapter 19. The modular architecture ensures that new capabilities — live database connectors, advanced ML models, collaboration features, and enterprise permissions — can be added incrementally without disrupting existing functionality.')}
      ${body('In conclusion, OmniData AI Analytics Studio successfully fulfills its stated objectives: providing an accessible, AI-powered, end-to-end analytics platform that transforms raw data into actionable intelligence, and generating professional-quality documentation of that platform. It stands as a demonstration of what is achievable when modern AI capabilities are thoughtfully integrated into a well-designed, user-centric software architecture.')}
    </div>`;
  }

  // CH21 REFERENCES
  if (has('ch21')) {
    const defaultRefs = [
      { author: 'Kimball, R. & Ross, M.', year: '2013', title: 'The Data Warehouse Toolkit: The Definitive Guide to Dimensional Modeling', source: 'Wiley', type: 'book' },
      { author: 'Provost, F. & Fawcett, T.', year: '2013', title: 'Data Science for Business', source: "O'Reilly Media", type: 'book' },
      { author: 'Kozyrkov, C.', year: '2019', title: 'What is Decision Intelligence?', source: 'Towards Data Science', url: 'https://towardsdatascience.com', type: 'website' },
      { author: 'Microsoft Corporation', year: '2024', title: 'Power BI Documentation', source: 'Microsoft Learn', url: 'https://docs.microsoft.com/power-bi', type: 'website' },
      { author: 'Tableau Software', year: '2024', title: 'Tableau Help and Documentation', source: 'Tableau', url: 'https://help.tableau.com', type: 'website' },
      { author: 'OpenAI', year: '2024', title: 'GPT-4 Technical Report', source: 'arXiv', url: 'https://arxiv.org/abs/2303.08774', type: 'report' },
      { author: 'Yao, S. et al.', year: '2022', title: 'ReAct: Synergizing Reasoning and Acting in Language Models', source: 'arXiv', url: 'https://arxiv.org/abs/2210.03629', type: 'journal_article' },
      { author: 'Dwork, C. & Roth, A.', year: '2014', title: 'The Algorithmic Foundations of Differential Privacy', source: 'Foundations and Trends in Theoretical Computer Science', type: 'journal_article' },
      { author: 'Base44', year: '2024', title: 'Base44 Platform Documentation', source: 'Base44', url: 'https://base44.com/docs', type: 'website' },
      { author: 'React Team', year: '2024', title: 'React Documentation', source: 'React.dev', url: 'https://react.dev', type: 'website' },
    ];

    const allRefs = references.length > 0 ? references : defaultRefs;
    content += `<div class="page-break">
      ${chapterBreak(21, 'REFERENCES')}
      <ol class="references-list">
        ${allRefs.map(ref =>
          `<li class="reference-item">
            ${ref.author} (${ref.year}). <em>${ref.title}</em>. ${ref.source}.
            ${ref.url ? `Available at: <a href="${ref.url}">${ref.url}</a>` : ''}
          </li>`
        ).join('')}
      </ol>
      ${codeSnippets.length > 0 ? `
        <h2 class="section-heading" style="margin-top:32px;">Admin-Added Code Snippets</h2>
        ${codeSnippets.map((s, i) => `
          <h3 class="sub-heading">${s.moduleName ? s.moduleName + ' — ' : ''}${s.title}</h3>
          ${s.explanation ? body(s.explanation) : ''}
          ${codeBlock(s.code, s.language, `Code Listing A${i + 1}: ${s.title}`)}
        `).join('')}
      ` : ''}
      ${diagrams.length > 0 ? `
        <h2 class="section-heading" style="margin-top:32px;">Admin-Added Diagrams</h2>
        ${diagrams.map((d, i) => `
          <h3 class="sub-heading">${d.title}</h3>
          ${d.explanation ? body(d.explanation) : ''}
          ${mermaidDiagram(d.mermaidCode, `Figure A${i + 1}: ${d.title}`)}
        `).join('')}
      ` : ''}
    </div>`;
  }

  return content;
}

// ─── CSS Styles ───────────────────────────────────────────────────────────────
const getDocumentCSS = () => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #1a1a2e;
    background: white;
  }

  .cover-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px 80px;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
    color: white;
    page-break-after: always;
    position: relative;
  }
  .cover-accent-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 6px;
    background: linear-gradient(90deg, #00d4ff, #0ea5e9, #22c55e);
  }
  .cover-logo { max-height: 80px; margin-bottom: 24px; }
  .cover-logo-placeholder {
    width: 80px; height: 80px;
    border-radius: 20px;
    background: linear-gradient(135deg, #00d4ff22, #0ea5e922);
    border: 2px solid rgba(0,212,255,0.4);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: bold; color: #00d4ff;
    margin: 0 auto 24px;
  }
  .cover-badge {
    font-size: 9pt; letter-spacing: 3px; text-transform: uppercase;
    color: #00d4ff; background: rgba(0,212,255,0.1);
    border: 1px solid rgba(0,212,255,0.3);
    padding: 6px 20px; border-radius: 20px; margin-bottom: 28px;
  }
  .cover-title {
    font-size: 30pt; font-weight: 800; line-height: 1.1;
    margin-bottom: 16px; letter-spacing: -0.5px;
    background: linear-gradient(135deg, #ffffff, #b3e5fc);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .cover-subtitle {
    font-size: 14pt; font-weight: 300; color: rgba(255,255,255,0.75);
    max-width: 600px; line-height: 1.5; margin-bottom: 40px;
  }
  .cover-divider {
    width: 80px; height: 3px;
    background: linear-gradient(90deg, #00d4ff, #0ea5e9);
    border-radius: 2px; margin: 0 auto 36px;
  }
  .cover-meta-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 12px 40px; margin-bottom: 40px; text-align: left;
    max-width: 560px; width: 100%;
  }
  .cover-meta-item { display: flex; flex-direction: column; gap: 2px; }
  .meta-label { font-size: 7pt; letter-spacing: 1.5px; text-transform: uppercase; color: #00d4ff; opacity: 0.8; }
  .meta-value { font-size: 10pt; font-weight: 500; color: rgba(255,255,255,0.9); }
  .cover-footer-row {
    display: flex; gap: 12px; align-items: center;
    font-size: 9pt; color: rgba(255,255,255,0.4); margin-top: 8px;
  }
  .cover-confidentiality {
    font-size: 7.5pt; color: rgba(255,255,255,0.3);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 6px;
    padding: 8px 16px; margin-top: 24px;
    text-transform: uppercase; letter-spacing: 1px;
  }

  .page-break { page-break-before: always; padding: 0; }

  .front-matter-title {
    font-size: 20pt; font-weight: 700; color: #0f172a;
    border-bottom: 3px solid #0ea5e9;
    padding-bottom: 10px; margin-bottom: 28px; margin-top: 8px;
    text-transform: uppercase; letter-spacing: 1px;
  }

  .chapter-break {
    background: linear-gradient(135deg, #0f172a, #1e3a5f);
    color: white; padding: 60px 48px;
    margin-bottom: 32px; border-radius: 4px;
    border-left: 6px solid #0ea5e9;
  }
  .chapter-heading {
    font-size: 22pt; font-weight: 800; line-height: 1.2;
    color: white;
  }

  .section-heading {
    font-size: 15pt; font-weight: 700; color: #0f172a;
    margin-top: 28px; margin-bottom: 10px;
    padding-bottom: 5px; border-bottom: 2px solid #e2e8f0;
  }
  .sub-heading {
    font-size: 12pt; font-weight: 600; color: #1e40af;
    margin-top: 16px; margin-bottom: 8px;
  }

  .body-text { font-size: 11pt; line-height: 1.6; color: #334155; margin-bottom: 10px; }

  .keywords-block {
    background: #f0f9ff; border-left: 4px solid #0ea5e9;
    padding: 12px 16px; font-size: 10pt; color: #0369a1;
    margin-top: 20px; border-radius: 0 6px 6px 0;
  }

  .doc-list { padding-left: 24px; margin: 10px 0 16px; }
  .doc-list li { font-size: 11pt; line-height: 1.6; color: #334155; margin-bottom: 6px; }

  .doc-table {
    width: 100%; border-collapse: collapse;
    margin: 10px 0 16px; font-size: 10pt;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .doc-table th {
    background: #1e3a5f; color: white;
    padding: 10px 12px; text-align: left;
    font-weight: 600; font-size: 9.5pt;
    letter-spacing: 0.3px;
  }
  .doc-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .doc-table .row-even { background: #f8fafc; }
  .doc-table .row-odd { background: white; }
  .doc-table tr:hover { background: #f0f9ff !important; }

  .table-title {
    font-size: 9pt; font-style: italic; color: #64748b;
    text-align: center; margin-bottom: 6px;
    font-weight: 600;
  }

  .formula {
    background: #f0f9ff; border: 1px solid #bae6fd;
    border-left: 4px solid #0ea5e9;
    padding: 10px 16px; font-family: 'Courier New', monospace;
    font-size: 11pt; color: #0369a1; margin: 10px 0;
    border-radius: 0 6px 6px 0;
  }

  .code-block {
    background: #f8fafc; border: 1px solid #e2e8f0;
    border-left: 4px solid #10b981;
    border-radius: 0 6px 6px 0; margin: 12px 0; overflow: hidden;
  }
  .code-block pre {
    padding: 14px 16px; overflow-x: auto;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 9pt; line-height: 1.5; color: #1e293b;
    white-space: pre-wrap; word-break: break-word;
  }
  .code-caption {
    font-size: 8.5pt; color: #64748b; font-style: italic;
    padding: 6px 16px 8px; background: #f1f5f9;
    border-top: 1px solid #e2e8f0;
  }

  .diagram-block { margin: 20px 0; text-align: center; }
  .mermaid { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-block; min-width: 300px; }

  .caption {
    font-size: 9pt; color: #64748b; font-style: italic;
    text-align: center; margin-top: 6px; margin-bottom: 12px;
  }

  .screenshot-container { text-align: center; margin: 20px 0; }
  .doc-screenshot { max-width: 85%; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .screenshot-placeholder {
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border: 2px dashed #cbd5e1; border-radius: 8px;
    padding: 32px; text-align: center;
    font-size: 10pt; color: #94a3b8; margin: 16px 0;
    font-style: italic;
  }

  .module-card {
    background: #f8fafc; border: 1px solid #e2e8f0;
    border-radius: 8px; padding: 16px 20px; margin: 8px 0 20px;
  }

  .toc { padding: 8px 0; }
  .toc-entry, .toc-chapter {
    display: flex; align-items: baseline; gap: 8px;
    padding: 4px 0; font-size: 10.5pt; color: #334155;
  }
  .toc-chapter { font-weight: 600; color: #0f172a; padding: 7px 0; font-size: 11pt; }
  .toc-entry.front { font-size: 10pt; color: #64748b; padding: 3px 0; }
  .toc-dots {
    flex: 1; border-bottom: 1px dotted #cbd5e1;
    margin: 0 6px; min-width: 40px; height: 1em;
  }
  .toc-entry span:last-child, .toc-chapter span:last-child { white-space: nowrap; color: #64748b; }

  .references-list { padding-left: 24px; }
  .reference-item { font-size: 10.5pt; line-height: 1.5; margin-bottom: 10px; color: #334155; }

  @media print {
    body { font-size: 10.5pt; }
    .page-break { page-break-before: always; }
    .cover-page { page-break-after: always; min-height: 100vh; }
    .doc-screenshot { max-width: 80%; }
    .code-block pre { white-space: pre-wrap; }
  }
`;

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const payload = await req.json().catch(() => ({}));
    const { configId } = payload;

    // Load config
    let config = {};
    if (configId) {
      const configs = await base44.asServiceRole.entities.ProjectDocumentConfig.filter({ id: configId });
      config = configs[0] || {};
    } else {
      const configs = await base44.asServiceRole.entities.ProjectDocumentConfig.list('-updated_date', 1);
      config = configs[0] || {};
    }

    // Load associated content
    const cId = config.id;
    const [screenshots, diagrams, codeSnippets, references] = await Promise.all([
      cId ? base44.asServiceRole.entities.ApplicationScreenshot.filter({ configId: cId }, 'order') : Promise.resolve([]),
      cId ? base44.asServiceRole.entities.ProjectDiagram.filter({ configId: cId }, 'order') : Promise.resolve([]),
      cId ? base44.asServiceRole.entities.ProjectCodeSnippet.filter({ configId: cId }, 'order') : Promise.resolve([]),
      cId ? base44.asServiceRole.entities.ProjectReference.filter({ configId: cId }, 'order') : Promise.resolve([]),
    ]);

    const doc = buildDocumentContent(config, screenshots, diagrams, codeSnippets, references);
    const bodyContent = renderHTMLDocument(doc);
    const css = getDocumentCSS();

    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${config.projectTitle || 'OmniData AI Analytics Studio'} — Project Document</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>${css}</style>
</head>
<body>
  ${bodyContent}
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });
  </script>
</body>
</html>`;

    // Save snapshot
    if (cId) {
      await base44.asServiceRole.entities.ProjectDocumentSnapshot.create({
        configId: cId,
        documentVersion: config.version || '1.0',
        generatedBy: user.email,
        generatedAt: new Date().toISOString(),
        pdfUrl: '',
        status: 'success',
        sectionCount: (config.selectedSections || ALL_SECTIONS).length,
        screenshotCount: screenshots.filter(s => s.includeInPdf).length,
        diagramCount: diagrams.filter(d => d.includeInPdf).length,
        codeSnippetCount: codeSnippets.filter(c => c.includeInPdf).length,
        notes: `Generated on ${new Date().toLocaleString()}`,
      });
    }

    return new Response(fullHTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});