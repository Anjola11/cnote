import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { useEntry, usePatchEntry, useDeleteEntry } from '../hooks/useEntries';
import { useAutoSave } from '../hooks/useAutoSave';
import type { SaveStatus, ScriptureVerse, Category } from '../types';
import type { Editor } from '@tiptap/react';
import './EditorPage.css';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: entry, isLoading } = useEntry(id!);
  const patchEntry = usePatchEntry();
  const deleteEntry = useDeleteEntry();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<object | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showScriptureModal, setShowScriptureModal] = useState(false);
  // Use state (not ref) so Toolbar re-renders when editor becomes available
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize from entry data
  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
    }
  }, [entry]);

  // Autosave content
  useAutoSave(id!, content, setSaveStatus);

  // Title debounce save
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(() => {
      patchEntry.mutate({ id: id!, data: { title: newTitle } as any });
    }, 800);
  }, [id, patchEntry]);

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
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: `📖 ${verse.reference} (${verse.translation})`, marks: [{ type: 'bold' }] },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: `"${verse.text}"`, marks: [{ type: 'italic' }] },
          ],
        },
      ],
    }).run();
  }, [editorInstance]);

  const handleDelete = () => {
    deleteEntry.mutate(id!);
    setShowDeleteModal(false);
  };

  if (isLoading || !entry) {
    return <CnoteLoader message="Loading entry..." />;
  }

  const lastSaved = formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true });

  return (
    <div className="editor-page">
      <Navbar />

      <div className="editor-page__actions">
        <SaveStatusIndicator status={saveStatus} />
        <Button
          variant="ghost"
          size="sm"
          icon="fa-solid fa-trash"
          className="editor-page__delete"
          onClick={() => setShowDeleteModal(true)}
          aria-label="Delete entry"
        />
      </div>

      <main className="editor-page__main">
        {/* Title */}
        <input
          type="text"
          className="editor-page__title"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Untitled"
        />

        {/* Metadata row */}
        <div className="editor-page__meta">
          <Badge category={entry.category as Category} />
          <span className="editor-page__meta-dot">·</span>
          <span className="editor-page__meta-saved">Saved {lastSaved}</span>
        </div>

        {/* Toolbar */}
        <Toolbar
          editor={editorInstance}
          category={entry.category as Category}
          onScriptureClick={() => setShowScriptureModal(true)}
        />

        {/* Rich editor */}
        <RichEditor
          content={entry.content}
          onUpdate={setContent}
          onEditorReady={handleEditorReady}
        />
      </main>

      {/* Delete confirm modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete this entry?">
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
          This cannot be undone. The entry and all its content will be permanently deleted.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="md" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" size="md" onClick={handleDelete} loading={deleteEntry.isPending}>Delete</Button>
        </div>
      </Modal>

      {/* Scripture modal */}
      <ScriptureBlock
        isOpen={showScriptureModal}
        onClose={() => setShowScriptureModal(false)}
        onInsert={handleScriptureInsert}
      />
    </div>
  );
}
