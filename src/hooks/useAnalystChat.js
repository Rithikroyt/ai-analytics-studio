/**
 * useAnalystChat — Hook for managing AI Analyst chat with 7-step workflow
 */
import { useState, useCallback } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { executeAnalystWorkflowV4 } from '@/lib/analystEngineV4';

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
      const response = await executeAnalystWorkflowV4(
        question,
        useWorkspaceStore.getState(),
        freshAnalysis,
        activeTable
      );

      addMessage({
        role: 'assistant',
        v4: true,
        answer: response.answer,
        sections: response.sections,
        confidenceNum: response.confidenceNum,
        intent: response.intent,
        insights: response.insights,
        recommendations: response.recommendations,
        charts: response.charts,
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