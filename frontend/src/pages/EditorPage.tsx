import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { get } from 'idb-keyval';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '../components/layout/Navbar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import CnoteLoader from '../components/ui/CnoteLoader';
import Toolbar from '../components/editor/Toolbar';
import RichEditor from '../components/editor/RichEditor';
import Switch from '../components/ui/Switch';
import SaveStatusIndicator from '../components/editor/SaveStatus';
import OfflineBanner from '../components/editor/OfflineBanner';
import { useNote, usePatchNote, useDeleteNote, useShareNote } from '../hooks/useNotes';
import { useAutoSave } from '../hooks/useAutoSave';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useLoader } from '../context/LoaderContext';
import { useThemeContext } from '../context/ThemeContext';
import { adaptEditorColors } from '../utils/colorAdaptation';
import toast from 'react-hot-toast';
import type { SaveStatus, Category } from '../types';
import type { Editor } from '@tiptap/react';
import './EditorPage.css';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: note, isLoading } = useNote(id!);
  const { mutate: mutatePatchNote } = usePatchNote();
  const deleteNote = useDeleteNote();
  const { setIsLoading } = useLoader();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<object | null>(null);
  const [initialContent, setInitialContent] = useState<object | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(() => {
    return location.state?.isNew === true;
  });
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInitialized = useRef(false);

  // Issue 3: Offline detection & API failure lock
  const isOnline = useOnlineStatus();
  const isEffectivelyOnline = isOnline && saveStatus !== 'circuit-open';
  const wasOnlineRef = useRef(isEffectivelyOnline);

  // Issue 5: Dark mode color adaptation
  const { isDark } = useThemeContext();
  const colorAdaptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (note && !titleInitialized.current) {
      setTitle(note.title || '');
      titleInitialized.current = true;
      
      // Check IDB for unsaved local content
      get(`note-${id}`).then((localContent) => {
        if (localContent && JSON.stringify(localContent) !== JSON.stringify(note.content)) {
          setInitialContent(localContent as object);
          setContent(localContent as object); // Trigger auto-save to sync local changes
        } else {
          setInitialContent(note.content);
        }
      }).catch(() => {
        setInitialContent(note.content);
      });
    }
  }, [note, id]);

  useEffect(() => {
    if (!isLoading && note && initialContent) {
      setIsLoading(false);
    }
  }, [isLoading, note, initialContent, setIsLoading]);

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

  /* Issue 3: Offline → Online transition: show toast.
   * NOTE: If the auto-save debounce was in-flight when going offline,
   * it may have been lost. The auto-save hook should ideally cancel
   * pending saves on offline and re-queue on reconnect — deferred. */
  useEffect(() => {
    if (isEffectivelyOnline && !wasOnlineRef.current && isEditing) {
      toast.success('Back online — editing resumed.', { duration: 3000, id: 'connectivity' });
    }
    wasOnlineRef.current = isEffectivelyOnline;
  }, [isEffectivelyOnline, isEditing]);

  /* Issue 5: Adapt inline-colored text for dark mode.
   * On theme change, run a full DOM walk immediately.
   * On editor content updates, debounce at 200ms to avoid perf issues. */
  useEffect(() => {
    if (editorInstance) {
      adaptEditorColors(editorInstance.view.dom, isDark);
    }
  }, [isDark, editorInstance]);

  useEffect(() => {
    if (!editorInstance || !isDark) return;
    // Debounced re-adaptation when content changes in dark mode
    colorAdaptTimerRef.current = setTimeout(() => {
      adaptEditorColors(editorInstance.view.dom, true);
    }, 200);
    return () => {
      if (colorAdaptTimerRef.current) clearTimeout(colorAdaptTimerRef.current);
    };
  }, [content, editorInstance, isDark]);


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

  if (isLoading || !note || !initialContent) {
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
            noteId={id!}
            disabled={!isEffectivelyOnline}
          />
        )}

        <RichEditor
          content={initialContent}
          onUpdate={setContent}
          onEditorReady={handleEditorReady}
          editable={isEditing && isEffectivelyOnline}
        />
      </main>

      {/* Issue 3: Offline lock overlay */}
      {!isEffectivelyOnline && isEditing && <OfflineBanner />}

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
            <Switch
              checked={note.is_public}
              onChange={handleShareToggle}
              disabled={shareNote.isPending}
              label={note.is_public ? 'Public Access' : 'Private Access'}
              id="share-toggle"
            />
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

    </div>
  );
}
