import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { boot } from './app/boot';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { setBridge } from './bridge/bridge';
import './index.css';

const start = async () => {
  // `pnpm dev:web`: the renderer alone in a browser, with demo data
  if (import.meta.env.MODE === 'web') {
    const { createDemoBridge } = await import('./demo/demoBridge');
    setBridge(createDemoBridge(new URLSearchParams(window.location.search)));
  }

  await boot({ audio: new Audio(), mediaSession: navigator.mediaSession });

  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root element');
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
};

void start();
