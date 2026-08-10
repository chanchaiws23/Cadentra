import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { createCadentraClient, createOfflineUserDataGateway, createSupabaseAuthGateway, createSupabaseUserDataGateway } from '@cadentra/data'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'
import { environment } from './config/environment.ts'
import { LocaleProvider } from './i18n/LocaleProvider.tsx'
import './index.css'
import App from './App.tsx'

const supabase = createCadentraClient(environment.supabaseUrl, environment.supabaseAnonKey)
const authGateway = supabase ? createSupabaseAuthGateway(supabase) : null
const remoteDataGateway = supabase ? createSupabaseUserDataGateway(supabase) : null
const dataGateway = remoteDataGateway ? createOfflineUserDataGateway(remoteDataGateway, window.localStorage) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider gateway={authGateway}>
        <LocaleProvider>
          <BrowserRouter>
            <App dataGateway={dataGateway}/>
          </BrowserRouter>
        </LocaleProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>,
)

document.documentElement.dataset.dataMode = environment.mode

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}
