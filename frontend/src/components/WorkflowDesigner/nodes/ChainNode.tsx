import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GlobeAltIcon, LinkIcon } from '@heroicons/react/24/outline';

interface ChainData {
  label: string;
  description?: string;
  chainType?: 'polkadot' | 'kusama' | 'ethereum' | 'moonbeam' | 'acala' | 'custom';
  rpcEndpoint?: string;
  chainId?: string;
  nativeToken?: string;
  status?: 'connected' | 'connecting' | 'disconnected' | 'error';
  blockHeight?: number;
  latency?: number;
}

export const ChainNode: React.FC<NodeProps<ChainData>> = memo(({ data, selected }) => {
  const getChainColor = (chainType?: string) => {
    switch (chainType) {
      case 'polkadot':
        return 'bg-gradient-to-br from-pink-500 to-purple-600 text-white';
      case 'kusama':
        return 'bg-gradient-to-br from-yellow-500 to-orange-600 text-white';
      case 'ethereum':
        return 'bg-gradient-to-br from-blue-400 to-purple-600 text-white';
      case 'moonbeam':
        return 'bg-gradient-to-br from-green-400 to-blue-500 text-white';
      case 'acala':
        return 'bg-gradient-to-br from-red-500 to-pink-600 text-white';
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-700 text-white';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'connecting':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getChainIcon = (chainType?: string) => {
    // In a real app, you'd have specific chain icons
    return <GlobeAltIcon className="w-5 h-5" />;
  };

  return (
    <div
      className={`
        min-w-[180px] rounded-xl border-2 shadow-lg transition-all duration-200
        ${selected ? 'border-blue-500 shadow-blue-200 scale-105' : 'border-gray-200 hover:border-blue-300'}
        ${getChainColor(data.chainType)}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-400"
        style={{ borderRadius: '50%', left: '-6px' }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getChainIcon(data.chainType)}
            <span className="font-semibold text-sm">{data.label}</span>
          </div>
          <LinkIcon className="w-4 h-4 opacity-75" />
        </div>

        {/* Status */}
        {data.status && (
          <div className="mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(data.status)}`}>
              {data.status}
            </span>
          </div>
        )}

        {/* Chain Info */}
        <div className="space-y-1 text-xs opacity-90">
          {data.chainId && (
            <div>Chain ID: {data.chainId}</div>
          )}
          {data.nativeToken && (
            <div>Token: {data.nativeToken}</div>
          )}
          {data.blockHeight && (
            <div>Block: #{data.blockHeight.toLocaleString()}</div>
          )}
          {data.latency && (
            <div>Latency: {data.latency}ms</div>
          )}
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-xs opacity-75 mt-2">{data.description}</p>
        )}

        {/* Quick Actions */}
        <div className="flex space-x-1 mt-3">
          <button className="px-2 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30 transition-colors">
            Details
          </button>
          <button className="px-2 py-1 bg-white bg-opacity-20 rounded text-xs hover:bg-opacity-30 transition-colors">
            Explorer
          </button>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-gray-400"
        style={{ borderRadius: '50%', right: '-6px' }}
      />
    </div>
  );
});

ChainNode.displayName = 'ChainNode';

export default ChainNode;