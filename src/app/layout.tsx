import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

import '@/app/globals.css';
import { LocalizationContextProvider } from '@/components/localization-context';
import { UpdateDialogProvider } from '@/components/UpdateDialogContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VRC Worlds Manager v2',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LocalizationContextProvider>
            <UpdateDialogProvider>
              <main>{children}</main>
            </UpdateDialogProvider>
          </LocalizationContextProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
