import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Note: StrictMode removed to prevent WebSocket double-connect issue in development
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);