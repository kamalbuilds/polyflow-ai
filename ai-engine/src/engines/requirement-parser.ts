/**
 * Requirement Parser - Natural language processing for development requirements
 */

import natural from 'natural';
import compromise from 'compromise';
import { Logger } from '../utils/logger';

export interface ParsedRequirement {
  intent: string;
  entities: {
    palletNames: string[];
    functionNames: string[];
    dataTypes: string[];
    frameworks: string[];
    features: string[];
    constraints: string[];
  };
  complexity: 'simple' | 'medium' | 'complex' | 'expert';
  category: 'runtime' | 'pallet' | 'smart_contract' | 'xcm' | 'defi' | 'governance' | 'utility';
  confidence: number;
  extractedVariables: Record<string, any>;
  requiredDependencies: string[];
  estimatedEffort: {
    level: 'low' | 'medium' | 'high' | 'expert';
    description: string;
  };
}

export class RequirementParser {
  private logger: Logger;
  private tokenizer: natural.WordTokenizer;
  private stemmer: any;
  private classifier: natural.BayesClassifier;
  private initialized: boolean = false;

  // Known Substrate/Polkadot terminology
  private readonly substrateTerms = new Set([
    'pallet', 'runtime', 'extrinsic', 'storage', 'event', 'error', 'trait',
    'frame', 'substrate', 'polkadot', 'kusama', 'parachain', 'xcm',
    'consensus', 'aura', 'grandpa', 'babe', 'transaction', 'balance',
    'governance', 'democracy', 'council', 'treasury', 'staking',
    'nomination', 'validator', 'collator', 'bridge', 'oracle',
    'multisig', 'proxy', 'utility', 'scheduler', 'identity',
    'assets', 'uniques', 'nft', 'fungible', 'tokens'
  ]);

  private readonly complexityKeywords = {
    simple: ['basic', 'simple', 'standard', 'template', 'example', 'hello', 'world'],
    medium: ['custom', 'enhanced', 'extended', 'advanced', 'integrate', 'configure'],
    complex: ['complex', 'sophisticated', 'multi', 'cross', 'interoperable', 'optimize'],
    expert: ['consensus', 'cryptographic', 'zero-knowledge', 'byzantine', 'proof']
  };

  private readonly categoryKeywords = {
    runtime: ['runtime', 'node', 'client', 'consensus', 'networking'],
    pallet: ['pallet', 'module', 'logic', 'functionality', 'feature'],
    smart_contract: ['contract', 'ink!', 'solidity', 'wasm', 'smart'],
    xcm: ['xcm', 'cross-chain', 'parachain', 'relay', 'interoperability'],
    defi: ['defi', 'dex', 'amm', 'liquidity', 'yield', 'farming', 'lending'],
    governance: ['governance', 'democracy', 'proposal', 'referendum', 'council'],
    utility: ['utility', 'helper', 'tool', 'batch', 'proxy', 'multisig']
  };

  private readonly frameworkKeywords = {
    'frame': ['frame', 'substrate', 'pallet'],
    'ink!': ['ink', 'smart contract', 'wasm', 'contract'],
    'polkadot': ['polkadot', 'xcm', 'parachain', 'relay'],
    'solidity': ['solidity', 'ethereum', 'evm']
  };

  constructor() {
    this.logger = new Logger();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.classifier = new natural.BayesClassifier();
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Requirement Parser...');

      // Train the classifier with example patterns
      this.trainClassifier();

      this.initialized = true;
      this.logger.info('Requirement Parser initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Requirement Parser:', error);
      throw error;
    }
  }

  async parse(text: string): Promise<ParsedRequirement> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      this.logger.debug('Parsing requirement text:', text.substring(0, 100) + '...');

      // Clean and tokenize text
      const cleanText = this.preprocessText(text);
      const tokens = this.tokenizer.tokenize(cleanText) || [];

      // Extract entities using compromise
      const doc = compromise(text);
      const entities = this.extractEntities(doc, tokens);

      // Determine complexity
      const complexity = this.analyzeComplexity(tokens, text);

      // Categorize the requirement
      const category = this.categorizeRequirement(tokens, text);

      // Extract variables and parameters
      const extractedVariables = this.extractVariables(text, doc);

      // Determine required dependencies
      const requiredDependencies = this.inferDependencies(entities, category);

      // Estimate effort
      const estimatedEffort = this.estimateEffort(complexity, entities, text);

      // Calculate confidence based on recognized terms
      const confidence = this.calculateConfidence(tokens, entities);

      const result: ParsedRequirement = {
        intent: text,
        entities,
        complexity,
        category,
        confidence,
        extractedVariables,
        requiredDependencies,
        estimatedEffort
      };

      this.logger.debug('Parsed requirement:', {
        category,
        complexity,
        confidence,
        entityCount: Object.values(entities).reduce((sum, arr) => sum + arr.length, 0)
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to parse requirement:', error);
      throw error;
    }
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractEntities(doc: any, tokens: string[]): ParsedRequirement['entities'] {
    const entities: ParsedRequirement['entities'] = {
      palletNames: [],
      functionNames: [],
      dataTypes: [],
      frameworks: [],
      features: [],
      constraints: []
    };

    // Extract nouns as potential pallet/function names
    const nouns = doc.nouns().out('array') || [];
    entities.palletNames = nouns.filter((noun: string) =>
      this.substrateTerms.has(noun.toLowerCase()) || noun.includes('pallet')
    );

    // Extract verbs as potential function names
    const verbs = doc.verbs().out('array') || [];
    entities.functionNames = verbs.filter((verb: string) =>
      ['create', 'transfer', 'mint', 'burn', 'approve', 'revoke', 'update', 'delete'].includes(verb.toLowerCase())
    );

    // Extract data types
    entities.dataTypes = tokens.filter(token =>
      ['u8', 'u16', 'u32', 'u64', 'u128', 'i8', 'i16', 'i32', 'i64', 'i128',
       'bool', 'string', 'vec', 'option', 'result', 'accountid', 'balance', 'hash'].includes(token)
    );

    // Extract frameworks
    for (const [framework, keywords] of Object.entries(this.frameworkKeywords)) {
      if (keywords.some(keyword => tokens.includes(keyword))) {
        entities.frameworks.push(framework);
      }
    }

    // Extract features from common patterns
    entities.features = tokens.filter(token =>
      ['staking', 'governance', 'identity', 'multisig', 'proxy', 'democracy',
       'treasury', 'assets', 'nft', 'defi', 'dex', 'oracle'].includes(token)
    );

    // Extract constraints
    const constraintPatterns = [
      /max.{0,10}(\d+)/g,
      /min.{0,10}(\d+)/g,
      /limit.{0,10}(\d+)/g,
      /require.{0,20}(\w+)/g
    ];

    for (const pattern of constraintPatterns) {
      const matches = [...doc.text().matchAll(pattern)];
      entities.constraints.push(...matches.map(match => match[0]));
    }

    return entities;
  }

  private analyzeComplexity(tokens: string[], text: string): ParsedRequirement['complexity'] {
    let score = 0;

    for (const [level, keywords] of Object.entries(this.complexityKeywords)) {
      for (const keyword of keywords) {
        if (tokens.includes(keyword) || text.toLowerCase().includes(keyword)) {
          switch (level) {
            case 'simple': score += 1; break;
            case 'medium': score += 2; break;
            case 'complex': score += 3; break;
            case 'expert': score += 4; break;
          }
        }
      }
    }

    // Additional complexity indicators
    const lineCount = text.split('\n').length;
    const wordCount = tokens.length;
    const technicalTermCount = tokens.filter(token => this.substrateTerms.has(token)).length;

    if (lineCount > 10 || wordCount > 200) score += 2;
    if (technicalTermCount > 10) score += 2;
    if (text.includes('custom') && text.includes('algorithm')) score += 3;
    if (text.includes('optimize') || text.includes('performance')) score += 2;

    if (score <= 3) return 'simple';
    if (score <= 6) return 'medium';
    if (score <= 10) return 'complex';
    return 'expert';
  }

  private categorizeRequirement(tokens: string[], text: string): ParsedRequirement['category'] {
    let bestCategory: ParsedRequirement['category'] = 'utility';
    let maxScore = 0;

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      let score = 0;
      for (const keyword of keywords) {
        if (tokens.includes(keyword) || text.toLowerCase().includes(keyword)) {
          score++;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestCategory = category as ParsedRequirement['category'];
      }
    }

    return bestCategory;
  }

  private extractVariables(text: string, doc: any): Record<string, any> {
    const variables: Record<string, any> = {};

    // Extract named entities that could be variable names
    const patterns = [
      { regex: /pallet.{0,10}(?:named?|called?)\s+([A-Za-z]\w*)/gi, key: 'pallet_name' },
      { regex: /runtime.{0,10}(?:named?|called?)\s+([A-Za-z]\w*)/gi, key: 'runtime_name' },
      { regex: /token.{0,10}(?:named?|called?)\s+([A-Za-z]\w*)/gi, key: 'token_name' },
      { regex: /symbol.{0,10}([A-Z]{2,6})/gi, key: 'token_symbol' },
      { regex: /(\d+)\s*decimals?/gi, key: 'decimals' },
      { regex: /supply.{0,20}(\d+(?:_\d+)*)/gi, key: 'max_supply' },
      { regex: /weight.{0,10}(\d+(?:_\d+)*)/gi, key: 'weight' }
    ];

    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern.regex)];
      if (matches.length > 0) {
        variables[pattern.key] = matches[0][1];
      }
    }

    // Extract numbers that might be relevant
    const numbers = doc.match('#Value').out('array') || [];
    if (numbers.length > 0) {
      variables.extracted_numbers = numbers;
    }

    // Extract quoted strings as potential names
    const quotedStrings = text.match(/"([^"]+)"|'([^']+)'/g);
    if (quotedStrings) {
      variables.quoted_strings = quotedStrings.map(str => str.slice(1, -1));
    }

    return variables;
  }

  private inferDependencies(entities: ParsedRequirement['entities'], category: string): string[] {
    const dependencies = new Set<string>();

    // Base Substrate dependencies
    dependencies.add('frame-support');
    dependencies.add('frame-system');

    // Framework-specific dependencies
    if (entities.frameworks.includes('frame')) {
      dependencies.add('sp-std');
      dependencies.add('sp-runtime');
    }

    if (entities.frameworks.includes('ink!')) {
      dependencies.add('ink');
      dependencies.add('ink_storage');
      dependencies.add('ink_env');
    }

    // Category-specific dependencies
    switch (category) {
      case 'defi':
        dependencies.add('pallet-balances');
        dependencies.add('pallet-assets');
        break;
      case 'governance':
        dependencies.add('pallet-democracy');
        dependencies.add('pallet-collective');
        break;
      case 'xcm':
        dependencies.add('xcm');
        dependencies.add('xcm-executor');
        dependencies.add('polkadot-parachain');
        break;
      case 'smart_contract':
        if (entities.frameworks.includes('ink!')) {
          dependencies.add('ink_lang');
        }
        break;
    }

    // Feature-specific dependencies
    if (entities.features.includes('staking')) {
      dependencies.add('pallet-staking');
    }
    if (entities.features.includes('multisig')) {
      dependencies.add('pallet-multisig');
    }
    if (entities.features.includes('identity')) {
      dependencies.add('pallet-identity');
    }

    return Array.from(dependencies);
  }

  private estimateEffort(
    complexity: string,
    entities: ParsedRequirement['entities'],
    text: string
  ): ParsedRequirement['estimatedEffort'] {
    const baseEffort = {
      simple: { level: 'low' as const, hours: 4 },
      medium: { level: 'medium' as const, hours: 16 },
      complex: { level: 'high' as const, hours: 40 },
      expert: { level: 'expert' as const, hours: 100 }
    }[complexity];

    // Adjust based on number of entities and features
    const entityCount = Object.values(entities).reduce((sum, arr) => sum + arr.length, 0);
    const adjustmentFactor = Math.max(1, entityCount / 5);
    const adjustedHours = Math.ceil(baseEffort.hours * adjustmentFactor);

    let description = `Estimated ${adjustedHours} hours based on ${complexity} complexity`;

    if (entityCount > 10) {
      description += ' with high feature complexity';
    }
    if (text.includes('custom') && text.includes('algorithm')) {
      description += ' requiring custom algorithm development';
    }
    if (text.includes('security') || text.includes('audit')) {
      description += ' with additional security review time';
    }

    return {
      level: baseEffort.level,
      description
    };
  }

  private calculateConfidence(tokens: string[], entities: ParsedRequirement['entities']): number {
    const substrateTermsFound = tokens.filter(token => this.substrateTerms.has(token)).length;
    const totalTerms = tokens.length;
    const entityCount = Object.values(entities).reduce((sum, arr) => sum + arr.length, 0);

    // Base confidence from recognized Substrate terms
    let confidence = Math.min(0.8, (substrateTermsFound / Math.max(totalTerms, 1)) * 2);

    // Boost confidence for extracted entities
    confidence += Math.min(0.2, entityCount * 0.02);

    // Ensure minimum confidence
    confidence = Math.max(0.1, confidence);

    return Math.round(confidence * 100) / 100;
  }

  private trainClassifier(): void {
    // Train with example substrate/polkadot development requests
    const trainingData = [
      { text: 'create a basic pallet for token transfers', category: 'pallet' },
      { text: 'implement runtime with governance features', category: 'runtime' },
      { text: 'build smart contract with ink for nft marketplace', category: 'smart_contract' },
      { text: 'setup xcm for cross-chain asset transfers', category: 'xcm' },
      { text: 'create defi protocol with liquidity pools', category: 'defi' },
      { text: 'implement democracy pallet for governance', category: 'governance' },
      { text: 'build utility functions for batch operations', category: 'utility' }
    ];

    for (const data of trainingData) {
      this.classifier.addDocument(data.text, data.category);
    }

    this.classifier.train();
    this.logger.debug('Classifier trained with', trainingData.length, 'examples');
  }

  isHealthy(): boolean {
    return this.initialized;
  }
}