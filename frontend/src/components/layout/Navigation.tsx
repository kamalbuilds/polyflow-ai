'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { cn } from '@/utils';
import { useAppStore } from '@/hooks/useStore';
import { useTheme } from '@/components/ThemeProvider';

const userNavigation = [
  { name: 'Profile', href: '/profile', icon: UserCircleIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Sign out', href: '/logout', icon: ArrowRightOnRectangleIcon },
];

const themeOptions = [
  { name: 'Light', value: 'light', icon: SunIcon },
  { name: 'Dark', value: 'dark', icon: MoonIcon },
  { name: 'System', value: 'system', icon: ComputerDesktopIcon },
];

export function Navigation() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Get page title based on current route
  const getPageTitle = () => {
    const routes: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/chat': 'AI Assistant',
      '/workflows': 'Workflow Designer',
      '/code': 'Code Generator',
      '/network': 'Network Explorer',
      '/xcm': 'XCM Builder',
      '/analytics': 'Analytics',
      '/playground': 'Playground',
      '/terminal': 'Terminal',
      '/settings': 'Settings',
    };

    return routes[pathname] || 'PolyFlow AI';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      {/* Page title */}
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-foreground">
          {getPageTitle()}
        </h1>
      </div>

      {/* Search bar */}
      <div className="relative flex-1 max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search workflows, code, docs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm bg-muted border-0 rounded-lg focus:ring-2 focus:ring-ring focus:bg-background transition-colors"
        />
        {searchQuery && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50">
            <div className="p-2 text-sm text-muted-foreground">
              Search results for "{searchQuery}"
            </div>
            {/* Search results would go here */}
          </div>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Theme switcher */}
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors">
            {theme === 'light' && <SunIcon className="w-4 h-4" />}
            {theme === 'dark' && <MoonIcon className="w-4 h-4" />}
            {theme === 'system' && <ComputerDesktopIcon className="w-4 h-4" />}
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
              {themeOptions.map((option) => (
                <Menu.Item key={option.value}>
                  {({ active }) => (
                    <button
                      onClick={() => setTheme(option.value as any)}
                      className={cn(
                        'w-full flex items-center px-4 py-2 text-sm transition-colors',
                        active ? 'bg-accent text-accent-foreground' : 'text-foreground',
                        theme === option.value && 'bg-primary text-primary-foreground'
                      )}
                    >
                      <option.icon className="w-4 h-4 mr-3" />
                      {option.name}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Transition>
        </Menu>

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors">
          <BellIcon className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-destructive-foreground rounded-full" />
          </span>
        </button>

        {/* User menu */}
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent transition-colors">
            <UserCircleIcon className="w-5 h-5" />
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
              <div className="px-4 py-2 border-b border-border">
                <div className="text-sm font-medium text-foreground">John Doe</div>
                <div className="text-xs text-muted-foreground">john@example.com</div>
              </div>
              {userNavigation.map((item) => (
                <Menu.Item key={item.name}>
                  {({ active }) => (
                    <a
                      href={item.href}
                      className={cn(
                        'flex items-center px-4 py-2 text-sm transition-colors',
                        active ? 'bg-accent text-accent-foreground' : 'text-foreground'
                      )}
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {item.name}
                    </a>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Transition>
        </Menu>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="hidden sm:inline">Online</span>
        </div>
      </div>
    </header>
  );
}