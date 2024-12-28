// src/app/layout.tsx
import "./globals.css";
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Neural Network Configuration",
  description: "Configure neural network parameters",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <main className="min-h-screen">
            {children}
            <Toaster position="top-center" />
          </main>
        </ErrorBoundary>
      </body>
    </html>
  );
}