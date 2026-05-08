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
        <Route path="/governance" element={<DataGovernance />} />
        <Route path="/data-contract" element={<DataContract />} />
        <Route path="/metric-store" element={<MetricStore />} />
        <Route path="/what-if" element={<WhatIfSimulator />} />
        <Route path="/notebook" element={<AnalystNotebook />} />
        <Route path="/action-board" element={<ActionBoard />} />
        <Route path="/decision-reports" element={<DecisionReports />} />
        <Route path="/ml-workbench" element={<MLWorkbench />} />
        <Route path="/policy-center" element={<PolicyCenter />} />
        <Route path="/agent-studio" element={<AgentStudio />} />
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