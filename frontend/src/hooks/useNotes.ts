import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notesApi } from '../services/api';
import toast from 'react-hot-toast';
import type { Category, Note, NoteListItem } from '../types';

export function useNotes(category?: Category) {
  return useQuery({
    queryKey: ['notes', category],
    queryFn: () => notesApi.list(category),
    placeholderData: keepPreviousData,
  });
}

export function useDeletedNotes() {
  return useQuery({
    queryKey: ['deleted_entries'],
    queryFn: () => notesApi.listDeleted(),
  });
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ['note', id],
    queryFn: () => notesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (category: Category) => notesApi.create(category),
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      navigate(`/editor/${note.id}`, { state: { isNew: true } });
    },
  });
}

export function usePatchNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Note> }) => notesApi.patch(id, data),
    onSuccess: (_note, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note', variables.id] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (id: string) => notesApi.delete(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notes'] });

      // Snapshot the previous value
      const previousNotes = queryClient.getQueryData(['notes']);

      // Optimistically remove the note from the list
      queryClient.setQueryData(['notes'], (old: NoteListItem[] | undefined) => 
        old?.filter(note => note.id !== id)
      );

      return { previousNotes };
    },
    onError: (_err, _id, context) => {
      // Rollback to the previous value if it fails
      if (context?.previousNotes) {
        queryClient.setQueryData(['notes'], context.previousNotes);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['deleted_entries'] });
      toast.success('Note moved to bin');
      navigate('/feed');
    },
  });
}

export function useShareNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, is_public }: { id: string; is_public: boolean }) =>
      notesApi.share(id, is_public),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['note', variables.id] });

      // Snapshot the previous value
      const previousNote = queryClient.getQueryData(['note', variables.id]);

      // Optimistically update the note
      queryClient.setQueryData(['note', variables.id], (old: Note | undefined) => {
        if (!old) return old;
        return { ...old, is_public: variables.is_public };
      });

      return { previousNote };
    },
    onError: (_err, variables, context) => {
      // Rollback to previous state
      if (context?.previousNote) {
        queryClient.setQueryData(['note', variables.id], context.previousNote);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['note', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useRestoreNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notesApi.restore(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['deleted_entries'] });

      // Snapshot previous value
      const previousDeleted = queryClient.getQueryData(['deleted_entries']);

      // Optimistically remove from deleted list
      queryClient.setQueryData(['deleted_entries'], (old: NoteListItem[] | undefined) => 
        old?.filter(note => note.id !== id)
      );

      return { previousDeleted };
    },
    onError: (_err, _id, context) => {
      if (context?.previousDeleted) {
        queryClient.setQueryData(['deleted_entries'], context.previousDeleted);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['deleted_entries'] });
      toast.success('Note restored');
    },
  });
}
