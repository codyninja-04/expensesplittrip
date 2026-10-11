import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'TripSplit', template: '%s · TripSplit' },
  description:
    'Group travel expenses without the spreadsheet. Snap receipts in any currency, see who owes what live, and settle up in the fewest transfers.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'TripSplit', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#FAFAFA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
