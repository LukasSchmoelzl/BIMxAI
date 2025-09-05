'use client'

import dynamic from 'next/dynamic';

// Import the entire app as client-only
const ClientApp = dynamic(() => import('./ClientApp'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '1.2rem',
      color: '#666'
    }}>
      Loading BIM Viewer...
    </div>
  )
});

export default function Home() {
  return <ClientApp />;
}