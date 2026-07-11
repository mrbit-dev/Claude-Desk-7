import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { useRealtimeInvalidation } from './hooks/useRealtime';
import { useEffect } from 'react';

/** Component that sets up real-time WebSocket invalidation */
function RealtimeBridge() {
  useRealtimeInvalidation();
  return null;
}
import Dashboard from './pages/Dashboard';
import Sessions from './pages/Sessions';
import SessionDetail from './pages/SessionDetail';
import MCPs from './pages/MCPs';
import Settings from './pages/Settings';
import Skills from './pages/Skills';
import Plugins from './pages/Plugins';
import Projects from './pages/Projects';
import Auth from './pages/Auth';
import Launch from './pages/Launch';
import Agents from './pages/Agents';
import Logs from './pages/Logs';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      gcTime: 60000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RealtimeBridge />
        <ErrorBoundary>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1d1c2e',
                color: '#e2e0e8',
                border: '1px solid #3b385a',
              },
            }}
          />
          <AppShell>
            <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/:id" element={<SessionDetail />} />
            <Route path="/mcp-servers" element={<MCPs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/plugins" element={<Plugins />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
