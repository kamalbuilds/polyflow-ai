'use client';

import { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  ClipboardIcon,
  CodeBracketIcon,
  PlayIcon,
  StopIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/utils';
import { useChatStore } from '@/hooks/useStore';
import { useTheme } from '@/components/ThemeProvider';

const examplePrompts = [
  "Create a cross-chain token transfer between Polkadot and Moonbeam",
  "Build a governance voting mechanism for a parachain",
  "Generate a smart contract for NFT marketplace with XCM support",
  "Explain how to implement cross-chain asset bridging",
  "Create a DeFi protocol that works across multiple parachains",
];

interface CodeBlockProps {
  language?: string;
  children: string;
}

function CodeBlock({ language = 'javascript', children }: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="relative group">
      <div className="flex items-center justify-between bg-muted border border-border rounded-t-lg px-4 py-2">
        <span className="text-sm font-medium text-muted-foreground">{language}</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-md hover:bg-background transition-colors"
            title="Copy code"
          >
            <ClipboardIcon className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-background transition-colors"
            title="Run code"
          >
            <PlayIcon className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded-md hover:bg-background transition-colors"
            title="Download"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={resolvedTheme === 'dark' ? vscDarkPlus : vs}
          customStyle={{
            margin: 0,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: '0.5rem',
            borderBottomRightRadius: '0.5rem',
            border: '1px solid hsl(var(--border))',
            borderTop: 'none',
          }}
        >
          {children}
        </SyntaxHighlighter>
        {copied && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-green-600 text-white text-xs rounded-md">
            Copied!
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, isUser }: { message: any; isUser: boolean }) {
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground border border-border'
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="chat-message">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';

                  if (!inline && language) {
                    return (
                      <CodeBlock language={language}>
                        {String(children).replace(/\n$/, '')}
                      </CodeBlock>
                    );
                  }

                  return (
                    <code
                      className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                pre({ children }) {
                  return <>{children}</>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {message.metadata && (
          <div className="mt-2 text-xs opacity-70">
            {message.metadata.tokens && `${message.metadata.tokens} tokens`}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, addMessage, setStreaming, isStreaming } = useChatStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (prompt?: string) => {
    const messageText = prompt || input.trim();
    if (!messageText || isStreaming) return;

    setInput('');
    setIsGenerating(true);
    setStreaming(true);

    // Add user message
    addMessage({
      type: 'user',
      content: messageText,
    });

    // Simulate AI response (replace with actual API call)
    try {
      await simulateAIResponse(messageText);
    } catch (error) {
      addMessage({
        type: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
      });
    } finally {
      setIsGenerating(false);
      setStreaming(false);
    }
  };

  const simulateAIResponse = async (prompt: string) => {
    // Simulate streaming response
    const responses = {
      'cross-chain': `# Cross-Chain Token Transfer

Here's how to create a cross-chain token transfer between Polkadot and Moonbeam:

## 1. XCM Message Structure

\`\`\`typescript
import { ApiPromise, WsProvider } from '@polkadot/api';

// Initialize connection to Polkadot
const wsProvider = new WsProvider('wss://rpc.polkadot.io');
const api = await ApiPromise.create({ provider: wsProvider });

// Create XCM message for token transfer
const xcmMessage = {
  V3: {
    instructions: [
      {
        WithdrawAsset: [
          {
            id: {
              Concrete: {
                parents: 0,
                interior: { Here: null }
              }
            },
            fun: {
              Fungible: '1000000000000' // 1 DOT in planck
            }
          }
        ]
      },
      {
        InitiateTeleport: {
          assets: { Wild: { All: null } },
          dest: {
            parents: 0,
            interior: {
              X1: {
                Parachain: 2004 // Moonbeam parachain ID
              }
            }
          },
          xcm: {
            V3: {
              instructions: [
                {
                  BuyExecution: {
                    fees: {
                      id: {
                        Concrete: {
                          parents: 0,
                          interior: { Here: null }
                        }
                      },
                      fun: {
                        Fungible: '100000000000' // Fee amount
                      }
                    },
                    weightLimit: { Unlimited: null }
                  }
                },
                {
                  DepositAsset: {
                    assets: { Wild: { All: null } },
                    beneficiary: {
                      parents: 0,
                      interior: {
                        X1: {
                          AccountKey20: {
                            network: null,
                            key: '0x1234...5678' // Moonbeam address
                          }
                        }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    ]
  }
};

// Execute the XCM message
const tx = api.tx.xcmPallet.send(
  { V3: { parents: 0, interior: { X1: { Parachain: 2004 } } } },
  xcmMessage
);

await tx.signAndSend(sender);
\`\`\`

## 2. Error Handling

\`\`\`typescript
try {
  const result = await tx.signAndSend(sender, (status) => {
    if (status.isInBlock) {
      console.log('Transaction included in block:', status.asInBlock.toHex());
    } else if (status.isFinalized) {
      console.log('Transaction finalized:', status.asFinalized.toHex());
    }
  });
} catch (error) {
  console.error('XCM transfer failed:', error);
}
\`\`\`

This implementation creates a secure cross-chain token transfer using XCM v3 format.`,

      'governance': `# Governance Voting Mechanism

Here's a complete governance voting system for a parachain:

\`\`\`rust
use frame_support::{
    decl_module, decl_storage, decl_event, decl_error,
    weights::Weight,
    traits::{Get, Currency, ReservableCurrency},
};
use sp_std::vec::Vec;
use codec::{Encode, Decode};

#[derive(Encode, Decode, Clone, PartialEq, Eq)]
pub struct Proposal<AccountId, Balance> {
    pub author: AccountId,
    pub title: Vec<u8>,
    pub description: Vec<u8>,
    pub deposit: Balance,
    pub voting_end: u32,
}

#[derive(Encode, Decode, Clone, PartialEq, Eq)]
pub enum Vote {
    Aye,
    Nay,
}

pub trait Config: frame_system::Config {
    type Event: From<Event<Self>> + Into<<Self as frame_system::Config>::Event>;
    type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;
    type MinimumDeposit: Get<<Self::Currency as Currency<Self::AccountId>>::Balance>;
    type VotingPeriod: Get<u32>;
}

decl_storage! {
    trait Store for Module<T: Config> as Governance {
        /// Proposals by ID
        pub Proposals get(fn proposals):
            map hasher(blake2_128_concat) u32 =>
            Option<Proposal<T::AccountId, T::Currency::Balance>>;

        /// Next proposal ID
        pub NextProposalId get(fn next_proposal_id): u32 = 1;

        /// Votes on proposals
        pub Voting get(fn voting):
            double_map hasher(blake2_128_concat) u32,
            hasher(blake2_128_concat) T::AccountId =>
            Option<Vote>;

        /// Vote counts
        pub VoteCounts get(fn vote_counts):
            map hasher(blake2_128_concat) u32 => (u32, u32); // (ayes, nays)
    }
}

decl_event!(
    pub enum Event<T> where AccountId = T::AccountId, Balance = T::Currency::Balance {
        ProposalCreated(u32, AccountId),
        VoteCast(u32, AccountId, Vote),
        ProposalExecuted(u32),
        ProposalRejected(u32),
    }
);

decl_module! {
    pub struct Module<T: Config> for enum Call where origin: T::Origin {
        fn deposit_event() = default;

        #[weight = 10_000]
        pub fn create_proposal(
            origin,
            title: Vec<u8>,
            description: Vec<u8>
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let deposit = T::MinimumDeposit::get();
            T::Currency::reserve(&who, deposit)?;

            let proposal_id = Self::next_proposal_id();
            let voting_end = <frame_system::Pallet<T>>::block_number() +
                T::VotingPeriod::get().into();

            let proposal = Proposal {
                author: who.clone(),
                title,
                description,
                deposit,
                voting_end,
            };

            Proposals::<T>::insert(&proposal_id, &proposal);
            NextProposalId::put(proposal_id + 1);

            Self::deposit_event(RawEvent::ProposalCreated(proposal_id, who));

            Ok(())
        }

        #[weight = 10_000]
        pub fn vote(
            origin,
            proposal_id: u32,
            vote: Vote
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            ensure!(Proposals::<T>::contains_key(&proposal_id), "Proposal does not exist");

            Voting::<T>::insert(&proposal_id, &who, &vote);

            let (mut ayes, mut nays) = Self::vote_counts(&proposal_id);
            match vote {
                Vote::Aye => ayes += 1,
                Vote::Nay => nays += 1,
            }
            VoteCounts::insert(&proposal_id, (ayes, nays));

            Self::deposit_event(RawEvent::VoteCast(proposal_id, who, vote));

            Ok(())
        }
    }
}
\`\`\`

This governance system allows token holders to create proposals and vote on them with proper economic incentives.`,

      'default': `I'm PolyFlow AI, your cross-chain development assistant. I can help you with:

🔗 **Cross-Chain Development**
- XCM message creation and optimization
- Multi-parachain application architecture
- Cross-chain asset transfers and bridges

💻 **Code Generation**
- Substrate pallet development
- Smart contracts for parachains
- Frontend integration with Polkadot.js

🏗️ **Architecture Design**
- System design for cross-chain applications
- Security best practices
- Performance optimization

🔧 **Tools & Integration**
- Workflow automation
- Testing strategies
- Deployment pipelines

What would you like to build today? Try one of the example prompts below or ask me anything about cross-chain development!`,
    };

    let responseText = responses.default;
    if (prompt.toLowerCase().includes('cross-chain') || prompt.toLowerCase().includes('transfer')) {
      responseText = responses['cross-chain'];
    } else if (prompt.toLowerCase().includes('governance') || prompt.toLowerCase().includes('voting')) {
      responseText = responses['governance'];
    }

    // Simulate typing effect
    addMessage({
      type: 'assistant',
      content: '',
    });

    const words = responseText.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const partialText = words.slice(0, i + 3).join(' ');

      // Update the last message
      const currentMessages = useChatStore.getState().messages;
      if (currentMessages.length > 0) {
        const lastMessage = currentMessages[currentMessages.length - 1];
        lastMessage.content = partialText;
        useChatStore.setState({
          messages: [...currentMessages.slice(0, -1), lastMessage]
        });
      }
    }

    // Final update with complete text and metadata
    const currentMessages = useChatStore.getState().messages;
    if (currentMessages.length > 0) {
      const lastMessage = currentMessages[currentMessages.length - 1];
      lastMessage.content = responseText;
      lastMessage.metadata = {
        tokens: Math.floor(responseText.length / 4),
      };
      useChatStore.setState({
        messages: [...currentMessages.slice(0, -1), lastMessage]
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-border p-4 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Natural language cross-chain development
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              GPT-4 Connected
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-ai rounded-full flex items-center justify-center mx-auto mb-4">
                <CodeBracketIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Welcome to PolyFlow AI
              </h2>
              <p className="text-muted-foreground mb-8">
                Your AI assistant for cross-chain development. Ask me anything about
                building on Polkadot, creating XCM workflows, or generating smart contracts.
              </p>

              <div className="grid gap-3 max-w-2xl mx-auto">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Try these examples:
                </h3>
                {examplePrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSubmit(prompt)}
                    className="text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 group"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <span className="text-xs font-medium">
                          {index + 1}
                        </span>
                      </div>
                      <span className="text-sm text-foreground">{prompt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isUser={message.type === 'user'}
                />
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3 border border-border">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4 bg-card">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe what you want to build... (Press Shift+Enter for new line)"
              className="w-full resize-none bg-background border border-input rounded-lg px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent min-h-[60px] max-h-[200px]"
              disabled={isStreaming}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isStreaming}
              className={cn(
                'absolute bottom-2 right-2 w-8 h-8 rounded-md flex items-center justify-center transition-colors',
                input.trim() && !isStreaming
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isStreaming ? (
                <StopIcon className="w-4 h-4" />
              ) : (
                <PaperAirplaneIcon className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <div>
              Press <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to send,{' '}
              <kbd className="px-1 py-0.5 bg-muted rounded">Shift+Enter</kbd> for new line
            </div>
            <div>
              {input.length}/2000 characters
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}