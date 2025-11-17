/**
 * Type definitions for Knowledge Base
 */

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  framework: string;
  language: string;
  tags?: string[];
  version?: string;
  lastUpdated?: Date;
  source?: string;
  examples?: string[];
  relatedEntries?: string[];
}

export interface KnowledgeQuery {
  text: string;
  language?: string;
  framework?: string;
  category?: string;
  tags?: string[];
  limit?: number;
  threshold?: number;
}

export interface KnowledgeContext {
  entries: KnowledgeEntry[];
  relevanceScore: number;
  totalTokens: number;
}

export interface DocumentEmbedding {
  id: string;
  embedding: number[];
  metadata: {
    title: string;
    category: string;
    framework: string;
    language: string;
    tags: string[];
    content: string;
  };
}

export interface SubstratePattern {
  id: string;
  name: string;
  description: string;
  code_example: string;
  security_considerations: string[];
  performance_notes: string[];
  use_cases: string[];
}

export interface FramePallet {
  id: string;
  name: string;
  description: string;
  category: string;
  dependencies: string[];
  extrinsics: Array<{
    name: string;
    description: string;
    parameters: string[];
    security_notes?: string[];
  }>;
  storage: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  events?: string[];
  errors?: string[];
  inherents?: string[];
  best_practices: string[];
}

export interface PolkadotConcept {
  id: string;
  name: string;
  description: string;
  category: 'consensus' | 'governance' | 'xcm' | 'parachain' | 'runtime' | 'storage';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  codeExamples: Array<{
    title: string;
    code: string;
    explanation: string;
  }>;
  resources: Array<{
    type: 'documentation' | 'tutorial' | 'example' | 'reference';
    url: string;
    title: string;
  }>;
}

export interface SecurityPattern {
  id: string;
  name: string;
  description: string;
  category: 'access_control' | 'data_validation' | 'cryptography' | 'consensus' | 'economic_security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  vulnerabilities: string[];
  mitigations: string[];
  codeExample: string;
  antiPatterns: string[];
  testCases: string[];
}

export interface PerformancePattern {
  id: string;
  name: string;
  description: string;
  category: 'storage' | 'computation' | 'networking' | 'consensus' | 'memory';
  impact: 'low' | 'medium' | 'high';
  optimizations: string[];
  benchmarks: Array<{
    scenario: string;
    before: string;
    after: string;
    improvement: string;
  }>;
  codeExample: string;
  metrics: string[];
}

export interface KnowledgeGraph {
  nodes: Array<{
    id: string;
    type: 'concept' | 'pattern' | 'example' | 'pallet' | 'feature';
    data: any;
  }>;
  edges: Array<{
    from: string;
    to: string;
    relationship: 'depends_on' | 'implements' | 'extends' | 'uses' | 'related_to';
    weight: number;
  }>;
}

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  level: number;
  parent?: string;
  children: string[];
  codeBlocks: Array<{
    language: string;
    code: string;
    caption?: string;
  }>;
  links: Array<{
    text: string;
    url: string;
    type: 'internal' | 'external';
  }>;
}

export interface SearchResult {
  entry: KnowledgeEntry;
  score: number;
  highlights: string[];
  context: string;
}

export interface KnowledgeStats {
  totalEntries: number;
  entriesByCategory: Record<string, number>;
  entriesByFramework: Record<string, number>;
  entriesByLanguage: Record<string, number>;
  lastUpdated: Date;
  averageRelevanceScore: number;
}

export interface EmbeddingModel {
  name: string;
  dimensions: number;
  maxTokens: number;
  costPerToken: number;
  languages: string[];
}