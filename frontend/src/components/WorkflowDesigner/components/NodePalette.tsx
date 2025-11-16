import React from 'react';
import {
  PaperAirplaneIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CogIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';

interface NodeType {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  category: string;
}

interface NodePaletteProps {
  selectedNodeType: string;
  onNodeTypeSelect: (nodeType: string) => void;
}

const nodeTypes: NodeType[] = [
  {
    id: 'xcmMessage',
    label: 'XCM Message',
    description: 'Cross-chain message for transfers and calls',
    icon: PaperAirplaneIcon,
    color: 'blue',
    category: 'Messages',
  },
  {
    id: 'chain',
    label: 'Blockchain',
    description: 'Connect to a blockchain network',
    icon: GlobeAltIcon,
    color: 'green',
    category: 'Networks',
  },
  {
    id: 'validation',
    label: 'Validator',
    description: 'Validate transactions and data',
    icon: ShieldCheckIcon,
    color: 'yellow',
    category: 'Security',
  },
  {
    id: 'aiAssistant',
    label: 'AI Assistant',
    description: 'Get AI-powered suggestions and help',
    icon: SparklesIcon,
    color: 'purple',
    category: 'AI Tools',
  },
  {
    id: 'contract',
    label: 'Smart Contract',
    description: 'Deploy and interact with smart contracts',
    icon: CogIcon,
    color: 'indigo',
    category: 'Contracts',
  },
  {
    id: 'test',
    label: 'Test Node',
    description: 'Test and simulate operations',
    icon: BeakerIcon,
    color: 'pink',
    category: 'Testing',
  },
];

const categories = Array.from(new Set(nodeTypes.map(node => node.category)));

export const NodePalette: React.FC<NodePaletteProps> = ({
  selectedNodeType,
  onNodeTypeSelect,
}) => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    const baseClasses = `border-2 transition-all duration-200 cursor-grab active:cursor-grabbing`;

    if (isSelected) {
      switch (color) {
        case 'blue':
          return `${baseClasses} border-blue-500 bg-blue-50 shadow-blue-200`;
        case 'green':
          return `${baseClasses} border-green-500 bg-green-50 shadow-green-200`;
        case 'yellow':
          return `${baseClasses} border-yellow-500 bg-yellow-50 shadow-yellow-200`;
        case 'purple':
          return `${baseClasses} border-purple-500 bg-purple-50 shadow-purple-200`;
        case 'indigo':
          return `${baseClasses} border-indigo-500 bg-indigo-50 shadow-indigo-200`;
        case 'pink':
          return `${baseClasses} border-pink-500 bg-pink-50 shadow-pink-200`;
        default:
          return `${baseClasses} border-gray-500 bg-gray-50 shadow-gray-200`;
      }
    }

    return `${baseClasses} border-gray-200 bg-white hover:border-gray-300 hover:shadow-md`;
  };

  const getIconColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600';
      case 'green':
        return 'text-green-600';
      case 'yellow':
        return 'text-yellow-600';
      case 'purple':
        return 'text-purple-600';
      case 'indigo':
        return 'text-indigo-600';
      case 'pink':
        return 'text-pink-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Component Palette
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Drag and drop components to build your workflow
        </p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Search components..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Categories */}
      <div className="p-4">
        {categories.map((category) => (
          <div key={category} className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              {category}
            </h3>
            <div className="space-y-2">
              {nodeTypes
                .filter((node) => node.category === category)
                .map((nodeType) => (
                  <div
                    key={nodeType.id}
                    draggable
                    onDragStart={(event) => onDragStart(event, nodeType.id)}
                    onClick={() => onNodeTypeSelect(nodeType.id)}
                    className={`
                      p-3 rounded-lg shadow-sm
                      ${getColorClasses(nodeType.color, selectedNodeType === nodeType.id)}
                    `}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 ${getIconColorClasses(nodeType.color)}`}>
                        <nodeType.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {nodeType.label}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {nodeType.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Templates Section */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Templates
          </h3>
          <div className="space-y-2">
            <div className="p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Save custom node templates
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button className="w-full p-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded">
              Create XCM Transfer
            </button>
            <button className="w-full p-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 rounded">
              Connect Polkadot
            </button>
            <button className="w-full p-2 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900 rounded">
              Ask AI Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodePalette;