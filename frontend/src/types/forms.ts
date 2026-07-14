export type FormLayoutType = 'single_page' | 'multi_page';

export type FormFieldType =
  | 'short_answer'
  | 'long_answer'
  | 'multiple_choice_single'
  | 'multiple_choice_multi'
  | 'email'
  | 'phone';

export interface FormBackgroundConfig {
  type: 'color' | 'image' | 'gradient';
  value: string;
}

export interface FormField {
  id: string;
  form_id: string;
  order: number;
  page: number;
  type: FormFieldType;
  label: string;
  is_required: boolean;
  options: string[] | null;
  allow_other: boolean;
}

export interface FormListItem {
  id: string;
  title: string;
  description: string | null;
  layout_type: FormLayoutType;
  is_published: boolean;
  accepts_responses: boolean;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
  response_count: number;
}

export interface Form extends FormListItem {
  uid: string;
  logo_url: string | null;
  background_config: FormBackgroundConfig;
  deleted_at: string | null;
  fields: FormField[];
}

// ─── Answer types ──────────────────────────────────────────────────────────

export type AnswerValue = string | string[] | null;

export interface AnswerIn {
  field_id: string;
  value: AnswerValue;
}

export interface AnswerOut {
  id: string;
  field_id: string;
  value: AnswerValue;
}

export interface FormResponseItem {
  id: string;
  form_id: string;
  submitted_at: string;
  answers: AnswerOut[];
}

export interface ResponseSummaryField {
  field_id: string;
  label: string;
  type: string;
  tally: Record<string, number> | null;
  text_count: number | null;
}

// ─── Public form ───────────────────────────────────────────────────────────

export interface PublicForm {
  id: string;
  title: string;
  description: string | null;
  logo_url: string | null;
  background_config: FormBackgroundConfig;
  layout_type: FormLayoutType;
  fields: FormField[];
}
