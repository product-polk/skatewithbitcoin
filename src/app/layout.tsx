import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Skate with Bitcoin - Skateboarding Game',
  description: 'A sidescrolling skateboarding game built with Next.js and Canvas',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
} 