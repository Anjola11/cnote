import axios from 'axios';
import type { Entry, EntryCard, Category, ScriptureVerse } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  withCredentials: true, // httpOnly cookie auth
});

// Response interceptor: redirect to login on 401
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const entriesApi = {
  list: (category?: Category) =>
    api.get<EntryCard[]>('/entries', { params: { category, limit: 20 } }).then(r => r.data),
  get: (id: string) =>
    api.get<Entry>(`/entries/${id}`).then(r => r.data),
  create: (category: Category) =>
    api.post<Entry>('/entries', {
      category,
      title: 'Untitled',
      content: { type: 'doc', content: [] },
    }).then(r => r.data),
  patch: (id: string, data: Partial<Entry>) =>
    api.patch<Entry>(`/entries/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/entries/${id}`),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  signup: (name: string, email: string, password: string) =>
    api.post('/auth/signup', { name, email, password }),
  logout: () =>
    api.post('/auth/logout'),
  me: () =>
    api.get('/auth/me').then(r => r.data),
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
