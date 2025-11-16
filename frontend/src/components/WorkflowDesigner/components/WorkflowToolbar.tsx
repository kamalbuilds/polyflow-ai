import React from 'react';
import {
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  PlayIcon,
  StopIcon,
  PlusIcon,
  TrashIcon,
  CogIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';

interface WorkflowToolbarProps {
  onSave: () => void;
  onLoad: () => void;
  onRun?: () => void;
  onStop?: () => void;
  onClear?: () => void;
  onSettings?: () => void;
  onShare?: () => void;
  nodeCount: number;
  edgeCount: number;
  isRunning?: boolean;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  onSave,
  onLoad,
  onRun,
  onStop,
  onClear,
  onSettings,
  onShare,
  nodeCount,
  edgeCount,
  isRunning = false,
}) => {
  const toolbarItems = [
    {
      group: 'File',
      items: [
        {
          icon: DocumentArrowUpIcon,
          label: 'Save Workflow',
          onClick: onSave,
          shortcut: 'Cmd+S',
        },
        {
          icon: DocumentArrowDownIcon,
          label: 'Load Workflow',
          onClick: onLoad,
          shortcut: 'Cmd+O',
        },
      ],
    },
    {
      group: 'Execution',
      items: [
        {
          icon: isRunning ? StopIcon : PlayIcon,
          label: isRunning ? 'Stop Execution' : 'Run Workflow',
          onClick: isRunning ? onStop : onRun,
          className: isRunning ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50',
          shortcut: 'Cmd+R',
        },
      ],
    },
    {
      group: 'Tools',
      items: [
        {
          icon: TrashIcon,
          label: 'Clear Workflow',
          onClick: onClear,
          className: 'text-red-600 hover:bg-red-50',
        },
        {
          icon: CogIcon,
          label: 'Settings',
          onClick: onSettings,
        },
        {
          icon: ShareIcon,
          label: 'Share',
          onClick: onShare,
        },
      ],
    },
  ];

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left side - Action buttons */}
        <div className="flex items-center space-x-4">
          {toolbarItems.map((group, groupIndex) => (
            <div key={group.group} className="flex items-center space-x-1">
              {groupIndex > 0 && (
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
              )}
              {group.items.map((item, itemIndex) => (
                <button
                  key={itemIndex}
                  onClick={item.onClick}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${item.className || 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                  `}
                  title={`${item.label} ${item.shortcut ? `(${item.shortcut})` : ''}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:block">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Center - Workflow Info */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>{nodeCount} nodes</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>{edgeCount} connections</span>
          </div>
          {isRunning && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Running</span>
            </div>
          )}
        </div>

        {/* Right side - Additional info */}
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <span>PolyFlow AI</span>
          <span>v1.0.0</span>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
            <span>Quick Actions:</span>
            <button className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800">
              Add XCM Message
            </button>
            <button className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800">
              Add Chain
            </button>
            <button className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800">
              Add AI Assistant
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">Auto-save:</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-600 dark:text-green-400">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowToolbar;