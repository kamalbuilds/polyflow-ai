/**
 * Code Generator Engine - Template-based code synthesis for Substrate/FRAME
 */

import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { AIService } from '../services/ai-service';
import { KnowledgeBase } from '../services/knowledge-base';
import { Logger } from '../utils/logger';
import {
  CodeGenerationRequest,
  CodeGenerationResponse,
  CodeTemplate,
  TemplateContext,
  GenerationStrategy
} from '../types/code-generation-types';

export class CodeGenerator {
  private aiService: AIService;
  private knowledgeBase: KnowledgeBase;
  private logger: Logger;
  private templates: Map<string, CodeTemplate> = new Map();
  private handlebars: typeof Handlebars;

  constructor(aiService: AIService, knowledgeBase: KnowledgeBase) {
    this.aiService = aiService;
    this.knowledgeBase = knowledgeBase;
    this.logger = new Logger();
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Code Generator...');

      // Load templates
      await this.loadTemplates();

      // Register custom helpers
      this.registerCustomHelpers();

      this.logger.info('Code Generator initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Code Generator:', error);
      throw error;
    }
  }

  private async loadTemplates(): Promise<void> {
    const templatesDir = path.join(__dirname, '../../templates');

    try {
      // Load Substrate templates
      await this.loadTemplateCategory(path.join(templatesDir, 'substrate'), 'substrate');

      // Load FRAME pallet templates
      await this.loadTemplateCategory(path.join(templatesDir, 'frame'), 'frame');

      // Load Polkadot-specific templates
      await this.loadTemplateCategory(path.join(templatesDir, 'polkadot'), 'polkadot');

      this.logger.info(`Loaded ${this.templates.size} code templates`);
    } catch (error) {
      this.logger.error('Failed to load templates:', error);
      throw error;
    }
  }

  private async loadTemplateCategory(categoryPath: string, category: string): Promise<void> {
    try {
      await fs.mkdir(categoryPath, { recursive: true });

      // Create default templates if directory is empty
      if (category === 'substrate') {
        await this.createDefaultSubstrateTemplates(categoryPath);
      } else if (category === 'frame') {
        await this.createDefaultFrameTemplates(categoryPath);
      } else if (category === 'polkadot') {
        await this.createDefaultPolkadotTemplates(categoryPath);
      }

      const files = await fs.readdir(categoryPath);

      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const templatePath = path.join(categoryPath, file);
          const templateContent = await fs.readFile(templatePath, 'utf-8');

          // Parse template metadata from comments
          const metadata = this.parseTemplateMetadata(templateContent);

          const template: CodeTemplate = {
            id: path.basename(file, '.hbs'),
            name: metadata.name || path.basename(file, '.hbs'),
            description: metadata.description || '',
            category,
            language: metadata.language || 'rust',
            framework: metadata.framework || category,
            template: templateContent,
            variables: metadata.variables || [],
            dependencies: metadata.dependencies || [],
            examples: metadata.examples || [],
            tags: metadata.tags || []
          };

          this.templates.set(template.id, template);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to load templates from ${categoryPath}:`, error);
    }
  }

  private async createDefaultSubstrateTemplates(dir: string): Promise<void> {
    const runtimeTemplate = `{{!--
name: Substrate Runtime
description: Basic Substrate runtime template with essential pallets
language: rust
framework: substrate
variables: [runtime_name, pallet_list]
dependencies: [substrate-frame, sp-runtime]
tags: [runtime, core]
--}}
#![cfg_attr(not(feature = "std"), no_std)]
// \`construct_runtime!\` does a lot of recursion and requires us to increase the limit to 256.
#![recursion_limit = "256"]

use sp_std::prelude::*;
use sp_consensus_aura::sr25519::AuthorityId as AuraId;
use sp_core::{crypto::KeyTypeId, OpaqueMetadata};
use sp_runtime::{
    ApplyExtrinsicResult, generic, create_runtime_str, impl_opaque_keys, ModuleId,
    OpaqueExtrinsic, transaction_validity::{TransactionValidity, TransactionSource},
};
use sp_version::RuntimeVersion;
use sp_api::impl_runtime_apis;
use frame_support::{
    construct_runtime, parameter_types, weights::{
        Weight, IdentityFee, constants::{BlockExecutionWeight, ExtrinsicBaseWeight, WEIGHT_PER_SECOND}
    },
    traits::{Randomness, KeyOwnerProofSystem},
};
use frame_system::limits::{BlockWeights, BlockLength};

/// Runtime version
pub const VERSION: RuntimeVersion = RuntimeVersion {
    spec_name: create_runtime_str!("{{runtime_name}}"),
    impl_name: create_runtime_str!("{{runtime_name}}"),
    authoring_version: 1,
    spec_version: 100,
    impl_version: 1,
    apis: RUNTIME_API_VERSIONS,
    transaction_version: 1,
};

construct_runtime!(
    pub enum Runtime where
        Block = Block,
        NodeBlock = opaque::Block,
        UncheckedExtrinsic = UncheckedExtrinsic
    {
        System: frame_system::{Pallet, Call, Config, Storage, Event<T>},
        Timestamp: pallet_timestamp::{Pallet, Call, Storage, Inherent},
        Aura: pallet_aura::{Pallet, Config<T>},
        Grandpa: pallet_grandpa::{Pallet, Call, Storage, Config, Event},
        Balances: pallet_balances::{Pallet, Call, Storage, Config<T>, Event<T>},
        TransactionPayment: pallet_transaction_payment::{Pallet, Storage, Event<T>},
        Sudo: pallet_sudo::{Pallet, Call, Config<T>, Storage, Event<T>},
        {{#each pallet_list}}
        {{name}}: {{module}}::{Pallet, Call, Storage, Event<T>},
        {{/each}}
    }
);

// Implementation blocks...
impl frame_system::Config for Runtime {
    type BaseCallFilter = frame_support::traits::Everything;
    type BlockWeights = RuntimeBlockWeights;
    type BlockLength = RuntimeBlockLength;
    type DbWeight = RocksDbWeight;
    type Origin = Origin;
    type Call = Call;
    type Index = Index;
    type BlockNumber = BlockNumber;
    type Hash = Hash;
    type Hashing = BlakeTwo256;
    type AccountId = AccountId;
    type Lookup = AccountIdLookupOf<Self>;
    type Header = generic::Header<BlockNumber, BlakeTwo256>;
    type Event = Event;
    type BlockHashCount = BlockHashCount;
    type Version = Version;
    type PalletInfo = PalletInfo;
    type AccountData = pallet_balances::AccountData<Balance>;
    type OnNewAccount = ();
    type OnKilledAccount = ();
    type SystemWeightInfo = ();
    type SS58Prefix = SS58Prefix;
    type OnSetCode = ();
    type MaxConsumers = frame_support::traits::ConstU32<16>;
}
`;

    await fs.writeFile(path.join(dir, 'runtime.hbs'), runtimeTemplate);

    const palletTemplate = `{{!--
name: FRAME Pallet
description: Basic FRAME pallet template with common functionality
language: rust
framework: frame
variables: [pallet_name, storage_items, extrinsics, events, errors]
dependencies: [frame-support, frame-system]
tags: [pallet, frame]
--}}
#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{
    codec::{Encode, Decode},
    dispatch::{DispatchResult, DispatchError},
    traits::{Get, Randomness},
    weights::Weight,
    storage::{StorageValue, StorageMap},
    decl_module, decl_storage, decl_event, decl_error,
    ensure,
};
use frame_system::ensure_signed;
use sp_std::vec::Vec;

pub trait Config: frame_system::Config {
    type Event: From<Event<Self>> + Into<<Self as frame_system::Config>::Event>;
    type Randomness: Randomness<Self::Hash>;
    {{#each config_traits}}
    type {{name}}: {{trait_bound}};
    {{/each}}
}

decl_storage! {
    trait Store for Module<T: Config> as {{pallet_name}} {
        {{#each storage_items}}
        /// {{description}}
        {{name}} get(fn {{getter}}): {{storage_type}};
        {{/each}}
    }
}

decl_event!(
    pub enum Event<T> where AccountId = <T as frame_system::Config>::AccountId {
        {{#each events}}
        /// {{description}}
        {{name}}({{#each params}}{{type}}{{#unless @last}}, {{/unless}}{{/each}}),
        {{/each}}
    }
);

decl_error! {
    pub enum Error for Module<T: Config> {
        {{#each errors}}
        /// {{description}}
        {{name}},
        {{/each}}
    }
}

decl_module! {
    pub struct Module<T: Config> for enum Call where origin: T::Origin {
        type Error = Error<T>;

        fn deposit_event() = default;

        {{#each extrinsics}}
        /// {{description}}
        #[weight = {{weight}}]
        pub fn {{name}}(
            origin,
            {{#each params}}
            {{name}}: {{type}},
            {{/each}}
        ) -> DispatchResult {
            let _sender = ensure_signed(origin)?;

            {{implementation}}

            Ok(())
        }
        {{/each}}
    }
}
`;

    await fs.writeFile(path.join(dir, 'pallet.hbs'), palletTemplate);
  }

  private async createDefaultFrameTemplates(dir: string): Promise<void> {
    const tokenPalletTemplate = `{{!--
name: Token Pallet
description: Custom token implementation with transfer and minting capabilities
language: rust
framework: frame
variables: [token_name, token_symbol, decimals, max_supply]
dependencies: [frame-support, frame-system, pallet-balances]
tags: [token, erc20, defi]
--}}
#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{
    codec::{Encode, Decode},
    dispatch::{DispatchResult, DispatchError},
    traits::{Get, EnsureOrigin},
    weights::Weight,
    decl_module, decl_storage, decl_event, decl_error,
    ensure,
};
use frame_system::ensure_signed;
use sp_std::{vec::Vec, collections::btree_map::BTreeMap};
use sp_runtime::traits::{Zero, Saturating};

pub trait Config: frame_system::Config {
    type Event: From<Event<Self>> + Into<<Self as frame_system::Config>::Event>;
    type Currency: Currency<Self::AccountId>;
    type MaxSupply: Get<u128>;
    type MintOrigin: EnsureOrigin<Self::Origin>;
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, Debug)]
pub struct TokenInfo {
    pub name: Vec<u8>,
    pub symbol: Vec<u8>,
    pub decimals: u8,
    pub total_supply: u128,
}

decl_storage! {
    trait Store for Module<T: Config> as {{token_name}} {
        /// Token metadata information
        TokenMetadata get(fn token_metadata): TokenInfo = TokenInfo {
            name: b"{{token_name}}".to_vec(),
            symbol: b"{{token_symbol}}".to_vec(),
            decimals: {{decimals}},
            total_supply: 0,
        };

        /// Token balances for each account
        Balances get(fn balance_of): map hasher(blake2_128_concat) T::AccountId => u128;

        /// Allowances for spending on behalf of others
        Allowances get(fn allowance):
            double_map hasher(blake2_128_concat) T::AccountId, hasher(blake2_128_concat) T::AccountId => u128;

        /// Total token supply
        TotalSupply get(fn total_supply): u128;
    }
}

decl_event!(
    pub enum Event<T> where AccountId = <T as frame_system::Config>::AccountId {
        /// Token transfer occurred
        Transfer(AccountId, AccountId, u128),

        /// Tokens were approved for spending
        Approval(AccountId, AccountId, u128),

        /// New tokens were minted
        Mint(AccountId, u128),

        /// Tokens were burned
        Burn(AccountId, u128),
    }
);

decl_error! {
    pub enum Error for Module<T: Config> {
        /// Insufficient balance for transfer
        InsufficientBalance,

        /// Insufficient allowance for transfer
        InsufficientAllowance,

        /// Cannot transfer to same account
        TransferToSelf,

        /// Amount exceeds maximum supply
        ExceedsMaxSupply,

        /// Cannot burn more than balance
        InsufficientBalanceForBurn,
    }
}

decl_module! {
    pub struct Module<T: Config> for enum Call where origin: T::Origin {
        type Error = Error<T>;

        fn deposit_event() = default;

        /// Transfer tokens between accounts
        #[weight = 10_000]
        pub fn transfer(
            origin,
            to: T::AccountId,
            amount: u128,
        ) -> DispatchResult {
            let from = ensure_signed(origin)?;
            Self::do_transfer(&from, &to, amount)?;
            Ok(())
        }

        /// Approve another account to spend tokens
        #[weight = 10_000]
        pub fn approve(
            origin,
            spender: T::AccountId,
            amount: u128,
        ) -> DispatchResult {
            let owner = ensure_signed(origin)?;

            Allowances::<T>::insert(&owner, &spender, amount);

            Self::deposit_event(RawEvent::Approval(owner, spender, amount));
            Ok(())
        }

        /// Transfer tokens on behalf of another account
        #[weight = 10_000]
        pub fn transfer_from(
            origin,
            from: T::AccountId,
            to: T::AccountId,
            amount: u128,
        ) -> DispatchResult {
            let spender = ensure_signed(origin)?;

            let allowance = Self::allowance(&from, &spender);
            ensure!(allowance >= amount, Error::<T>::InsufficientAllowance);

            Self::do_transfer(&from, &to, amount)?;

            let new_allowance = allowance.saturating_sub(amount);
            Allowances::<T>::insert(&from, &spender, new_allowance);

            Ok(())
        }

        /// Mint new tokens (requires MintOrigin)
        #[weight = 10_000]
        pub fn mint(
            origin,
            to: T::AccountId,
            amount: u128,
        ) -> DispatchResult {
            T::MintOrigin::ensure_origin(origin)?;

            let total_supply = Self::total_supply();
            let new_supply = total_supply.saturating_add(amount);
            ensure!(new_supply <= T::MaxSupply::get(), Error::<T>::ExceedsMaxSupply);

            let balance = Self::balance_of(&to);
            let new_balance = balance.saturating_add(amount);

            Balances::<T>::insert(&to, new_balance);
            TotalSupply::<T>::put(new_supply);

            Self::deposit_event(RawEvent::Mint(to, amount));
            Ok(())
        }

        /// Burn tokens from account
        #[weight = 10_000]
        pub fn burn(
            origin,
            amount: u128,
        ) -> DispatchResult {
            let from = ensure_signed(origin)?;

            let balance = Self::balance_of(&from);
            ensure!(balance >= amount, Error::<T>::InsufficientBalanceForBurn);

            let new_balance = balance.saturating_sub(amount);
            let total_supply = Self::total_supply();
            let new_supply = total_supply.saturating_sub(amount);

            Balances::<T>::insert(&from, new_balance);
            TotalSupply::<T>::put(new_supply);

            Self::deposit_event(RawEvent::Burn(from, amount));
            Ok(())
        }
    }
}

impl<T: Config> Module<T> {
    fn do_transfer(
        from: &T::AccountId,
        to: &T::AccountId,
        amount: u128,
    ) -> DispatchResult {
        ensure!(from != to, Error::<T>::TransferToSelf);

        let from_balance = Self::balance_of(from);
        ensure!(from_balance >= amount, Error::<T>::InsufficientBalance);

        let to_balance = Self::balance_of(to);

        let new_from_balance = from_balance.saturating_sub(amount);
        let new_to_balance = to_balance.saturating_add(amount);

        Balances::<T>::insert(from, new_from_balance);
        Balances::<T>::insert(to, new_to_balance);

        Self::deposit_event(RawEvent::Transfer(from.clone(), to.clone(), amount));

        Ok(())
    }
}
`;

    await fs.writeFile(path.join(dir, 'token-pallet.hbs'), tokenPalletTemplate);
  }

  private async createDefaultPolkadotTemplates(dir: string): Promise<void> {
    const xcmTemplate = `{{!--
name: XCM Integration
description: Cross-chain messaging implementation with asset transfers
language: rust
framework: polkadot
variables: [pallet_name, supported_assets]
dependencies: [xcm, xcm-executor, polkadot-parachain]
tags: [xcm, cross-chain, interoperability]
--}}
#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{
    codec::{Encode, Decode},
    dispatch::DispatchResult,
    traits::Get,
    weights::Weight,
};
use sp_std::{marker::PhantomData, vec::Vec};
use xcm::latest::{
    Junction, Junctions, MultiAsset, MultiAssets, MultiLocation, NetworkId, Response, Xcm,
};
use xcm_executor::traits::{WeightBounds, WeightTrader};

pub trait Config: frame_system::Config {
    type Event: From<Event<Self>> + Into<<Self as frame_system::Config>::Event>;
    type XcmExecutor: ExecuteXcm<Self::Call>;
    type LocationToAccountId: Convert<MultiLocation, Self::AccountId>;
    type CurrencyMatcher: MatchesFungible<AssetId>;
    type TrustedLocations: Get<Vec<MultiLocation>>;
    type MaxInstructions: Get<u32>;
}

decl_event!(
    pub enum Event<T> where AccountId = <T as frame_system::Config>::AccountId {
        /// XCM message executed successfully
        XcmExecuted { outcome: Outcome },

        /// Asset transferred via XCM
        AssetTransferred {
            from: MultiLocation,
            to: MultiLocation,
            asset: MultiAsset,
        },

        /// XCM execution failed
        XcmFailed {
            origin: MultiLocation,
            error: XcmError,
        },
    }
);

decl_module! {
    pub struct Module<T: Config> for enum Call where origin: T::Origin {
        type Error = Error<T>;
        fn deposit_event() = default;

        /// Send XCM message to transfer assets
        #[weight = 1_000_000_000]
        pub fn transfer_asset(
            origin,
            destination: Box<VersionedMultiLocation>,
            beneficiary: Box<VersionedMultiLocation>,
            assets: Box<VersionedMultiAssets>,
        ) -> DispatchResult {
            let origin_location = T::ExecuteXcmOrigin::ensure_origin(origin)?;

            let dest = MultiLocation::try_from(*destination)
                .map_err(|()| Error::<T>::BadVersion)?;
            let beneficiary = MultiLocation::try_from(*beneficiary)
                .map_err(|()| Error::<T>::BadVersion)?;
            let assets = MultiAssets::try_from(*assets)
                .map_err(|()| Error::<T>::BadVersion)?;

            // Validate destination is trusted
            let trusted_locations = T::TrustedLocations::get();
            ensure!(
                trusted_locations.contains(&dest),
                Error::<T>::UntrustedDestination
            );

            // Build XCM message for asset transfer
            let message = Xcm(vec![
                ReserveAssetDeposited(assets.clone()),
                ClearOrigin,
                BuyExecution {
                    fees: assets.get(0).ok_or(Error::<T>::Empty)?.clone(),
                    weight_limit: Limited(Weight::from_ref_time(5_000_000_000)),
                },
                DepositAsset {
                    assets: Wild(All),
                    max_assets: 1,
                    beneficiary,
                },
            ]);

            // Execute XCM
            let outcome = T::XcmExecutor::execute_xcm(origin_location, message, Weight::MAX);

            match outcome {
                Outcome::Complete(weight) => {
                    Self::deposit_event(Event::AssetTransferred {
                        from: origin_location,
                        to: dest,
                        asset: assets.get(0).unwrap().clone(),
                    });
                },
                Outcome::Incomplete(_, error) | Outcome::Error(error) => {
                    Self::deposit_event(Event::XcmFailed {
                        origin: origin_location,
                        error,
                    });
                    return Err(Error::<T>::XcmExecutionFailed.into());
                }
            }

            Ok(())
        }

        /// Execute arbitrary XCM message
        #[weight = T::WeightInfo::execute()]
        pub fn execute(
            origin,
            message: Box<VersionedXcm<T::Call>>,
            max_weight: Weight,
        ) -> DispatchResult {
            let origin_location = T::ExecuteXcmOrigin::ensure_origin(origin)?;

            let message = Xcm::<T::Call>::try_from(*message)
                .map_err(|()| Error::<T>::BadVersion)?;

            // Validate message doesn't exceed instruction limit
            ensure!(
                message.0.len() <= T::MaxInstructions::get() as usize,
                Error::<T>::TooManyInstructions
            );

            let outcome = T::XcmExecutor::execute_xcm(origin_location, message, max_weight);

            Self::deposit_event(Event::XcmExecuted { outcome: outcome.clone() });

            match outcome {
                Outcome::Complete(_) => Ok(()),
                Outcome::Incomplete(_, error) | Outcome::Error(error) => {
                    Err(Error::<T>::XcmExecutionFailed.into())
                }
            }
        }
    }
}

// Helper implementations for XCM configuration
impl<T: Config> Convert<MultiLocation, T::AccountId> for LocationToAccountId<T> {
    fn convert(location: MultiLocation) -> T::AccountId {
        // Convert location to account ID using a deterministic method
        match location {
            MultiLocation { parents: 0, interior: X1(AccountId32 { network: None, id }) } => {
                T::AccountId::decode(&mut &id[..]).unwrap_or_default()
            },
            _ => {
                // Hash-based conversion for complex locations
                let encoded = location.encode();
                T::AccountId::decode(&mut &sp_io::hashing::blake2_256(&encoded)[..])
                    .unwrap_or_default()
            }
        }
    }
}
`;

    await fs.writeFile(path.join(dir, 'xcm-integration.hbs'), xcmTemplate);
  }

  private parseTemplateMetadata(content: string): any {
    const metadataRegex = /{{!--([\s\S]*?)--}}/;
    const match = content.match(metadataRegex);

    if (!match) return {};

    const metadataText = match[1];
    const metadata: any = {};

    // Parse metadata lines
    const lines = metadataText.split('\n').map(line => line.trim()).filter(line => line);

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (key === 'variables' || key === 'dependencies' || key === 'tags' || key === 'examples') {
        try {
          metadata[key] = JSON.parse(value);
        } catch {
          metadata[key] = value.split(',').map(v => v.trim());
        }
      } else {
        metadata[key] = value;
      }
    }

    return metadata;
  }

  private registerHelpers(): void {
    // Register standard helpers
    this.handlebars.registerHelper('capitalize', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    this.handlebars.registerHelper('snake_case', (str: string) => {
      return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    });

    this.handlebars.registerHelper('camel_case', (str: string) => {
      return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    });

    this.handlebars.registerHelper('upper_case', (str: string) => {
      return str.toUpperCase();
    });
  }

  private registerCustomHelpers(): void {
    // Register Substrate-specific helpers
    this.handlebars.registerHelper('weight_calculation', (complexity: string) => {
      const weights = {
        'low': '10_000',
        'medium': '50_000',
        'high': '100_000',
        'complex': '500_000'
      };
      return weights[complexity] || '10_000';
    });

    this.handlebars.registerHelper('storage_type', (type: string, key?: string, value?: string) => {
      switch (type) {
        case 'value':
          return `StorageValue<_, ${value || 'u32'}, ValueQuery>`;
        case 'map':
          return `StorageMap<_, Blake2_128Concat, ${key || 'AccountId'}, ${value || 'Balance'}, ValueQuery>`;
        case 'double_map':
          return `StorageDoubleMap<_, Blake2_128Concat, AccountId, Blake2_128Concat, ${key || 'u32'}, ${value || 'Balance'}, ValueQuery>`;
        default:
          return `StorageValue<_, ${value || 'u32'}, ValueQuery>`;
      }
    });

    this.handlebars.registerHelper('event_params', (params: string[]) => {
      return params.join(', ');
    });
  }

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    try {
      this.logger.info('Generating code with template-based approach', {
        intent: request.intent,
        strategy: request.strategy
      });

      // Determine generation strategy
      const strategy = this.determineStrategy(request);

      let response: CodeGenerationResponse;

      switch (strategy) {
        case 'template':
          response = await this.generateFromTemplate(request);
          break;
        case 'ai':
          response = await this.aiService.generateCode(request);
          break;
        case 'hybrid':
          response = await this.generateHybrid(request);
          break;
        default:
          response = await this.generateHybrid(request);
      }

      // Post-process the generated code
      response.generatedCode = await this.postProcessCode(response.generatedCode, request);

      this.logger.info('Code generation completed', {
        requestId: request.requestId,
        strategy,
        codeLength: response.generatedCode.length
      });

      return response;

    } catch (error) {
      this.logger.error('Code generation failed:', error);
      throw error;
    }
  }

  private determineStrategy(request: CodeGenerationRequest): GenerationStrategy {
    // Use explicit strategy if provided
    if (request.strategy) {
      return request.strategy;
    }

    // Determine based on intent patterns
    const intent = request.intent.toLowerCase();

    // Template-suitable patterns
    const templatePatterns = [
      'create.*pallet',
      'new.*runtime',
      'token.*pallet',
      'xcm.*integration',
      'basic.*implementation'
    ];

    for (const pattern of templatePatterns) {
      if (new RegExp(pattern).test(intent)) {
        return 'template';
      }
    }

    // AI-suitable patterns (complex/unique requirements)
    const aiPatterns = [
      'complex.*algorithm',
      'custom.*logic',
      'advanced.*feature',
      'optimize.*performance'
    ];

    for (const pattern of aiPatterns) {
      if (new RegExp(pattern).test(intent)) {
        return 'ai';
      }
    }

    // Default to hybrid approach
    return 'hybrid';
  }

  private async generateFromTemplate(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    // Find matching template
    const template = this.findBestTemplate(request);

    if (!template) {
      this.logger.warn('No suitable template found, falling back to AI generation');
      return this.aiService.generateCode(request);
    }

    // Prepare template context
    const context = await this.prepareTemplateContext(request, template);

    // Compile and execute template
    const compiledTemplate = this.handlebars.compile(template.template);
    const generatedCode = compiledTemplate(context);

    return {
      requestId: request.requestId,
      generatedCode,
      language: request.language,
      framework: request.framework,
      confidence: 0.9, // High confidence for template-based generation
      suggestions: template.examples,
      securityNotes: this.extractSecurityNotesFromTemplate(template),
      performanceNotes: this.extractPerformanceNotesFromTemplate(template),
      templateUsed: template.id,
      metadata: {
        strategy: 'template',
        templateId: template.id,
        templateVersion: '1.0.0'
      }
    };
  }

  private async generateHybrid(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    // First, try to find a base template
    const template = this.findBestTemplate(request);

    if (template) {
      // Generate base code from template
      const baseContext = await this.prepareTemplateContext(request, template);
      const compiledTemplate = this.handlebars.compile(template.template);
      const baseCode = compiledTemplate(baseContext);

      // Enhance with AI
      const enhancedRequest: CodeGenerationRequest = {
        ...request,
        intent: `Enhance this ${template.name} template code with: ${request.intent}`,
        context: `Base template code:\n\`\`\`${request.language}\n${baseCode}\n\`\`\`\n\nRequirements: ${request.requirements?.join(', ')}`
      };

      const aiResponse = await this.aiService.generateCode(enhancedRequest);

      return {
        ...aiResponse,
        templateUsed: template.id,
        metadata: {
          strategy: 'hybrid',
          templateId: template.id,
          baseCodeLength: baseCode.length,
          ...aiResponse.metadata
        }
      };
    } else {
      // Pure AI generation with knowledge base context
      return this.aiService.generateCode(request);
    }
  }

  private findBestTemplate(request: CodeGenerationRequest): CodeTemplate | null {
    const intent = request.intent.toLowerCase();
    const framework = request.framework?.toLowerCase() || '';
    const language = request.language?.toLowerCase() || '';

    // Score templates based on relevance
    let bestTemplate: CodeTemplate | null = null;
    let bestScore = 0;

    for (const template of this.templates.values()) {
      let score = 0;

      // Framework match
      if (template.framework === framework) score += 3;

      // Language match
      if (template.language === language) score += 2;

      // Tag matches
      for (const tag of template.tags) {
        if (intent.includes(tag.toLowerCase())) {
          score += 1;
        }
      }

      // Name/description matches
      if (intent.includes(template.name.toLowerCase())) score += 2;
      if (intent.includes(template.description.toLowerCase())) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
      }
    }

    // Require minimum relevance score
    return bestScore >= 3 ? bestTemplate : null;
  }

  private async prepareTemplateContext(
    request: CodeGenerationRequest,
    template: CodeTemplate
  ): Promise<TemplateContext> {
    const context: TemplateContext = {
      // Extract variables from request
      ...this.extractVariablesFromIntent(request.intent),

      // Default values
      runtime_name: 'CustomRuntime',
      pallet_name: 'CustomPallet',
      token_name: 'CustomToken',
      token_symbol: 'CTK',
      decimals: 18,
      max_supply: '1000000000000000000000000000', // 1B tokens with 18 decimals

      // Meta information
      framework: request.framework,
      language: request.language,
      timestamp: new Date().toISOString(),

      // Additional context from requirements
      requirements: request.requirements || []
    };

    // Override with any explicit variables from request
    if (request.variables) {
      Object.assign(context, request.variables);
    }

    return context;
  }

  private extractVariablesFromIntent(intent: string): Record<string, any> {
    const variables: Record<string, any> = {};

    // Extract common patterns
    const patterns = [
      { regex: /pallet.*named?\s+(\w+)/i, key: 'pallet_name' },
      { regex: /runtime.*named?\s+(\w+)/i, key: 'runtime_name' },
      { regex: /token.*named?\s+(\w+)/i, key: 'token_name' },
      { regex: /symbol\s+(\w+)/i, key: 'token_symbol' },
      { regex: /(\d+)\s*decimals?/i, key: 'decimals' },
    ];

    for (const pattern of patterns) {
      const match = intent.match(pattern.regex);
      if (match) {
        variables[pattern.key] = match[1];
      }
    }

    return variables;
  }

  private extractSecurityNotesFromTemplate(template: CodeTemplate): string[] {
    // Extract security notes from template metadata or comments
    return template.tags.filter(tag => tag.includes('security')) || [];
  }

  private extractPerformanceNotesFromTemplate(template: CodeTemplate): string[] {
    // Extract performance notes from template metadata or comments
    return template.tags.filter(tag => tag.includes('performance') || tag.includes('optimization')) || [];
  }

  private async postProcessCode(code: string, request: CodeGenerationRequest): Promise<string> {
    // Basic code formatting and cleanup
    let processedCode = code;

    // Remove excessive whitespace
    processedCode = processedCode.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Ensure proper imports are included
    if (request.language === 'rust' && request.framework?.includes('substrate')) {
      processedCode = this.ensureSubstrateImports(processedCode);
    }

    // Add security and performance comments if missing
    if (!processedCode.includes('SECURITY:') && !processedCode.includes('WARNING:')) {
      processedCode = this.addSecurityComments(processedCode, request);
    }

    return processedCode;
  }

  private ensureSubstrateImports(code: string): string {
    const requiredImports = [
      '#![cfg_attr(not(feature = "std"), no_std)]',
      'use frame_support::{',
      'use frame_system::ensure_signed;'
    ];

    for (const import_ of requiredImports) {
      if (!code.includes(import_)) {
        // Add missing imports at the top
        code = `${import_}\n\n${code}`;
      }
    }

    return code;
  }

  private addSecurityComments(code: string, request: CodeGenerationRequest): string {
    // Add basic security reminders for blockchain code
    const securityHeader = `
// SECURITY: Always validate origins and input parameters
// WARNING: Ensure proper error handling for all operations
// NOTE: Review weight calculations for accurate fee estimation
// AUDIT: Consider having this code reviewed by security experts

`;

    return securityHeader + code;
  }

  getAvailableTemplates(): CodeTemplate[] {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: string): Promise<CodeTemplate | null> {
    return this.templates.get(id) || null;
  }

  isHealthy(): boolean {
    return this.templates.size > 0 && !!this.handlebars;
  }
}