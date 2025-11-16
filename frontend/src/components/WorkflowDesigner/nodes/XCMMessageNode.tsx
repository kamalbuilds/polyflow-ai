import React, { useState, memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { PaperAirplaneIcon, Cog6ToothIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface XCMMessageData {
  label: string;
  description?: string;
  messageType?: 'transfer' | 'execute' | 'query' | 'custom';
  sourceChain?: string;
  destinationChain?: string;
  amount?: string;
  asset?: string;
  recipient?: string;
  calldata?: string;
  status?: 'draft' | 'configured' | 'ready' | 'sent';
}

export const XCMMessageNode: React.FC<NodeProps<XCMMessageData>> = memo(({ data, selected }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ready':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'configured':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'sent':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMessageTypeIcon = (type?: string) => {
    switch (type) {
      case 'transfer':
        return <PaperAirplaneIcon className="w-4 h-4" />;
      case 'execute':
        return <Cog6ToothIcon className="w-4 h-4" />;
      case 'query':
        return <CheckCircleIcon className="w-4 h-4" />;
      default:
        return <PaperAirplaneIcon className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={`
        min-w-[200px] rounded-lg border-2 bg-white shadow-lg transition-all duration-200
        ${selected ? 'border-blue-500 shadow-blue-200' : 'border-gray-200 hover:border-blue-300'}
        ${getStatusColor(data.status)}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500"
        style={{ borderRadius: '50%' }}
      />

      {/* Header */}
      <div
        className="p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getMessageTypeIcon(data.messageType)}
            <span className="font-medium text-sm">{data.label}</span>
          </div>
          <div className="flex items-center space-x-1">
            {data.status && (
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(data.status)}`}>
                {data.status}
              </span>
            )}
          </div>
        </div>
        {data.description && (
          <p className="text-xs text-gray-600 mt-1">{data.description}</p>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="font-medium text-gray-700">Source:</label>
              <p className="text-gray-600">{data.sourceChain || 'Not set'}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">Destination:</label>
              <p className="text-gray-600">{data.destinationChain || 'Not set'}</p>
            </div>
          </div>

          {data.messageType === 'transfer' && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="font-medium text-gray-700">Amount:</label>
                <p className="text-gray-600">{data.amount || '0'}</p>
              </div>
              <div>
                <label className="font-medium text-gray-700">Asset:</label>
                <p className="text-gray-600">{data.asset || 'DOT'}</p>
              </div>
            </div>
          )}

          {data.recipient && (
            <div className="text-xs">
              <label className="font-medium text-gray-700">Recipient:</label>
              <p className="text-gray-600 truncate">{data.recipient}</p>
            </div>
          )}

          <div className="flex space-x-2 pt-2">
            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
              Configure
            </button>
            <button className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">
              Validate
            </button>
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500"
        style={{ borderRadius: '50%' }}
      />
    </div>
  );
});

XCMMessageNode.displayName = 'XCMMessageNode';

export default XCMMessageNode;