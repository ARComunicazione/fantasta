import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FantAsta 26/27',
  description: 'Asta del fantacalcio in tempo reale',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: [{ media: '(prefers-color-scheme: light)', color: '#F0F1F3' }, { media: '(prefers-color-scheme: dark)', color: '#0A0C10' }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>
        <Icons />
        {children}
      </body>
    </html>
  );
}

function Icons() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></symbol>
        <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>
        <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
        <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14" /></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></symbol>
        <symbol id="i-undo" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 010 10h-3" /></symbol>
        <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></symbol>
        <symbol id="i-play" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" /></symbol>
        <symbol id="i-monitor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></symbol>
      </defs>
    </svg>
  );
}
