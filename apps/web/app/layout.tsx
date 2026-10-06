import '@fontsource-variable/inter';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: { default: 'Lowfare — find the best flight deals', template: '%s · Lowfare' },
  description: 'Real-time flight search that ranks every fare by how good a deal it really is.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111111' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Dynamic rendering is required for per-request CSP nonces.
  await connection();
  return (
    <html lang="en">
      <body className="min-h-dvh bg-bg text-fg">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-fg focus:px-3 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-8">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Lowfare
          </Link>
          <span className="text-xs text-fg-3">Best fares, honestly ranked</span>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 pb-24 sm:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
