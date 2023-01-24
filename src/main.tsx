import React from 'react';
import ReactDOM from 'react-dom/client';
/** Utils */
import registerIcons from '@utils/fontAwesome';
/** Components */
import App from './App';
/** Styles */
import '@styles/main.scss';

registerIcons();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
