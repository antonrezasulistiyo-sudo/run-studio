import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Run Studio',
  description: 'Poster dan animasi rute 3D dari aktivitas Strava',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  appleWebApp: { capable: true, title: 'Run Studio', statusBarStyle: 'black-translucent' }
};
export const viewport: Viewport = { themeColor: '#fc4c02', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
