import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formsApi } from '../services/formsApi';
import type { Form, FormField, FormResponseItem, AnswerIn } from '../types/forms';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if a field ID is a client-generated temp ID (not yet persisted). */
export const isTempId = (id: string) => id.startsWith('temp-');

/** Patch a field in the cache by id. */
function patchField(old: Form | undefined, fieldId: string, patch: Partial<FormField>): Form | undefined {
  if (!old) return old;
  return {
    ...old,
    fields: old.fields.map(f => (f.id === fieldId ? { ...f, ...patch } : f)),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useForms() {
  return useQuery({
    queryKey: ['forms'],
    queryFn: () => formsApi.list(),
  });
}

export function useDeletedForms() {
  return useQuery({
    queryKey: ['deleted_forms'],
    queryFn: () => formsApi.listDeleted(),
  });
}

export function useForm(id: string) {
  return useQuery({
    queryKey: ['form', id],
    queryFn: () => formsApi.get(id),
    enabled: !!id,
  });
}

export function useFormResponses(formId: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['form_responses', formId, params],
    queryFn: () => formsApi.listResponses(formId, params),
    enabled: !!formId,
  });
}

export function useFormSummary(formId: string) {
  return useQuery({
    queryKey: ['form_summary', formId],
    queryFn: () => formsApi.getSummary(formId),
    enabled: !!formId,
  });
}

// ─── Create form ──────────────────────────────────────────────────────────────

export function useCreateForm() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => formsApi.create({ title: 'Untitled Form' }),
    onSuccess: (form) => {
      // Prepend to list cache without waiting for a full refetch
      queryClient.setQueryData<any[]>(['forms'], (old) => [
        {
          id: form.id,
          title: form.title,
          description: form.description,
          layout_type: form.layout_type,
          is_published: form.is_published,
          accepts_responses: form.accepts_responses,
          closes_at: form.closes_at,
          created_at: form.created_at,
          updated_at: form.updated_at,
          response_count: 0,
        },
        ...(old ?? []),
      ]);
      navigate(`/forms/${form.id}/edit`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create form');
    },
  });
}

// ─── Update form (settings) ────────────────────────────────────────────────────

export function useUpdateForm(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Form>) => formsApi.update(formId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['form', formId] });
      const previous = queryClient.getQueryData<Form>(['form', formId]);
      queryClient.setQueryData<Form>(['form', formId], (old) => {
        if (!old) return old;
        return { ...old, ...data };
      });
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['form', formId], context.previous);
      toast.error('Could not save — reverted.');
    },
    onSuccess: () => {
      // Invalidate list so the title/status are fresh there too
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
  });
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export function usePublishForm(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (_?: void) => formsApi.publish(formId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['form', formId] });
      const previous = queryClient.getQueryData<Form>(['form', formId]);
      queryClient.setQueryData<Form>(['form', formId], (old) => {
        if (!old) return old;
        return { ...old, is_published: true };
      });
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['form', formId], context.previous);
      toast.error('Failed to publish — reverted.');
    },
    onSuccess: (form) => {
      queryClient.setQueryData(['form', formId], form);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Form published!');
    },
  });
}

// ─── Delete / restore form ────────────────────────────────────────────────────

export function useDeleteForm() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (id: string) => formsApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['forms'] });
      const previous = queryClient.getQueryData<any[]>(['forms']);
      queryClient.setQueryData<any[]>(['forms'], (old) => old?.filter(f => f.id !== id) ?? []);
      return { previous };
    },
    onError: (_err, _id, context: any) => {
      if (context?.previous) queryClient.setQueryData(['forms'], context.previous);
      toast.error('Failed to delete form — reverted.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted_forms'] });
      toast.success('Form moved to bin');
      navigate('/forms');
    },
  });
}

export function useRestoreForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => formsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['deleted_forms'] });
      toast.success('Form restored');
    },
    onError: () => {
      toast.error('Failed to restore form');
    },
  });
}

// ─── Add field (temp-ID optimistic) ───────────────────────────────────────────

export function useCreateField(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<FormField>) => {
      // Exclude temp id from payload sent to backend
      const { id: _, ...payload } = data;
      return formsApi.createField(formId, payload);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['form', formId] });
      const previous = queryClient.getQueryData<Form>(['form', formId]);

      const tempId = data.id || `temp-${crypto.randomUUID()}`;
      const currentFields = previous?.fields ?? [];
      const optimisticField: FormField = {
        id: tempId,
        form_id: formId,
        order: currentFields.length,
        page: data.page ?? 0,
        type: data.type!,
        label: data.label ?? '',
        is_required: data.is_required ?? false,
        options: data.options ?? null,
        allow_other: data.allow_other ?? false,
      };

      queryClient.setQueryData<Form>(['form', formId], (old) => {
        if (!old) return old;
        return { ...old, fields: [...old.fields, optimisticField] };
      });

      return { previous, tempId };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['form', formId], context.previous);
      toast.error('Could not add field — reverted.');
    },
    onSuccess: (serverField, _vars, context: any) => {
      // Swap the temp-ID card with the real one from the server
      queryClient.setQueryData<Form>(['form', formId], (old) => {
        if (!old) return old;
        return {
          ...old,
          fields: old.fields.map(f => (f.id === context?.tempId ? serverField : f)),
        };
      });
    },
  });
}

// ─── Update field ─────────────────────────────────────────────────────────────

export function useUpdateField(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: Partial<FormField> }) =>
      formsApi.updateField(formId, fieldId, data),
    onMutate: async ({ fieldId, data }) => {
      // Never send a PATCH for a temp ID — the field doesn't exist on the server yet
      if (isTempId(fieldId)) return;

      await queryClient.cancelQueries({ queryKey: ['form', formId] });
      const previous = queryClient.getQueryData<Form>(['form', formId]);
      queryClient.setQueryData<Form>(['form', formId], old => patchField(old, fieldId, data));
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['form', formId], context.previous);
      toast.error('Could not save — reverted.');
    },
    // No onSuccess needed: optimistic state already matches server confirmation
  });
}

// ─── Delete field ─────────────────────────────────────────────────────────────

export function useDeleteField(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fieldId: string) => {
      if (isTempId(fieldId)) {
        return Promise.resolve({ data: { detail: 'Field deleted' } } as any);
      }
      return formsApi.deleteField(formId, fieldId);
    },
    onMutate: async (fieldId) => {
      await queryClient.cancelQueries({ queryKey: ['form', formId] });
      const previous = queryClient.getQueryData<Form>(['form', formId]);
      queryClient.setQueryData<Form>(['form', formId], (old) => {
        if (!old) return old;
        return { ...old, fields: old.fields.filter(f => f.id !== fieldId) };
      });
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['form', formId], context.previous);
      toast.error('Could not delete field — reverted.');
    },
  });
}

// ─── Reorder fields (already optimistic, verified) ───────────────────────────

export function useReorderFields(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fieldIds: string[]) => formsApi.reorderFields(formId, fieldIds),
    onMutate: async (fieldIds) => {
      await queryClient.cancelQueries({ queryKey: ['form', formId] });
      const previous = queryClient.getQueryData<Form>(['form', formId]);

      if (previous) {
        const fieldMap = Object.fromEntries(previous.fields.map(f => [f.id, f]));
        const reordered = fieldIds
          .map((id, idx) => fieldMap[id] ? { ...fieldMap[id], order: idx } : null)
          .filter(Boolean) as FormField[];
        queryClient.setQueryData<Form>(['form', formId], { ...previous, fields: reordered });
      }

      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['form', formId], context.previous);
      toast.error('Could not reorder fields — reverted.');
    },
    onSuccess: (form) => {
      // Reconcile with server's authoritative order
      queryClient.setQueryData(['form', formId], form);
    },
  });
}

// ─── Logo upload ──────────────────────────────────────────────────────────────

export function useUploadFormLogo(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file }: { file: File; objectUrl: string }) =>
      formsApi.uploadLogo(formId, file),
    onMutate: async ({ objectUrl }) => {
      await queryClient.cancelQueries({ queryKey: ['form', formId] });
      const previous = queryClient.getQueryData<Form>(['form', formId]);
      // Show object URL preview immediately while Cloudinary upload runs
      queryClient.setQueryData<Form>(['form', formId], (old) => {
        if (!old) return old;
        return { ...old, logo_url: objectUrl };
      });
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['form', formId], context.previous);
      toast.error('Logo upload failed — reverted.');
    },
    onSuccess: (result) => {
      // Swap preview object URL for the real Cloudinary URL
      queryClient.setQueryData<Form>(['form', formId], (old) => {
        if (!old) return old;
        return { ...old, logo_url: result.url ?? old.logo_url };
      });
      // Persist to DB (fire-and-forget; builder already shows the right URL)
      formsApi.update(formId, { logo_url: result.url });
    },
  });
}

// ─── Response mutations ───────────────────────────────────────────────────────

export function useDeleteResponse(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (responseId: string) => formsApi.deleteResponse(formId, responseId),
    onMutate: async (responseId) => {
      await queryClient.cancelQueries({ queryKey: ['form_responses', formId] });
      
      const queryCache = queryClient.getQueryCache();
      const matchingQueries = queryCache.findAll({ queryKey: ['form_responses', formId] });
      
      const previousQueries = matchingQueries.map(query => ({
        queryKey: query.queryKey,
        data: query.state.data,
      }));

      // Optimistically remove from all matching caches
      matchingQueries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: FormResponseItem[] | undefined) => {
          return old?.filter(r => r.id !== responseId) ?? [];
        });
      });

      queryClient.invalidateQueries({ queryKey: ['form_summary', formId] });

      return { previousQueries };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(({ queryKey, data }: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Could not delete response — reverted.');
    },
  });
}

export function useBulkDeleteResponses(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (responseIds: string[]) => formsApi.bulkDeleteResponses(formId, responseIds),
    onMutate: async (responseIds) => {
      const responseIdsSet = new Set(responseIds);
      await queryClient.cancelQueries({ queryKey: ['form_responses', formId] });
      
      const queryCache = queryClient.getQueryCache();
      const matchingQueries = queryCache.findAll({ queryKey: ['form_responses', formId] });
      
      const previousQueries = matchingQueries.map(query => ({
        queryKey: query.queryKey,
        data: query.state.data,
      }));

      // Optimistically remove from all matching caches
      matchingQueries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: FormResponseItem[] | undefined) => {
          return old?.filter(r => !responseIdsSet.has(r.id)) ?? [];
        });
      });

      queryClient.invalidateQueries({ queryKey: ['form_summary', formId] });

      return { previousQueries };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(({ queryKey, data }: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Could not delete responses — reverted.');
    },
  });
}

export function useEditResponse(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ responseId, answers }: { responseId: string; answers: AnswerIn[] }) =>
      formsApi.editResponse(formId, responseId, answers),
    onMutate: async ({ responseId, answers }) => {
      await queryClient.cancelQueries({ queryKey: ['form_responses', formId] });
      
      const queryCache = queryClient.getQueryCache();
      const matchingQueries = queryCache.findAll({ queryKey: ['form_responses', formId] });
      
      const previousQueries = matchingQueries.map(query => ({
        queryKey: query.queryKey,
        data: query.state.data,
      }));

      // Optimistically edit all matching caches
      matchingQueries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: FormResponseItem[] | undefined) => {
          if (!old) return old;
          return old.map(resp => {
            if (resp.id !== responseId) return resp;

            const updatedAnswers = [...resp.answers];
            for (const ansIn of answers) {
              const idx = updatedAnswers.findIndex(a => a.field_id === ansIn.field_id);
              if (idx !== -1) {
                updatedAnswers[idx] = { ...updatedAnswers[idx], value: ansIn.value };
              } else {
                updatedAnswers.push({ id: `temp-${crypto.randomUUID()}`, field_id: ansIn.field_id, value: ansIn.value });
              }
            }
            return { ...resp, answers: updatedAnswers };
          });
        });
      });

      return { previousQueries };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(({ queryKey, data }: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to save changes — reverted.');
    },
    onSuccess: (updatedResponse) => {
      const queryCache = queryClient.getQueryCache();
      const matchingQueries = queryCache.findAll({ queryKey: ['form_responses', formId] });

      // Update all matching caches with authoritative server response
      matchingQueries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: FormResponseItem[] | undefined) => {
          if (!old) return old;
          return old.map(r => (r.id === updatedResponse.id ? updatedResponse : r));
        });
      });

      queryClient.invalidateQueries({ queryKey: ['form_summary', formId] });
    },
  });
}


