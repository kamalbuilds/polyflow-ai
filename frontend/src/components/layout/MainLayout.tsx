import React, { useState } from 'react';
import { useAuth } from '../Auth/AuthProvider';
import WorkflowDesignerWithProvider from '../WorkflowDesigner';
import AIChatInterface from '../AI/AIChatInterface';
import TransactionMonitor from '../Dashboard/TransactionMonitor';
import CodeEditor from '../CodeEditor';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  ChartBarIcon,
  CogIcon,
  UserCircleIcon,
  BellIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type ActiveView = 'workflow' | 'chat' | 'monitor' | 'editor' | 'dashboard';

const MainLayout: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>('workflow');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications] = useState(3);

  const navigationItems = [
    {
      id: 'workflow',
      name: 'Workflow Designer',
      icon: HomeIcon,
      permission: 'workflow.create',
      description: 'Visual drag-and-drop workflow builder',
    },
    {
      id: 'chat',
      name: 'AI Assistant',
      icon: ChatBubbleLeftRightIcon,
      permission: 'ai.chat',
      description: 'Natural language development assistant',
    },
    {
      id: 'editor',
      name: 'Code Editor',
      icon: CodeBracketIcon,
      permission: 'code.generate',
      description: 'Advanced code editor with AI suggestions',
    },
    {
      id: 'monitor',
      name: 'Transaction Monitor',
      icon: ChartBarIcon,
      permission: 'workflow.view',
      description: 'Real-time cross-chain transaction tracking',
    },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'workflow':
        return (
          <WorkflowDesignerWithProvider
            onWorkflowSave={(workflow) => console.log('Workflow saved:', workflow)}
            onWorkflowLoad={() => console.log('Load workflow')}
            className="h-full"
          />
        );
      case 'chat':
        return (
          <AIChatInterface
            onCodeGenerate={(code, language) => {
              console.log('Code generated:', { code, language });
              setActiveView('editor');
            }}
            onWorkflowCreate={(workflow) => {
              console.log('Workflow created:', workflow);
              setActiveView('workflow');
            }}
            onXCMMessageCreate={(message) => {
              console.log('XCM message created:', message);
              setActiveView('workflow');
            }}
            className="h-full"
          />
        );
      case 'editor':
        return (
          <CodeEditor
            onCodeExecute={async (code, language) => {
              // Simulate code execution
              await new Promise(resolve => setTimeout(resolve, 2000));
              return `Code executed successfully!\n\nLanguage: ${language}\nLines: ${code.split('\n').length}\nOutput: Mock execution result`;
            }}
            className="h-full"
          />
        );
      case 'monitor':
        return <TransactionMonitor className="h-full" />;
      default:
        return <div>Select a view from the sidebar</div>;
    }
  };

  const getSubscriptionBadge = () => {
    const plan = user?.subscription?.plan || 'free';
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800',
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[plan]}`}>
        {plan.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-3 ${!sidebarOpen && 'justify-center'}`}>
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">PolyFlow AI</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cross-chain Development</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {sidebarOpen ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <Bars3Icon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            if (!hasPermission(item.permission)) return null;

            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ActiveView)}
                className={`
                  w-full flex items-center p-3 rounded-lg text-left transition-colors duration-200
                  ${isActive
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                title={!sidebarOpen ? item.name : undefined}
              >
                <item.icon className={`w-5 h-5 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                {sidebarOpen && (
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.description}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className={`flex items-center ${!sidebarOpen && 'justify-center'}`}>
            <img
              className="w-8 h-8 rounded-full"
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=6366f1&color=ffffff`}
              alt={user?.name}
            />
            {sidebarOpen && (
              <div className="ml-3 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </div>
                  {getSubscriptionBadge()}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <button className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    Profile
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Connection Status */}
          {sidebarOpen && user?.walletConnected && (
            <div className="mt-3 p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-800 dark:text-green-200">
                  {user.walletConnected.type === 'polkadot' ? '🟣' : '🦊'} Wallet Connected
                </span>
              </div>
              <div className="text-xs text-green-600 dark:text-green-300 mt-1 font-mono">
                {user.walletConnected.address.slice(0, 8)}...{user.walletConnected.address.slice(-8)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {navigationItems.find(item => item.id === activeView)?.name || 'Dashboard'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {navigationItems.find(item => item.id === activeView)?.description || ''}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search workflows, code, or docs..."
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <BellIcon className="w-5 h-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>

              {/* Settings */}
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <CogIcon className="w-5 h-5" />
              </button>

              {/* User Menu */}
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <UserCircleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;