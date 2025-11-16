import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ValidationData {
  label: string;
  description?: string;
  validationType?: 'syntax' | 'security' | 'gas' | 'balance' | 'custom';
  status?: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  rules?: string[];
  results?: {
    rule: string;
    status: 'passed' | 'failed' | 'warning';
    message?: string;
  }[];
  lastRun?: string;
}

export const ValidationNode: React.FC<NodeProps<ValidationData>> = memo(({ data, selected }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />;
      case 'running':
        return <ClockIcon className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'passed':
        return 'border-green-300 bg-green-50';
      case 'failed':
        return 'border-red-300 bg-red-50';
      case 'warning':
        return 'border-yellow-300 bg-yellow-50';
      case 'running':
        return 'border-blue-300 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getValidationTypeColor = (type?: string) => {
    switch (type) {
      case 'security':
        return 'bg-red-100 text-red-800';
      case 'gas':
        return 'bg-orange-100 text-orange-800';
      case 'balance':
        return 'bg-green-100 text-green-800';
      case 'syntax':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      className={`
        min-w-[220px] rounded-lg border-2 bg-white shadow-lg transition-all duration-200
        ${selected ? 'border-blue-500 shadow-blue-200' : 'border-gray-200 hover:border-blue-300'}
        ${getStatusColor(data.status)}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-yellow-500"
        style={{ borderRadius: '50%' }}
      />

      {/* Header */}
      <div
        className="p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(data.status)}
            <span className="font-medium text-sm">{data.label}</span>
          </div>
          <div className="flex items-center space-x-2">
            {data.validationType && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${getValidationTypeColor(data.validationType)}`}>
                {data.validationType}
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
        <div className="border-t border-gray-200 p-3 space-y-3">
          {/* Validation Rules */}
          {data.rules && data.rules.length > 0 && (
            <div>
              <h4 className="font-medium text-xs text-gray-700 mb-2">Validation Rules:</h4>
              <ul className="text-xs space-y-1">
                {data.rules.map((rule, index) => (
                  <li key={index} className="text-gray-600 truncate">
                    • {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Validation Results */}
          {data.results && data.results.length > 0 && (
            <div>
              <h4 className="font-medium text-xs text-gray-700 mb-2">Results:</h4>
              <div className="space-y-1">
                {data.results.map((result, index) => (
                  <div key={index} className="flex items-start space-x-2 text-xs">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <span className="text-gray-700">{result.rule}</span>
                      {result.message && (
                        <p className="text-gray-500 mt-0.5">{result.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Run */}
          {data.lastRun && (
            <div className="text-xs text-gray-500">
              Last run: {new Date(data.lastRun).toLocaleString()}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
              Run
            </button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200">
              Configure
            </button>
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-yellow-500"
        style={{ borderRadius: '50%' }}
      />
    </div>
  );
});

ValidationNode.displayName = 'ValidationNode';

export default ValidationNode;