import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ErrorBoundary from './ErrorBoundary.jsx';
import App from './App.jsx';
import './App.css';

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
