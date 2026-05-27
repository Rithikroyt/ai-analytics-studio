import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Navbar from '@/components/layout/Navbar';
import Home from '@/pages/Home';
import Platform from '@/pages/Platform';
import Workflows from '@/pages/Workflows';
import UniversalData from '@/pages/UniversalData';
import Workspace from '@/pages/Workspace';
import Dashboards from '@/pages/Dashboards';
import StoryBuilder from '@/pages/StoryBuilder';
import Alerts from '@/pages/Alerts';
import Integrations from '@/pages/Integrations';
import DataMapping from '@/pages/DataMapping';
import Reports from '@/pages/Reports';
import Collaboration from '@/pages/Collaboration';
import PredictiveInsights from '@/pages/PredictiveInsights';
import ForecastHub from '@/pages/ForecastHub';
import Workbench from '@/pages/Workbench';
import Governance from '@/pages/Governance';
import DataGovernance from '@/pages/DataGovernance';
import DataContract from '@/pages/DataContract';
import MetricStore from '@/pages/MetricStore';
import WhatIfSimulator from '@/pages/WhatIfSimulator';
import AnalystNotebook from '@/pages/AnalystNotebook';
import ActionBoard from '@/pages/ActionBoard';
import DecisionReports from '@/pages/DecisionReports';
import MLWorkbench from '@/pages/MLWorkbench';
import PolicyCenter from '@/pages/PolicyCenter';
import AgentStudio from '@/pages/AgentStudio';
import ExecutiveDashboard from '@/pages/ExecutiveDashboard';
import AdminCenter from '@/pages/AdminCenter';
import AICommandCenter from '@/pages/AICommandCenter';
import DataIntelligenceHub from '@/pages/DataIntelligenceHub';
import MLIntelligence from '@/pages/MLIntelligence';
import StrategicKPIBoard from '@/pages/StrategicKPIBoard';
import AdvancedAnalyticsLab from '@/pages/AdvancedAnalyticsLab';
import ExecutiveBriefing from '@/pages/ExecutiveBriefing';
import StrategicOKRBoard from '@/pages/StrategicOKRBoard';
import DataLineageViewer from '@/pages/DataLineageViewer';
import PipelineStudio from '@/pages/PipelineStudio.jsx';
import RAGEvidenceHub from '@/pages/RAGEvidenceHub';
import ObservabilityCenter from '@/pages/ObservabilityCenter.jsx';
import ProjectDocumentationCenter from '@/pages/ProjectDocumentationCenter';
import SemanticModelStudio from '@/pages/SemanticModelStudio';
import BenchmarkCenter from '@/pages/BenchmarkCenter';
import SkillMatrix from '@/pages/SkillMatrix';
import DataEngineeringStudio from '@/pages/DataEngineeringStudio';
import SemanticMetricStore from '@/pages/SemanticMetricStore';
import SQLPythonWorkbench from '@/pages/SQLPythonWorkbench';
import HandoverPackage from '@/pages/HandoverPackage.jsx';
import DecisionIntelligenceReportsV4 from '@/pages/DecisionIntelligenceReports.jsx';
import SeniorAnalystWorkbench from '@/pages/SeniorAnalystWorkbench';
import VisualBuilder from '@/pages/VisualBuilder';
import ApiConnectorWizard from '@/pages/ApiConnectorWizard';
import DomainAnalyticsPacks from '@/pages/DomainAnalyticsPacks';
import AdvancedAnalyticsLabV3 from '@/pages/AdvancedAnalyticsLab';
import DemoMode from '@/pages/DemoMode';
import SampleDashboards from '@/pages/SampleDashboards';
import ProductSalePitch from '@/pages/ProductSalePitch';
import ReadinessScore from '@/pages/ReadinessScore';
import RoleSelector from '@/pages/RoleSelector';
import BusinessAnalystWorkspace from '@/pages/BusinessAnalystWorkspace';
import MarketingAnalystWorkspace from '@/pages/MarketingAnalystWorkspace';
import DataAnalystWorkspace from '@/pages/DataAnalystWorkspace';
import DataScienceWorkspace from '@/pages/DataScienceWorkspace';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="w-8 h-8 border-2 border-white/10 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <div className="text-xs text-muted-foreground">Loading OmniData AI…</div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/platform" element={<Platform />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/universal-data" element={<UniversalData />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/dashboards" element={<Dashboards />} />
        <Route path="/story-builder" element={<StoryBuilder />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/data-mapping" element={<DataMapping />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/collaboration" element={<Collaboration />} />
        <Route path="/predictive" element={<PredictiveInsights />} />
        <Route path="/forecast-hub" element={<ForecastHub />} />
        <Route path="/workbench" element={<Workbench />} />
        <Route path="/governance" element={<Governance />} />
        <Route path="/data-governance" element={<DataGovernance />} />
        <Route path="/data-contract" element={<DataContract />} />
        <Route path="/metric-store" element={<MetricStore />} />
        <Route path="/what-if" element={<WhatIfSimulator />} />
        <Route path="/notebook" element={<AnalystNotebook />} />
        <Route path="/action-board" element={<ActionBoard />} />
        <Route path="/decision-reports" element={<DecisionIntelligenceReportsV4 />} />
        <Route path="/ml-workbench" element={<MLWorkbench />} />
        <Route path="/policy-center" element={<PolicyCenter />} />
        <Route path="/agent-studio" element={<AgentStudio />} />
        <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
        <Route path="/admin" element={<AdminCenter />} />
        <Route path="/ai-command-center" element={<AICommandCenter />} />
        <Route path="/data-intelligence" element={<DataIntelligenceHub />} />
        <Route path="/ml-intelligence" element={<MLIntelligence />} />
        <Route path="/strategic-kpi" element={<StrategicKPIBoard />} />
        <Route path="/analytics-lab" element={<AdvancedAnalyticsLabV3 />} />
        <Route path="/executive-briefing" element={<ExecutiveBriefing />} />
        <Route path="/strategic-okr" element={<StrategicOKRBoard />} />
        <Route path="/data-lineage" element={<DataLineageViewer />} />
        <Route path="/pipeline-studio" element={<PipelineStudio />} />
        <Route path="/rag-evidence" element={<RAGEvidenceHub />} />
        <Route path="/observability" element={<ObservabilityCenter />} />
        <Route path="/admin/project-documentation" element={<ProjectDocumentationCenter />} />
        <Route path="/semantic-model" element={<SemanticModelStudio />} />
        <Route path="/admin/benchmark-center" element={<BenchmarkCenter />} />
        <Route path="/skill-matrix" element={<SkillMatrix />} />
        <Route path="/data-engineering" element={<DataEngineeringStudio />} />
        <Route path="/semantic-metrics" element={<SemanticMetricStore />} />
        <Route path="/sql-workbench" element={<SQLPythonWorkbench />} />
        <Route path="/handover" element={<HandoverPackage />} />
        <Route path="/senior-workbench" element={<SeniorAnalystWorkbench />} />
        <Route path="/visual-builder" element={<VisualBuilder />} />
        <Route path="/api-connector" element={<ApiConnectorWizard />} />
        <Route path="/domain-packs" element={<DomainAnalyticsPacks />} />
        <Route path="/analytics-lab-v3" element={<AdvancedAnalyticsLabV3 />} />
        <Route path="/demo-mode" element={<DemoMode />} />
        <Route path="/sample-dashboards" element={<SampleDashboards />} />
        <Route path="/product-pitch" element={<ProductSalePitch />} />
        <Route path="/readiness-score" element={<ReadinessScore />} />
        <Route path="/role-select" element={<RoleSelector />} />
        <Route path="/workspace/business-analyst" element={<BusinessAnalystWorkspace />} />
        <Route path="/workspace/marketing-analyst" element={<MarketingAnalystWorkspace />} />
        <Route path="/workspace/data-analyst" element={<DataAnalystWorkspace />} />
        <Route path="/workspace/data-scientist" element={<DataScienceWorkspace />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};

function App() {
  return (
  <ErrorBoundary>
  <AuthProvider>
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthenticatedApp />
      </Router>
      <Toaster />
    </QueryClientProvider>
  </AuthProvider>
  </ErrorBoundary>
  );
  }

export default App;