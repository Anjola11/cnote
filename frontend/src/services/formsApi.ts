import axios from 'axios';
import type {
  AnswerIn,
  Form,
  FormField,
  FormListItem,
  FormResponseItem,
  PublicForm,
  ResponseSummaryField,
} from '../types/forms';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api/v1';
  const cleanUrl = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
};

// Reuse same axios instance config (withCredentials for httpOnly cookies)
const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

export const formsApi = {
  // ── CRUD ────────────────────────────────────────────────────────────────
  list: () =>
    api.get<{ data: FormListItem[] }>('/forms/').then(r => r.data.data),

  get: (id: string) =>
    api.get<{ data: Form }>(`/forms/${id}`).then(r => r.data.data),

  create: (data: { title?: string; description?: string; layout_type?: string }) =>
    api.post<{ data: Form }>('/forms/', data).then(r => r.data.data),

  update: (id: string, data: Partial<Form>) =>
    api.patch<{ data: Form }>(`/forms/${id}`, data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/forms/${id}`),

  restore: (id: string) =>
    api.post(`/forms/${id}/restore`).then(r => r.data.data),

  publish: (id: string) =>
    api.post<{ data: Form }>(`/forms/${id}/publish`).then(r => r.data.data),

  listDeleted: () =>
    api.get<{ data: FormListItem[] }>('/forms/bin').then(r => r.data.data),

  // ── Fields ───────────────────────────────────────────────────────────────
  createField: (formId: string, data: Partial<FormField>) =>
    api.post<{ data: FormField }>(`/forms/${formId}/fields`, data).then(r => r.data.data),

  updateField: (formId: string, fieldId: string, data: Partial<FormField>) =>
    api.patch<{ data: FormField }>(`/forms/${formId}/fields/${fieldId}`, data).then(r => r.data.data),

  deleteField: (formId: string, fieldId: string) =>
    api.delete(`/forms/${formId}/fields/${fieldId}`),

  reorderFields: (formId: string, field_ids: string[]) =>
    api.patch<{ data: Form }>(`/forms/${formId}/fields/reorder`, { field_ids }).then(r => r.data.data),

  // ── Responses ────────────────────────────────────────────────────────────
  listResponses: (formId: string, params?: { limit?: number; offset?: number }) =>
    api.get<{ data: FormResponseItem[] }>(`/forms/${formId}/responses`, { params }).then(r => r.data.data),

  deleteResponse: (formId: string, responseId: string) =>
    api.delete(`/forms/${formId}/responses/${responseId}`).then(r => r.data),

  bulkDeleteResponses: (formId: string, responseIds: string[]) =>
    api.delete(`/forms/${formId}/responses`, { data: { response_ids: responseIds } }).then(r => r.data),

  editResponse: (formId: string, responseId: string, answers: AnswerIn[]) =>
    api.patch<{ data: FormResponseItem }>(`/forms/${formId}/responses/${responseId}`, { answers }).then(r => r.data.data),

  getSummary: (formId: string) =>
    api.get<{ data: ResponseSummaryField[] }>(`/forms/${formId}/responses/summary`).then(r => r.data.data),

  getExportUrl: (formId: string, fields?: string[]) => {
    const base = `${getBaseURL()}/forms/${formId}/responses/export`;
    if (fields && fields.length > 0) return `${base}?fields=${fields.join(',')}`;
    return base;
  },

  // ── Logo upload ──────────────────────────────────────────────────────────
  uploadLogo: (formId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ data: { public_id: string; url: string } }>(
      `/upload/form-logo/${formId}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data.data);
  },
};

// ── Public API (no auth needed) ──────────────────────────────────────────────
export const publicFormsApi = {
  getForm: (formId: string) =>
    api.get<{ data: PublicForm }>(`/public/forms/${formId}`).then(r => r.data.data),

  submitResponse: (formId: string, answers: AnswerIn[]) =>
    api.post(`/public/forms/${formId}/responses`, { answers }).then(r => r.data),
};
