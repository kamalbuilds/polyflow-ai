/**
 * Type definitions for Code Generator
 */

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  framework: string;
  template: string;
  variables: string[];
  dependencies: string[];
  examples: string[];
  tags: string[];
  version?: string;
  author?: string;
  lastModified?: Date;
}

export interface TemplateContext {
  [key: string]: any;
  // Common context variables
  runtime_name?: string;
  pallet_name?: string;
  token_name?: string;
  token_symbol?: string;
  decimals?: number;
  max_supply?: string;
  framework?: string;
  language?: string;
  timestamp?: string;
  requirements?: string[];
}

export type GenerationStrategy = 'template' | 'ai' | 'hybrid' | 'auto';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
}

export interface TemplateSection {
  id: string;
  name: string;
  description: string;
  template: string;
  dependencies: string[];
  optional: boolean;
}

export interface CodeGenerationStrategy {
  name: string;
  description: string;
  suitability: Array<{
    framework: string;
    complexity: 'simple' | 'medium' | 'complex';
    score: number;
  }>;
  implementation: (request: any) => Promise<any>;
}

export interface TemplateEngine {
  compile(template: string): (context: TemplateContext) => string;
  registerHelper(name: string, helper: Function): void;
  registerPartial(name: string, partial: string): void;
}

export interface CodeValidator {
  validate(code: string, language: string): ValidationResult;
  fix(code: string, issues: ValidationIssue[]): string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'syntax' | 'logic' | 'style' | 'security' | 'performance';
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  fix?: string;
}

export interface CodeFormatter {
  format(code: string, language: string, options?: FormattingOptions): string;
}

export interface FormattingOptions {
  indentSize: number;
  useTabs: boolean;
  maxLineLength: number;
  insertFinalNewline: boolean;
  trimTrailingWhitespace: boolean;
}

export interface TemplateMetadata {
  name?: string;
  description?: string;
  language?: string;
  framework?: string;
  variables?: TemplateVariable[];
  dependencies?: string[];
  examples?: string[];
  tags?: string[];
  author?: string;
  version?: string;
  license?: string;
  documentation?: string;
}

export interface GenerationContext {
  request: any;
  template?: CodeTemplate;
  knowledgeContext: string;
  patterns: any[];
  userPreferences: UserPreferences;
}

export interface UserPreferences {
  codeStyle: 'verbose' | 'concise' | 'minimal';
  commentLevel: 'minimal' | 'moderate' | 'extensive';
  securityLevel: 'basic' | 'enhanced' | 'paranoid';
  performanceOptimization: boolean;
  testGeneration: boolean;
  documentationGeneration: boolean;
}

export interface GenerationResult {
  code: string;
  metadata: {
    strategy: GenerationStrategy;
    templateUsed?: string;
    confidence: number;
    warnings: string[];
    suggestions: string[];
  };
  artifacts: {
    tests?: string;
    documentation?: string;
    configuration?: string;
  };
}

export interface TemplateLibrary {
  templates: Map<string, CodeTemplate>;
  categories: string[];
  frameworks: string[];
  languages: string[];
}

export interface CodeAnalysisHints {
  expectedPatterns: string[];
  securityChecks: string[];
  performanceConsiderations: string[];
  frameworkSpecific: Record<string, string[]>;
}