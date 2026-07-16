import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Navbar from '../components/layout/Navbar';
import DesktopSidebar from '../components/layout/DesktopSidebar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import {
  useForm,
  useFormResponses,
  useFormSummary,
  useDeleteResponse,
  useBulkDeleteResponses,
  useEditResponse,
} from '../hooks/useForms';
import { formsApi } from '../services/formsApi';
import type { FormField, FormResponseItem } from '../types/forms';
import './FormResponsesPage.css';

type Tab = 'table' | 'charts';


// Helper to check if value doesn't match current options
const isOptionMismatch = (field: FormField, val: any): boolean => {
  if (field.type !== 'multiple_choice_single' && field.type !== 'multiple_choice_multi') {
    return false;
  }
  if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) {
    return false;
  }
  const opts = new Set(field.options || []);
  if (field.type === 'multiple_choice_single') {
    if (field.allow_other) return false;
    return !opts.has(String(val));
  } else {
    const list = Array.isArray(val) ? val : [val];
    if (field.allow_other) {
      const unknown = list.filter(v => !opts.has(v));
      return unknown.length > 1;
    }
    return list.some(v => !opts.has(v));
  }
};

// ─── SingleSelect Cell Editor component ───────────────────────────────────────

interface SingleSelectEditorProps {
  field: FormField;
  value: any;
  onSave: (val: string) => void;
  onClose: () => void;
}

function SingleSelectCellEditor({ field, value, onSave, onClose }: SingleSelectEditorProps) {
  const options = field.options || [];
  const isCustomValue = value && !options.includes(value);
  const [selectedOpt, setSelectedOpt] = useState<string>(
    isCustomValue ? '__other__' : value || ''
  );
  const [customText, setCustomText] = useState<string>(isCustomValue ? value : '');

  const containerRef = useRef<HTMLDivElement>(null);

  const handleBlur = (e: React.FocusEvent<any>) => {
    // If focus moves to the custom input inside the container, don't commit yet
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    commit();
  };

  const commit = () => {
    if (selectedOpt === '__other__') {
      onSave(customText);
    } else {
      onSave(selectedOpt);
    }
  };

  return (
    <div
      ref={containerRef}
      className="cell-edit-select-container"
      onBlur={handleBlur}
    >
      <select
        value={selectedOpt}
        onChange={(e) => {
          setSelectedOpt(e.target.value);
          if (e.target.value !== '__other__') {
            onSave(e.target.value);
          }
        }}
        autoFocus
        className="cell-edit-select"
      >
        <option value="">—</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        {field.allow_other && (
          <option value="__other__">Other (custom value)...</option>
        )}
      </select>
      {selectedOpt === '__other__' && (
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Type custom value..."
          autoFocus
          className="cell-edit-input cell-edit-input--custom"
        />
      )}
    </div>
  );
}

// ─── MultiSelect Cell Editor component ────────────────────────────────────────

interface MultiSelectEditorProps {
  options: string[];
  initialValue: any;
  onSave: (val: string[]) => void;
  onClose: () => void;
}

function MultiSelectCellEditor({ options, initialValue, onSave, onClose }: MultiSelectEditorProps) {
  const [vals, setVals] = useState<string[]>(
    Array.isArray(initialValue)
      ? initialValue
      : initialValue
        ? [initialValue]
        : []
  );

  return (
    <div
      className="cell-edit-multi-popover"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          onSave(vals);
        }
      }}
      tabIndex={0}
      autoFocus
    >
      <div className="cell-edit-multi-list">
        {options.map(opt => (
          <label key={opt} className="cell-edit-checkbox-row">
            <input
              type="checkbox"
              checked={vals.includes(opt)}
              onChange={(e) => {
                if (e.target.checked) {
                  setVals([...vals, opt]);
                } else {
                  setVals(vals.filter(v => v !== opt));
                }
              }}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      <div className="cell-edit-multi-actions">
        <button className="cell-edit-multi-btn" onClick={() => onSave(vals)}>
          Done
        </button>
        <button className="cell-edit-multi-btn cell-edit-multi-btn--cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function FormResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const { data: form } = useForm(id!);
  const { data: responses, isLoading } = useFormResponses(id!, { limit, offset });
  const { data: summary } = useFormSummary(id!);

  const deleteResponse = useDeleteResponse(id!);
  const bulkDeleteResponses = useBulkDeleteResponses(id!);
  const editResponse = useEditResponse(id!);

  const [tab, setTab] = useState<Tab>('table');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  // Response select and delete states
  const [selectedResponseIds, setSelectedResponseIds] = useState<Set<string>>(new Set());
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Inline cell edit state
  const [editingCell, setEditingCell] = useState<{ responseId: string; fieldId: string } | null>(null);

  const sortedFields = form ? [...form.fields].sort((a, b) => a.order - b.order) : [];
  const allFieldIds = new Set(sortedFields.map(f => f.id));

  const handleExportOpen = () => {
    setSelectedFields(new Set(sortedFields.map(f => f.id)));
    setShowExportModal(true);
  };

  const handleDownloadCSV = () => {
    const filter = selectedFields.size === allFieldIds.size
      ? []
      : Array.from(selectedFields);
    const url = formsApi.getExportUrl(id!, filter);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-${id}-responses.csv`;
    a.click();
    setShowExportModal(false);
  };

  const handleSingleDelete = () => {
    if (!singleDeleteId) return;
    deleteResponse.mutate(singleDeleteId, {
      onSuccess: () => {
        setSelectedResponseIds(prev => {
          const next = new Set(prev);
          next.delete(singleDeleteId);
          return next;
        });
        setSingleDeleteId(null);
        toast.success('Response deleted');
      },
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedResponseIds);
    bulkDeleteResponses.mutate(ids, {
      onSuccess: () => {
        setSelectedResponseIds(new Set());
        setShowBulkDeleteConfirm(false);
        toast.success('Responses deleted');
      },
    });
  };

  const handleSaveCell = (responseId: string, fieldId: string, value: any) => {
    const field = sortedFields.find(f => f.id === fieldId);
    if (!field) return;

    // Enforce is_required properties during cell edit
    if (field.is_required && (value == null || value === '' || (Array.isArray(value) && value.length === 0))) {
      toast.error(`"${field.label || 'Question'}" is required.`);
      setEditingCell(null);
      return;
    }

    // Enforce email format properties during cell edit
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) {
        toast.error('Please enter a valid email address.');
        setEditingCell(null);
        return;
      }
    }

    // Enforce phone format properties during cell edit
    if (field.type === 'phone' && value) {
      const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
      if (!phoneRegex.test(String(value))) {
        toast.error('Please enter a valid phone number.');
        setEditingCell(null);
        return;
      }
    }

    setEditingCell(null);
    editResponse.mutate({
      responseId,
      answers: [{ field_id: fieldId, value }],
    });
  };

  const getAnswerValue = (response: FormResponseItem, fieldId: string): any => {
    const ans = response.answers.find(a => a.field_id === fieldId);
    if (!ans) return null;
    return ans.value;
  };

  const formatHumanDate = (val: string): string => {
    if (!val) return '';
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (val.startsWith('--')) {
      const m = parseInt(val.slice(2, 4), 10);
      const d = parseInt(val.slice(5, 7), 10);
      if (isNaN(m) || isNaN(d) || m < 1 || m > 12) return val;
      return `${months[m - 1]} ${d}`;
    } else {
      const parts = val.split('-');
      if (parts.length !== 3) return val;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12) return val;
      return `${months[m - 1]} ${d}, ${y}`;
    }
  };

  const renderDisplayValue = (field: FormField, value: any) => {
    if (value == null) return <span className="responses-table__empty">—</span>;
    if (field.type === 'date') {
      return formatHumanDate(String(value));
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  };

  return (
    <div className="responses-page">
      <Navbar hideOnDesktop />
      <DesktopSidebar />

      <main className="responses-main">
        {/* Header */}
        <div className="responses-header">
          <div className="responses-header__left">
            <button className="responses-back" onClick={() => navigate(`/forms/${id}/edit`)}>
              <i className="fa-solid fa-arrow-left" />
            </button>
            <div>
              <div className="responses-header__title-row">
                <h1 className="responses-title">{form?.title || 'Responses'}</h1>
                {responses && (
                  <span className="responses-badge">
                    {responses.length} response{responses.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className="responses-count">
                Response Dashboard
              </span>
            </div>
          </div>
          <Button variant="secondary" icon="fa-solid fa-download" onClick={handleExportOpen}>
            Download CSV
          </Button>
        </div>

        {/* Tab switcher */}
        <div className="responses-tabs">
          <button
            className={`responses-tab ${tab === 'table' ? 'responses-tab--active' : ''}`}
            onClick={() => setTab('table')}
          >
            <i className="fa-solid fa-table" /> Table
          </button>
          <button
            className={`responses-tab ${tab === 'charts' ? 'responses-tab--active' : ''}`}
            onClick={() => setTab('charts')}
          >
            <i className="fa-solid fa-chart-bar" /> Charts
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="responses-loading">
            <i className="fa-solid fa-spinner fa-spin" /> Loading responses…
          </div>
        )}

        {/* Empty */}
        {!isLoading && responses && responses.length === 0 && (
          <div className="responses-empty">
            <i className="fa-solid fa-inbox responses-empty__icon" />
            <h2>No responses yet</h2>
            <p>Share your form link to start collecting responses.</p>
          </div>
        )}

        {/* Table view */}
        {!isLoading && tab === 'table' && responses && responses.length > 0 && (
          <div className="responses-table-wrap">
            <table className="responses-table">
              <thead>
                <tr>
                  <th className="responses-table__checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedResponseIds.size === responses.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedResponseIds(new Set(responses.map(r => r.id)));
                        } else {
                          setSelectedResponseIds(new Set());
                        }
                      }}
                    />
                  </th>
                  <th>Submitted</th>
                  {sortedFields.map(f => (
                    <th key={f.id}>{f.label || 'Untitled'}</th>
                  ))}
                  <th className="responses-table__actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {responses.map(resp => (
                  <tr key={resp.id} className={selectedResponseIds.has(resp.id) ? 'row-selected' : ''}>
                    <td className="responses-table__checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedResponseIds.has(resp.id)}
                        onChange={(e) => {
                          const next = new Set(selectedResponseIds);
                          if (e.target.checked) {
                            next.add(resp.id);
                          } else {
                            next.delete(resp.id);
                          }
                          setSelectedResponseIds(next);
                        }}
                      />
                    </td>
                    <td className="responses-table__date">
                      {format(new Date(resp.submitted_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    {sortedFields.map(field => {
                      const value = getAnswerValue(resp, field.id);
                      const isEditing = editingCell?.responseId === resp.id && editingCell?.fieldId === field.id;
                      const hasWarning = isOptionMismatch(field, value);

                      return (
                        <td
                          key={field.id}
                          className={`responses-table__cell ${hasWarning ? 'cell-warning' : ''}`}
                          onDoubleClick={() => setEditingCell({ responseId: resp.id, fieldId: field.id })}
                          title="Double click to edit cell"
                        >
                          {isEditing ? (
                            <div onClick={e => e.stopPropagation()}>
                              {field.type === 'long_answer' ? (
                                <div className="cell-edit-textarea-popover">
                                  <textarea
                                    defaultValue={value || ''}
                                    onBlur={(e) => handleSaveCell(resp.id, field.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        handleSaveCell(resp.id, field.id, (e.target as HTMLTextAreaElement).value);
                                      } else if (e.key === 'Escape') {
                                        setEditingCell(null);
                                      }
                                    }}
                                    autoFocus
                                    rows={4}
                                    className="cell-edit-textarea"
                                  />
                                  <span className="cell-edit-popover-hint">Press Cmd+Enter or click away to save</span>
                                </div>
                              ) : field.type === 'multiple_choice_multi' ? (
                                <MultiSelectCellEditor
                                  options={field.options || []}
                                  initialValue={value}
                                  onSave={(vals) => handleSaveCell(resp.id, field.id, vals)}
                                  onClose={() => setEditingCell(null)}
                                />
                              ) : field.type === 'multiple_choice_single' ? (
                                <SingleSelectCellEditor
                                  field={field}
                                  value={value}
                                  onSave={(val) => handleSaveCell(resp.id, field.id, val)}
                                  onClose={() => setEditingCell(null)}
                                />
                              ) : (
                                <input
                                  type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                                  inputMode={field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
                                  defaultValue={value || ''}
                                  onBlur={(e) => handleSaveCell(resp.id, field.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveCell(resp.id, field.id, (e.target as HTMLInputElement).value);
                                    } else if (e.key === 'Escape') {
                                      setEditingCell(null);
                                    }
                                  }}
                                  autoFocus
                                  className="cell-edit-input"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="cell-display-wrap">
                              {hasWarning && (
                                <i className="fa-solid fa-triangle-exclamation cell-warning-icon" title="Value doesn't match current options" />
                              )}
                              {renderDisplayValue(field, value)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="responses-table__actions">
                      <button
                        className="responses-row-delete-btn"
                        onClick={() => setSingleDeleteId(resp.id)}
                        title="Delete response"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="responses-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
              <button
                className="responses-tab-btn"
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                <i className="fa-solid fa-chevron-left" /> Previous
              </button>
              <span className="responses-pagination-info" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Showing {offset + 1} – {offset + responses.length}
              </span>
              <button
                className="responses-tab-btn"
                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                disabled={responses.length < limit}
                onClick={() => setOffset(offset + limit)}
              >
                Next <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
        )}

        {/* Charts view */}
        {!isLoading && tab === 'charts' && summary && summary.length > 0 && (
          <div className="responses-charts">
            {summary.map(field => (
              <div key={field.field_id} className="responses-chart-card">
                <h3 className="responses-chart-card__label">{field.label || 'Untitled'}</h3>
                {field.tally ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={Object.entries(field.tally).map(([name, count]) => ({ name, count }))}
                      margin={{ top: 4, right: 16, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                        labelStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="responses-chart-card__text-note">
                    <i className="fa-solid fa-font" /> {field.text_count} text response{field.text_count !== 1 ? 's' : ''} — view in Table
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Selection Bar */}
      {selectedResponseIds.size > 0 && (
        <div className="responses-select-bar">
          <span className="responses-select-bar__count">
            {selectedResponseIds.size} response{selectedResponseIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="responses-select-bar__actions">
            <Button variant="ghost" size="sm" onClick={() => setSelectedResponseIds(new Set())}>
              Clear selection
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowBulkDeleteConfirm(true)}>
              Delete selected
            </Button>
          </div>
        </div>
      )}

      {/* Single delete confirmation modal */}
      <Modal
        isOpen={!!singleDeleteId}
        onClose={() => setSingleDeleteId(null)}
        title="Delete response?"
      >
        <p className="responses-delete-modal-text">
          Are you sure you want to delete this response? This cannot be undone.
        </p>
        <div className="responses-delete-modal-actions">
          <Button
            variant="ghost"
            onClick={() => setSingleDeleteId(null)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSingleDelete}
            loading={deleteResponse.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* Bulk delete confirmation modal */}
      <Modal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        title="Delete selected responses?"
      >
        <p className="responses-delete-modal-text">
          Are you sure you want to delete the {selectedResponseIds.size} selected response{selectedResponseIds.size !== 1 ? 's' : ''}? This cannot be undone.
        </p>
        <div className="responses-delete-modal-actions">
          <Button
            variant="ghost"
            onClick={() => setShowBulkDeleteConfirm(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleBulkDelete}
            loading={bulkDeleteResponses.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* Export modal */}
      {showExportModal && (
        <div className="export-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="export-modal" onClick={e => e.stopPropagation()}>
            <div className="export-modal__header">
              <h2>Select columns to export</h2>
              <button className="export-modal__close" onClick={() => setShowExportModal(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="export-modal__fields">
              {sortedFields.map(f => (
                <label key={f.id} className="export-modal__field-row">
                  <input
                    type="checkbox"
                    checked={selectedFields.has(f.id)}
                    onChange={e => {
                      const next = new Set(selectedFields);
                      e.target.checked ? next.add(f.id) : next.delete(f.id);
                      setSelectedFields(next);
                    }}
                  />
                  {f.label || 'Untitled'}
                </label>
              ))}
            </div>
            <div className="export-modal__actions">
              <Button variant="ghost" onClick={() => setShowExportModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                icon="fa-solid fa-download"
                onClick={handleDownloadCSV}
                disabled={selectedFields.size === 0}
              >
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
