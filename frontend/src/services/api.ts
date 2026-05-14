import axios from 'axios';
import type { Note, NoteListItem, Category, ScriptureVerse } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true, // httpOnly cookie auth
});

import toast from 'react-hot-toast';

/**
 * Strips internal details (UUIDs, stack traces, field names) from backend messages
 * and returns a clean, user-friendly string.
 */
function sanitizeErrorMessage(raw: string): string {
  if (!raw) return '';
  // Strip UUIDs like [UID:xxxx-xxxx...]
  let cleaned = raw.replace(/\[?UID:\s*[a-f0-9-]+\]?/gi, '').trim();
  // Strip raw UUIDs
  cleaned = cleaned.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '').trim();
  // Strip field-level validation prefixes like "body -> email"
  cleaned = cleaned.replace(/body\s*->\s*\w+\s*/gi, '').trim();
  // Remove double spaces and trailing punctuation artifacts
  cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/^[:\s]+/, '').trim();
  return cleaned || 'Something went wrong. Please try again.';
}

/**
 * Maps common backend error messages to user-friendly ones.
 * Returns null if no mapping found (caller should use sanitized original).
 */
function mapToUserMessage(_status: number, raw: string): { message: string; action?: 'redirect-verify' | 'redirect-login' } | null {
  const lower = (raw || '').toLowerCase();

  // Verification-related
  if (lower.includes('not verified') || lower.includes('verify your') || lower.includes('account not verified')) {
    return { message: 'Please verify your email to continue.', action: 'redirect-verify' };
  }
  // Auth / session
  if (lower.includes('session expired') || lower.includes('token has been revoked')) {
    return { message: 'Your session has expired. Please log in again.', action: 'redirect-login' };
  }
  if (lower.includes('not authenticated') || lower.includes('could not validate')) {
    return { message: 'Please log in to continue.', action: 'redirect-login' };
  }
  // Common user errors
  if (lower.includes('already exists') || lower.includes('already registered')) {
    return { message: 'An account with this email already exists.' };
  }
  if (lower.includes('invalid credentials') || lower.includes('incorrect password') || lower.includes('wrong password')) {
    return { message: 'Invalid email or password.' };
  }
  if (lower.includes('user not found') || lower.includes('no user found')) {
    return { message: 'No account found with that email.' };
  }
  if (lower.includes('passwords do not match')) {
    return { message: 'Passwords do not match.' };
  }
  if (lower.includes('otp') && (lower.includes('invalid') || lower.includes('expired') || lower.includes('incorrect'))) {
    return { message: 'Invalid or expired verification code. Please try again.' };
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return { message: 'Too many attempts. Please wait a moment and try again.' };
  }

  return null;
}

/** Extract the most useful message string from an error response */
function extractBackendMessage(data: any): string {
  if (!data) return '';
  if (typeof data.message === 'string') return data.message;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors.map((e: any) => e.message || e.msg || '').join('. ');
  }
  return '';
}

// Prevent redirect storms
const SAFE_PAGES = ['/login', '/signup', '/', '/verify'];
function isSafePage(path: string) {
  return SAFE_PAGES.includes(path) || path.startsWith('/public/');
}

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const { status, data } = error.response;
      const rawMsg = extractBackendMessage(data);
      const mapped = mapToUserMessage(status, rawMsg);
      const currentPath = window.location.pathname;

      if (status === 401) {
        if (!isSafePage(currentPath) && !error.config?.url?.includes('/auth/me')) {
          toast.error(mapped?.message || 'Your session has expired. Please log in again.');
          window.location.href = '/login';
        }
      } else if (status === 403) {
        if (mapped?.action === 'redirect-verify') {
          if (!isSafePage(currentPath) && currentPath !== '/verify') {
            window.location.href = '/verify';
          }
        } else {
          toast.error(mapped?.message || 'You do not have permission to perform this action.');
        }
      } else if (status === 429) {
        toast.error("You're doing that too fast. Please wait a moment.");
      } else if (status >= 500) {
        toast.error('Something went wrong on our end. Please try again later.');
      }
      // For 400/422 etc., we don't show a global toast — let the calling page handle it.
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

/** Helper to get a clean user-facing error from a caught axios error */
export function getUserErrorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  const raw = extractBackendMessage(err?.response?.data);
  const mapped = mapToUserMessage(err?.response?.status, raw);
  if (mapped) return mapped.message;
  if (raw) return sanitizeErrorMessage(raw);
  return fallback;
}


export const notesApi = {
  list: (category?: Category) =>
    api.get<{ data: NoteListItem[] }>('/notes/', { params: { category, limit: 20 } }).then(r => r.data.data),
  listDeleted: () =>
    api.get<{ data: NoteListItem[] }>('/notes/bin', { params: { limit: 50 } }).then(r => r.data.data),
  get: (id: string) =>
    api.get<{ data: Note }>(`/notes/${id}`).then(r => r.data.data),
  create: (category: Category) =>
    api.post<{ data: Note }>('/notes/', { category }).then(r => r.data.data),
  patch: (id: string, data: Partial<Note>) => {
    if (data.title !== undefined) {
      return api.patch<{ data: Note }>(`/notes/${id}/title`, { title: data.title }).then(r => r.data.data);
    }
    if (data.content !== undefined) {
      return api.patch<{ data: Note }>(`/notes/${id}/content`, { content: data.content }).then(r => r.data.data);
    }
    // Fallback if needed, though backend splits these routes
    return api.patch<{ data: Note }>(`/notes/${id}`, data).then(r => r.data.data);
  },
  delete: (id: string) =>
    api.delete(`/notes/${id}`),
  share: (id: string, is_public: boolean) =>
    api.patch(`/notes/${id}/share`, { is_public }).then(r => r.data.data),
  restore: (id: string) =>
    api.post(`/notes/${id}/restore`).then(r => r.data.data),
};

export const publicApi = {
  getNote: (shareToken: string) =>
    api.get<{ data: Note }>(`/public/notes/${shareToken}`).then(r => r.data.data),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  signup: (email: string, password: string, confirm_password: string) =>
    api.post('/auth/signup', { email, password, confirm_password }),
  verifyOtp: (uid: string, otp: string, otp_type: string) =>
    api.post('/auth/verify-otp', { uid, otp, otp_type }),
  resendOtp: (email: string, otp_type: string) =>
    api.post('/auth/resend-otp', { email, otp_type }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (reset_token: string, new_password: string) =>
    api.post('/auth/reset-password', { reset_token, new_password }),
  logout: () =>
    api.post('/auth/logout'),
  me: () =>
    api.get('/auth/me').then(r => r.data),
  updateProfile: (data: { display_name?: string; bio?: string }) =>
    api.patch('/auth/me', data).then(r => r.data),
};

export const mediaApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export const scriptureApi = {
  search: (q: string) =>
    api.get<ScriptureVerse[]>('/scripture/search', { params: { q } }).then(r => r.data),
};

export default api;
