import { useState } from 'react';
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
import Navbar from '../components/layout/Navbar';
import DesktopSidebar from '../components/layout/DesktopSidebar';
import Button from '../components/ui/Button';
import { useForm, useFormResponses, useFormSummary } from '../hooks/useForms';
import { formsApi } from '../services/formsApi';
import type { FormResponseItem } from '../types/forms';
import './FormResponsesPage.css';

type Tab = 'table' | 'charts';

export default function FormResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: form } = useForm(id!);
  const { data: responses, isLoading } = useFormResponses(id!);
  const { data: summary } = useFormSummary(id!);

  const [tab, setTab] = useState<Tab>('table');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  const sortedFields = form ? [...form.fields].sort((a, b) => a.order - b.order) : [];

  // Initialise field selection when form loads
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
    // Trigger download via anchor
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-${id}-responses.csv`;
    a.click();
    setShowExportModal(false);
  };

  const getAnswerValue = (response: FormResponseItem, fieldId: string): string => {
    const ans = response.answers.find(a => a.field_id === fieldId);
    if (!ans || ans.value == null) return '—';
    if (Array.isArray(ans.value)) return ans.value.join(', ');
    return String(ans.value);
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
              <h1 className="responses-title">{form?.title || 'Responses'}</h1>
              <span className="responses-count">
                {responses ? `${responses.length} response${responses.length !== 1 ? 's' : ''}` : ''}
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
                  <th>Submitted</th>
                  {sortedFields.map(f => (
                    <th key={f.id}>{f.label || 'Untitled'}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.map(resp => (
                  <tr key={resp.id}>
                    <td className="responses-table__date">
                      {format(new Date(resp.submitted_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    {sortedFields.map(f => (
                      <td key={f.id}>{getAnswerValue(resp, f.id)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
