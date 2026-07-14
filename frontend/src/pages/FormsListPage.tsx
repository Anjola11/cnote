import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import Navbar from '../components/layout/Navbar';
import DesktopSidebar from '../components/layout/DesktopSidebar';
import Button from '../components/ui/Button';
import { useForms, useCreateForm, useDeleteForm } from '../hooks/useForms';
import type { FormListItem } from '../types/forms';
import './FormsListPage.css';

function statusLabel(form: FormListItem): { text: string; cls: string } {
  if (!form.is_published) return { text: 'Draft', cls: 'status--draft' };
  const now = new Date();
  if (form.closes_at && new Date(form.closes_at) < now) return { text: 'Closed', cls: 'status--closed' };
  if (!form.accepts_responses) return { text: 'Closed', cls: 'status--closed' };
  return { text: 'Published', cls: 'status--published' };
}

export default function FormsListPage() {
  const navigate = useNavigate();
  const { data: forms, isLoading } = useForms();
  const createForm = useCreateForm();
  const deleteForm = useDeleteForm();

  return (
    <div className="forms-list-page">
      <Navbar hideOnDesktop />
      <DesktopSidebar />

      <main className="forms-list-main">
        <div className="forms-list-header">
          <div>
            <h1 className="forms-list-title">Forms</h1>
            <span className="forms-list-count">
              {forms ? `${forms.length} form${forms.length !== 1 ? 's' : ''}` : ''}
            </span>
          </div>
          <Button
            variant="primary"
            icon="fa-solid fa-plus"
            onClick={() => createForm.mutate()}
            loading={createForm.isPending}
          >
            New Form
          </Button>
        </div>

        {isLoading && (
          <div className="forms-grid">
            {[1, 2, 3].map(i => (
              <div key={i} className="form-card form-card--skeleton">
                <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 13, width: '80%', marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 22, width: 80 }} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && forms && forms.length === 0 && (
          <div className="forms-empty">
            <i className="fa-solid fa-clipboard-list forms-empty__icon" />
            <h2 className="forms-empty__title">No forms yet</h2>
            <p className="forms-empty__sub">Create your first form to start collecting responses.</p>
            <Button
              variant="primary"
              icon="fa-solid fa-plus"
              onClick={() => createForm.mutate()}
              loading={createForm.isPending}
            >
              New Form
            </Button>
          </div>
        )}

        {!isLoading && forms && forms.length > 0 && (
          <div className="forms-grid">
            {forms.map(form => {
              const { text, cls } = statusLabel(form);
              return (
                <div
                  key={form.id}
                  className="form-card"
                  onClick={() => navigate(`/forms/${form.id}/edit`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/forms/${form.id}/edit`)}
                >
                  <div className="form-card__header">
                    <h3 className="form-card__title">{form.title || 'Untitled Form'}</h3>
                    <span className={`form-card__status ${cls}`}>{text}</span>
                  </div>
                  {form.description && (
                    <p className="form-card__desc">{form.description}</p>
                  )}
                  <div className="form-card__meta">
                    <span className="form-card__responses">
                      <i className="fa-solid fa-inbox" />
                      {form.response_count} {form.response_count === 1 ? 'response' : 'responses'}
                    </span>
                    <span className="form-card__date">
                      {format(new Date(form.updated_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="form-card__actions" onClick={e => e.stopPropagation()}>
                    <button
                      className="form-card__action-btn"
                      title="View responses"
                      onClick={() => navigate(`/forms/${form.id}/responses`)}
                    >
                      <i className="fa-solid fa-chart-bar" />
                    </button>
                    <button
                      className="form-card__action-btn form-card__action-btn--danger"
                      title="Delete form"
                      onClick={() => deleteForm.mutate(form.id)}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
