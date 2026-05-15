import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../services/api';
import CnoteLoader from '../components/ui/CnoteLoader';
import { format } from 'date-fns';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import LinkExtension from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import CodeBlockComponent from '../components/editor/CodeBlockComponent';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Scripture } from '../components/editor/ScriptureExtension';
import PublicNavbar from '../components/layout/PublicNavbar';
import Logo from '../components/ui/Logo';
import SEO from '../components/common/SEO';
import './PublicNotePage.css';

const lowlight = createLowlight(common);

const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
});

export default function PublicNotePage() {
  const { shareToken } = useParams<{ shareToken: string }>();

  const { data: note, isLoading, error } = useQuery({
    queryKey: ['publicNote', shareToken],
    queryFn: () => publicApi.getNote(shareToken!),
    enabled: !!shareToken,
    retry: false,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, link: false, underline: false } as any),
      Underline,
      TextStyle,
      Color,
      LinkExtension.configure({ openOnClick: true }),
      Image.configure({ inline: false }),
      CustomCodeBlock.configure({ lowlight }),
      Scripture,
    ],
    content: note?.content,
    editable: false, // strictly read-only
  }, [note?.content]);


  if (isLoading) {
    return <CnoteLoader message="Loading note..." />;
  }

  if (error || !note) {
    return (
      <div className="public-note__error">
        <Logo className="public-note__error-logo" />
        <h2>Note not found</h2>
        <p>This note may have been deleted, made private, or the link is incorrect.</p>
        <Link to="/" className="public-note__home-link">Return Home</Link>
      </div>
    );
  }

  const dateStr = format(new Date(note.created_at), 'MMM d, yyyy');
  const readTime = Math.max(1, Math.ceil(note.word_count / 200));

  const initials = note.display_name
    ? note.display_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="public-note-page">
      <SEO 
        title={note.title || 'Untitled Note'} 
        description={note.content_text || 'A public note on Cnote.'}
        url={`${window.location.origin}/public/note/${shareToken}`}
      />
      <PublicNavbar />

      <main className="public-note__main">
        <article className="public-note__article">
          <h1 className="public-note__title">{note.title || 'Untitled'}</h1>
          
          <div className="public-note__author-meta">
            <div className="public-note__avatar">
              {note.avatar_url ? (
                <img src={note.avatar_url} alt={note.display_name} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="public-note__author-info">
              <span className="public-note__author-name">{note.display_name}</span>
              <div className="public-note__date-read">
                <span>{readTime} min read</span>
                <span className="public-note__dot">·</span>
                <span>{dateStr}</span>
              </div>
            </div>
          </div>

          <div className="public-note__content">
            <EditorContent editor={editor} />
          </div>
        </article>
      </main>
    </div>
  );
}
