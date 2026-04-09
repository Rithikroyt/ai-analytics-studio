import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sampleBundles } from '@/lib/sampleData';

export const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      // Tables / datasets
      tables: [],
      activeTableId: null,
      
      // Semantic model
      semanticModel: null,
      
      // Analysis results
      analysisResults: null,
      
      // AI Chat
      chatMessages: [],
      
      // Current workspace section
      activeSection: 'overview',
      
      // Upload state
      isProcessing: false,
      processingStep: '',
      
      // Reports
      reports: [],

      // Saved dashboard items
      savedCharts: [],

      // Story Builder slides
      stories: [], // [{id, title, slides: [{id, type:'chart'|'insight', chartId?, text?, narration?}]}]

      // Alerts
      alerts: [], // [{id, label, metric, condition, threshold, unit, email, active, lastTriggered}]

      // Integrations / Connections
      connections: {}, // { [connectorId]: { status, schedule, config, lastSync, rowCount, error } }

      setActiveSection: (section) => set({ activeSection: section }),

      addTable: (table) => set((state) => ({
        tables: [...state.tables, table],
        activeTableId: state.activeTableId || table.id,
      })),

      setTables: (tables) => set({ 
        tables, 
        activeTableId: tables.length > 0 ? tables[0].id : null 
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
        reports: [...state.reports, report],
      })),

      // Dashboard / saved charts
      saveToDashboard: (item) => set((state) => ({
        savedCharts: [...state.savedCharts, { ...item, id: Date.now().toString(), savedAt: new Date().toISOString() }],
      })),
      removeSavedChart: (id) => set((state) => ({
        savedCharts: state.savedCharts.filter(c => c.id !== id),
      })),
      renameSavedChart: (id, label) => set((state) => ({
        savedCharts: state.savedCharts.map(c => c.id === id ? { ...c, label } : c),
      })),

      // Story Builder
      addStory: (story) => set((state) => ({
        stories: [...state.stories, { ...story, id: Date.now().toString(), createdAt: new Date().toISOString() }],
      })),
      updateStory: (id, updates) => set((state) => ({
        stories: state.stories.map(s => s.id === id ? { ...s, ...updates } : s),
      })),
      removeStory: (id) => set((state) => ({
        stories: state.stories.filter(s => s.id !== id),
      })),

      // Alerts
      addAlert: (alert) => set((state) => ({
        alerts: [...state.alerts, { ...alert, id: Date.now().toString(), createdAt: new Date().toISOString(), active: true }],
      })),
      updateAlert: (id, updates) => set((state) => ({
        alerts: state.alerts.map(a => a.id === id ? { ...a, ...updates } : a),
      })),
      removeAlert: (id) => set((state) => ({
        alerts: state.alerts.filter(a => a.id !== id),
      })),

      loadSampleBundle: (bundleKey) => {
        const bundle = sampleBundles[bundleKey];
        if (!bundle) return;
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
        savedCharts: [],
      }),
    }),
    {
      name: 'omnidata-workspace',
      partialize: (state) => ({
        savedCharts: state.savedCharts,
        stories: state.stories,
        alerts: state.alerts,
        // Persist tables but strip large row data to avoid localStorage limits
        tables: state.tables.map(t => ({
          ...t,
          rows: t.rows?.slice(0, 500) ?? [], // cap at 500 rows for storage
        })),
        activeTableId: state.activeTableId,
        semanticModel: state.semanticModel,
        analysisResults: state.analysisResults,
      }),
    }
  )
);