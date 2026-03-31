import { create } from 'zustand';
import { sampleBundles } from '@/lib/sampleData';

export const useWorkspaceStore = create((set, get) => ({
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
  }),
}));