import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '../components/layout/Navbar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import CnoteLoader from '../components/ui/CnoteLoader';
import Toolbar from '../components/editor/Toolbar';
import RichEditor from '../components/editor/RichEditor';
import SaveStatusIndicator from '../components/editor/SaveStatus';
import ScriptureBlock from '../components/editor/ScriptureBlock';
import { useNote, usePatchNote, useDeleteNote, useShareNote } from '../hooks/useNotes';
import { useAutoSave } from '../hooks/useAutoSave';
import toast from 'react-hot-toast';
import type { SaveStatus, ScriptureVerse, Category } from '../types';
import type { Editor } from '@tiptap/react';
import './EditorPage.css';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: note, isLoading } = useNote(id!);
  const { mutate: mutatePatchNote } = usePatchNote();
  const deleteNote = useDeleteNote();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<object | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showScriptureModal, setShowScriptureModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(() => {
    return location.state?.isNew === true;
  });
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInitialized = useRef(false);

  useEffect(() => {
    if (note && !titleInitialized.current) {
      setTitle(note.title || '');
      titleInitialized.current = true;
    }
  }, [note]);

  useAutoSave(id!, content, setSaveStatus, isEditing);

  const handleTitleChange = useCallback((newTitle: string) => {
    if (!isEditing) return;
    setTitle(newTitle);
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(() => {
      mutatePatchNote({ id: id!, data: { title: newTitle } as any });
    }, 800);
  }, [id, mutatePatchNote, isEditing]);

  useEffect(() => {
    return () => {
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    };
  }, []);

  const handleEditorReady = useCallback((editor: Editor) => {
    setEditorInstance(editor);
  }, []);

  const handleScriptureInsert = useCallback((verse: ScriptureVerse) => {
    if (!editorInstance) return;
    editorInstance.chain().focus().insertContent({
      type: 'scripture',
      attrs: {
        reference: verse.reference,
        translation: verse.translation,
        text: verse.text,
      },
    }).run();
  }, [editorInstance]);

  const handleDelete = () => {
    setShowDeleteModal(false);
    deleteNote.mutate(id!);
  };

  const shareNote = useShareNote();

  const handleShareToggle = async (isPublic: boolean) => {
    try {
      await shareNote.mutateAsync({ id: id!, is_public: isPublic });
      if (isPublic) {
        toast.success('Note is now public.');
      } else {
        toast.success('Note is now private.');
      }
    } catch {
      toast.error('Failed to update share settings.');
    }
  };

  const copyShareLink = () => {
    if (note?.share_token) {
      const link = `${window.location.origin}/public/note/${note.share_token}`;
      navigator.clipboard.writeText(link);
      toast.success('Link copied to clipboard!');
    }
  };

  if (isLoading || !note) {
    return <CnoteLoader message="Loading note..." />;
  }

  const lastSaved = formatDistanceToNow(new Date(note.updated_at), { addSuffix: true });

  return (
    <div className="editor-page">
      <Navbar isEditor />

      <div className="editor-page__actions">
        <Button
          variant="ghost"
          size="sm"
          icon="fa-solid fa-arrow-left"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        />
        <div className="editor-page__actions-right">
          {isEditing && <SaveStatusIndicator status={saveStatus} />}
          {!isEditing && (
            <Button
              variant="secondary"
              size="sm"
              icon="fa-solid fa-pen"
              onClick={() => setIsEditing(true)}
            >
              Edit Note
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            icon="fa-solid fa-share-nodes"
            onClick={() => setShowShareModal(true)}
            aria-label="Share note"
          />
          <Button
            variant="ghost"
            size="sm"
            icon="fa-solid fa-trash"
            className="editor-page__delete"
            loading={deleteNote.isPending}
            disabled={deleteNote.isPending}
            onClickCapture={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
            aria-label="Delete entry"
          />
        </div>
      </div>

      <main className={`editor-page__main ${!isEditing ? 'editor-page__main--read-only' : ''}`}>
        <input
          type="text"
          className="editor-page__title"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          readOnly={!isEditing}
        />

        <div className="editor-page__meta">
          <Badge category={note.category as Category} />
          <span className="editor-page__meta-dot">·</span>
          <span className="editor-page__meta-saved">Saved {lastSaved}</span>
        </div>

        {isEditing && (
          <Toolbar
            editor={editorInstance}
            category={note.category as Category}
            onScriptureClick={() => setShowScriptureModal(true)}
          />
        )}

        <RichEditor
          content={note.content}
          onUpdate={setContent}
          onEditorReady={handleEditorReady}
          editable={isEditing}
        />
      </main>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete this entry?"
      >
        <p className="editor-page__delete-modal-text">
          This cannot be undone. The note and all its content will be permanently deleted.
        </p>
        <div className="editor-page__delete-modal-actions">
          <Button
            variant="ghost"
            size="md"
            type="button"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            type="button"
            onClick={handleDelete}
            loading={deleteNote.isPending}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share this note"
      >
        <div className="editor-page__share-modal">
          <p className="editor-page__share-modal-text">
            Making this note public will generate a link anyone can use to read it. 
            They will not be able to edit your content.
          </p>
          
          <div className="editor-page__share-toggle-container">
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={note.is_public} 
                onChange={(e) => handleShareToggle(e.target.checked)}
                disabled={shareNote.isPending}
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="editor-page__share-status">
              {note.is_public ? 'Public Access' : 'Private Access'}
            </span>
          </div>

          {note.is_public && note.share_token && (
            <div className="editor-page__share-link-section">
              <label className="editor-page__share-link-label">Public Link</label>
              <div className="editor-page__share-link-group">
                <input 
                  type="text" 
                  readOnly 
                  className="editor-page__share-link-input"
                  value={`${window.location.origin}/public/note/${note.share_token}`}
                />
                <Button variant="primary" size="sm" onClick={copyShareLink}>
                  <i className="fa-solid fa-copy" style={{ marginRight: '6px' }} /> Copy
                </Button>
              </div>
            </div>
          )}

          <div className="editor-page__share-modal-footer">
            <Button variant="ghost" size="md" onClick={() => setShowShareModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      <ScriptureBlock
        isOpen={showScriptureModal}
        onClose={() => setShowScriptureModal(false)}
        onInsert={handleScriptureInsert}
      />
    </div>
  );
}
