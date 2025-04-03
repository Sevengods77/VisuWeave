import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Create a root using createRoot for React 18+
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App using root.render()
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

