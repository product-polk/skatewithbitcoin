import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Skate with Bitcoin - Skateboarding Game',
  description: 'A fun skateboard desktop-game built with ❤️ for Bitcoin. Skater jumps over obstacles like FTX, Mt.Gox, SEC, Luna, and other obstacles to win sats and help Bitcoin reach ATH',
  openGraph: {
    title: 'Skate with Bitcoin - Skateboarding Game',
    description: 'A fun skateboard desktop-game built with ❤️ for Bitcoin. Skater jumps over obstacles like FTX, Mt.Gox, SEC, Luna, and other obstacles to win sats and help Bitcoin reach ATH',
    type: 'website',
  },
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