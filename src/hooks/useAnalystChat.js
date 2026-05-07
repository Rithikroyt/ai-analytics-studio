/**
 * useAnalystChat — Hook for managing AI Analyst chat with 7-step workflow
 */
import { useState, useCallback } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { executeAnalystWorkflow } from '@/components/workspace/analyst/AnalystEngine';

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
      // Execute the 7-step analyst workflow
      const response = await executeAnalystWorkflow(
        question,
        useWorkspaceStore.getState(),
        freshAnalysis,
        activeTable
      );

      // Add assistant response with structured format
      addMessage({
        role: 'assistant',
        answer: response.answer,
        insights: response.insights,
        evidence: response.evidence,
        recommendations: response.recommendations,
        charts: response.charts,
        confidence: response.confidence,
        limitations: response.limitations,
        methodology: response.methodology,
        steps: response.steps,
        // V3 structured fields
        intent: response.intent,
        mode: response.mode,
        businessMeaning: response.businessMeaning,
        rootCauses: response.rootCauses,
        nextQuestion: response.nextQuestion,
      });
    } catch (e) {
      console.error('[useAnalystChat]', e);
      addMessage({
        role: 'assistant',
        answer: 'Error during analysis. Please try again.',
        confidence: 0,
        steps: [],
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