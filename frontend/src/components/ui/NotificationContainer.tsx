'use client';

import { Fragment } from 'react';
import { Transition } from '@headlessui/react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils';
import { useNotificationStore } from '@/hooks/useStore';

const iconMap = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const colorMap = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-blue-600 dark:text-blue-400',
};

const bgMap = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
};

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 z-100 space-y-2 max-w-sm w-full pointer-events-none">
      {notifications.map((notification) => {
        const Icon = iconMap[notification.type];

        return (
          <Transition
            key={notification.id}
            show={true}
            as={Fragment}
            enter="transform ease-out duration-300 transition"
            enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
            enterTo="translate-y-0 opacity-100 sm:translate-x-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className={cn(
                'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg',
                bgMap[notification.type]
              )}
            >
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Icon
                      className={cn('h-6 w-6', colorMap[notification.type])}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex flex-shrink-0">
                    <button
                      type="button"
                      className="inline-flex rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        );
      })}
    </div>
  );
}