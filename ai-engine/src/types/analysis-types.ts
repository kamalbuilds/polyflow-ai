/**
 * Type definitions for Code Analyzer
 */

export interface CodeAnalysisRequest {
  requestId: string;
  code: string;
  language: string;
  framework?: string;
  analysisTypes?: string[];
  focusAreas?: string[];
  userId?: string;
}

export interface CodeAnalysisResponse {
  requestId: string;
  securityIssues: Array<{
    severity: string;
    description: string;
    recommendation: string;
  }>;
  performanceIssues: Array<{
    type: string;
    description: string;
    impact: string;
    recommendation: string;
  }>;
  codeQuality: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  suggestions: string[];
  compliance: Array<{
    standard: string;
    issue: string;
    recommendation: string;
  }>;
  metrics?: CodeMetrics;
  metadata?: {
    tokenCount?: number;
    responseTime?: number;
    model?: string;
    codeLength?: number;
    analysisTime?: number;
    rulesApplied?: number;
    codeHash?: string;
  };
}

export interface SecurityIssue {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  message: string;
  suggestion: string;
  line: number;
  snippet: string;
  examples?: string[];
  cwe?: string; // Common Weakness Enumeration
  owasp?: string; // OWASP reference
  impact?: string;
  exploitability?: 'low' | 'medium' | 'high';
}

export interface PerformanceIssue {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  message: string;
  suggestion: string;
  line: number;
  snippet: string;
  impact: string;
  gasImpact?: number; // For blockchain-specific performance
  complexity?: string; // Big O notation
  alternatives?: string[];
}

export interface QualityIssue {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  message: string;
  suggestion: string;
  line: number;
  snippet: string;
  maintainabilityImpact?: 'low' | 'medium' | 'high';
  readabilityScore?: number;
}

export interface ComplianceCheck {
  id: string;
  name: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion: string;
  line: number;
  compliant: boolean;
  standard: string; // e.g., 'substrate-best-practices', 'rust-guidelines'
  reference?: string; // URL to documentation
}

export interface AnalysisRule {
  id: string;
  name: string;
  description: string;
  severity: string;
  category: string;
  pattern: RegExp;
  message: string;
  suggestion: string;
  examples?: string[];
  enabled?: boolean;
  frameworks?: string[];
  languages?: string[];
}

export interface CodeMetrics {
  linesOfCode: number;
  nonBlankLines: number;
  commentLines: number;
  functions: number;
  complexity: number; // Cyclomatic complexity
  testCoverage: number;
  dependencies: number;
  codeSize: number;
  duplicatedLines?: number;
  technicalDebt?: {
    hours: number;
    issues: number;
  };
}

export interface DependencyAnalysis {
  totalDependencies: number;
  directDependencies: number;
  transitiveDependencies: number;
  vulnerableDependencies: VulnerableDependency[];
  outdatedDependencies: OutdatedDependency[];
  licenseIssues: LicenseIssue[];
  dependencyGraph: DependencyNode[];
}

export interface VulnerableDependency {
  name: string;
  version: string;
  vulnerability: {
    id: string;
    severity: string;
    description: string;
    fixedIn?: string;
  };
}

export interface OutdatedDependency {
  name: string;
  currentVersion: string;
  latestVersion: string;
  changeType: 'major' | 'minor' | 'patch';
}

export interface LicenseIssue {
  dependency: string;
  license: string;
  issue: 'incompatible' | 'unknown' | 'restrictive';
  impact: string;
}

export interface DependencyNode {
  name: string;
  version: string;
  dependencies: string[];
  size: number;
  license: string;
}

export interface SecurityScan {
  vulnerabilities: SecurityVulnerability[];
  secrets: SecretLeak[];
  cryptographicIssues: CryptographicIssue[];
  accessControlIssues: AccessControlIssue[];
  inputValidationIssues: InputValidationIssue[];
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  recommendation: string;
  cve?: string;
  references?: string[];
}

export interface SecretLeak {
  type: 'api_key' | 'password' | 'private_key' | 'token' | 'credential';
  pattern: string;
  location: {
    file: string;
    line: number;
  };
  confidence: number;
  redacted: string;
}

export interface CryptographicIssue {
  type: 'weak_algorithm' | 'hardcoded_key' | 'insecure_random' | 'weak_hash';
  description: string;
  location: {
    file: string;
    line: number;
  };
  recommendation: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AccessControlIssue {
  type: 'missing_authorization' | 'privilege_escalation' | 'insecure_permissions';
  description: string;
  location: {
    file: string;
    line: number;
  };
  impact: string;
  recommendation: string;
}

export interface InputValidationIssue {
  type: 'sql_injection' | 'xss' | 'path_traversal' | 'command_injection' | 'deserialization';
  description: string;
  location: {
    file: string;
    line: number;
  };
  userInput: string;
  sanitization: 'none' | 'partial' | 'complete';
  recommendation: string;
}

export interface PerformanceProfile {
  hotspots: PerformanceHotspot[];
  memoryUsage: MemoryProfile[];
  algorithmicComplexity: ComplexityAnalysis[];
  gasOptimizations: GasOptimization[]; // Blockchain-specific
}

export interface PerformanceHotspot {
  function: string;
  location: {
    file: string;
    line: number;
  };
  estimatedCost: number;
  frequency: number;
  optimization: string;
}

export interface MemoryProfile {
  allocation: string;
  size: number;
  lifetime: 'short' | 'medium' | 'long';
  optimization: string;
}

export interface ComplexityAnalysis {
  function: string;
  timeComplexity: string; // Big O notation
  spaceComplexity: string;
  suggestion: string;
}

export interface GasOptimization {
  operation: string;
  currentCost: number;
  optimizedCost: number;
  savings: number;
  technique: string;
}

export interface CodeSmell {
  type: 'long_method' | 'large_class' | 'duplicate_code' | 'dead_code' | 'magic_number';
  severity: 'minor' | 'major' | 'blocker';
  description: string;
  location: {
    file: string;
    startLine: number;
    endLine: number;
  };
  refactoring: string;
  effort: 'low' | 'medium' | 'high';
}

export interface ArchitecturalIssue {
  type: 'circular_dependency' | 'tight_coupling' | 'god_object' | 'feature_envy';
  description: string;
  components: string[];
  impact: string;
  recommendation: string;
}

export interface TestingIssues {
  coverageGaps: CoverageGap[];
  testSmells: TestSmell[];
  missingTests: MissingTest[];
}

export interface CoverageGap {
  file: string;
  function: string;
  lines: number[];
  type: 'branch' | 'statement' | 'function';
}

export interface TestSmell {
  type: 'long_test' | 'duplicate_test' | 'unclear_assertion' | 'magic_value';
  test: string;
  description: string;
  recommendation: string;
}

export interface MissingTest {
  component: string;
  functionality: string;
  priority: 'low' | 'medium' | 'high';
  suggestion: string;
}