import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = { title: 'Receivables Desk', description: 'Outstanding invoices, payments and reminder mails' };
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f6f8' },
    { media: '(prefers-color-scheme: dark)', color: '#0e141b' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{children}</body>
    </html>
  );
}
