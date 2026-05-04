import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { entriesApi } from '../services/api';
import * as demoStore from '../demo/demoStore';
import type { Category, Entry } from '../types';

export function useEntries(category?: Category) {
  const { isDemo } = useAuth();

  return useQuery({
    queryKey: ['entries', category],
    queryFn: () => isDemo ? demoStore.getEntries(category) : entriesApi.list(category),
  });
}

export function useEntry(id: string) {
  const { isDemo } = useAuth();

  return useQuery({
    queryKey: ['entry', id],
    queryFn: () => isDemo ? demoStore.getEntry(id) : entriesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateEntry() {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (category: Category) =>
      isDemo ? demoStore.createEntry(category) : entriesApi.create(category),
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      navigate(`/editor/${entry.id}`);
    },
  });
}

export function usePatchEntry() {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Entry> }) =>
      isDemo ? demoStore.patchEntry(id, data) : entriesApi.patch(id, data),
    onSuccess: (_entry, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['entry', variables.id] });
    },
  });
}

export function useDeleteEntry() {
  const { isDemo } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemo) { await demoStore.deleteEntry(id); }
      else { await entriesApi.delete(id); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      navigate('/feed');
    },
  });
}
