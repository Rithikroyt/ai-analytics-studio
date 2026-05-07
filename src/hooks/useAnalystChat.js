/**
 * useAnalystChat — Hook for managing AI Analyst chat with V5 10-step workflow
 */
import { useState, useCallback } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { orchestrateV5Workflow } from '@/lib/v5AgentOrchestrator';

export function useAnalystChat() {
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState('');
  const { getActiveTable } = useWorkspaceStore();

  const addMessage = useCallback((msg) => {
    setChatMessages(prev => [...prev, msg]);
  }, []);

  const sendQuestion = useCallback(async (question) => {
    if (!question.trim() || loading) return;

    // Always pull fresh state to avoid stale closures
    const freshState = useWorkspaceStore.getState();
    const activeTable = freshState.getActiveTable();
    const freshAnalysis = freshState.analysisResults;
    if (!activeTable) {
      addMessage({
        role: 'assistant',
        answer: 'No dataset loaded. Upload data in the Intake section to begin.',
        confidence: 0,
        steps: [],
      });
      return;
    }

    // Add user message
    addMessage({ role: 'user', content: question });
    setLoading(true);
    setThinkingLabel('Starting analysis...');

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
      addMessage({
        role: 'assistant',
        v5: true,
        // Direct Answer (Part 1)
        answer: v5Result.answer,
        // Business Meaning (Part 2)
        businessMeaning: v5Result.businessMeaning,
        // Evidence (Part 3)
        evidence: v5Result.evidence,
        charts: v5Result.evidence?.toolResults?.map(r => r.result?.chart).filter(Boolean) || [],
        // Root Cause & Driver
        rootCause: v5Result.explanation?.businessMeaning,
        // Recommendations (Part 5)
        recommendations: v5Result.recommendations,
        expectedImpact: v5Result.recommendations?.expectedImpact,
        // Confidence & Limitations (Parts 6-7)
        confidence: v5Result.confidence,
        insightScore: v5Result.insightScore,
        limitations: v5Result.insightScore?.limitations || [],
        // Suggested Next Question (Part 10)
        nextQuestion: v5Result.nextQuestion,
        // Workflow trail
        workflowSteps: v5Result.allSteps,
        // Transparency
        sqlUsed: v5Result.evidence?.toolResults?.find(r => r.tool === 'generate_sql')?.result?.sql,
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
      setLoading(false);
      setThinkingLabel('');
    }
  }, [loading, getActiveTable, addMessage]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  return {
    chatMessages,
    loading,
    thinkingLabel,
    addMessage,
    sendQuestion,
    clearChat,
  };
}