// Global Types for PolyFlow AI Frontend

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'developer' | 'admin' | 'enterprise';
  createdAt: Date;
  lastLogin: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  chains: Chain[];
  workflows: Workflow[];
  analytics: ProjectAnalytics;
}

export interface Chain {
  id: string;
  name: string;
  network: 'polkadot' | 'kusama' | 'westend' | 'custom';
  endpoint: string;
  status: 'connected' | 'disconnected' | 'syncing';
  blockHeight: number;
  validators: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: 'xcm' | 'smart-contract' | 'dapp' | 'custom';
  status: 'draft' | 'active' | 'paused' | 'completed';
  steps: WorkflowStep[];
  connections: Connection[];
  metadata: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  type: 'xcm-message' | 'contract-call' | 'transaction' | 'condition' | 'delay';
  title: string;
  description: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

export interface Connection {
  id: string;
  sourceStepId: string;
  targetStepId: string;
  sourceOutput: string;
  targetInput: string;
}

export interface XCMMessage {
  id: string;
  version: number;
  origin: Chain;
  destination: Chain;
  instructions: XCMInstruction[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  hash?: string;
  blockNumber?: number;
  timestamp: Date;
}

export interface XCMInstruction {
  type: 'withdraw-asset' | 'reserve-asset-deposited' | 'buy-execution' | 'deposit-asset' | 'transfer-asset';
  params: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    code?: string;
    language?: string;
    preview?: string;
    tokens?: number;
  };
}

export interface CodeGeneration {
  id: string;
  prompt: string;
  language: 'typescript' | 'javascript' | 'rust' | 'solidity' | 'substrate';
  code: string;
  explanation: string;
  dependencies: string[];
  tests?: string;
  status: 'generating' | 'completed' | 'error';
}

export interface ProjectAnalytics {
  transactions: number;
  successRate: number;
  averageLatency: number;
  totalValue: number;
  chains: number;
  workflows: number;
  lastActivity: Date;
  performance: PerformanceMetric[];
}

export interface PerformanceMetric {
  timestamp: Date;
  metric: string;
  value: number;
  unit: string;
}

export interface NetworkTopology {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  layout: 'force' | 'circular' | 'hierarchical';
}

export interface NetworkNode {
  id: string;
  type: 'parachain' | 'relay-chain' | 'bridge' | 'validator';
  name: string;
  status: 'active' | 'inactive' | 'syncing';
  position: { x: number; y: number };
  metadata: Record<string, any>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: 'xcmp' | 'hrmp' | 'bridge' | 'validator';
  weight: number;
  bidirectional: boolean;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'list' | 'map' | 'custom';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
  data: any;
  refreshInterval?: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Event Types
export type AppEvent =
  | { type: 'workflow-updated'; payload: Workflow }
  | { type: 'transaction-completed'; payload: { workflowId: string; txHash: string } }
  | { type: 'chain-connected'; payload: Chain }
  | { type: 'chain-disconnected'; payload: { chainId: string } }
  | { type: 'user-activity'; payload: { action: string; timestamp: Date } };

// Theme and UI Types
export interface Theme {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface UISettings {
  sidebarCollapsed: boolean;
  theme: Theme;
  notifications: boolean;
  autoSave: boolean;
  language: string;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data?: T;
  loading: boolean;
  error?: string;
  lastFetch?: Date;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};