import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import CnoteLoader from '../components/ui/CnoteLoader';
import Button from '../components/ui/Button';
import { useRestoreNote, useDeletedNotes } from '../hooks/useNotes';
import type { NoteListItem } from '../types';
import DesktopSidebar from '../components/layout/DesktopSidebar';
import './BinPage.css';

export default function BinPage() {
  const navigate = useNavigate();
  const { data: entries, isLoading } = useDeletedNotes();
  const restoreNote = useRestoreNote();
  
  const handleRestore = (id: string) => {
    restoreNote.mutate(id);
  };

  if (isLoading) {
    return <CnoteLoader />;
  }

  const deletedNotes = entries || [];

  return (
    <div className="bin-page">
      <Navbar hideOnDesktop />
      <DesktopSidebar />
      <main className="bin-main">
        <div className="mobile-back-container">
          <Button 
            variant="ghost" 
            size="sm" 
            icon="fa-solid fa-arrow-left" 
            onClick={() => navigate('/feed')}
          >
            Back
          </Button>
        </div>
        <header className="bin-page__header">
          <h1>Recently Deleted</h1>
          <p>Notes in the bin will be permanently deleted after 30 days.</p>
        </header>

        <div className="bin-page__list">
          {deletedNotes.length === 0 ? (
            <div className="bin-page__empty">
              <i className="fa-solid fa-trash-can-arrow-up" />
              <p>Your bin is empty.</p>
            </div>
          ) : (
            deletedNotes.map((note: NoteListItem) => (
              <div key={note.id} className="bin-page__item">
                <div className="bin-page__item-info">
                  <h3>{note.title || 'Untitled'}</h3>
                  <p>{note.content_text || 'No content'}</p>
                </div>
                <div className="bin-page__item-actions">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleRestore(note.id)}
                    loading={restoreNote.isPending && restoreNote.variables === note.id}
                    disabled={restoreNote.isPending}
                    icon="fa-solid fa-rotate-left"
                  >
                    Restore
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
