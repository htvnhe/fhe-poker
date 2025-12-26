// Buffer polyfill for browser (required by encryption SDK)
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './config/i18n/config'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
