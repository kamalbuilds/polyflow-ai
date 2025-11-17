/**
 * Code Analyzer Engine - Static analysis for security, performance, and quality
 */

// Tree-sitter removed for now
// import Parser from 'tree-sitter';
// import Rust from 'tree-sitter-rust';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto-js';
import { Logger } from '../utils/logger';
import {
  CodeAnalysisRequest,
  CodeAnalysisResponse,
  SecurityIssue,
  PerformanceIssue,
  QualityIssue,
  AnalysisRule,
  CodeMetrics,
  ComplianceCheck
} from '../types/analysis-types';

export class CodeAnalyzer {
  // private parser: Parser; // Removed for now
  private logger: Logger;
  private securityRules: Map<string, AnalysisRule> = new Map();
  private performanceRules: Map<string, AnalysisRule> = new Map();
  private qualityRules: Map<string, AnalysisRule> = new Map();
  private complianceRules: Map<string, AnalysisRule> = new Map();

  constructor() {
    this.logger = new Logger();
    // Tree-sitter parser removed for now
    // this.parser = new Parser();
    // this.parser.setLanguage(Rust);
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Code Analyzer...');

      await this.loadAnalysisRules();

      this.logger.info('Code Analyzer initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Code Analyzer:', error);
      throw error;
    }
  }

  private async loadAnalysisRules(): Promise<void> {
    // Load security rules
    await this.loadSecurityRules();

    // Load performance rules
    await this.loadPerformanceRules();

    // Load quality rules
    await this.loadQualityRules();

    // Load compliance rules
    await this.loadComplianceRules();

    this.logger.info('Analysis rules loaded successfully', {
      security: this.securityRules.size,
      performance: this.performanceRules.size,
      quality: this.qualityRules.size,
      compliance: this.complianceRules.size
    });
  }

  private async loadSecurityRules(): Promise<void> {
    const securityRules: AnalysisRule[] = [
      {
        id: 'unsafe-unwrap',
        name: 'Unsafe Unwrap Usage',
        description: 'Detect unsafe .unwrap() calls that can cause panics',
        severity: 'high',
        category: 'security',
        pattern: /\.unwrap\(\)/g,
        message: 'Use proper error handling instead of .unwrap() to prevent panics',
        suggestion: 'Replace .unwrap() with proper error handling using ?, expect(), or match',
        examples: [
          'Bad: value.unwrap()',
          'Good: value.map_err(|_| Error::<T>::SomeError)?'
        ]
      },
      {
        id: 'integer-overflow',
        name: 'Integer Overflow Risk',
        description: 'Detect arithmetic operations that may overflow',
        severity: 'high',
        category: 'security',
        pattern: /(\w+)\s*\+\s*(\w+)(?!\s*\.saturating_)/g,
        message: 'Use saturating arithmetic to prevent integer overflow',
        suggestion: 'Use .saturating_add(), .checked_add(), or .wrapping_add() instead of +',
        examples: [
          'Bad: a + b',
          'Good: a.saturating_add(b)',
          'Good: a.checked_add(b).ok_or(Error::<T>::Overflow)?'
        ]
      },
      {
        id: 'unchecked-origin',
        name: 'Unchecked Origin',
        description: 'Detect functions without proper origin validation',
        severity: 'critical',
        category: 'security',
        pattern: /pub fn \w+\(\s*origin[^)]*\).*?\{(?![\s\S]*ensure_signed|[\s\S]*ensure_root)/g,
        message: 'All public functions must validate their origin',
        suggestion: 'Add ensure_signed(origin)? or ensure_root(origin)? at the start of the function',
        examples: [
          'Good: let sender = ensure_signed(origin)?;',
          'Good: ensure_root(origin)?;'
        ]
      },
      {
        id: 'storage-unbounded',
        name: 'Unbounded Storage Growth',
        description: 'Detect storage items that may grow unbounded',
        severity: 'medium',
        category: 'security',
        pattern: /StorageMap<[^>]*>\s*(?!.*BoundedVec)/g,
        message: 'Consider using bounded collections to prevent unbounded storage growth',
        suggestion: 'Use BoundedVec, BoundedBTreeMap, or implement cleanup mechanisms',
        examples: [
          'Good: BoundedVec<Item, T::MaxItems>',
          'Good: Implement periodic cleanup of old entries'
        ]
      },
      {
        id: 'missing-weight',
        name: 'Missing Weight Annotation',
        description: 'Detect extrinsics without proper weight annotations',
        severity: 'medium',
        category: 'security',
        pattern: /pub fn \w+\([^)]*\)\s*->\s*DispatchResult(?!.*#\[weight)/g,
        message: 'All extrinsics must have proper weight annotations',
        suggestion: 'Add #[weight = T::WeightInfo::function_name()] above the function',
        examples: [
          'Good: #[weight = T::WeightInfo::transfer()]',
          'Good: #[weight = 10_000 + T::DbWeight::get().reads(1)]'
        ]
      }
    ];

    for (const rule of securityRules) {
      this.securityRules.set(rule.id, rule);
    }
  }

  private async loadPerformanceRules(): Promise<void> {
    const performanceRules: AnalysisRule[] = [
      {
        id: 'inefficient-storage-read',
        name: 'Inefficient Storage Reads',
        description: 'Detect multiple reads of the same storage item',
        severity: 'medium',
        category: 'performance',
        pattern: /(\w+::<T>::get\(\)[\s\S]*?\1::<T>::get\(\))/g,
        message: 'Avoid multiple reads of the same storage item',
        suggestion: 'Cache storage reads in local variables',
        examples: [
          'Bad: let a = Storage::<T>::get(); let b = Storage::<T>::get();',
          'Good: let value = Storage::<T>::get(); let a = value; let b = value;'
        ]
      },
      {
        id: 'expensive-clone',
        name: 'Expensive Clone Operations',
        description: 'Detect potentially expensive clone operations',
        severity: 'low',
        category: 'performance',
        pattern: /\.clone\(\)(?=.*Vec|.*BTreeMap|.*HashMap)/g,
        message: 'Avoid cloning large data structures when possible',
        suggestion: 'Use references or move semantics instead of cloning',
        examples: [
          'Bad: let copy = large_vec.clone();',
          'Good: let reference = &large_vec;',
          'Good: Use into() for ownership transfer'
        ]
      },
      {
        id: 'string-allocation',
        name: 'Unnecessary String Allocation',
        description: 'Detect unnecessary string allocations in performance-critical code',
        severity: 'low',
        category: 'performance',
        pattern: /String::from|\.to_string\(\)|format!/g,
        message: 'Avoid string allocations in performance-critical paths',
        suggestion: 'Use string literals or pre-allocated strings when possible',
        examples: [
          'Bad: String::from("constant")',
          'Good: "constant" or b"constant"',
          'Consider: Use const for repeated strings'
        ]
      },
      {
        id: 'nested-loops',
        name: 'Nested Loop Performance',
        description: 'Detect nested loops that may cause performance issues',
        severity: 'medium',
        category: 'performance',
        pattern: /for\s+.*\{[\s\S]*for\s+.*\{/g,
        message: 'Nested loops can be expensive with large datasets',
        suggestion: 'Consider algorithmic optimizations or batching',
        examples: [
          'Consider: Use iterators and functional approaches',
          'Consider: Implement early termination conditions',
          'Consider: Use more efficient algorithms (O(n log n) vs O(n²))'
        ]
      }
    ];

    for (const rule of performanceRules) {
      this.performanceRules.set(rule.id, rule);
    }
  }

  private async loadQualityRules(): Promise<void> {
    const qualityRules: AnalysisRule[] = [
      {
        id: 'missing-docs',
        name: 'Missing Documentation',
        description: 'Detect public functions without documentation',
        severity: 'low',
        category: 'quality',
        pattern: /pub fn (?!.*\/\/\/|.*\/\*\*)/g,
        message: 'Public functions should have documentation comments',
        suggestion: 'Add /// documentation comments above public functions',
        examples: [
          'Good: /// Transfer tokens between accounts',
          'Good: /// # Arguments\n/// * `to` - Destination account\n/// * `amount` - Transfer amount'
        ]
      },
      {
        id: 'magic-numbers',
        name: 'Magic Numbers',
        description: 'Detect magic numbers that should be constants',
        severity: 'low',
        category: 'quality',
        pattern: /(?<![\w.])\d{4,}(?![\w.])/g,
        message: 'Large numeric literals should be defined as constants',
        suggestion: 'Define constants with descriptive names',
        examples: [
          'Bad: if value > 1000000',
          'Good: const MIN_STAKE: u128 = 1_000_000;'
        ]
      },
      {
        id: 'long-function',
        name: 'Function Too Long',
        description: 'Detect functions that may be too long',
        severity: 'low',
        category: 'quality',
        pattern: /fn\s+\w+[\s\S]*?\{[\s\S]{1000,}?\}/g,
        message: 'Consider breaking down long functions',
        suggestion: 'Split into smaller, focused functions',
        examples: [
          'Good: Keep functions under 50 lines when possible',
          'Good: Extract complex logic into helper functions'
        ]
      },
      {
        id: 'deep-nesting',
        name: 'Deep Nesting',
        description: 'Detect deeply nested code blocks',
        severity: 'low',
        category: 'quality',
        pattern: /\{[\s\S]*\{[\s\S]*\{[\s\S]*\{[\s\S]*\{/g,
        message: 'Deep nesting makes code hard to read',
        suggestion: 'Use early returns, guard clauses, or extract functions',
        examples: [
          'Good: Use early returns with ensure! macro',
          'Good: Extract nested logic into separate functions'
        ]
      }
    ];

    for (const rule of qualityRules) {
      this.qualityRules.set(rule.id, rule);
    }
  }

  private async loadComplianceRules(): Promise<void> {
    const complianceRules: AnalysisRule[] = [
      {
        id: 'substrate-best-practices',
        name: 'Substrate Best Practices',
        description: 'Check compliance with Substrate development best practices',
        severity: 'medium',
        category: 'compliance',
        pattern: /decl_storage![\s\S]*?(?!get\(fn)/g,
        message: 'Storage items should use getter functions for external access',
        suggestion: 'Add get(fn getter_name) to storage declarations',
        examples: [
          'Good: SomeValue get(fn some_value): StorageValue<_, u32>;'
        ]
      },
      {
        id: 'error-handling',
        name: 'Proper Error Handling',
        description: 'Ensure proper error handling patterns are used',
        severity: 'medium',
        category: 'compliance',
        pattern: /\.expect\(|panic!/g,
        message: 'Use Result types instead of expect() or panic! in runtime code',
        suggestion: 'Return errors using DispatchError or custom error types',
        examples: [
          'Bad: value.expect("should exist")',
          'Good: value.ok_or(Error::<T>::ValueNotFound)?'
        ]
      },
      {
        id: 'runtime-safety',
        name: 'Runtime Safety',
        description: 'Check for runtime safety violations',
        severity: 'critical',
        category: 'compliance',
        pattern: /unsafe\s*\{/g,
        message: 'Unsafe code should be avoided in runtime logic',
        suggestion: 'Use safe alternatives or carefully document safety requirements',
        examples: [
          'Consider: Use safe abstractions when possible',
          'Required: Add detailed safety comments for necessary unsafe code'
        ]
      }
    ];

    for (const rule of complianceRules) {
      this.complianceRules.set(rule.id, rule);
    }
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResponse> {
    try {
      this.logger.info('Starting code analysis', {
        language: request.language,
        codeLength: request.code.length
      });

      // Parse code into AST (simplified for now)
      // const tree = this.parser.parse(request.code);

      // Calculate code metrics (simplified without AST)
      const metrics = this.calculateMetrics(request.code, null);

      // Run security analysis
      const securityIssues = await this.runSecurityAnalysis(request.code, null);

      // Run performance analysis
      const performanceIssues = await this.runPerformanceAnalysis(request.code, null);

      // Run quality analysis
      const qualityIssues = await this.runQualityAnalysis(request.code, null);

      // Run compliance checks
      const complianceChecks = await this.runComplianceChecks(request.code, null);

      // Generate suggestions
      const suggestions = this.generateSuggestions(
        securityIssues,
        performanceIssues,
        qualityIssues,
        complianceChecks
      );

      // Calculate overall quality score
      const qualityScore = this.calculateQualityScore(
        metrics,
        securityIssues,
        performanceIssues,
        qualityIssues,
        complianceChecks
      );

      const response: CodeAnalysisResponse = {
        requestId: request.requestId,
        securityIssues: securityIssues.map(issue => ({
          severity: issue.severity,
          description: issue.message,
          recommendation: issue.suggestion
        })),
        performanceIssues: performanceIssues.map(issue => ({
          type: issue.category,
          description: issue.message,
          impact: issue.severity,
          recommendation: issue.suggestion
        })),
        codeQuality: {
          score: qualityScore,
          issues: qualityIssues.map(issue => issue.message),
          strengths: this.identifyStrengths(request.code, metrics)
        },
        suggestions,
        compliance: complianceChecks.map(check => ({
          standard: check.category,
          issue: check.message,
          recommendation: check.suggestion
        })),
        metrics,
        metadata: {
          analysisTime: Date.now() - Date.now(),
          rulesApplied: this.securityRules.size + this.performanceRules.size + this.qualityRules.size,
          codeHash: crypto.SHA256(request.code).toString()
        }
      };

      this.logger.info('Code analysis completed', {
        requestId: request.requestId,
        securityIssues: securityIssues.length,
        performanceIssues: performanceIssues.length,
        qualityScore
      });

      return response;

    } catch (error) {
      this.logger.error('Code analysis failed:', error);
      throw error;
    }
  }

  private calculateMetrics(code: string, tree: any): CodeMetrics {
    const lines = code.split('\n');

    return {
      linesOfCode: lines.length,
      nonBlankLines: lines.filter(line => line.trim().length > 0).length,
      commentLines: lines.filter(line => line.trim().startsWith('//')).length,
      functions: this.countFunctions(tree),
      complexity: this.calculateComplexity(tree),
      testCoverage: this.estimateTestCoverage(code),
      dependencies: this.countDependencies(code),
      codeSize: code.length
    };
  }

  private countFunctions(tree: any): number {
    // Simplified function counting without AST
    if (!tree) {
      // Count functions using regex as fallback
      return 0; // Will implement simple regex counting if needed
    }

    let count = 0;
    // AST traversal code commented out for now
    return count;
  }

  private calculateComplexity(tree: any): number {
    let complexity = 1; // Base complexity

    // Simplified complexity calculation without AST
    if (!tree) {
      return complexity; // Will implement simple regex counting if needed
    }

    // AST traversal code commented out for now
    return complexity;
  }

  private estimateTestCoverage(code: string): number {
    // Simple estimation based on test-related patterns
    const testPatterns = [
      /#\[test\]/g,
      /#\[cfg\(test\)\]/g,
      /assert!/g,
      /assert_eq!/g,
      /assert_ne!/g
    ];

    let testScore = 0;
    for (const pattern of testPatterns) {
      const matches = code.match(pattern);
      testScore += matches ? matches.length : 0;
    }

    // Rough estimation: more tests = higher coverage
    const linesOfCode = code.split('\n').length;
    const estimatedCoverage = Math.min((testScore / linesOfCode) * 100 * 10, 100);

    return Math.round(estimatedCoverage);
  }

  private countDependencies(code: string): number {
    const useStatements = code.match(/^use\s+.*$/gm);
    return useStatements ? useStatements.length : 0;
  }

  private async runSecurityAnalysis(code: string, tree: any): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    for (const rule of this.securityRules.values()) {
      const matches = code.match(rule.pattern);

      if (matches) {
        for (const match of matches) {
          issues.push({
            id: rule.id,
            name: rule.name,
            severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
            category: rule.category,
            message: rule.message,
            suggestion: rule.suggestion,
            line: this.findLineNumber(code, match),
            snippet: match,
            examples: rule.examples
          });
        }
      }
    }

    // Add context-aware analysis using AST (commented out for now)
    // issues.push(...this.analyzeSecurityWithAST(tree, code));

    return issues;
  }

  private async runPerformanceAnalysis(code: string, tree: any): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];

    for (const rule of this.performanceRules.values()) {
      const matches = code.match(rule.pattern);

      if (matches) {
        for (const match of matches) {
          issues.push({
            id: rule.id,
            name: rule.name,
            severity: rule.severity as 'low' | 'medium' | 'high',
            category: rule.category,
            message: rule.message,
            suggestion: rule.suggestion,
            line: this.findLineNumber(code, match),
            snippet: match,
            impact: this.calculatePerformanceImpact(rule.severity)
          });
        }
      }
    }

    // Add performance analysis using AST (commented out for now)
    // issues.push(...this.analyzePerformanceWithAST(tree, code));

    return issues;
  }

  private async runQualityAnalysis(code: string, tree: any): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];

    for (const rule of this.qualityRules.values()) {
      const matches = code.match(rule.pattern);

      if (matches) {
        for (const match of matches) {
          issues.push({
            id: rule.id,
            name: rule.name,
            severity: rule.severity as 'low' | 'medium' | 'high',
            category: rule.category,
            message: rule.message,
            suggestion: rule.suggestion,
            line: this.findLineNumber(code, match),
            snippet: match
          });
        }
      }
    }

    return issues;
  }

  private async runComplianceChecks(code: string, tree: any): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    for (const rule of this.complianceRules.values()) {
      const matches = code.match(rule.pattern);

      if (matches) {
        for (const match of matches) {
          checks.push({
            id: rule.id,
            name: rule.name,
            category: rule.category,
            severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
            message: rule.message,
            suggestion: rule.suggestion,
            line: this.findLineNumber(code, match),
            compliant: false,
            standard: rule.category
          });
        }
      }
    }

    return checks;
  }

  private analyzeSecurityWithAST(tree: any, code: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // TODO: Implement AST-based security analysis
    // This would analyze the actual structure of the code for more sophisticated checks

    return issues;
  }

  private analyzePerformanceWithAST(tree: any, code: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // TODO: Implement AST-based performance analysis
    // This would analyze call patterns, loop structures, etc.

    return issues;
  }

  private findLineNumber(code: string, snippet: string): number {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(snippet.substring(0, Math.min(snippet.length, 50)))) {
        return i + 1;
      }
    }
    return 1;
  }

  private calculatePerformanceImpact(severity: string): string {
    const impacts: { [key: string]: string } = {
      'low': 'Minimal performance impact',
      'medium': 'Moderate performance impact, consider optimization',
      'high': 'Significant performance impact, optimization recommended'
    };

    return impacts[severity] || impacts['medium'];
  }

  private generateSuggestions(
    security: SecurityIssue[],
    performance: PerformanceIssue[],
    quality: QualityIssue[],
    compliance: ComplianceCheck[]
  ): string[] {
    const suggestions: string[] = [];

    // Prioritize critical security issues
    const criticalSecurity = security.filter(issue => issue.severity === 'critical');
    if (criticalSecurity.length > 0) {
      suggestions.push('🚨 Critical security issues found - address immediately');
    }

    // Performance suggestions
    const highPerformance = performance.filter(issue => issue.severity === 'high');
    if (highPerformance.length > 0) {
      suggestions.push('⚡ High-impact performance issues detected - optimization needed');
    }

    // General suggestions based on patterns
    const allIssues = [...security, ...performance, ...quality];

    if (allIssues.some(issue => issue.message.includes('unwrap'))) {
      suggestions.push('Consider using proper error handling instead of .unwrap()');
    }

    if (allIssues.some(issue => issue.message.includes('weight'))) {
      suggestions.push('Review and benchmark weight calculations for accuracy');
    }

    if (allIssues.some(issue => issue.message.includes('storage'))) {
      suggestions.push('Optimize storage usage and consider bounded collections');
    }

    return suggestions;
  }

  private calculateQualityScore(
    metrics: CodeMetrics,
    security: SecurityIssue[],
    performance: PerformanceIssue[],
    quality: QualityIssue[],
    compliance: ComplianceCheck[]
  ): number {
    let score = 100;

    // Deduct points for issues
    score -= security.filter(i => i.severity === 'critical').length * 20;
    score -= security.filter(i => i.severity === 'high').length * 10;
    score -= security.filter(i => i.severity === 'medium').length * 5;
    score -= security.filter(i => i.severity === 'low').length * 1;

    score -= performance.filter(i => i.severity === 'high').length * 8;
    score -= performance.filter(i => i.severity === 'medium').length * 4;
    score -= performance.filter(i => i.severity === 'low').length * 1;

    score -= quality.length * 2;
    score -= compliance.filter(c => !c.compliant).length * 3;

    // Bonus points for good practices
    if (metrics.testCoverage > 80) score += 10;
    if (metrics.commentLines > metrics.nonBlankLines * 0.1) score += 5;
    if (metrics.complexity < 10) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private identifyStrengths(code: string, metrics: CodeMetrics): string[] {
    const strengths: string[] = [];

    if (metrics.testCoverage > 70) {
      strengths.push('Good test coverage');
    }

    if (metrics.commentLines > metrics.nonBlankLines * 0.1) {
      strengths.push('Well documented code');
    }

    if (code.includes('ensure_signed') || code.includes('ensure_root')) {
      strengths.push('Proper origin validation');
    }

    if (code.includes('saturating_') || code.includes('checked_')) {
      strengths.push('Safe arithmetic operations');
    }

    if (code.includes('BoundedVec') || code.includes('BoundedBTreeMap')) {
      strengths.push('Uses bounded collections');
    }

    if (code.includes('#[weight')) {
      strengths.push('Proper weight annotations');
    }

    return strengths;
  }

  isHealthy(): boolean {
    return this.securityRules.size > 0 && this.performanceRules.size > 0;
  }
}