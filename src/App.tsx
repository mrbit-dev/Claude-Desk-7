import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { useRealtimeInvalidation } from './hooks/useRealtime';
import { useEffect } from 'react';
import { useUIStore } from './store/uiStore';

/** Component that sets up real-time WebSocket invalidation */
function RealtimeBridge() {
  useRealtimeInvalidation();
  return null;
}

/** Page wrapper for animated transitions */
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/** Animated routes with exit animations */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/sessions" element={<PageTransition><Sessions /></PageTransition>} />
        <Route path="/sessions/:id" element={<PageTransition><SessionDetail /></PageTransition>} />
        <Route path="/mcp-servers" element={<PageTransition><MCPs /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/skills" element={<PageTransition><Skills /></PageTransition>} />
        <Route path="/plugins" element={<PageTransition><Plugins /></PageTransition>} />
        <Route path="/projects" element={<PageTransition><Projects /></PageTransition>} />
        <Route path="/launch" element={<PageTransition><Launch /></PageTransition>} />
        <Route path="/terminal" element={<PageTransition><TerminalPage /></PageTransition>} />
        <Route path="/agents" element={<PageTransition><Agents /></PageTransition>} />
        <Route path="/search" element={<PageTransition><SearchPage /></PageTransition>} />
        <Route path="/logs" element={<PageTransition><Logs /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
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
import TerminalPage from './pages/Terminal';
import Agents from './pages/Agents';
import Logs from './pages/Logs';
import SearchPage from './pages/Search';
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
  const theme = useUIStore((s) => s.theme);
  const isLight = theme === 'light';

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RealtimeBridge />
        <ErrorBoundary>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: isLight ? '#ffffff' : '#1d1c2e',
                color: isLight ? '#141223' : '#e2e0e8',
                border: isLight ? '1px solid #dcdae6' : '1px solid #3b385a',
              },
            }}
          />
          <AppShell>
            <AnimatedRoutes />
          </AppShell>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
