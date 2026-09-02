import * as React from 'react';
import App from './components/App';
import { createRoot } from 'react-dom/client';

const rootEl = document.getElementById('root');

if (!rootEl) {
  throw new Error('Could not find root element to mount the app');
}

createRoot(rootEl).render(<App />);
