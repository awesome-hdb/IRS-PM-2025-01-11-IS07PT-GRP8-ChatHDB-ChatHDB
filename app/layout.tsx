import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ChatWindow from './components/ChatWindow';
import { ThemeProvider } from '@/app/providers/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { PdfProvider } from '@/app/providers/PdfContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ChatHDB',
  description: 'CHATHDB is a platform that helps you find the best HDB for your needs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <PdfProvider>
            <div className="fixed top-4 right-4 z-50">
              <ThemeToggle />
            </div>
            {children}
            <ChatWindow />
          </PdfProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
