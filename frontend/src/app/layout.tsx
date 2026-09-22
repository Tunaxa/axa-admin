import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { cn } from 'cn';

import { AppShell } from '@/components/layout/app-shell';

import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'AXA Admin',
  description: 'Internal operations and knowledge platform for the AXA ecosystem',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
