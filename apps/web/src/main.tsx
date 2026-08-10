import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { environment } from './config/environment.ts'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

document.documentElement.dataset.dataMode = environment.mode

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}
