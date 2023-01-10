import React from 'react';
import ReactDOM from 'react-dom/client';
/** Components */
import App from './App';
/** Utils */
import { registerIcons } from './utils/fontAwesome';
/** Styles */
import './index.scss';

registerIcons();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
