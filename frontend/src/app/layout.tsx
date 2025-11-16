import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { Navigation } from '@/components/layout/Navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { NotificationContainer } from '@/components/ui/NotificationContainer';
import { cn } from '@/utils';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | PolyFlow AI',
    default: 'PolyFlow AI - Revolutionary Cross-Chain Development',
  },
  description: 'AI-driven cross-chain development platform that makes building on multiple blockchains as simple as natural language conversation.',
  keywords: ['blockchain', 'cross-chain', 'AI', 'development', 'Polkadot', 'XCM', 'Web3'],
  authors: [{ name: 'PolyFlow AI Team' }],
  creator: 'PolyFlow AI',
  publisher: 'PolyFlow AI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'PolyFlow AI',
    title: 'PolyFlow AI - Revolutionary Cross-Chain Development',
    description: 'AI-driven cross-chain development platform that makes building on multiple blockchains as simple as natural language conversation.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PolyFlow AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PolyFlow AI - Revolutionary Cross-Chain Development',
    description: 'AI-driven cross-chain development platform that makes building on multiple blockchains as simple as natural language conversation.',
    images: ['/twitter-image.png'],
    creator: '@polyflow_ai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        <Providers>
          <div className="relative flex min-h-screen">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:ml-64">
              {/* Top Navigation */}
              <Navigation />

              {/* Page Content */}
              <main className="flex-1 overflow-auto">
                <div className="h-full">
                  {children}
                </div>
              </main>
            </div>
          </div>

          {/* Global Notifications */}
          <NotificationContainer />

          {/* Development Tools */}
          {process.env.NODE_ENV === 'development' && (
            <div className="fixed bottom-4 right-4 z-50">
              <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
                🚧 Development Mode
              </div>
            </div>
          )}
        </Providers>
      </body>
    </html>
  );
}