import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicFormsApi } from '../services/formsApi';
import type { AnswerIn, AnswerValue, FormField, PublicForm } from '../types/forms';
import './PublicFormPage.css';

// ─── Field Renderers ──────────────────────────────────────────────────────────

interface FieldProps {
  field: FormField;
  value: AnswerValue;
  onChange: (val: AnswerValue) => void;
  error?: string;
}

function PhoneFieldRenderer({ field, value, onChange, error }: FieldProps) {
  const strVal = (value as string) || '';

  const countries = [
    { code: '+234', label: '🇳🇬 +234' },
    { code: '+1', label: '🇺🇸 +1' },
    { code: '+44', label: '🇬🇧 +44' },
    { code: '+91', label: '🇮🇳 +91' },
    { code: '+233', label: '🇬🇭 +233' },
    { code: '+254', label: '🇰🇪 +254' },
    { code: '+27', label: '🇿🇦 +27' },
  ];

  // Default to Nigeria (+234)
  let activeCode = '+234';
  let localNum = strVal;

  for (const c of countries) {
    if (strVal.startsWith(c.code)) {
      activeCode = c.code;
      localNum = strVal.slice(c.code.length);
      break;
    }
  }

  const handleCodeChange = (newCode: string) => {
    onChange(newCode + localNum);
  };

  const handleLocalChange = (newLocal: string) => {
    onChange(activeCode + newLocal);
  };

  return (
    <div className="pf-phone-container">
      <select
        className="pf-phone-code"
        value={activeCode}
        onChange={e => handleCodeChange(e.target.value)}
      >
        {countries.map(c => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        id={`field-${field.id}`}
        className={`pf-input pf-phone-input ${error ? 'pf-input--error' : ''}`}
        type="tel"
        inputMode="tel"
        placeholder="e.g. 08012345678"
        value={localNum}
        onChange={e => handleLocalChange(e.target.value)}
      />
    </div>
  );
}

function FieldRenderer({ field, value, onChange, error }: FieldProps) {
  const [otherText, setOtherText] = useState('');
  const [otherChecked, setOtherChecked] = useState(false);

  const baseInputCls = `pf-input ${error ? 'pf-input--error' : ''}`;

  switch (field.type) {
    case 'short_answer':
    case 'email':
      return (
        <input
          id={`field-${field.id}`}
          className={baseInputCls}
          type={field.type === 'email' ? 'email' : 'text'}
          inputMode={field.type === 'email' ? 'email' : 'text'}
          placeholder={field.type === 'email' ? 'your@email.com' : 'Your answer'}
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
        />
      );

    case 'phone':
      return (
        <PhoneFieldRenderer
          field={field}
          value={value}
          onChange={onChange}
          error={error}
        />
      );

    case 'long_answer':
      return (
        <textarea
          id={`field-${field.id}`}
          className={`${baseInputCls} pf-textarea`}
          placeholder="Your answer"
          rows={4}
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
        />
      );

    case 'multiple_choice_single': {
      const currentVal = (value as string) || '';
      const isOtherSelected = field.allow_other && currentVal !== '' && !(field.options || []).includes(currentVal);

      return (
        <div className="pf-options">
          {(field.options || []).map(opt => (
            <label key={opt} className={`pf-option-row ${currentVal === opt ? 'pf-option-row--selected' : ''}`}>
              <input
                type="radio"
                name={`field-${field.id}`}
                checked={currentVal === opt}
                onChange={() => {
                  setOtherChecked(false);
                  onChange(opt);
                }}
              />
              <span>{opt}</span>
            </label>
          ))}
          {field.allow_other && (
            <label className={`pf-option-row ${isOtherSelected || otherChecked ? 'pf-option-row--selected' : ''}`}>
              <input
                type="radio"
                name={`field-${field.id}`}
                checked={isOtherSelected || otherChecked}
                onChange={() => {
                  setOtherChecked(true);
                  onChange(otherText || '');
                }}
              />
              <span>Other</span>
              {(isOtherSelected || otherChecked) && (
                <input
                  className="pf-input pf-input--other"
                  placeholder="Please specify…"
                  value={isOtherSelected ? currentVal : otherText}
                  onChange={e => {
                    setOtherText(e.target.value);
                    onChange(e.target.value);
                  }}
                  onClick={e => e.stopPropagation()}
                />
              )}
            </label>
          )}
        </div>
      );
    }

    case 'multiple_choice_multi': {
      const currentVals = (value as string[]) || [];

      const toggleOption = (opt: string) => {
        if (currentVals.includes(opt)) {
          onChange(currentVals.filter(v => v !== opt));
        } else {
          onChange([...currentVals, opt]);
        }
      };

      const otherInValues = currentVals.find(v => !(field.options || []).includes(v));

      return (
        <div className="pf-options">
          {(field.options || []).map(opt => (
            <label key={opt} className={`pf-option-row ${currentVals.includes(opt) ? 'pf-option-row--selected' : ''}`}>
              <input
                type="checkbox"
                checked={currentVals.includes(opt)}
                onChange={() => toggleOption(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
          {field.allow_other && (
            <label className={`pf-option-row ${otherInValues !== undefined || otherChecked ? 'pf-option-row--selected' : ''}`}>
              <input
                type="checkbox"
                checked={otherInValues !== undefined || otherChecked}
                onChange={e => {
                  setOtherChecked(e.target.checked);
                  if (!e.target.checked) {
                    // Remove other value
                    onChange(currentVals.filter(v => (field.options || []).includes(v)));
                  }
                }}
              />
              <span>Other</span>
              {(otherInValues !== undefined || otherChecked) && (
                <input
                  className="pf-input pf-input--other"
                  placeholder="Please specify…"
                  value={otherInValues || otherText}
                  onChange={e => {
                    const newOther = e.target.value;
                    setOtherText(newOther);
                    const known = currentVals.filter(v => (field.options || []).includes(v));
                    onChange(newOther ? [...known, newOther] : known);
                  }}
                  onClick={e => e.stopPropagation()}
                />
              )}
            </label>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function getPageStyle(form: PublicForm): React.CSSProperties {
  const bg = form.background_config;
  if (!bg) return {};
  if (bg.type === 'color') return { backgroundColor: bg.value };
  if (bg.type === 'gradient') return { background: bg.value };
  if (bg.type === 'image') return { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  return {};
}

export default function PublicFormPage() {
  const { id } = useParams<{ id: string }>();

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['publicForm', id],
    queryFn: () => publicFormsApi.getForm(id!),
    enabled: !!id,
    retry: false,
  });

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submissionIdempotencyKey] = useState(() => crypto.randomUUID());

  if (isLoading) {
    return (
      <div className="pf-shell pf-shell--loading">
        <div className="pf-loader">
          <i className="fa-solid fa-spinner fa-spin" />
          <span>Loading form…</span>
        </div>
      </div>
    );
  }

  if (error || !form) {
    const isNotFound = !form;
    return (
      <div className="pf-shell">
        <div className="pf-state-card">
          <i className="fa-solid fa-circle-exclamation pf-state-card__icon" />
          <h1 className="pf-state-card__title">
            {isNotFound ? 'Form not found' : 'Form unavailable'}
          </h1>
          <p className="pf-state-card__sub">
            {isNotFound
              ? 'This form may have been deleted or the link is incorrect.'
              : 'This form is not currently available.'}
          </p>
        </div>
      </div>
    );
  }

  // Multi-page support
  const isMultiPage = form.layout_type === 'multi_page';
  const fieldsByPage: Record<number, FormField[]> = {};
  form.fields.forEach(f => {
    const pg = isMultiPage ? f.page : 0;
    if (!fieldsByPage[pg]) fieldsByPage[pg] = [];
    fieldsByPage[pg].push(f);
  });
  const pages = Object.keys(fieldsByPage).map(Number).sort();
  const totalPages = isMultiPage ? pages.length : 1;
  const currentPageFields = isMultiPage
    ? (fieldsByPage[pages[currentPage]] || [])
    : form.fields;

  const updateAnswer = (fieldId: string, val: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [fieldId]: val }));
    if (errors[fieldId]) setErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
  };

  const validatePage = (fields: FormField[]): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (!field.is_required) continue;
      const val = answers[field.id];
      if (val == null || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
        newErrors[field.id] = 'This field is required.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validatePage(currentPageFields)) return;
    setCurrentPage(p => p + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentPage(p => p - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validatePage(currentPageFields)) return;
    setSubmitting(true);
    setSubmitError('');

    const answersList: AnswerIn[] = Object.entries(answers)
      .filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0))
      .map(([field_id, value]) => ({ field_id, value }));

    try {
      await publicFormsApi.submitResponse(id!, answersList, submissionIdempotencyKey);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        setSubmitError(detail);
      } else if (detail?.errors) {
        const apiErrors: Record<string, string> = {};
        for (const e of detail.errors) {
          apiErrors[e.field_id] = e.error;
        }
        setErrors(apiErrors);
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pageStyle = getPageStyle(form);

  if (submitted) {
    return (
      <div className="pf-shell" style={pageStyle}>
        <div className="pf-state-card pf-state-card--success">
          <i className="fa-solid fa-circle-check pf-state-card__icon pf-state-card__icon--success" />
          <h1 className="pf-state-card__title">Thanks, your response has been recorded.</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-shell" style={pageStyle}>
      <div className="pf-container">
        {/* Logo */}
        {form.logo_url && (
          <div className="pf-logo-wrap">
            <img src={form.logo_url} alt="Form logo" className="pf-logo" />
          </div>
        )}

        {/* Form header */}
        <div className="pf-header-card pf-card">
          <h1 className="pf-form-title">{form.title}</h1>
          {form.description && (
            <p className="pf-form-desc">{form.description}</p>
          )}
        </div>

        {/* Progress bar (multi-page) */}
        {isMultiPage && totalPages > 1 && (
          <div className="pf-progress">
            <div className="pf-progress__bar">
              <div
                className="pf-progress__fill"
                style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
              />
            </div>
            <span className="pf-progress__label">Step {currentPage + 1} of {totalPages}</span>
          </div>
        )}

        {/* Fields */}
        {currentPageFields.map(field => (
          <div key={field.id} className="pf-card pf-question-card">
            <label className="pf-question-label" htmlFor={`field-${field.id}`}>
              {field.label || 'Untitled Question'}
              {field.is_required && <span className="pf-required" aria-label="required"> *</span>}
            </label>
            <FieldRenderer
              field={field}
              value={answers[field.id] ?? null}
              onChange={val => updateAnswer(field.id, val)}
              error={errors[field.id]}
            />
            {errors[field.id] && (
              <p className="pf-field-error">
                <i className="fa-solid fa-circle-exclamation" /> {errors[field.id]}
              </p>
            )}
          </div>
        ))}

        {/* Submit error */}
        {submitError && (
          <p className="pf-submit-error">
            <i className="fa-solid fa-circle-exclamation" /> {submitError}
          </p>
        )}

        {/* Navigation */}
        <div className={`pf-nav ${isMultiPage && currentPage > 0 ? 'pf-nav--has-back' : ''}`}>
          {isMultiPage && currentPage > 0 && (
            <button className="pf-nav__back" onClick={handleBack}>
              <i className="fa-solid fa-arrow-left" /> Back
            </button>
          )}
          {isMultiPage && currentPage < totalPages - 1 ? (
            <button className="pf-nav__next" onClick={handleNext}>
              Next <i className="fa-solid fa-arrow-right" />
            </button>
          ) : (
            <button
              className="pf-nav__submit"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <><i className="fa-solid fa-spinner fa-spin" /> Submitting…</> : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
