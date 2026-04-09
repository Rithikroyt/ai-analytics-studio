import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sampleBundles } from '@/lib/sampleData';

export const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      tables: [],
      activeTableId: null,
      semanticModel: null,
      analysisResults: null,
      chatMessages: [],
      activeSection: 'overview',
      isProcessing: false,
      processingStep: '',
      reports: [],
      savedCharts: [],
      stories: [],
      alerts: [],
      connections: {},
      documents: [],

      setActiveSection: (section) => set({ activeSection: section }),

      addTable: (table) => set((state) => ({
        tables: [...state.tables, table],
        activeTableId: state.activeTableId || table.id,
      })),

      setTables: (tables) => set({
        tables,
        activeTableId: tables.length > 0 ? tables[0].id : null,
      }),

      setActiveTable: (id) => set({ activeTableId: id }),

      updateTable: (id, updates) => set((state) => ({
        tables: state.tables.map(t => t.id === id ? { ...t, ...updates } : t),
      })),

      removeTable: (id) => set((state) => ({
        tables: state.tables.filter(t => t.id !== id),
        activeTableId: state.activeTableId === id
          ? (state.tables.find(t => t.id !== id)?.id || null)
          : state.activeTableId,
        analysisResults: state.activeTableId === id ? null : state.analysisResults,
      })),

      setSemanticModel: (model) => set({ semanticModel: model }),
      setAnalysisResults: (results) => set({ analysisResults: results }),

      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, message],
      })),

      updateLastMessage: (updates) => set((state) => {
        const messages = [...state.chatMessages];
        if (messages.length > 0) {
          messages[messages.length - 1] = { ...messages[messages.length - 1], ...updates };
        }
        return { chatMessages: messages };
      }),

      clearChat: () => set({ chatMessages: [] }),

      setProcessing: (isProcessing, step = '') => set({ isProcessing, processingStep: step }),

      addReport: (report) => set((state) => ({
        reports: [{ ...report, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...state.reports],
      })),
      removeReport: (id) => set((state) => ({
        reports: state.reports.filter(r => r.id !== id),
      })),

      saveToDashboard: (item) => set((state) => ({
        savedCharts: [...state.savedCharts, { ...item, id: Date.now().toString(), savedAt: new Date().toISOString() }],
      })),
      removeSavedChart: (id) => set((state) => ({
        savedCharts: state.savedCharts.filter(c => c.id !== id),
      })),
      renameSavedChart: (id, label) => set((state) => ({
        savedCharts: state.savedCharts.map(c => c.id === id ? { ...c, label } : c),
      })),

      addStory: (story) => set((state) => ({
        stories: [...state.stories, { ...story, id: Date.now().toString(), createdAt: new Date().toISOString() }],
      })),
      updateStory: (id, updates) => set((state) => ({
        stories: state.stories.map(s => s.id === id ? { ...s, ...updates } : s),
      })),
      removeStory: (id) => set((state) => ({
        stories: state.stories.filter(s => s.id !== id),
      })),

      addAlert: (alert) => set((state) => ({
        alerts: [...state.alerts, { ...alert, id: Date.now().toString(), createdAt: new Date().toISOString(), active: true }],
      })),
      updateAlert: (id, updates) => set((state) => ({
        alerts: state.alerts.map(a => a.id === id ? { ...a, ...updates } : a),
      })),
      removeAlert: (id) => set((state) => ({
        alerts: state.alerts.filter(a => a.id !== id),
      })),

      addDocument: (doc) => set((state) => ({
        documents: [...state.documents, doc],
      })),
      removeDocument: (id) => set((state) => ({
        documents: state.documents.filter(d => d.id !== id),
      })),

      loadSampleBundle: (bundleKey) => {
        const bundle = sampleBundles[bundleKey];
        if (!bundle || !bundle.tables?.length) {
          console.warn('[store] loadSampleBundle: unknown key or empty bundle:', bundleKey);
          return;
        }
        // Preserve savedCharts, stories, alerts, documents — only replace workspace session data
        set({
          tables: bundle.tables,
          activeTableId: bundle.tables[0]?.id || null,
          semanticModel: bundle.semanticModel,
          analysisResults: bundle.analysisResults,
          chatMessages: [],
        });
      },

      getActiveTable: () => {
        const { tables, activeTableId } = get();
        return tables.find(t => t.id === activeTableId) || tables[0] || null;
      },

      // Resets only the current workspace session — preserved: savedCharts, stories, alerts, documents
      reset: () => set({
        tables: [],
        activeTableId: null,
        semanticModel: null,
        analysisResults: null,
        chatMessages: [],
        activeSection: 'overview',
        isProcessing: false,
        processingStep: '',
        reports: [],
      }),
    }),
    {
      name: 'omnidata-workspace-v2',
      partialize: (state) => ({
        savedCharts: state.savedCharts,
        stories: state.stories,
        alerts: state.alerts,
        activeSection: state.activeSection,
        // Cap rows to prevent localStorage overflow
        tables: state.tables.map(t => ({
          ...t,
          rows: t.rows?.slice(0, 800) ?? [],
        })),
        activeTableId: state.activeTableId,
        semanticModel: state.semanticModel,
        documents: (state.documents || []).map(d => ({ ...d, content: d.content?.slice(0, 2000) })),
        // Cap analysisResults colStats + trendData to avoid bloat
        analysisResults: state.analysisResults ? {
          ...state.analysisResults,
          colStats: {},
          allBreakdowns: {},
          allTrends: {},
          numericCols: state.analysisResults.numericCols,
          catCols: state.analysisResults.catCols,
          dateCol: state.analysisResults.dateCol,
        } : null,
      }),
    }
  )
);