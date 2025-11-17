/**
 * Smart Contract Generator - Generate ink! and Solidity smart contracts
 */

import { AIService } from '../services/ai-service';
import { Logger } from '../utils/logger';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

export interface SmartContractRequest {
  requestId: string;
  contractType: 'ink!' | 'solidity';
  intent: string;
  features: string[];
  variables?: Record<string, any>;
  securityLevel: 'basic' | 'standard' | 'high' | 'audited';
  optimizationLevel: 'size' | 'gas' | 'balanced';
  includeTests: boolean;
}

export interface SmartContractResponse {
  requestId: string;
  contractCode: string;
  testCode?: string;
  deploymentScript?: string;
  documentation: string;
  securityAnalysis: {
    vulnerabilities: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      recommendation: string;
    }>;
    recommendations: string[];
  };
  gasAnalysis?: {
    estimatedDeploymentGas: number;
    functionGasEstimates: Record<string, number>;
    optimizations: string[];
  };
  metadata: {
    contractType: string;
    solcVersion?: string;
    cargoVersion?: string;
    dependencies: string[];
    features: string[];
    codeLines: number;
  };
}

export class SmartContractGenerator {
  private aiService: AIService;
  private logger: Logger;
  private handlebars: typeof Handlebars;
  private templates: Map<string, string> = new Map();

  constructor(aiService: AIService) {
    this.aiService = aiService;
    this.logger = new Logger();
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Smart Contract Generator...');

      // Load contract templates
      await this.loadTemplates();

      this.logger.info('Smart Contract Generator initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Smart Contract Generator:', error);
      throw error;
    }
  }

  async generateContract(request: SmartContractRequest): Promise<SmartContractResponse> {
    try {
      this.logger.info('Generating smart contract:', {
        type: request.contractType,
        intent: request.intent.substring(0, 100),
        features: request.features
      });

      let contractCode: string;
      let testCode: string | undefined;
      let deploymentScript: string | undefined;
      let documentation: string;
      let dependencies: string[];

      if (request.contractType === 'ink!') {
        const result = await this.generateInkContract(request);
        contractCode = result.contract;
        testCode = result.tests;
        deploymentScript = result.deployment;
        documentation = result.docs;
        dependencies = result.dependencies;
      } else {
        const result = await this.generateSolidityContract(request);
        contractCode = result.contract;
        testCode = result.tests;
        deploymentScript = result.deployment;
        documentation = result.docs;
        dependencies = result.dependencies;
      }

      // Perform security analysis
      const securityAnalysis = await this.analyzeContractSecurity(contractCode, request);

      // Perform gas analysis
      const gasAnalysis = await this.analyzeGasUsage(contractCode, request);

      const response: SmartContractResponse = {
        requestId: request.requestId,
        contractCode,
        testCode,
        deploymentScript,
        documentation,
        securityAnalysis,
        gasAnalysis,
        metadata: {
          contractType: request.contractType,
          solcVersion: request.contractType === 'solidity' ? '0.8.19' : undefined,
          cargoVersion: request.contractType === 'ink!' ? '1.70.0' : undefined,
          dependencies,
          features: request.features,
          codeLines: contractCode.split('\\n').length
        }
      };

      this.logger.info('Smart contract generation completed:', {
        requestId: request.requestId,
        codeLines: response.metadata.codeLines,
        vulnerabilities: securityAnalysis.vulnerabilities.length
      });

      return response;
    } catch (error) {
      this.logger.error('Smart contract generation failed:', error);
      throw error;
    }
  }

  private async generateInkContract(request: SmartContractRequest): Promise<{
    contract: string;
    tests?: string;
    deployment?: string;
    docs: string;
    dependencies: string[];
  }> {
    const template = this.getInkTemplate(request.features);
    const context = this.prepareInkContext(request);

    const prompt = `
Generate a complete ink! smart contract with the following specifications:

Intent: ${request.intent}
Features: ${request.features.join(', ')}
Security Level: ${request.securityLevel}
Optimization: ${request.optimizationLevel}

Requirements:
1. Use ink! 4.x syntax
2. Include proper error handling
3. Implement security best practices
4. Optimize for ${request.optimizationLevel === 'gas' ? 'gas efficiency' : request.optimizationLevel === 'size' ? 'contract size' : 'balanced performance'}
5. Add comprehensive documentation
6. Include proper access control
${request.includeTests ? '7. Generate comprehensive tests\\n' : ''}

Base template:
\`\`\`rust
${template}
\`\`\`

Context variables:
${JSON.stringify(context, null, 2)}

Generate:
1. Complete contract code
2. Documentation
3. List of dependencies
${request.includeTests ? '4. Test suite\\n5. Deployment script' : '4. Deployment script'}
`;

    const response = await this.aiService.generateCode({
      requestId: request.requestId,
      intent: prompt,
      language: 'rust',
      framework: 'ink!',
      includeTests: request.includeTests,
      includeSecurity: request.securityLevel !== 'basic',
      optimizationLevel: request.optimizationLevel === 'gas' ? 'expert' : 'advanced'
    });

    // Parse the AI response to extract different sections
    const sections = this.parseAIResponse(response.generatedCode);

    return {
      contract: sections.contract || response.generatedCode,
      tests: sections.tests,
      deployment: sections.deployment || this.generateInkDeployment(context),
      docs: sections.documentation || this.generateInkDocumentation(request, context),
      dependencies: this.getInkDependencies(request.features)
    };
  }

  private async generateSolidityContract(request: SmartContractRequest): Promise<{
    contract: string;
    tests?: string;
    deployment?: string;
    docs: string;
    dependencies: string[];
  }> {
    const template = this.getSolidityTemplate(request.features);
    const context = this.prepareSolidityContext(request);

    const prompt = `
Generate a complete Solidity smart contract with the following specifications:

Intent: ${request.intent}
Features: ${request.features.join(', ')}
Security Level: ${request.securityLevel}
Optimization: ${request.optimizationLevel}

Requirements:
1. Use Solidity 0.8.19+ syntax
2. Include proper error handling with custom errors
3. Implement security best practices (ReentrancyGuard, Access Control, etc.)
4. Optimize for ${request.optimizationLevel === 'gas' ? 'gas efficiency' : request.optimizationLevel === 'size' ? 'bytecode size' : 'balanced performance'}
5. Add comprehensive NatSpec documentation
6. Use OpenZeppelin contracts where appropriate
${request.includeTests ? '7. Generate Hardhat/Foundry tests\\n' : ''}

Base template:
\`\`\`solidity
${template}
\`\`\`

Context variables:
${JSON.stringify(context, null, 2)}

Generate:
1. Complete contract code with interfaces
2. NatSpec documentation
3. List of dependencies
${request.includeTests ? '4. Test suite (Hardhat)\\n5. Deployment script' : '4. Deployment script'}
`;

    const response = await this.aiService.generateCode({
      requestId: request.requestId,
      intent: prompt,
      language: 'solidity',
      framework: 'ethereum',
      includeTests: request.includeTests,
      includeSecurity: request.securityLevel !== 'basic',
      optimizationLevel: request.optimizationLevel === 'gas' ? 'expert' : 'advanced'
    });

    const sections = this.parseAIResponse(response.generatedCode);

    return {
      contract: sections.contract || response.generatedCode,
      tests: sections.tests,
      deployment: sections.deployment || this.generateSolidityDeployment(context),
      docs: sections.documentation || this.generateSolidityDocumentation(request, context),
      dependencies: this.getSolidityDependencies(request.features)
    };
  }

  private async analyzeContractSecurity(
    contractCode: string,
    request: SmartContractRequest
  ): Promise<SmartContractResponse['securityAnalysis']> {
    const analysisPrompt = `
Perform a comprehensive security analysis of this ${request.contractType} smart contract:

\`\`\`${request.contractType === 'ink!' ? 'rust' : 'solidity'}
${contractCode}
\`\`\`

Analyze for:
1. Reentrancy vulnerabilities
2. Integer overflow/underflow
3. Access control issues
4. Front-running vulnerabilities
5. Gas limit issues
6. Logic errors
7. Economic attacks
8. ${request.contractType === 'solidity' ? 'EVM-specific issues' : 'WASM-specific issues'}

Categorize findings by severity: critical, high, medium, low
Provide specific recommendations for each issue found.

Return findings in JSON format:
{
  "vulnerabilities": [{"severity": "", "description": "", "recommendation": ""}],
  "recommendations": [""]
}
`;

    try {
      const response = await this.aiService.analyzeCode({
        requestId: `${request.requestId}-security`,
        code: contractCode,
        language: request.contractType === 'ink!' ? 'rust' : 'solidity',
        framework: request.contractType === 'ink!' ? 'ink!' : 'ethereum',
        analysisTypes: ['security', 'vulnerability']
      });

      // Extract security findings from the analysis
      return {
        vulnerabilities: response.securityIssues.map(issue => ({
          severity: issue.severity as 'low' | 'medium' | 'high' | 'critical',
          description: issue.description,
          recommendation: issue.recommendation
        })),
        recommendations: response.suggestions
      };
    } catch (error) {
      this.logger.warn('Security analysis failed:', error);
      return {
        vulnerabilities: [],
        recommendations: ['Manual security audit recommended']
      };
    }
  }

  private async analyzeGasUsage(
    contractCode: string,
    request: SmartContractRequest
  ): Promise<SmartContractResponse['gasAnalysis']> {
    if (request.contractType === 'ink!') {
      // ink! uses WASM and different gas model
      return undefined;
    }

    try {
      const analysisPrompt = `
Analyze this Solidity contract for gas usage and provide optimization suggestions:

\`\`\`solidity
${contractCode}
\`\`\`

Estimate:
1. Deployment gas cost
2. Function call gas costs
3. Storage operations costs
4. Optimization opportunities

Return analysis in JSON format:
{
  "estimatedDeploymentGas": number,
  "functionGasEstimates": {"functionName": gasAmount},
  "optimizations": ["optimization suggestion"]
}
`;

      const response = await this.aiService.generateCode({
        requestId: `${request.requestId}-gas`,
        intent: analysisPrompt,
        language: 'solidity',
        framework: 'ethereum',
        optimizationLevel: 'expert'
      });

      // Try to parse gas analysis from response
      const gasMatch = response.generatedCode.match(/{[\\s\\S]*}/);
      if (gasMatch) {
        return JSON.parse(gasMatch[0]);
      }

      return {
        estimatedDeploymentGas: 0,
        functionGasEstimates: {},
        optimizations: ['Manual gas analysis recommended']
      };
    } catch (error) {
      this.logger.warn('Gas analysis failed:', error);
      return undefined;
    }
  }

  private async loadTemplates(): Promise<void> {
    // Load ink! templates
    this.templates.set('ink-erc20', this.getInkERC20Template());
    this.templates.set('ink-nft', this.getInkNFTTemplate());
    this.templates.set('ink-governance', this.getInkGovernanceTemplate());

    // Load Solidity templates
    this.templates.set('solidity-erc20', this.getSolidityERC20Template());
    this.templates.set('solidity-nft', this.getSolidityNFTTemplate());
    this.templates.set('solidity-governance', this.getSolidityGovernanceTemplate());
  }

  private getInkTemplate(features: string[]): string {
    if (features.includes('erc20') || features.includes('token')) {
      return this.templates.get('ink-erc20') || '';
    }
    if (features.includes('nft') || features.includes('erc721')) {
      return this.templates.get('ink-nft') || '';
    }
    if (features.includes('governance') || features.includes('dao')) {
      return this.templates.get('ink-governance') || '';
    }
    return this.getInkBaseTemplate();
  }

  private getSolidityTemplate(features: string[]): string {
    if (features.includes('erc20') || features.includes('token')) {
      return this.templates.get('solidity-erc20') || '';
    }
    if (features.includes('nft') || features.includes('erc721')) {
      return this.templates.get('solidity-nft') || '';
    }
    if (features.includes('governance') || features.includes('dao')) {
      return this.templates.get('solidity-governance') || '';
    }
    return this.getSolidityBaseTemplate();
  }

  private getInkERC20Template(): string {
    return `
#![cfg_attr(not(feature = "std"), no_std)]

use ink_lang as ink;

#[ink::contract]
mod erc20 {
    use ink_storage::{
        traits::SpreadAllocate,
        Mapping,
    };

    #[ink(storage)]
    #[derive(SpreadAllocate)]
    pub struct Erc20 {
        total_supply: Balance,
        balances: Mapping<AccountId, Balance>,
        allowances: Mapping<(AccountId, AccountId), Balance>,
    }

    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        value: Balance,
    }

    #[ink(event)]
    pub struct Approval {
        #[ink(topic)]
        owner: AccountId,
        #[ink(topic)]
        spender: AccountId,
        value: Balance,
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        InsufficientBalance,
        InsufficientAllowance,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    impl Erc20 {
        #[ink(constructor)]
        pub fn new(initial_supply: Balance) -> Self {
            ink_lang::utils::initialize_contract(|contract: &mut Self| {
                let caller = Self::env().caller();
                contract.total_supply = initial_supply;
                contract.balances.insert(&caller, &initial_supply);
                Self::env().emit_event(Transfer {
                    from: None,
                    to: Some(caller),
                    value: initial_supply,
                });
            })
        }

        #[ink(message)]
        pub fn total_supply(&self) -> Balance {
            self.total_supply
        }

        #[ink(message)]
        pub fn balance_of(&self, owner: AccountId) -> Balance {
            self.balances.get(owner).unwrap_or_default()
        }
    }
}
`;
  }

  private registerHelpers(): void {
    this.handlebars.registerHelper('capitalize', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    this.handlebars.registerHelper('camelCase', (str: string) => {
      return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    });
  }

  // Additional template methods...
  private getInkNFTTemplate(): string { return ''; }
  private getInkGovernanceTemplate(): string { return ''; }
  private getSolidityERC20Template(): string { return ''; }
  private getSolidityNFTTemplate(): string { return ''; }
  private getSolidityGovernanceTemplate(): string { return ''; }
  private getInkBaseTemplate(): string { return ''; }
  private getSolidityBaseTemplate(): string { return ''; }

  private prepareInkContext(request: SmartContractRequest): any {
    return {
      contractName: request.variables?.contractName || 'CustomContract',
      features: request.features,
      securityLevel: request.securityLevel
    };
  }

  private prepareSolidityContext(request: SmartContractRequest): any {
    return {
      contractName: request.variables?.contractName || 'CustomContract',
      features: request.features,
      securityLevel: request.securityLevel
    };
  }

  private parseAIResponse(response: string): {
    contract?: string;
    tests?: string;
    deployment?: string;
    documentation?: string;
  } {
    // Parse different sections from AI response
    return { contract: response };
  }

  private generateInkDeployment(context: any): string {
    return `// ink! deployment script
// cargo +nightly contract build --release
// cargo +nightly contract instantiate --args ${context.features.join(', ')}`;
  }

  private generateSolidityDeployment(context: any): string {
    return `// Hardhat deployment script
// npx hardhat deploy --network ${context.network || 'localhost'}`;
  }

  private generateInkDocumentation(request: SmartContractRequest, context: any): string {
    return `# ${context.contractName} - ink! Smart Contract\n\n## Features\n${request.features.map(f => `- ${f}`).join('\\n')}`;
  }

  private generateSolidityDocumentation(request: SmartContractRequest, context: any): string {
    return `# ${context.contractName} - Solidity Smart Contract\n\n## Features\n${request.features.map(f => `- ${f}`).join('\\n')}`;
  }

  private getInkDependencies(features: string[]): string[] {
    const deps = ['ink_lang', 'ink_storage', 'ink_env'];
    if (features.includes('erc20')) deps.push('openbrush');
    return deps;
  }

  private getSolidityDependencies(features: string[]): string[] {
    const deps = ['@openzeppelin/contracts'];
    if (features.includes('hardhat')) deps.push('hardhat');
    return deps;
  }

  isHealthy(): boolean {
    return this.templates.size > 0;
  }
}