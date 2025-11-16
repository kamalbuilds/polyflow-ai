'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  CommandLineIcon,
  CpuChipIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BoltIcon,
  BeakerIcon,
  GlobeAltIcon,
  CodeBracketIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils';
import { useAppStore } from '@/hooks/useStore';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    description: 'Project overview and analytics',
  },
  {
    name: 'AI Assistant',
    href: '/chat',
    icon: ChatBubbleLeftRightIcon,
    description: 'Natural language development',
  },
  {
    name: 'Workflow Designer',
    href: '/workflows',
    icon: BoltIcon,
    description: 'Visual cross-chain workflows',
  },
  {
    name: 'Code Generator',
    href: '/code',
    icon: CodeBracketIcon,
    description: 'AI-powered code generation',
  },
  {
    name: 'Network Explorer',
    href: '/network',
    icon: GlobeAltIcon,
    description: 'Cross-chain network topology',
  },
  {
    name: 'XCM Builder',
    href: '/xcm',
    icon: CpuChipIcon,
    description: 'Cross-consensus messaging',
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    description: 'Performance metrics and insights',
  },
  {
    name: 'Playground',
    href: '/playground',
    icon: BeakerIcon,
    description: 'Test and experiment',
  },
  {
    name: 'Terminal',
    href: '/terminal',
    icon: CommandLineIcon,
    description: 'Command line interface',
  },
];

const bottomNavigation = [
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    description: 'Application settings',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  if (!sidebarOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}
        onClick={() => setSidebarOpen(false)}
      >
        <div className="absolute inset-0 bg-black opacity-50" />
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out lg:translate-x-0',
          collapsed ? 'w-16' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-ai rounded-lg flex items-center justify-center">
                <BoltIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gradient">
                PolyFlow AI
              </span>
            </Link>
          )}

          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors"
          >
            {collapsed ? (
              <ChevronRightIcon className="w-4 h-4" />
            ) : (
              <ChevronLeftIcon className="w-4 h-4" />
            )}
          </button>

          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      'flex-shrink-0 w-5 h-5',
                      collapsed ? 'mx-auto' : 'mr-3'
                    )}
                  />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{item.name}</div>
                      <div className={cn(
                        'text-xs truncate',
                        isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}>
                        {item.description}
                      </div>
                    </div>
                  )}

                  {/* Active indicator */}
                  {isActive && !collapsed && (
                    <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-border p-2">
          <nav className="space-y-1">
            {bottomNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      'flex-shrink-0 w-5 h-5',
                      collapsed ? 'mx-auto' : 'mr-3'
                    )}
                  />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{item.name}</div>
                      <div className={cn(
                        'text-xs truncate',
                        isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}>
                        {item.description}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>v1.0.0</div>
              <div>Revolutionary AI Development</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}