import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  SparklesIcon,
  ChatBubbleLeftIcon,
  CodeBracketIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

interface AIAssistantData {
  label: string;
  description?: string;
  assistantType?: 'coder' | 'analyst' | 'validator' | 'optimizer' | 'general';
  status?: 'idle' | 'thinking' | 'responding' | 'error';
  lastPrompt?: string;
  lastResponse?: string;
  suggestedActions?: string[];
  confidence?: number;
  processingTime?: number;
}

export const AIAssistantNode: React.FC<NodeProps<AIAssistantData>> = memo(({ data, selected }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');

  const getAssistantIcon = (type?: string) => {
    switch (type) {
      case 'coder':
        return <CodeBracketIcon className="w-4 h-4" />;
      case 'analyst':
        return <LightBulbIcon className="w-4 h-4" />;
      case 'validator':
        return <SparklesIcon className="w-4 h-4" />;
      default:
        return <ChatBubbleLeftIcon className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'thinking':
        return 'border-yellow-300 bg-yellow-50';
      case 'responding':
        return 'border-blue-300 bg-blue-50';
      case 'error':
        return 'border-red-300 bg-red-50';
      default:
        return 'border-purple-300 bg-purple-50';
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'coder':
        return 'bg-blue-100 text-blue-800';
      case 'analyst':
        return 'bg-green-100 text-green-800';
      case 'validator':
        return 'bg-yellow-100 text-yellow-800';
      case 'optimizer':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSendPrompt = () => {
    if (inputPrompt.trim()) {
      // In a real app, this would send the prompt to the AI service
      console.log('Sending prompt:', inputPrompt);
      setInputPrompt('');
    }
  };

  return (
    <div
      className={`
        min-w-[240px] rounded-xl border-2 bg-white shadow-lg transition-all duration-200
        ${selected ? 'border-purple-500 shadow-purple-200' : 'border-gray-200 hover:border-purple-300'}
        ${getStatusColor(data.status)}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-purple-500"
        style={{ borderRadius: '50%' }}
      />

      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              {getAssistantIcon(data.assistantType)}
            </div>
            <div>
              <span className="font-medium text-sm">{data.label}</span>
              {data.assistantType && (
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getTypeColor(data.assistantType)}`}>
                  {data.assistantType}
                </span>
              )}
            </div>
          </div>
          <SparklesIcon className={`w-4 h-4 ${data.status === 'thinking' ? 'animate-pulse text-yellow-500' : 'text-purple-500'}`} />
        </div>

        {data.description && (
          <p className="text-xs text-gray-600 mt-2">{data.description}</p>
        )}

        {/* Status Indicator */}
        {data.status && (
          <div className="flex items-center space-x-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${
              data.status === 'thinking' ? 'bg-yellow-400 animate-pulse' :
              data.status === 'responding' ? 'bg-blue-400 animate-pulse' :
              data.status === 'error' ? 'bg-red-400' : 'bg-green-400'
            }`} />
            <span className="text-xs text-gray-600 capitalize">{data.status}</span>
            {data.confidence && (
              <span className="text-xs text-gray-500">
                ({Math.round(data.confidence * 100)}% confidence)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          {/* Quick Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Ask AI Assistant:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Type your request..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSendPrompt()}
              />
              <button
                onClick={handleSendPrompt}
                className="px-3 py-2 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
              >
                Send
              </button>
            </div>
          </div>

          {/* Last Interaction */}
          {data.lastPrompt && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Prompt:</label>
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                {data.lastPrompt}
              </p>
            </div>
          )}

          {data.lastResponse && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Response:</label>
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                {data.lastResponse}
              </p>
            </div>
          )}

          {/* Suggested Actions */}
          {data.suggestedActions && data.suggestedActions.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Suggested Actions:</label>
              <div className="space-y-1">
                {data.suggestedActions.map((action, index) => (
                  <button
                    key={index}
                    className="block w-full text-left px-3 py-2 text-xs bg-purple-50 hover:bg-purple-100 rounded border border-purple-200"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Performance Info */}
          {data.processingTime && (
            <div className="text-xs text-gray-500">
              Processing time: {data.processingTime}ms
            </div>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-purple-500"
        style={{ borderRadius: '50%' }}
      />
    </div>
  );
});

AIAssistantNode.displayName = 'AIAssistantNode';

export default AIAssistantNode;