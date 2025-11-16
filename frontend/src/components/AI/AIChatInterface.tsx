import React, { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  CodeBracketIcon,
  DocumentIcon,
  BoltIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'text' | 'code' | 'workflow' | 'suggestion';
  metadata?: {
    language?: string;
    confidence?: number;
    suggestedActions?: string[];
  };
}

interface AIChatInterfaceProps {
  onCodeGenerate?: (code: string, language: string) => void;
  onWorkflowCreate?: (workflow: any) => void;
  onXCMMessageCreate?: (message: any) => void;
  className?: string;
}

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  onCodeGenerate,
  onWorkflowCreate,
  onXCMMessageCreate,
  className = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to PolyFlow AI! I can help you build cross-chain applications, create XCM messages, generate Substrate pallets, and much more. What would you like to build today?',
      timestamp: new Date(),
      type: 'text',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulate AI response - in real app, this would call the AI API
      await new Promise(resolve => setTimeout(resolve, 1000));

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(inputMessage),
        timestamp: new Date(),
        type: determineResponseType(inputMessage),
        metadata: {
          confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
          suggestedActions: generateSuggestedActions(inputMessage),
        },
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        type: 'text',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('xcm') || lowerInput.includes('cross-chain')) {
      return `I'll help you create an XCM message. Based on your request, here's a template:

\`\`\`rust
use xcm::v3::{Junction::Parachain, Junctions::X1, MultiLocation, WeightLimit};

let dest = MultiLocation {
    parents: 1,
    interior: X1(Parachain(2000)), // Acala
};

let message = xcm::v3::Xcm(vec![
    WithdrawAsset(assets.into()),
    InitiateReserveWithdraw {
        assets: asset_filter,
        reserve: dest,
        xcm: Xcm(vec![
            BuyExecution { fees: fee_asset, weight_limit: WeightLimit::Unlimited },
            DepositAsset { assets, max_assets: 1, beneficiary: account }
        ])
    }
]);
\`\`\`

Would you like me to customize this for your specific use case?`;
    }

    if (lowerInput.includes('pallet') || lowerInput.includes('substrate')) {
      return `I'll generate a Substrate pallet for you. Here's a basic template:

\`\`\`rust
#[frame_support::pallet]
pub mod pallet {
    use frame_support::pallet_prelude::*;
    use frame_system::pallet_prelude::*;

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    }

    #[pallet::storage]
    pub type Something<T> = StorageValue<_, u32>;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        SomethingStored { something: u32, who: T::AccountId },
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight(10_000)]
        pub fn do_something(origin: OriginFor<T>, something: u32) -> DispatchResult {
            let who = ensure_signed(origin)?;
            Something::<T>::put(&something);
            Self::deposit_event(Event::SomethingStored { something, who });
            Ok(())
        }
    }
}
\`\`\`

This is a basic pallet structure. What specific functionality would you like to add?`;
    }

    return `I understand you're working on: "${input}". Let me help you with that! I can assist with:

• Creating XCM messages for cross-chain transfers
• Generating Substrate pallets and runtime code
• Building smart contracts for Moonbeam/Astar
• Setting up blockchain connections
• Validating transactions and security checks
• Creating workflow automation

What specific aspect would you like to focus on first?`;
  };

  const determineResponseType = (input: string): ChatMessage['type'] => {
    if (input.toLowerCase().includes('code') || input.toLowerCase().includes('pallet')) {
      return 'code';
    }
    if (input.toLowerCase().includes('workflow')) {
      return 'workflow';
    }
    return 'text';
  };

  const generateSuggestedActions = (input: string): string[] => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('xcm')) {
      return ['Create XCM Transfer', 'Add Destination Chain', 'Validate Message'];
    }
    if (lowerInput.includes('pallet')) {
      return ['Generate Pallet Code', 'Add to Workflow', 'Test Pallet'];
    }

    return ['Add to Workflow', 'Generate Code', 'Create Documentation'];
  };

  const handleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
      };

      recognition.start();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (message: ChatMessage) => {
    if (message.type === 'code') {
      return (
        <div className="space-y-2">
          <div dangerouslySetInnerHTML={{ __html: message.content.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto"><code>$2</code></pre>') }} />
          {message.metadata?.suggestedActions && (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.metadata.suggestedActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleActionClick(action, message)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br />') }} />
        {message.metadata?.suggestedActions && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.metadata.suggestedActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action, message)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleActionClick = (action: string, message: ChatMessage) => {
    switch (action) {
      case 'Generate Code':
      case 'Generate Pallet Code':
        if (onCodeGenerate) {
          const codeMatch = message.content.match(/```(\w+)?\n([\s\S]*?)```/);
          if (codeMatch) {
            onCodeGenerate(codeMatch[2], codeMatch[1] || 'rust');
          }
        }
        break;
      case 'Add to Workflow':
        if (onWorkflowCreate) {
          onWorkflowCreate({ type: 'ai-suggestion', content: message.content });
        }
        break;
      case 'Create XCM Transfer':
        if (onXCMMessageCreate) {
          onXCMMessageCreate({ type: 'transfer', source: message.content });
        }
        break;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="flex items-center space-x-3">
          <SparklesIcon className="w-6 h-6" />
          <div>
            <h2 className="text-lg font-semibold">PolyFlow AI Assistant</h2>
            <p className="text-sm opacity-90">Your intelligent cross-chain development companion</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] p-4 rounded-lg
                ${message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                  : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                }
              `}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <SparklesIcon className="w-4 h-4 mt-1 flex-shrink-0 text-purple-600" />
                )}
                <div className="flex-1">
                  {formatMessage(message)}
                  <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.metadata?.confidence && (
                      <span>{Math.round(message.metadata.confidence * 100)}% confidence</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="w-4 h-4 animate-pulse text-purple-600" />
                <span className="text-gray-600 dark:text-gray-400">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about cross-chain development..."
              rows={1}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleVoiceInput}
            disabled={isListening}
            className={`p-3 rounded-lg transition-colors ${
              isListening
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700`}
            title="Voice input"
          >
            <MicrophoneIcon className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message (Enter)"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => setInputMessage('Create an XCM transfer from Polkadot to Acala')}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
          >
            <PaperAirplaneIcon className="w-3 h-3 inline mr-1" />
            XCM Transfer
          </button>
          <button
            onClick={() => setInputMessage('Generate a new Substrate pallet for token management')}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition-colors"
          >
            <CodeBracketIcon className="w-3 h-3 inline mr-1" />
            New Pallet
          </button>
          <button
            onClick={() => setInputMessage('Create a smart contract for cross-chain governance')}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
          >
            <DocumentIcon className="w-3 h-3 inline mr-1" />
            Smart Contract
          </button>
          <button
            onClick={() => setInputMessage('Help me optimize gas costs for my cross-chain transactions')}
            className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm hover:bg-orange-200 transition-colors"
          >
            <BoltIcon className="w-3 h-3 inline mr-1" />
            Optimize
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;