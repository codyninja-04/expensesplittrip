import type { MetadataRoute } from 'next';

// Installable so it opens like a native app when you're standing at a counter
// in Osaka trying to log a ramen bill before you forget.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TripSplit',
    short_name: 'TripSplit',
    description: 'Group travel expense tracker with multi-currency receipts and optimal settle up.',
    start_url: '/trips',
    display: 'standalone',
    background_color: '#FAFAFA',
    theme_color: '#FAFAFA',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
