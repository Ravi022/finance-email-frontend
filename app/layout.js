import './globals.css';

export const metadata = { title: 'Receivables Desk', description: 'Outstanding invoices, payments and reminder mails' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
