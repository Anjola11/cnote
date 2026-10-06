import { useEffect } from 'react';
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
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Heading from '@tiptap/extension-heading';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import verilog from 'highlight.js/lib/languages/verilog';
import vhdl from 'highlight.js/lib/languages/vhdl';
import x86asm from 'highlight.js/lib/languages/x86asm';
import CodeBlockComponent from '../components/editor/CodeBlockComponent';
import { CustomImage } from '../components/editor/ImageExtension';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Scripture } from '../components/editor/ScriptureExtension';
import PublicNavbar from '../components/layout/PublicNavbar';
import Logo from '../components/ui/Logo';
import SEO from '../components/common/SEO';
import { useThemeContext } from '../context/ThemeContext';
import { adaptEditorColors } from '../utils/colorAdaptation';
import './PublicNotePage.css';

const lowlight = createLowlight(common);
lowlight.register('verilog', verilog);
lowlight.register('vhdl', vhdl);
lowlight.register('x86asm', x86asm);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const HeadingWithId = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level as number;
    const text = node.textContent;
    const id = slugify(text) || undefined;
    return [`h${level}`, { ...HTMLAttributes, id }, 0];
  },
});

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
      StarterKit.configure({
        codeBlock: false,
        heading: false,
        // @ts-ignore
        link: false,
        // @ts-ignore
        underline: false,
      }),
      HeadingWithId.configure({
        levels: [1, 2, 3],
      }),
      Underline,
      TextStyle,
      Color,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      CustomImage.configure({
        inline: false,
        allowBase64: true,
      }),
      CustomCodeBlock.configure({ lowlight }),
      Scripture,
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: note?.content,
    editable: false, // strictly read-only
    editorProps: {
      attributes: {
        spellcheck: 'false',
      },
      handleClick(_view, _pos, event) {
        const target = (event.target as HTMLElement).closest('a');
        if (!target) return false;

        const href = target.getAttribute('href');
        if (!href) return false;

        event.preventDefault();

        if (href.startsWith('#')) {
          const targetId = href.slice(1);
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        } else {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
        return true;
      },
    },
  }, [note?.content]);

  // Issue 5: Adapt inline-colored text for dark mode in public view
  const { isDark } = useThemeContext();
  
  // Apply color adaptation initially and whenever theme changes
  // We use useEffect to run this after the editor has rendered its content
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // In read-only mode, the content doesn't change after initial load,
      // so a single pass on theme change is sufficient.
      adaptEditorColors(editor.view.dom, isDark);
    }
  }, [isDark, editor, note?.content]);


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

  const avatarUrl = note.avatar_url?.replace(/^http:\/\//, 'https://');

  return (
    <div className="public-note-page">
      <SEO 
        title={note.title || 'Untitled Note'} 
        description={note.content_text || 'A public note on Cnote.'}
        url={`${window.location.origin}/public/note/${shareToken}`}
        noindex={true}
      />
      <PublicNavbar />

      <main className="public-note__main">
        <article className="public-note__article">
          <h1 className="public-note__title">{note.title || 'Untitled'}</h1>
          
          <div className="public-note__author-meta">
            <div className="public-note__avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={note.display_name} />
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
