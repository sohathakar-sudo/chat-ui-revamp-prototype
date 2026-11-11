import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './lib/music'; // Variant B background ambience (subscribes to the store)
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
