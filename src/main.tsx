import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('Mounting React application...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Root element not found!');
  } else {
    ReactDOM.createRoot(rootElement).render(<App />);
    console.log('App rendered successfully.');
  }
} catch (error) {
  console.error('Rendering error:', error);
}
