import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import './index.css'
import App from './App.tsx'
import AppErrorBoundary from './components/core/AppErrorBoundary.tsx'
import { initI18n } from './lib/i18n.ts'
import { useUiStore } from './stores/ui.ts'

// AppErrorBoundary goes outermost on purpose: everything below it — the query
// client, the auth provider, the router itself — renders unprotected
// otherwise, and a throw there unmounts the whole tree into a blank page.
function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </AppErrorBoundary>
    </StrictMode>,
  )
}

// The catalogue is awaited BEFORE the first render. Rendering first and
// loading after would show one frame of raw keys ("nav.refunds") or of the
// previous language — the flash this item exists to avoid.
//
// The locale is read straight from the store rather than through a hook,
// because there is no React tree yet. Zustand's persist middleware rehydrates
// from localStorage synchronously, so the value is already the user's choice.
//
// A failed catalogue load must not leave a blank page: rendering without
// translations shows raw keys, which is bad but diagnosable, whereas never
// calling render() shows nothing at all.
initI18n(useUiStore.getState().locale)
  .catch((error) => {
    console.error('Failed to load the translation catalogue:', error)
  })
  .finally(render)
