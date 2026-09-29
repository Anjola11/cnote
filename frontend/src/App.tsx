import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
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
import FormsListPage from './pages/FormsListPage';
import FormBuilderPage from './pages/FormBuilderPage';
import FormResponsesPage from './pages/FormResponsesPage';
import PublicFormPage from './pages/PublicFormPage';
import CnoteLoader from './components/ui/CnoteLoader';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { LoaderProvider } from './context/LoaderContext';

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

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/verify', element: <VerifyOtpPage /> },
  { path: '/feed', element: <RequireAuth><FeedPage /></RequireAuth> },
  { path: '/bin', element: <RequireAuth><BinPage /></RequireAuth> },
  { path: '/editor/:id', element: <RequireAuth><EditorPage /></RequireAuth> },
  { path: '/profile', element: <RequireAuth><ProfilePage /></RequireAuth> },
  { path: '/forms', element: <RequireAuth><FormsListPage /></RequireAuth> },
  { path: '/forms/:id/edit', element: <RequireAuth><FormBuilderPage /></RequireAuth> },
  { path: '/forms/:id/responses', element: <RequireAuth><FormResponsesPage /></RequireAuth> },
  { path: '/public/note/:shareToken', element: <PublicNotePage /> },
  { path: '/public/forms/:id', element: <PublicFormPage /> },
  { path: '*', element: <NotFoundPage /> },
]);

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LoaderProvider>
            <ThemeProvider>
              <Toaster position="top-center" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
              <RouterProvider router={router} />
            </ThemeProvider>
          </LoaderProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
