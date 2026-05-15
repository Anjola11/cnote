import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import FeedPage from './pages/FeedPage';
import EditorPage from './pages/EditorPage';
import PublicNotePage from './pages/PublicNotePage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import BinPage from './pages/BinPage';
import CnoteLoader from './components/ui/CnoteLoader';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <CnoteLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_verified) return <Navigate to="/verify" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify" element={<VerifyOtpPage />} />
      <Route path="/feed" element={<RequireAuth><FeedPage /></RequireAuth>} />
      <Route path="/bin" element={<RequireAuth><BinPage /></RequireAuth>} />
      <Route path="/editor/:id" element={<RequireAuth><EditorPage /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="/public/note/:shareToken" element={<PublicNotePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

import { LoaderProvider } from './context/LoaderContext';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LoaderProvider>
          <ThemeProvider>
            <BrowserRouter>
              <Toaster position="top-center" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
              <AppRoutes />
            </BrowserRouter>
          </ThemeProvider>
        </LoaderProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
