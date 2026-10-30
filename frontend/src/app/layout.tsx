import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { cn } from 'cn';

import { AppShell } from '@/components/layout/app-shell';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import { IssuesProvider } from '@/components/work/issues-provider';

import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'AXA Admin',
  description: 'Internal operations and knowledge platform for the AXA ecosystem',
};

// Picks the stored theme before the first paint so a dark user never flashes
// the light UI on load.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('axa-admin.theme');var p=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var r=(t==='light'||t==='dark')?t:p;document.documentElement.classList.add(r);document.documentElement.style.colorScheme=r;}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          <ToastProvider>
            <IssuesProvider>
              <AppShell>{children}</AppShell>
            </IssuesProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
