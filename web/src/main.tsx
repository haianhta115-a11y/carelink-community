import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import './styles/fonts.css';
import { App } from './routes/App';
import { ErrorBoundary } from './components/ui';
import { AuthProvider } from './features/auth/AuthProvider';
import { RealtimeProvider } from './features/chat/RealtimeProvider';
import './styles/index.css';
import './styles/requests.css';
import './styles/chat.css';
import './styles/reviews.css';
import './styles/admin.css';
import './styles/catalog.css';
import { PreviewNotice } from './components/PreviewNotice';
import './styles/polish.css';
import './styles/accessibility.css';
const Router = import.meta.env.VITE_ROUTER_MODE === 'hash' ? HashRouter : BrowserRouter;
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20000, retry: 1, refetchOnWindowFocus: true } },
});
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <RealtimeProvider>
              <PreviewNotice />
              <App />
              <Toaster richColors closeButton position="top-right" />
            </RealtimeProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
