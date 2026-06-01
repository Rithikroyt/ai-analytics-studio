import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sampleBundles, inferColumns, buildSemanticModel, buildAnalysis } from '@/lib/sampleData';
import { DEMO_DATASETS, generateDemoData } from '@/lib/demoDatasets';

// Map bundle keys used in UI to actual DEMO_DATASETS ids
const BUNDLE_KEY_MAP = {
  finance_operations: 'finance_costs',
  appointments_healthcare: 'healthcare',
};

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
        // Try legacy sampleBundles first
        const legacyBundle = sampleBundles[bundleKey];
        if (legacyBundle?.tables?.length) {
          set({
            tables: legacyBundle.tables,
            activeTableId: legacyBundle.tables[0]?.id || null,
            semanticModel: legacyBundle.semanticModel,
            analysisResults: legacyBundle.analysisResults,
            chatMessages: [],
          });
          return;
        }

        // Try new DEMO_DATASETS (resolve aliased keys first)
        const resolvedKey = BUNDLE_KEY_MAP[bundleKey] || bundleKey;
        const ds = DEMO_DATASETS.find(d => d.id === resolvedKey);
        if (ds) {
          try {
            const rows = generateDemoData(resolvedKey);
            const cols = inferColumns(rows);
            const id = `${resolvedKey}-main`;
            const table = {
              id,
              name: ds.name,
              fileName: `${resolvedKey}.csv`,
              rows,
              columns: cols,
              rowCount: rows.length,
              qualityScore: 75,
              issues: [],
              qualityIssues: [],
            };
            set({
              tables: [table],
              activeTableId: id,
              semanticModel: buildSemanticModel(id, cols, ds.name),
              analysisResults: buildAnalysis(rows, cols, ds.name),
              chatMessages: [],
            });
          } catch (e) {
            console.warn('[store] loadSampleBundle DEMO_DATASETS error:', e.message);
          }
          return;
        }

        console.warn('[store] loadSampleBundle: unknown key:', bundleKey);
      },

      getActiveTable: () => {
        const { tables, activeTableId } = get();
        return tables.find(t => t.id === activeTableId) || tables[0] || null;
      },

      // ── Analyst Memory Store ──
      analystMemory: {
        sessionInsights: [],    // { question, answer, chart, timestamp, tableId }
        userPreferences: {},    // { preferredMode, commonMetrics, lastQuestions }
        dataPatterns: {},       // { tableId: { patterns: [], summary } }
      },

      addAnalystInsight: (insight) => set((state) => ({
        analystMemory: {
          ...state.analystMemory,
          sessionInsights: [
            { ...insight, id: Date.now().toString(), timestamp: new Date().toISOString() },
            ...state.analystMemory.sessionInsights.slice(0, 49),
          ],
        },
      })),

      setUserPreference: (key, value) => set((state) => ({
        analystMemory: {
          ...state.analystMemory,
          userPreferences: { ...state.analystMemory.userPreferences, [key]: value },
        },
      })),

      setDataPattern: (tableId, pattern) => set((state) => ({
        analystMemory: {
          ...state.analystMemory,
          dataPatterns: { ...state.analystMemory.dataPatterns, [tableId]: pattern },
        },
      })),

      clearAnalystMemory: () => set({
        analystMemory: { sessionInsights: [], userPreferences: {}, dataPatterns: {} },
      }),

      // ── Resets only the current workspace session — preserved: savedCharts, stories, alerts, documents
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
      name: 'omnidata-workspace-v3',
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
        analystMemory: {
          sessionInsights: (state.analystMemory?.sessionInsights || []).slice(0, 30),
          userPreferences: state.analystMemory?.userPreferences || {},
          dataPatterns: state.analystMemory?.dataPatterns || {},
        },
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