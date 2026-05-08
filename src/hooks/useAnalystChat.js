/**
 * useAnalystChat — Hook for managing AI Analyst chat with V5 10-step workflow
 */
import { useState, useCallback } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { orchestrateV5Workflow } from '@/lib/v5AgentOrchestrator';

// #6: Step labels for real-time workflow indicator
export const WORKFLOW_STEP_LABELS = [
  'Classifying intent',
  'Looking up KPIs',
  'Checking data readiness',
  'Selecting tools',
  'Executing analysis',
  'Validating results',
  'Scoring insight',
  'Generating explanation',
  'Building recommendations',
  'Creating report',
];

export function useAnalystChat() {
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState('');
  const [currentStep, setCurrentStep] = useState(-1); // #6: live step tracking
  const { getActiveTable } = useWorkspaceStore();

  const addMessage = useCallback((msg) => {
    setChatMessages(prev => [...prev, msg]);
  }, []);

  const sendQuestion = useCallback(async (question) => {
    if (!question.trim() || loading) return;

    // Always pull fresh state to avoid stale closures
    const freshState = useWorkspaceStore.getState();
    const activeTable = freshState.getActiveTable();
    if (!activeTable) {
      // #2: Better no-data error with actionable guidance
      addMessage({
        role: 'assistant',
        answer: 'No dataset loaded yet. Please upload a CSV, Excel, or JSON file in the **Intake** section to get started.',
        noDataError: true,
        confidence: 0,
      });
      return;
    }

    // Add user message
    addMessage({ role: 'user', content: question });
    setLoading(true);
    setCurrentStep(0); // #6: start step tracker
    setThinkingLabel(WORKFLOW_STEP_LABELS[0]);

    // #6: Simulate step progression during analysis
    const stepTimer = setInterval(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next < WORKFLOW_STEP_LABELS.length) {
          setThinkingLabel(WORKFLOW_STEP_LABELS[next]);
          return next;
        }
        return prev;
      });
    }, 1200);

    try {
      // Execute V5 10-step agentic workflow
      const v5Result = await orchestrateV5Workflow(question, {
        question,
        metrics: activeTable?.columns?.filter(c => c.isKpiCandidate) || [],
        table: activeTable,
      });

      if (!v5Result.success) {
        addMessage({
          role: 'assistant',
          answer: v5Result.error || 'Analysis failed',
          confidence: 0,
          limitations: [v5Result.error],
          workflowSteps: v5Result.completedSteps,
        });
        return;
      }

      // Shape full 10-part V5 structured output
      const sqlToolResult = v5Result.evidence?.toolResults?.find(r => r.tool === 'generate_sql')?.result;
      // #1: Collect chart from explanation (SQL-derived) + any tool charts
      const charts = [
        v5Result.chart,
        ...( v5Result.evidence?.toolResults?.map(r => r.result?.chart).filter(Boolean) || []),
      ].filter(Boolean);

      addMessage({
        role: 'assistant',
        v5: true,
        answer: v5Result.answer,
        businessMeaning: v5Result.businessMeaning,
        evidence: v5Result.evidence,
        charts,
        rootCause: v5Result.explanation?.businessMeaning,
        recommendations: v5Result.recommendations,
        expectedImpact: v5Result.recommendations?.expectedImpact,
        confidence: v5Result.confidence,
        insightScore: v5Result.insightScore,
        limitations: v5Result.insightScore?.limitations || [],
        nextQuestion: v5Result.nextQuestion,
        workflowSteps: v5Result.allSteps,
        sqlUsed: sqlToolResult?.sql,
        queryResults: sqlToolResult?.queryResults,
        pythonUsed: v5Result.evidence?.toolResults?.find(r => r.tool?.includes('python'))?.result?.code,
      });
    } catch (e) {
      console.error('[useAnalystChat]', e);
      addMessage({
        role: 'assistant',
        answer: 'Error during V5 analysis: ' + e.message,
        confidence: 0,
        limitations: [e.message],
      });
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
      setThinkingLabel('');
      setCurrentStep(-1);
    }
  }, [loading, getActiveTable, addMessage]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  return {
    chatMessages,
    loading,
    thinkingLabel,
    currentStep, // #6
    addMessage,
    sendQuestion,
    clearChat,
  };
}