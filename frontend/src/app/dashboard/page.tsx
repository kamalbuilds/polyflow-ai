'use client';

import { useState } from 'react';
import {
  ChartBarIcon,
  CpuChipIcon,
  GlobeAltIcon,
  BoltIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils';

// Mock data for demonstration
const projectStats = {
  totalProjects: 12,
  activeWorkflows: 28,
  xcmMessages: 1247,
  chainsConnected: 8,
};

const recentProjects = [
  {
    id: '1',
    name: 'DeFi Cross-Chain Bridge',
    status: 'active',
    lastActivity: '2 hours ago',
    chains: ['Polkadot', 'Kusama', 'Moonbeam'],
    progress: 78,
  },
  {
    id: '2',
    name: 'NFT Marketplace Hub',
    status: 'paused',
    lastActivity: '1 day ago',
    chains: ['Polkadot', 'Astar'],
    progress: 45,
  },
  {
    id: '3',
    name: 'Governance Portal',
    status: 'completed',
    lastActivity: '3 days ago',
    chains: ['Polkadot'],
    progress: 100,
  },
];

const networkStatus = [
  { name: 'Polkadot', status: 'online', blockHeight: 18234567, validators: 297 },
  { name: 'Kusama', status: 'online', blockHeight: 22145789, validators: 1000 },
  { name: 'Westend', status: 'online', blockHeight: 18567234, validators: 150 },
  { name: 'Moonbeam', status: 'syncing', blockHeight: 4567890, validators: 64 },
];

const recentActivity = [
  {
    id: '1',
    type: 'workflow',
    message: 'Workflow "Token Bridge" completed successfully',
    timestamp: '5 minutes ago',
    status: 'success',
  },
  {
    id: '2',
    type: 'xcm',
    message: 'XCM message sent from Polkadot to Moonbeam',
    timestamp: '12 minutes ago',
    status: 'success',
  },
  {
    id: '3',
    type: 'error',
    message: 'Connection timeout to Acala network',
    timestamp: '1 hour ago',
    status: 'error',
  },
  {
    id: '4',
    type: 'deployment',
    message: 'Smart contract deployed on Astar',
    timestamp: '2 hours ago',
    status: 'success',
  },
];

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      {
        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400':
          status === 'active' || status === 'online' || status === 'success',
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400':
          status === 'paused' || status === 'syncing',
        'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400':
          status === 'completed',
        'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400':
          status === 'error',
      }
    )}
  >
    {status}
  </span>
);

export default function DashboardPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your cross-chain projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="widget-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
              <p className="text-2xl font-bold text-foreground">{projectStats.totalProjects}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                +2 this month
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="widget-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
              <p className="text-2xl font-bold text-foreground">{projectStats.activeWorkflows}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                +5 today
              </p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <BoltIcon className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>

        <div className="widget-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">XCM Messages</p>
              <p className="text-2xl font-bold text-foreground">{projectStats.xcmMessages.toLocaleString()}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                +127 today
              </p>
            </div>
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
              <CpuChipIcon className="w-6 h-6 text-secondary-foreground" />
            </div>
          </div>
        </div>

        <div className="widget-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Connected Chains</p>
              <p className="text-2xl font-bold text-foreground">{projectStats.chainsConnected}</p>
              <p className="text-sm text-green-600 flex items-center mt-1">
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                All operational
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <GlobeAltIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="widget-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Projects</h2>
            <a
              href="/projects"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View all
            </a>
          </div>
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-foreground">
                      {project.name}
                    </h3>
                    <StatusBadge status={project.status} />
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mb-2">
                    <ClockIcon className="w-3 h-3 mr-1" />
                    {project.lastActivity}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-1">
                      {project.chains.map((chain, index) => (
                        <div
                          key={chain}
                          className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground border-2 border-background"
                          title={chain}
                        >
                          {chain[0]}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {project.progress}% complete
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-muted rounded-full h-1">
                    <div
                      className="bg-primary h-1 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Network Status */}
        <div className="widget-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Network Status</h2>
            <div className="flex items-center text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Real-time
            </div>
          </div>
          <div className="space-y-3">
            {networkStatus.map((network) => (
              <div
                key={network.name}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white">
                    {network.name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {network.name}
                    </h3>
                    <div className="text-xs text-muted-foreground">
                      Block #{network.blockHeight.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={network.status} />
                  <div className="text-xs text-muted-foreground mt-1">
                    {network.validators} validators
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="widget-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          <a
            href="/activity"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            View all activity
          </a>
        </div>
        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start space-x-3 p-3 rounded-lg border border-border"
            >
              <div className="flex-shrink-0 mt-0.5">
                {activity.status === 'success' ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/workflows/new"
          className="group p-6 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <BoltIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Create Workflow
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Build cross-chain workflows with our visual designer
          </p>
        </a>

        <a
          href="/xcm/new"
          className="group p-6 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
              <CpuChipIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Send XCM Message
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Send cross-consensus messages between parachains
          </p>
        </a>

        <a
          href="/chat"
          className="group p-6 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Ask AI Assistant
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Get help with code generation and cross-chain development
          </p>
        </a>
      </div>
    </div>
  );
}