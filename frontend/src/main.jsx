import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Global error handler to display errors on screen
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h2>JavaScript Error</h2>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Source:</strong> ${source}</p>
        <p><strong>Line:</strong> ${lineno}:${colno}</p>
        <pre>${error ? error.stack : 'No stack trace'}</pre>
      </div>
    `;
  }
  return true;
};

// Catch unhandled promise rejections
window.onunhandledrejection = function(event) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h2>Unhandled Promise Rejection</h2>
        <p><strong>Reason:</strong> ${event.reason}</p>
        <pre>${event.reason?.stack || 'No stack trace'}</pre>
      </div>
    `;
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
