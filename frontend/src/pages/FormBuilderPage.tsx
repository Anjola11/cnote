import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';
import Navbar from '../components/layout/Navbar';
import DesktopSidebar from '../components/layout/DesktopSidebar';
import Button from '../components/ui/Button';
import {
  useForm,
  useUpdateForm,
  usePublishForm,
  useCreateField,
  useUpdateField,
  useDeleteField,
  useReorderFields,
  useUploadFormLogo,
  isTempId,
} from '../hooks/useForms';
import type { Form, FormField, FormFieldType } from '../types/forms';
import './FormBuilderPage.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  short_answer: 'Short Answer',
  long_answer: 'Long Answer',
  multiple_choice_single: 'Multiple Choice (Single)',
  multiple_choice_multi: 'Multiple Choice (Multi)',
  email: 'Email',
  phone: 'Phone',
  date: 'Date',
};

const FIELD_TYPE_ICONS: Record<FormFieldType, string> = {
  short_answer: 'fa-solid fa-minus',
  long_answer: 'fa-solid fa-align-left',
  multiple_choice_single: 'fa-solid fa-circle-dot',
  multiple_choice_multi: 'fa-solid fa-square-check',
  email: 'fa-solid fa-envelope',
  phone: 'fa-solid fa-phone',
  date: 'fa-solid fa-calendar',
};

const CHOICE_TYPES = new Set<FormFieldType>(['multiple_choice_single', 'multiple_choice_multi']);
const DEFAULT_OPTIONS = ['Option 1', 'Option 2'];

// ─── Sortable Field Card ──────────────────────────────────────────────────────

interface SortableFieldCardProps {
  field: FormField;
  isExpanded: boolean;
  onToggle: () => void;
  onEditField: (fieldId: string, patch: Partial<FormField>) => void;
  onDeleteField: (fieldId: string) => void;
}

function SortableFieldCard({
  field,
  isExpanded,
  onToggle,
  onEditField,
  onDeleteField,
}: SortableFieldCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  // Local label state — drives the input immediately, debounced PATCH goes to server
  const [localLabel, setLocalLabel] = useState(field.label);
  const labelTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync local label if the field changes externally (e.g. server reconciliation swaps temp→real)
  useEffect(() => {
    setLocalLabel(field.label);
  }, [field.id]); // only on ID change (temp→real swap), not every render

  const handleLabelChange = (val: string) => {
    setLocalLabel(val);
    clearTimeout(labelTimer.current);
    labelTimer.current = setTimeout(() => {
      onEditField(field.id, { label: val });
    }, 450);
  };

  const handleTypeChange = (type: FormFieldType) => {
    const isNowChoice = CHOICE_TYPES.has(type);
    const wasChoice = CHOICE_TYPES.has(field.type);
    const patch: Partial<FormField> = { type };

    // Reset/init options when the type category changes
    if (isNowChoice && !wasChoice) {
      patch.options = DEFAULT_OPTIONS.slice();
      patch.allow_other = false;
    } else if (!isNowChoice && wasChoice) {
      patch.options = null;
      patch.allow_other = false;
    }

    onEditField(field.id, patch);
  };

  const handleRequiredToggle = () => {
    onEditField(field.id, { is_required: !field.is_required });
  };

  const handleAddOption = () => {
    const updated = [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`];
    onEditField(field.id, { options: updated });
  };

  const handleOptionChange = useCallback(
    (idx: number, val: string) => {
      const updated = [...(field.options ?? [])];
      updated[idx] = val;
      onEditField(field.id, { options: updated });
    },
    [field.id, field.options, onEditField]
  );

  const handleRemoveOption = (idx: number) => {
    const updated = (field.options ?? []).filter((_, i) => i !== idx);
    onEditField(field.id, { options: updated });
  };

  const handleAllowOtherToggle = () => {
    onEditField(field.id, { allow_other: !field.allow_other });
  };

  const isChoiceType = CHOICE_TYPES.has(field.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`field-card ${isExpanded ? 'field-card--expanded' : ''}`}
    >
      <div className="field-card__header" onClick={onToggle}>
        <button
          className="field-card__drag-handle"
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          title="Drag to reorder"
        >
          <i className="fa-solid fa-grip-vertical" />
        </button>
        <i className={`field-card__type-icon ${FIELD_TYPE_ICONS[field.type]}`} />
        <span className="field-card__label-preview">{field.label || 'Untitled Question'}</span>
        {field.is_required && <span className="field-card__required-badge">Required</span>}
        <i className={`field-card__chevron fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
      </div>

      {isExpanded && (
        <div className="field-card__body">
          {/* Label */}
          <div className="field-card__row">
            <label className="field-card__label">Question Label</label>
            <input
              className="field-card__input"
              value={localLabel}
              onChange={e => handleLabelChange(e.target.value)}
              placeholder="Enter your question…"
            />
          </div>

          {/* Type selector */}
          <div className="field-card__row">
            <label className="field-card__label">Field Type</label>
            <select
              className="field-card__select"
              value={field.type}
              onChange={e => handleTypeChange(e.target.value as FormFieldType)}
            >
              {(Object.keys(FIELD_TYPE_LABELS) as FormFieldType[]).map(t => (
                <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Options for choice types */}
          {isChoiceType && (
            <div className="field-card__row">
              <label className="field-card__label">Options</label>
              <div className="field-card__options">
                {(field.options ?? []).map((opt, idx) => (
                  <OptionRow
                    key={idx}
                    value={opt}
                    index={idx}
                    onCommit={handleOptionChange}
                    onRemove={() => handleRemoveOption(idx)}
                  />
                ))}
                <button className="field-card__add-option" onClick={handleAddOption}>
                  <i className="fa-solid fa-plus" /> Add Option
                </button>
                <label className="field-card__toggle-row">
                  <input type="checkbox" checked={field.allow_other} onChange={handleAllowOtherToggle} />
                  <span>Allow "Other" (free text)</span>
                </label>
              </div>
            </div>
          )}

          {/* Options for date type */}
          {field.type === 'date' && (
            <div className="field-card__row">
              <label className="field-card__label">Date Configuration</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <label className="field-card__toggle-row">
                  <input
                    type="checkbox"
                    checked={field.date_config?.include_year !== false}
                    onChange={(e) => {
                      const include = e.target.checked;
                      onEditField(field.id, {
                        date_config: {
                          include_year: include,
                          min_date: include ? field.date_config?.min_date : undefined,
                          max_date: include ? field.date_config?.max_date : undefined,
                        }
                      });
                    }}
                  />
                  <span>Include Year</span>
                </label>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="field-card__label" style={{ fontSize: '10px', textTransform: 'none' }}>Min Date</label>
                    <input
                      type={field.date_config?.include_year !== false ? 'date' : 'text'}
                      placeholder={field.date_config?.include_year !== false ? '' : 'e.g. --01-01'}
                      className="field-card__input"
                      value={field.date_config?.min_date || ''}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val && field.date_config?.include_year === false && !val.startsWith('--')) {
                          if (val.match(/^\d{2}-\d{2}$/)) val = `--${val}`;
                        }
                        onEditField(field.id, {
                          date_config: {
                            include_year: field.date_config?.include_year !== false,
                            min_date: val || undefined,
                            max_date: field.date_config?.max_date,
                          }
                        });
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="field-card__label" style={{ fontSize: '10px', textTransform: 'none' }}>Max Date (Defaults to Today)</label>
                    <input
                      type={field.date_config?.include_year !== false ? 'date' : 'text'}
                      placeholder={field.date_config?.include_year !== false ? '' : 'e.g. --12-31'}
                      className="field-card__input"
                      value={field.date_config?.max_date || ''}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val && field.date_config?.include_year === false && !val.startsWith('--')) {
                          if (val.match(/^\d{2}-\d{2}$/)) val = `--${val}`;
                        }
                        onEditField(field.id, {
                          date_config: {
                            include_year: field.date_config?.include_year !== false,
                            min_date: field.date_config?.min_date,
                            max_date: val || undefined,
                          }
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer: required toggle + delete */}
          <div className="field-card__footer">
            <label className="field-card__toggle-row">
              <input type="checkbox" checked={field.is_required} onChange={handleRequiredToggle} />
              <span>Required</span>
            </label>
            <button
              className="field-card__delete-btn"
              onClick={() => onDeleteField(field.id)}
              title="Delete field"
            >
              <i className="fa-solid fa-trash" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Option row (local input, debounced commit) ───────────────────────────────

interface OptionRowProps {
  value: string;
  index: number;
  onCommit: (idx: number, val: string) => void;
  onRemove: () => void;
}

function OptionRow({ value, index, onCommit, onRemove }: OptionRowProps) {
  const [localVal, setLocalVal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync if parent value changes (e.g. rollback)
  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleChange = (val: string) => {
    setLocalVal(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(index, val), 450);
  };

  return (
    <div className="field-card__option-row">
      <input
        className="field-card__input"
        value={localVal}
        onChange={e => handleChange(e.target.value)}
        placeholder={`Option ${index + 1}`}
      />
      <button className="field-card__option-remove" onClick={onRemove} title="Remove option">
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}

// ─── Main Builder Page ────────────────────────────────────────────────────────

export default function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: form, isLoading } = useForm(id!);
  const updateForm = useUpdateForm(id!);
  const publishForm = usePublishForm(id!);
  const createField = useCreateField(id!);
  const updateField = useUpdateField(id!);
  const deleteField = useDeleteField(id!);
  const reorderFields = useReorderFields(id!);
  const uploadLogo = useUploadFormLogo(id!);

  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Local state for form header inputs — drives UI instantly, debounced PATCH on the wire
  const [localTitle, setLocalTitle] = useState('');
  const [localDesc, setLocalDesc] = useState('');
  const titleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const descTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Track pending creations and dirty patches for optimistic fields
  const pendingCreates = useRef<
    Map<string, { promise: Promise<string>; resolve: (id: string) => void; reject: (err: any) => void }>
  >(new Map());
  const dirtyPatches = useRef<Map<string, Partial<FormField>>>(new Map());

  // Seed local state once when form first loads (not on every re-render)
  const seeded = useRef(false);
  useEffect(() => {
    if (form && !seeded.current) {
      setLocalTitle(form.title ?? '');
      setLocalDesc(form.description ?? '');
      seeded.current = true;
    }
  }, [form]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !form) return;

      const fields = [...(form.fields ?? [])].sort((a, b) => a.order - b.order);
      const oldIdx = fields.findIndex(f => f.id === active.id);
      const newIdx = fields.findIndex(f => f.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = arrayMove(fields, oldIdx, newIdx);
      reorderFields.mutate(reordered.map(f => f.id));
    },
    [form, reorderFields]
  );

  const handleAddField = (type: FormFieldType) => {
    const isChoice = CHOICE_TYPES.has(type);
    const tempId = `temp-${crypto.randomUUID()}`;

    let resolveFn!: (id: string) => void;
    let rejectFn!: (err: any) => void;
    const promise = new Promise<string>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    pendingCreates.current.set(tempId, { promise, resolve: resolveFn, reject: rejectFn });

    createField.mutate(
      {
        id: tempId,
        type,
        label: '',
        is_required: false,
        options: isChoice ? DEFAULT_OPTIONS.slice() : undefined,
        allow_other: false,
        date_config: type === 'date' ? { include_year: true } : undefined,
      },
      {
        onSuccess: serverField => {
          resolveFn(serverField.id);
          pendingCreates.current.delete(tempId);
        },
        onError: err => {
          rejectFn(err);
          pendingCreates.current.delete(tempId);
          dirtyPatches.current.delete(tempId);
        },
      }
    );
  };

  const handleEditField = async (fieldId: string, patch: Partial<FormField>) => {
    // Step 1: Instant local state update in the query cache
    queryClient.setQueryData<Form>(['form', id!], old => {
      if (!old) return old;
      return {
        ...old,
        fields: old.fields.map(f => (f.id === fieldId ? { ...f, ...patch } : f)),
      };
    });

    // Step 2: Handle temp ID coalescing and resolution
    if (isTempId(fieldId)) {
      const existing = dirtyPatches.current.get(fieldId) ?? {};
      dirtyPatches.current.set(fieldId, { ...existing, ...patch });

      const pending = pendingCreates.current.get(fieldId);
      if (!pending) return;

      let realId;
      try {
        realId = await pending.promise;
      } catch {
        dirtyPatches.current.delete(fieldId);
        return; // the create failed and was rolled back
      }

      const merged = dirtyPatches.current.get(fieldId);
      dirtyPatches.current.delete(fieldId);
      if (merged && Object.keys(merged).length > 0) {
        updateField.mutate({ fieldId: realId, data: merged });
      }
      return;
    }

    // Step 3: Server patch for existing fields
    updateField.mutate({ fieldId, data: patch });
  };

  const handleDeleteField = (fieldId: string) => {
    // If it's a pending creation, reject the promise to cancel any waiting editField mutation
    if (isTempId(fieldId)) {
      const pending = pendingCreates.current.get(fieldId);
      if (pending) {
        pending.reject(new Error('Field deleted before creation completed'));
        pendingCreates.current.delete(fieldId);
      }
      dirtyPatches.current.delete(fieldId);
    }
    deleteField.mutate(fieldId);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Create a local object URL for the instant preview
    const objectUrl = URL.createObjectURL(file);
    uploadLogo.mutate({ file, objectUrl });
    e.target.value = '';
  };

  const handleTitleChange = (val: string) => {
    setLocalTitle(val);
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => updateForm.mutate({ title: val }), 450);
  };

  const handleDescChange = (val: string) => {
    setLocalDesc(val);
    clearTimeout(descTimer.current);
    descTimer.current = setTimeout(() => updateForm.mutate({ description: val }), 450);
  };

  const shareUrl = form ? `${window.location.origin}/public/forms/${form.id}` : '';
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => toast.success('Link copied!'));
  };

  if (isLoading || !form) {
    return (
      <div className="form-builder-page">
        <Navbar hideOnDesktop />
        <DesktopSidebar />
        <main className="form-builder-main">
          <div className="form-builder-loading">
            <i className="fa-solid fa-spinner fa-spin" /> Loading form…
          </div>
        </main>
      </div>
    );
  }

  const sortedFields = [...(form.fields ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="form-builder-page">
      <Navbar hideOnDesktop />
      <DesktopSidebar />

      <main className="form-builder-main">
        {/* Top bar */}
        <div className="form-builder-topbar">
          <button className="form-builder-back" onClick={() => navigate('/forms')} title="Back to forms">
            <i className="fa-solid fa-arrow-left" />
          </button>
          <span className="form-builder-topbar__title">{localTitle || 'Untitled Form'}</span>
          <div className="form-builder-topbar__actions">
            <Link to={`/public/forms/${form.id}`} target="_blank" className="form-builder-btn form-builder-btn--ghost">
              <i className="fa-solid fa-eye" /> Preview
            </Link>
            <button
              className="form-builder-btn form-builder-btn--ghost form-builder-settings-toggle"
              onClick={() => setShowSettings(true)}
            >
              <i className="fa-solid fa-gear" />
            </button>
            <button
              className={`form-builder-btn ${form.is_published ? 'form-builder-btn--ghost' : 'form-builder-btn--primary'}`}
              onClick={() => publishForm.mutate()}
              disabled={publishForm.isPending}
            >
              {form.is_published
                ? <><i className="fa-solid fa-check" /> Published</>
                : <><i className="fa-solid fa-paper-plane" /> Publish</>}
            </button>
          </div>
        </div>

        <div className="form-builder-layout">
          {/* Editor column */}
          <div className="form-builder-editor">
            {/* Form header card */}
            <div className="form-header-card">
              {form.logo_url && (
                <img src={form.logo_url} alt="Form logo" className="form-header-card__logo" />
              )}
              <input
                className="form-header-card__title"
                value={localTitle}
                placeholder="Form Title"
                onChange={e => handleTitleChange(e.target.value)}
              />
              <textarea
                className="form-header-card__desc"
                value={localDesc}
                placeholder="Form description (optional)"
                rows={2}
                onChange={e => handleDescChange(e.target.value)}
              />
            </div>

            {/* Field list with drag-and-drop */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className="form-fields-list">
                  {sortedFields.map(field => (
                    <SortableFieldCard
                      key={field.id}
                      field={field}
                      isExpanded={expandedFieldId === field.id}
                      onToggle={() => setExpandedFieldId(expandedFieldId === field.id ? null : field.id)}
                      onEditField={handleEditField}
                      onDeleteField={handleDeleteField}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {sortedFields.length === 0 && (
              <div className="form-builder-empty">
                <i className="fa-solid fa-circle-plus" />
                <p>Add your first question below</p>
              </div>
            )}

            {/* Add field buttons */}
            <div className="form-add-field">
              <span className="form-add-field__label">Add question</span>
              <div className="form-add-field__btns">
                {(Object.keys(FIELD_TYPE_LABELS) as FormFieldType[]).map(type => (
                  <button
                    key={type}
                    className="form-add-field__btn"
                    onClick={() => handleAddField(type)}
                    title={FIELD_TYPE_LABELS[type]}
                  >
                    <i className={FIELD_TYPE_ICONS[type]} />
                    <span>{FIELD_TYPE_LABELS[type]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Settings sidebar */}
          <aside className={`form-builder-settings ${showSettings ? 'form-builder-settings--open' : ''}`}>
            <div className="form-builder-settings__header">
              <span>Form Settings</span>
              <button className="form-builder-settings__close" onClick={() => setShowSettings(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Logo */}
            <div className="form-builder-settings__section">
              <label className="form-builder-settings__label">Logo</label>
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo" className="form-builder-settings__logo-preview" />
              )}
              <label className="form-builder-settings__upload-btn">
                <i className="fa-solid fa-upload" />
                {uploadLogo.isPending ? ' Uploading…' : form.logo_url ? ' Change logo' : ' Upload logo'}
                <input type="file" accept="image/*" hidden onChange={handleLogoUpload} />
              </label>
              {form.logo_url && (
                <button
                  className="form-builder-settings__remove-logo"
                  onClick={() => updateForm.mutate({ logo_url: '' })}
                >
                  Remove logo
                </button>
              )}
            </div>

            {/* Background color */}
            <div className="form-builder-settings__section">
              <label className="form-builder-settings__label">Background Color</label>
              <input
                type="color"
                className="form-builder-settings__color"
                value={form.background_config?.value || '#fafaf8'}
                onChange={e => updateForm.mutate({ background_config: { type: 'color', value: e.target.value } })}
              />
            </div>

            {/* Layout */}
            <div className="form-builder-settings__section">
              <label className="form-builder-settings__label">Layout</label>
              <select
                className="form-builder-settings__select"
                value={form.layout_type}
                onChange={e => updateForm.mutate({ layout_type: e.target.value as any })}
              >
                <option value="single_page">Single Page</option>
                <option value="multi_page">Multi Page</option>
              </select>
            </div>

            {/* Accepting responses */}
            <div className="form-builder-settings__section">
              <label className="form-builder-settings__label">Accepting Responses</label>
              <label className="form-builder-settings__toggle">
                <input
                  type="checkbox"
                  checked={form.accepts_responses}
                  onChange={e => updateForm.mutate({ accepts_responses: e.target.checked })}
                />
                <span>{form.accepts_responses ? 'Yes' : 'No'}</span>
              </label>
            </div>

            {/* Close at */}
            <div className="form-builder-settings__section">
              <label className="form-builder-settings__label">Close At (optional)</label>
              <input
                type="datetime-local"
                className="form-builder-settings__date"
                defaultValue={form.closes_at ? form.closes_at.slice(0, 16) : ''}
                onChange={e =>
                  updateForm.mutate({ closes_at: e.target.value ? new Date(e.target.value).toISOString() : null })
                }
              />
            </div>

            {/* Share link (published only) */}
            {form.is_published && (
              <div className="form-builder-settings__section">
                <label className="form-builder-settings__label">Share Link</label>
                <div className="form-builder-settings__share">
                  <input className="form-builder-settings__share-input" readOnly value={shareUrl} />
                  <button className="form-builder-settings__copy-btn" onClick={handleCopyLink} title="Copy link">
                    <i className="fa-solid fa-copy" />
                  </button>
                </div>
              </div>
            )}

            <div className="form-builder-settings__section">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/forms/${form.id}/responses`)}>
                <i className="fa-solid fa-chart-bar" /> View Responses
              </Button>
            </div>

            {!form.is_published && (
              <div className="form-builder-settings__section">
                <Button variant="primary" onClick={() => publishForm.mutate()} loading={publishForm.isPending}>
                  <i className="fa-solid fa-paper-plane" /> Publish Form
                </Button>
              </div>
            )}
          </aside>
        </div>

        {/* Mobile settings overlay */}
        {showSettings && (
          <div className="form-builder-overlay" onClick={() => setShowSettings(false)} />
        )}
      </main>
    </div>
  );
}
