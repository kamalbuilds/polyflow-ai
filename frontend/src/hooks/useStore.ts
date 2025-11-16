import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Project, Workflow, UISettings, ChatMessage } from '@/types';

// App State Store
interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;

  // Current context
  currentProject: Project | null;
  currentWorkflow: Workflow | null;

  // UI state
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'auto';
  uiSettings: UISettings;

  // Loading states
  loading: {
    projects: boolean;
    workflows: boolean;
    chat: boolean;
  };

  // Actions
  setUser: (user: User | null) => void;
  setCurrentProject: (project: Project | null) => void;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  updateUISettings: (settings: Partial<UISettings>) => void;
  setLoading: (key: keyof AppState['loading'], value: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      currentProject: null,
      currentWorkflow: null,
      sidebarOpen: true,
      theme: 'auto',
      uiSettings: {
        sidebarCollapsed: false,
        theme: { mode: 'auto', primaryColor: '#0ea5e9', secondaryColor: '#64748b', accentColor: '#d946ef' },
        notifications: true,
        autoSave: true,
        language: 'en',
      },
      loading: {
        projects: false,
        workflows: false,
        chat: false,
      },

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setCurrentProject: (currentProject) => set({ currentProject }),
      setCurrentWorkflow: (currentWorkflow) => set({ currentWorkflow }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setTheme: (theme) => set({ theme }),
      updateUISettings: (settings) => set({ uiSettings: { ...get().uiSettings, ...settings } }),
      setLoading: (key, value) => set({ loading: { ...get().loading, [key]: value } }),
      reset: () => set({
        user: null,
        isAuthenticated: false,
        currentProject: null,
        currentWorkflow: null,
        loading: { projects: false, workflows: false, chat: false },
      }),
    }),
    {
      name: 'polyflow-app-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        uiSettings: state.uiSettings,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// Chat Store
interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentContext: string;
  sessionId: string | null;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (update: Partial<ChatMessage>) => void;
  setStreaming: (isStreaming: boolean) => void;
  setContext: (context: string) => void;
  clearMessages: () => void;
  newSession: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentContext: '',
  sessionId: null,

  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    set({ messages: [...get().messages, newMessage] });
  },

  updateLastMessage: (update) => {
    const messages = get().messages;
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const updatedMessage = { ...lastMessage, ...update };
    const newMessages = [...messages.slice(0, -1), updatedMessage];

    set({ messages: newMessages });
  },

  setStreaming: (isStreaming) => set({ isStreaming }),
  setContext: (currentContext) => set({ currentContext }),
  clearMessages: () => set({ messages: [] }),
  newSession: () => set({
    messages: [],
    sessionId: `session_${Date.now()}`,
    isStreaming: false,
    currentContext: '',
  }),
}));

// Workflow Editor Store
interface WorkflowEditorState {
  nodes: any[];
  edges: any[];
  selectedNode: string | null;
  selectedEdge: string | null;
  isEditing: boolean;
  clipboard: any | null;
  history: Array<{ nodes: any[]; edges: any[] }>;
  historyIndex: number;

  // Actions
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  addNode: (node: any) => void;
  updateNode: (id: string, update: any) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: any) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setEditing: (isEditing: boolean) => void;
  copy: () => void;
  paste: () => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  reset: () => void;
}

export const useWorkflowEditorStore = create<WorkflowEditorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  isEditing: false,
  clipboard: null,
  history: [],
  historyIndex: -1,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => {
    const newNode = {
      ...node,
      id: node.id || `node_${Date.now()}`,
    };
    set({ nodes: [...get().nodes, newNode] });
    get().saveToHistory();
  },

  updateNode: (id, update) => {
    const nodes = get().nodes.map(node =>
      node.id === id ? { ...node, ...update } : node
    );
    set({ nodes });
    get().saveToHistory();
  },

  removeNode: (id) => {
    const nodes = get().nodes.filter(node => node.id !== id);
    const edges = get().edges.filter(edge =>
      edge.source !== id && edge.target !== id
    );
    set({ nodes, edges, selectedNode: null });
    get().saveToHistory();
  },

  addEdge: (edge) => {
    const newEdge = {
      ...edge,
      id: edge.id || `edge_${Date.now()}`,
    };
    set({ edges: [...get().edges, newEdge] });
    get().saveToHistory();
  },

  removeEdge: (id) => {
    const edges = get().edges.filter(edge => edge.id !== id);
    set({ edges, selectedEdge: null });
    get().saveToHistory();
  },

  selectNode: (selectedNode) => set({ selectedNode, selectedEdge: null }),
  selectEdge: (selectedEdge) => set({ selectedEdge, selectedNode: null }),
  setEditing: (isEditing) => set({ isEditing }),

  copy: () => {
    const { selectedNode, nodes } = get();
    if (selectedNode) {
      const node = nodes.find(n => n.id === selectedNode);
      if (node) {
        set({ clipboard: { type: 'node', data: node } });
      }
    }
  },

  paste: () => {
    const { clipboard } = get();
    if (clipboard?.type === 'node') {
      const newNode = {
        ...clipboard.data,
        id: `node_${Date.now()}`,
        position: {
          x: clipboard.data.position.x + 50,
          y: clipboard.data.position.y + 50,
        },
      };
      get().addNode(newNode);
    }
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        nodes: prevState.nodes,
        edges: prevState.edges,
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        nodes: nextState.nodes,
        edges: nextState.edges,
        historyIndex: historyIndex + 1,
      });
    }
  },

  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newState = { nodes: [...nodes], edges: [...edges] };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);

    // Limit history size
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  reset: () => set({
    nodes: [],
    edges: [],
    selectedNode: null,
    selectedEdge: null,
    isEditing: false,
    clipboard: null,
    history: [],
    historyIndex: -1,
  }),
}));

// Notification Store
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: Date;
}

interface NotificationState {
  notifications: Notification[];

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    set({ notifications: [...get().notifications, newNotification] });

    // Auto remove after duration
    const duration = notification.duration || 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(newNotification.id);
      }, duration);
    }
  },

  removeNotification: (id) => {
    set({ notifications: get().notifications.filter(n => n.id !== id) });
  },

  clearAll: () => set({ notifications: [] }),
}));