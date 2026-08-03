import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import './index.css'
import App from './App.tsx'
import AppErrorBoundary from './components/core/AppErrorBoundary.tsx'

// AppErrorBoundary goes outermost on purpose: everything below it — the query
// client, the auth provider, the router itself — renders unprotected
// otherwise, and a throw there unmounts the whole tree into a blank page.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
