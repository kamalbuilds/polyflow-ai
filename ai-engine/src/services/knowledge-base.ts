/**
 * Knowledge Base Service - Vector database for Substrate/FRAME documentation and patterns
 */

import { PineconeClient } from 'pinecone-client';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/logger';
import {
  KnowledgeEntry,
  KnowledgeQuery,
  KnowledgeContext,
  DocumentEmbedding,
  SubstratePattern,
  FramePallet
} from '../types/knowledge-types';

export class KnowledgeBase {
  private pinecone: PineconeClient;
  private openai: OpenAI;
  private logger: Logger;
  private indexName: string;
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger();
    this.indexName = process.env.PINECONE_INDEX_NAME || 'polyflow-knowledge';

    this.pinecone = new PineconeClient({
      apiKey: process.env.PINECONE_API_KEY || '',
      environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp'
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Knowledge Base...');

      // Initialize Pinecone
      await this.pinecone.init();

      // Create index if it doesn't exist
      await this.ensureIndexExists();

      // Load and embed documentation if needed
      await this.loadDocumentationIfNeeded();

      this.isInitialized = true;
      this.logger.info('Knowledge Base initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Knowledge Base:', error);
      throw error;
    }
  }

  private async ensureIndexExists(): Promise<void> {
    try {
      const indexes = await this.pinecone.listIndexes();

      if (!indexes.includes(this.indexName)) {
        this.logger.info(`Creating Pinecone index: ${this.indexName}`);

        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 1536, // OpenAI text-embedding-ada-002 dimension
          metric: 'cosine',
          pods: parseInt(process.env.PINECONE_PODS || '1', 10),
          replicas: parseInt(process.env.PINECONE_REPLICAS || '1', 10),
          podType: process.env.PINECONE_POD_TYPE || 'p1.x1'
        });

        this.logger.info('Pinecone index created successfully');
      } else {
        this.logger.info('Pinecone index already exists');
      }
    } catch (error) {
      this.logger.error('Failed to ensure index exists:', error);
      throw error;
    }
  }

  private async loadDocumentationIfNeeded(): Promise<void> {
    const index = this.pinecone.Index(this.indexName);

    // Check if documentation is already loaded
    const stats = await index.describeIndexStats();

    if (stats.totalVectorCount === 0) {
      this.logger.info('Loading Substrate/FRAME documentation...');
      await this.loadSubstrateDocumentation();
      await this.loadFrameDocumentation();
      await this.loadPolkadotPatterns();
      await this.loadSecurityPatterns();
      await this.loadPerformancePatterns();
    } else {
      this.logger.info(`Knowledge base already contains ${stats.totalVectorCount} documents`);
    }
  }

  private async loadSubstrateDocumentation(): Promise<void> {
    const substrateDocsPath = path.join(__dirname, '../../data/knowledge/substrate-docs');

    try {
      // Create documentation directory if it doesn't exist
      await fs.mkdir(substrateDocsPath, { recursive: true });

      // Load Substrate core concepts
      const substrateConcepts = [
        {
          id: 'substrate-runtime',
          title: 'Substrate Runtime Development',
          content: `
Substrate runtime is the core business logic of a blockchain. It defines:

1. State Transition Function: How the blockchain state changes with each block
2. Block Production: Consensus mechanism and block authoring
3. Networking: P2P communication and transaction pool management

Key Components:
- Runtime API: Interface between runtime and node
- Pallets: Modular components for specific functionality
- Executive: Orchestrates pallet execution
- System Pallet: Core blockchain functionality

Best Practices:
- Use weight-based fee calculation
- Implement proper error handling with DispatchError
- Follow the "fail-fast" principle
- Use benchmarking for weight estimation
- Implement proper storage migrations

Example Runtime Structure:
construct_runtime!(
  pub enum Runtime where
    Block = Block,
    NodeBlock = opaque::Block,
    UncheckedExtrinsic = UncheckedExtrinsic
  {
    System: frame_system,
    Balances: pallet_balances,
    CustomPallet: pallet_custom,
  }
);
          `,
          category: 'substrate',
          framework: 'substrate',
          language: 'rust',
          tags: ['runtime', 'core', 'architecture']
        },
        {
          id: 'substrate-storage',
          title: 'Substrate Storage Patterns',
          content: `
Substrate provides several storage types for different use cases:

1. StorageValue<T>: Single value storage
   - Use for global settings, counters, flags
   - Example: pub(super) type TotalSupply<T> = StorageValue<_, BalanceOf<T>, ValueQuery>;

2. StorageMap<K, V>: Key-value mapping
   - Use for user balances, account info
   - Example: pub type Balances<T> = StorageMap<_, Blake2_128Concat, T::AccountId, BalanceOf<T>, ValueQuery>;

3. StorageDoubleMap<K1, K2, V>: Two-key mapping
   - Use for relationships between two entities
   - Example: pub type Allowances<T> = StorageDoubleMap<_, Blake2_128Concat, T::AccountId, Blake2_128Concat, T::AccountId, BalanceOf<T>, ValueQuery>;

4. StorageNMap: Multi-dimensional storage
   - Use for complex data relationships
   - More flexible than DoubleMap for multiple keys

Storage Best Practices:
- Choose appropriate hasher: Blake2_128Concat for user-controlled keys, Twox64Concat for system keys
- Use ValueQuery for default values, OptionQuery for optional values
- Implement proper storage migrations when changing structure
- Monitor storage bloat and implement cleanup mechanisms
- Use bounded collections to prevent unbounded growth

Storage Optimization:
- Minimize storage reads/writes
- Use storage transactions for atomic updates
- Implement efficient storage removal patterns
- Consider storage rent for long-term sustainability
          `,
          category: 'substrate',
          framework: 'substrate',
          language: 'rust',
          tags: ['storage', 'optimization', 'patterns']
        }
      ];

      for (const doc of substrateConcepts) {
        await this.addKnowledgeEntry(doc);
      }

      this.logger.info('Substrate documentation loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load Substrate documentation:', error);
    }
  }

  private async loadFrameDocumentation(): Promise<void> {
    const frameDocsPath = path.join(__dirname, '../../data/knowledge/frame-docs');

    try {
      await fs.mkdir(frameDocsPath, { recursive: true });

      const framePallets: FramePallet[] = [
        {
          id: 'pallet-balances',
          name: 'Balances Pallet',
          description: 'Core token balance management with transfer, reserve, and lock functionality',
          category: 'core',
          dependencies: ['frame-system'],
          extrinsics: [
            {
              name: 'transfer',
              description: 'Transfer tokens between accounts',
              parameters: ['dest: AccountId', 'value: Balance'],
              security_notes: ['Check for sufficient balance', 'Handle dust accounts']
            },
            {
              name: 'transfer_keep_alive',
              description: 'Transfer tokens while keeping sender account alive',
              parameters: ['dest: AccountId', 'value: Balance'],
              security_notes: ['Prevents account reaping', 'Maintains existential deposit']
            }
          ],
          storage: [
            {
              name: 'Account',
              type: 'StorageMap<AccountId, AccountData>',
              description: 'Account balance information including free, reserved, and frozen balances'
            },
            {
              name: 'TotalIssuance',
              type: 'StorageValue<Balance>',
              description: 'Total number of tokens in existence'
            }
          ],
          events: ['Transfer', 'BalanceSet', 'Deposit', 'Withdraw'],
          errors: ['InsufficientBalance', 'ExistentialDeposit', 'KeepAlive'],
          best_practices: [
            'Always check balance before transfers',
            'Handle existential deposit requirements',
            'Use appropriate transfer methods for different use cases',
            'Monitor for dust accounts and cleanup if needed'
          ]
        },
        {
          id: 'pallet-timestamp',
          name: 'Timestamp Pallet',
          description: 'Provides blockchain with reliable timestamping functionality',
          category: 'utility',
          dependencies: ['frame-system'],
          extrinsics: [
            {
              name: 'set',
              description: 'Set the current timestamp',
              parameters: ['now: Moment'],
              security_notes: ['Only block authors can set', 'Must be monotonically increasing']
            }
          ],
          storage: [
            {
              name: 'Now',
              type: 'StorageValue<Moment>',
              description: 'Current timestamp in milliseconds since Unix epoch'
            }
          ],
          inherents: ['timestamp'],
          best_practices: [
            'Timestamps should be set by block authors',
            'Use for time-based operations and deadlines',
            'Be aware of potential clock drift between validators'
          ]
        }
      ];

      for (const pallet of framePallets) {
        await this.addKnowledgeEntry({
          id: pallet.id,
          title: pallet.name,
          content: JSON.stringify(pallet, null, 2),
          category: 'frame-pallet',
          framework: 'frame',
          language: 'rust',
          tags: ['pallet', pallet.category, ...pallet.dependencies]
        });
      }

      this.logger.info('FRAME documentation loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load FRAME documentation:', error);
    }
  }

  private async loadPolkadotPatterns(): Promise<void> {
    const patterns: SubstratePattern[] = [
      {
        id: 'xcm-pattern',
        name: 'Cross-Chain Messaging (XCM)',
        description: 'Secure cross-chain communication pattern',
        code_example: `
// XCM message execution
impl<T: Config> Pallet<T> {
    pub fn send_xcm_message(
        origin: OriginFor<T>,
        destination: MultiLocation,
        message: Xcm<()>,
    ) -> DispatchResult {
        let origin_location = T::ExecuteXcmOrigin::ensure_origin(origin)?;

        // Validate destination
        ensure!(
            Self::is_valid_destination(&destination),
            Error::<T>::InvalidDestination
        );

        // Execute XCM
        let outcome = T::XcmExecutor::execute_xcm(
            origin_location,
            message,
            T::MaxWeight::get()
        );

        match outcome {
            Outcome::Complete(weight) => {
                Self::deposit_event(Event::XcmMessageSent {
                    destination,
                    weight
                });
                Ok(())
            },
            Outcome::Incomplete(weight, error) => {
                Self::deposit_event(Event::XcmExecutionFailed {
                    destination,
                    error
                });
                Err(Error::<T>::XcmExecutionFailed.into())
            },
            Outcome::Error(error) => {
                Err(Error::<T>::XcmExecutionError.into())
            }
        }
    }
}
        `,
        security_considerations: [
          'Validate XCM origins to prevent unauthorized messages',
          'Implement proper weight limits for XCM execution',
          'Handle XCM version compatibility',
          'Protect against XCM-based attacks and spam'
        ],
        performance_notes: [
          'XCM messages consume weight on both chains',
          'Consider message queuing for high-throughput scenarios',
          'Optimize message size to reduce fees'
        ],
        use_cases: ['Cross-chain asset transfers', 'Remote pallet calls', 'Governance proposals']
      },
      {
        id: 'treasury-pattern',
        name: 'Treasury Management',
        description: 'On-chain treasury with proposal and approval system',
        code_example: `
// Treasury proposal submission
#[pallet::call]
impl<T: Config> Pallet<T> {
    #[pallet::weight(T::WeightInfo::propose_spend())]
    pub fn propose_spend(
        origin: OriginFor<T>,
        #[pallet::compact] value: BalanceOf<T>,
        beneficiary: <T::Lookup as StaticLookup>::Source,
    ) -> DispatchResult {
        let proposer = ensure_signed(origin)?;
        let beneficiary = T::Lookup::lookup(beneficiary)?;

        // Check minimum proposal value
        ensure!(
            value >= T::MinimumProposalValue::get(),
            Error::<T>::InsufficientProposalValue
        );

        // Calculate and reserve proposal bond
        let bond = T::ProposalBondMinimum::get()
            .max(T::ProposalBond::get() * value);

        T::Currency::reserve(&proposer, bond)?;

        let proposal_index = Self::proposal_count();

        // Store proposal
        Proposals::<T>::insert(proposal_index, Proposal {
            proposer: proposer.clone(),
            value,
            beneficiary: beneficiary.clone(),
            bond,
        });

        ProposalCount::<T>::put(proposal_index + 1);

        Self::deposit_event(Event::Proposed {
            proposal_index,
            proposer,
            beneficiary,
            value,
            bond
        });

        Ok(())
    }
}
        `,
        security_considerations: [
          'Require bonds to prevent spam proposals',
          'Implement proper voting mechanisms',
          'Set reasonable limits on proposal values',
          'Protect against treasury drainage attacks'
        ],
        performance_notes: [
          'Use efficient storage for proposal data',
          'Implement proposal cleanup mechanisms',
          'Consider proposal queue limits'
        ],
        use_cases: ['Development funding', 'Marketing initiatives', 'Infrastructure costs']
      }
    ];

    for (const pattern of patterns) {
      await this.addKnowledgeEntry({
        id: pattern.id,
        title: pattern.name,
        content: JSON.stringify(pattern, null, 2),
        category: 'pattern',
        framework: 'polkadot',
        language: 'rust',
        tags: ['pattern', 'polkadot', ...pattern.use_cases]
      });
    }

    this.logger.info('Polkadot patterns loaded successfully');
  }

  private async loadSecurityPatterns(): Promise<void> {
    const securityPatterns = [
      {
        id: 'origin-validation',
        title: 'Origin Validation Patterns',
        content: `
Proper origin validation is critical for blockchain security:

1. Signed Origins:
   - Use ensure_signed() for user-initiated transactions
   - Validate account permissions before execution
   - Check for sufficient funds/bonds

2. Root Origins:
   - Use ensure_root() for admin functions
   - Implement multi-sig for sensitive operations
   - Use sudo pallet carefully in development only

3. Custom Origins:
   - Implement custom origin types for specific permissions
   - Use origin filtering for enhanced security
   - Validate origin hierarchy

Example Patterns:
// Basic signed origin validation
let sender = ensure_signed(origin)?;
ensure!(Self::is_authorized(&sender), Error::<T>::Unauthorized);

// Custom origin with permission check
let origin_account = T::OriginAccountId::get();
ensure!(sender == origin_account, Error::<T>::BadOrigin);

// Multi-level permission system
match origin.into() {
    Ok(RawOrigin::Signed(account)) => {
        ensure!(Self::has_permission(&account, Permission::Execute),
                Error::<T>::InsufficientPermissions);
    },
    Ok(RawOrigin::Root) => {
        // Admin operations
    },
    _ => return Err(Error::<T>::BadOrigin.into()),
}

Security Best Practices:
- Always validate origins before state changes
- Use the principle of least privilege
- Implement permission hierarchies
- Log security-relevant events
- Use time-locks for sensitive operations
        `,
        category: 'security',
        framework: 'substrate',
        language: 'rust',
        tags: ['security', 'origins', 'validation', 'permissions']
      },
      {
        id: 'reentrancy-protection',
        title: 'Reentrancy Protection',
        content: `
Prevent reentrancy attacks in substrate pallets:

1. Check-Effects-Interactions Pattern:
   - Perform all checks first
   - Update state before external calls
   - Make external calls last

2. Reentrancy Guards:
   - Use storage flags to prevent reentrant calls
   - Implement mutex-like mechanisms
   - Use atomic operations

3. State Validation:
   - Validate state consistency after operations
   - Use storage transactions for atomicity
   - Implement proper rollback mechanisms

Example Implementation:
#[pallet::storage]
pub type ReentrancyGuard<T> = StorageValue<_, bool, ValueQuery>;

#[pallet::call]
impl<T: Config> Pallet<T> {
    pub fn protected_function(origin: OriginFor<T>) -> DispatchResult {
        let sender = ensure_signed(origin)?;

        // Reentrancy check
        ensure!(!ReentrancyGuard::<T>::get(), Error::<T>::ReentrancyDetected);

        // Set guard
        ReentrancyGuard::<T>::put(true);

        // Perform operations with automatic cleanup
        let result = Self::do_protected_operation(&sender);

        // Clear guard
        ReentrancyGuard::<T>::put(false);

        result
    }
}

Storage Transaction Pattern:
with_storage_layer(|| {
    // All storage operations here are atomic
    let balance = T::Currency::free_balance(&account);
    ensure!(balance >= amount, Error::<T>::InsufficientBalance);

    T::Currency::withdraw(&account, amount, WithdrawReasons::TRANSFER)?;
    Self::perform_complex_operation()?;
    T::Currency::deposit_creating(&beneficiary, amount);

    Ok(())
})
        `,
        category: 'security',
        framework: 'substrate',
        language: 'rust',
        tags: ['security', 'reentrancy', 'atomicity', 'protection']
      }
    ];

    for (const pattern of securityPatterns) {
      await this.addKnowledgeEntry(pattern);
    }

    this.logger.info('Security patterns loaded successfully');
  }

  private async loadPerformancePatterns(): Promise<void> {
    const performancePatterns = [
      {
        id: 'weight-optimization',
        title: 'Weight Optimization Patterns',
        content: `
Optimize extrinsic weights for better performance and lower fees:

1. Accurate Weight Calculation:
   - Use benchmarking for precise weight measurement
   - Account for storage operations (reads/writes)
   - Consider computational complexity

2. Weight Refunding:
   - Refund unused weight when possible
   - Use actual_weight in return values
   - Implement conditional weight charging

3. Batch Operations:
   - Group related operations to amortize costs
   - Use bounded collections for predictable weights
   - Implement efficient iteration patterns

Example Weight Patterns:
#[pallet::weight(T::WeightInfo::transfer())]
pub fn transfer(
    origin: OriginFor<T>,
    dest: T::AccountId,
    value: BalanceOf<T>,
) -> DispatchResultWithPostInfo {
    let sender = ensure_signed(origin)?;

    // Perform transfer
    Self::do_transfer(&sender, &dest, value)?;

    // Return actual weight used
    Ok(Pays::Yes.into())
}

// Complex weight calculation
#[pallet::weight(
    T::WeightInfo::complex_operation(items.len() as u32)
        .saturating_add(T::DbWeight::get().reads(items.len() as u64))
)]
pub fn batch_process(
    origin: OriginFor<T>,
    items: BoundedVec<Item, T::MaxItems>,
) -> DispatchResultWithPostInfo {
    let sender = ensure_signed(origin)?;

    let mut actual_weight = Weight::zero();
    let mut processed = 0;

    for item in items.iter() {
        match Self::process_item(&sender, item) {
            Ok(weight) => {
                actual_weight = actual_weight.saturating_add(weight);
                processed += 1;
            },
            Err(_) => break,
        }
    }

    // Refund unused weight
    let base_weight = T::WeightInfo::complex_operation(processed);
    let total_weight = base_weight.saturating_add(actual_weight);

    Ok(Some(total_weight).into())
}

Benchmarking Best Practices:
- Test with realistic data sizes
- Include worst-case scenarios
- Account for storage overhead
- Regular weight audits and updates
        `,
        category: 'performance',
        framework: 'substrate',
        language: 'rust',
        tags: ['performance', 'weight', 'optimization', 'benchmarking']
      }
    ];

    for (const pattern of performancePatterns) {
      await this.addKnowledgeEntry(pattern);
    }

    this.logger.info('Performance patterns loaded successfully');
  }

  async addKnowledgeEntry(entry: KnowledgeEntry): Promise<void> {
    try {
      // Generate embedding for the content
      const embedding = await this.generateEmbedding(entry.content);

      const index = this.pinecone.Index(this.indexName);

      // Upsert the entry
      await index.upsert([{
        id: entry.id,
        values: embedding,
        metadata: {
          title: entry.title,
          category: entry.category,
          framework: entry.framework,
          language: entry.language,
          tags: entry.tags?.join(',') || '',
          content: entry.content.substring(0, 10000) // Pinecone metadata limit
        }
      }]);

      this.logger.debug(`Added knowledge entry: ${entry.id}`);
    } catch (error) {
      this.logger.error(`Failed to add knowledge entry ${entry.id}:`, error);
      throw error;
    }
  }

  async getRelevantContext(
    query: string,
    language?: string,
    framework?: string
  ): Promise<string> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      const index = this.pinecone.Index(this.indexName);

      // Build filter based on language and framework
      const filter: any = {};
      if (language) filter.language = language;
      if (framework) filter.framework = framework;

      // Query the vector database
      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });

      // Combine relevant context
      const contexts = queryResponse.matches
        ?.filter(match => match.score && match.score > 0.7) // Relevance threshold
        ?.map(match => {
          const metadata = match.metadata as any;
          return `## ${metadata.title}\n${metadata.content}`;
        }) || [];

      if (contexts.length === 0) {
        return 'No relevant context found in knowledge base.';
      }

      return contexts.join('\n\n---\n\n');

    } catch (error) {
      this.logger.error('Failed to get relevant context:', error);
      return 'Error retrieving context from knowledge base.';
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // OpenAI token limit
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async searchKnowledge(query: KnowledgeQuery): Promise<KnowledgeEntry[]> {
    try {
      const context = await this.getRelevantContext(
        query.text,
        query.language,
        query.framework
      );

      // Parse context back to knowledge entries (simplified)
      // In a real implementation, store and retrieve structured data
      return [];
    } catch (error) {
      this.logger.error('Failed to search knowledge:', error);
      return [];
    }
  }

  isHealthy(): boolean {
    return this.isInitialized && !!this.pinecone && !!this.openai;
  }
}